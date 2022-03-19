var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// lib/catalog.ts
import path, { join } from "path";
import os from "os";
import fs from "fs";
import { exec } from "child_process";
import util from "util";
var execify = util.promisify(exec);
var mlr = join(process.cwd(), "node_modules", ".bin", "mlr@v6.0.0");
var Catalog = class {
  constructor(options) {
    this.name = options.name !== "" ? options.name : path.basename(options.source);
    this.options = options;
    this.env = "local";
    this.createdAt = new Date();
    this.state = "init";
    this.connector = null;
    this.loader = null;
    this.metadata = {
      type: "",
      columns: [],
      header: false,
      extension: "",
      size: 0,
      rowCount: 0,
      spanMultipleLines: false,
      quotes: false,
      delimiter: ",",
      errors: {},
      warnings: {}
    };
  }
  rowCount() {
    return __async(this, null, function* () {
      const rCount = yield execify(`${mlr} --ojson count ${this.options.source}`);
      if (rCount.stderr !== "") {
        throw new Error(`failed-to-get-row-count: ${rCount.stderr}`);
      }
      const rowCount = JSON.parse(rCount.stdout);
      if (rowCount.length === 0) {
        throw new Error("failed-to-get-row-count: no rows found");
      }
      if (rowCount[0].count === void 0) {
        throw new Error("failed-to-get-row-count: no count found");
      }
      this.metadata.rowCount = rowCount[0].count;
    });
  }
  headerColumn() {
    return __async(this, null, function* () {
      const header = yield execify(`${mlr} --icsv --ojson head -n 1 ${this.options.source}`);
      if (header.stderr !== "") {
        throw new Error(`failed-to-get-header-column: ${header.stderr}`);
      }
      const columns = JSON.parse(header.stdout);
      if (columns.length === 0) {
        throw new Error("failed-to-get-header-column: no columns found");
      }
      this.metadata.columns = Object.keys(columns[0]);
    });
  }
  fileType() {
    return __async(this, null, function* () {
      if (os.platform() !== "linux" && os.platform() !== "darwin") {
        throw new Error("unsupported-platform");
      }
      const mime = yield execify(`file ${this.options.source} --mime-type`);
      if (mime.stderr !== "") {
        throw new Error(`failed-to-detect-mime-type: ${mime.stderr}`);
      }
      const type = mime.stdout.split(":")[1].trim();
      if (type === "") {
        throw new Error("failed-to-detect-mime-type");
      }
      if (this.options.source.endsWith(".csv")) {
        this.metadata.extension = "csv";
      }
      if (this.options.source.endsWith(".json")) {
        this.metadata.extension = "json";
      }
      this.metadata.type = type;
    });
  }
  fileSize() {
    return __async(this, null, function* () {
      const stat = yield fs.promises.stat(this.options.source);
      this.metadata.size = stat.size;
    });
  }
  determineEnv() {
    const source = this.options.source;
    if (source.startsWith("/") || source.startsWith("../") || source.startsWith("./")) {
      this.env = "local";
      return;
    }
    if (source.startsWith("s3://")) {
      this.env = "s3";
      return;
    }
    throw new Error(`invalid-source-type: ${source}`);
  }
};
function createCatalog(opt) {
  return __async(this, null, function* () {
    return yield new Promise((resolve, reject) => {
      if (opt.source === "" || opt.source === void 0) {
        reject(new Error("failed-to-create-catalog: no source provided"));
      }
      if (opt.destination === "" || opt.destination === void 0) {
        reject(new Error("failed-to-create-catalog: no destination provided"));
      }
      if (opt.name === "" || opt.name === void 0) {
        reject(new Error("failed-to-create-catalog: no name provided"));
      }
      if (opt.input === "csv" && !opt.source.endsWith(".csv")) {
        reject(new Error("failed-to-create-catalog: file extension does not match input type"));
      }
      if (opt.input === "json" && !opt.source.endsWith(".json")) {
        reject(new Error("failed-to-create-catalog: file extension does not match input type"));
      }
      const catalog = new Catalog(opt);
      Promise.all([
        catalog.determineEnv(),
        catalog.headerColumn(),
        catalog.fileSize(),
        catalog.fileType(),
        catalog.rowCount()
      ]).then(() => {
        console.log(`created catalog for: ${opt.name}`);
        resolve(catalog);
      }).catch((err) => reject(err));
    });
  });
}

// lib/parser.ts
import { parse } from "pgsql-parser";
var Parser = class {
  constructor() {
    this.query = "";
    this.stmt = {
      type: "",
      distinct: false,
      columns: [{
        name: "",
        type: ""
      }],
      from: [{
        schemaname: "",
        relname: "",
        inh: ""
      }],
      sort: {},
      where: {},
      group: [],
      having: [],
      orderBy: [],
      limit: {
        type: "",
        val: ""
      }
    };
  }
  parse(raw) {
    var _a, _b, _c;
    if (raw.trim() === "") {
      throw new Error("invalid-query: no query found");
    }
    console.log(`raw: ${raw}`);
    const rawAST = parse(raw);
    if (Object.keys(rawAST[0].RawStmt.stmt)[0] === "SelectStmt") {
      this.stmt.type = "select";
    }
    const ast = rawAST[0].RawStmt.stmt.SelectStmt;
    const limit = ast.limitOption;
    if (limit === "LIMIT_OPTION_DEFAULT") {
      this.stmt.limit = {
        type: ast.limitOption,
        val: ""
      };
    }
    if (limit === "LIMIT_OPTION_COUNT" && ast.limitCount !== "") {
      this.stmt.limit = {
        type: ast.limitOption,
        val: ast.limitCount.A_Const.val.Integer.ival
      };
    }
    if (ast.distinctClause !== void 0) {
      this.stmt.distinct = true;
    }
    if (ast.targetList !== void 0) {
      this.stmt.columns = ast.targetList.map((t) => {
        const col = t.ResTarget.val.ColumnRef.fields[0];
        if (col.A_Star !== void 0) {
          return {
            name: "*"
          };
        }
        return {
          name: col.String.str
        };
      });
    }
    this.stmt.from = ast.fromClause.map((from) => {
      const source = {
        schemaname: "",
        relname: "",
        inh: ""
      };
      const t = from.RangeVar;
      if (t.schemaname !== void 0) {
        source.schemaname = t.schemaname;
      }
      if (t.relname !== void 0) {
        source.relname = t.relname;
      }
      if (t.inh !== void 0) {
        source.inh = t.inh;
      }
      return source;
    });
    if (ast.whereClause !== void 0) {
      if (ast.whereClause !== null && ((_a = ast == null ? void 0 : ast.whereClause) == null ? void 0 : _a.A_Expr.kind) === "AEXPR_OP") {
        const expr = ast.whereClause.A_Expr;
        const where = {
          operator: "",
          left: {},
          right: {}
        };
        where.operator = expr.name[0].String.str;
        if (expr.lexpr !== null) {
          where.left = expr.lexpr.ColumnRef.fields[0].String.str;
        }
        if (expr.rexpr !== null) {
          where.right = expr.rexpr.ColumnRef.fields[0].String.str;
        }
        this.stmt.where = where;
      }
      if (((_b = ast == null ? void 0 : ast.whereClause) == null ? void 0 : _b.A_Expr) !== null && ((_c = ast == null ? void 0 : ast.whereClause) == null ? void 0 : _c.A_Expr.kind) === "AEXPR_IN") {
        const expr = ast.whereClause.A_Expr;
        console.log(expr);
      }
      if (ast.whereClause.BoolExpr !== null) {
        if (ast.whereClause.BoolExpr.boolop === "AND_EXPR") {
          const args = ast.whereClause.BoolExpr.args;
          console.log(JSON.stringify(args, null, 2));
        }
        if (ast.whereClause.BoolExpr.boolop === "OR_EXPR") {
          const args = ast.whereClause.BoolExpr.args;
          console.log(JSON.stringify(args, null, 2));
        }
      }
    }
    return this.stmt;
  }
};
function parseQuery(query) {
  return new Parser().parse(query);
}
export {
  createCatalog,
  parseQuery
};
