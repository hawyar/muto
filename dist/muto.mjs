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
import path from "path";
import { createInterface } from "readline";
import os from "os";
import { constants, createReadStream } from "fs";
import { exec } from "child_process";
import util from "util";
import { access, stat } from "fs/promises";

// lib/miller.ts
import isInstalledGlobally from "is-installed-globally";
import { join } from "path";
import { cwd } from "process";
import { existsSync } from "fs";
import { execSync } from "child_process";
var Miller = class {
  constructor() {
    this.version = "6.0.0";
    this.path = join(cwd(), "node_modules", ".bin", "mlr@v" + this.version);
    this.args = [];
  }
  getCmd() {
    return this.path;
  }
  getArgs() {
    return this.args;
  }
  getPath() {
    if (this.path === "") {
      throw new Error("miller-path-not-set: missing miller binary path");
    }
    return this.path;
  }
  fileSource(file) {
    if (this.args.length === 0) {
      throw new Error("First specifiy the arguments then add the source file");
    }
    this.args.push(file);
    return this;
  }
  csvInput() {
    this.args.push("--icsv");
    return this;
  }
  jsonInput() {
    this.args.push("--ijson");
    return this;
  }
  csvOutput() {
    this.args.push("--ocsv");
    return this;
  }
  jsonOutput() {
    this.args.push("--ojson");
    return this;
  }
  implicitCsvHeader(fields) {
    this.args.push(`--implicit-csv-header label ${fields.join(",")}`);
    return this;
  }
  count() {
    this.args.push("count");
    return this;
  }
  cat() {
    this.args.push("cat");
    return this;
  }
  head(count) {
    this.args.push(`head -n ${count}`);
    return this;
  }
  determinePath() {
    if (isInstalledGlobally) {
      const stdout = execSync("npm root -g");
      if (stdout === null) {
        throw new Error("Failed to find global miller path");
      }
      const global = join(stdout.toString().trim(), "muto", "node_modules", ".bin", "mlr@" + this.version);
      if (existsSync(global)) {
        this.path = global;
      }
      return;
    }
    if (this.path === "") {
      this.path = join(cwd(), "node_modules", ".bin", "mlr@" + this.version);
    }
  }
};
function millerCmd() {
  const mlr = new Miller();
  mlr.determinePath();
  return mlr;
}

// lib/catalog.ts
var execify = util.promisify(exec);
var Catalog = class {
  constructor(options) {
    this.options = options;
    this.createdAt = new Date();
    this.source = {
      path: {
        root: "",
        dir: "",
        base: "",
        ext: "",
        name: ""
      },
      type: "csv",
      columns: [],
      header: false,
      fileSize: 0,
      rowCount: 0,
      spanMultipleLines: false,
      quotes: false,
      delimiter: ",",
      errors: {},
      warnings: {},
      preview: []
    };
    this.destination = {
      path: {
        root: "",
        dir: "",
        base: "",
        ext: "",
        name: ""
      },
      type: "csv",
      columns: [],
      header: false,
      fileSize: 0,
      rowCount: 0,
      spanMultipleLines: false,
      quotes: false,
      delimiter: ",",
      errors: {},
      warnings: {},
      preview: []
    };
  }
  getSource() {
    return this.source;
  }
  getDestination() {
    return this.destination;
  }
  getOptions() {
    return this.options;
  }
  getColumns() {
    return this.source.columns;
  }
  rowCount() {
    return __async(this, null, function* () {
      const mlr = millerCmd();
      const args = mlr.getCmd() + " " + mlr.jsonOutput().count().fileSource(this.options.source).getArgs().join(" ");
      const count = yield execify(args);
      if (count.stderr !== "") {
        throw new Error(`failed-to-get-row-count: ${count.stderr}`);
      }
      const rowCount = JSON.parse(count.stdout);
      if (rowCount.length === 0) {
        throw new Error("failed-to-get-row-count: no rows found");
      }
      if (rowCount[0].count === void 0) {
        throw new Error("failed-to-get-row-count: no count found");
      }
      this.source.rowCount = rowCount[0].count;
    });
  }
  columnHeader() {
    return __async(this, null, function* () {
      const mlr = millerCmd();
      const args = mlr.getCmd() + " " + mlr.jsonOutput().head(1).fileSource(this.options.source).getArgs().join(" ");
      const header = yield execify(args);
      if (header.stderr !== "") {
        throw new Error(`failed-to-get-header-column: ${header.stderr}`);
      }
      const columns = JSON.parse(header.stdout);
      if (columns.length === 0) {
        throw new Error("failed-to-get-header-column: no columns found");
      }
      for (const c in columns[0]) {
        this.source.columns.push(columns[0][c]);
      }
      this.source.header = true;
    });
  }
  validateSource() {
    return __async(this, null, function* () {
      const fstat = yield stat(this.options.source);
      if (!fstat.isFile()) {
        throw Error("Source path is not a file");
      }
      yield access(this.options.source, constants.R_OK).catch(() => {
        throw Error("Source file is not readable");
      });
      if (fstat.size === 0) {
        throw Error("Source file is empty");
      }
      this.source.path = path.parse(this.options.source);
    });
  }
  validateDestination() {
    return __async(this, null, function* () {
      this.destination.path = path.parse(this.options.destination);
    });
  }
  fileType() {
    return __async(this, null, function* () {
      if (os.platform() !== "linux" && os.platform() !== "darwin") {
        throw new Error("unsupported-platform");
      }
      const { stdout, stderr } = yield execify(`file ${this.options.source} --mime-type`);
      if (stderr !== "") {
        throw new Error(`failed-to-detect-mime-type: ${stderr}`);
      }
      const mimeType = stdout.split(":")[1].trim();
      console.log(mimeType);
      if (mimeType === "application/json") {
        throw new Error("failed-to-detect-mime-type");
      }
      if (mimeType === "application/csv") {
        this.source.type = "csv";
        return;
      }
      if (mimeType === "application/json") {
        this.source.type = "json";
        return;
      }
      if (mimeType === "text/csv") {
        this.source.type = "csv";
        return;
      }
      if (mimeType === "text/plain") {
        this.source.type = "csv";
        return;
      }
      const rl = createInterface({
        input: createReadStream(this.options.source)
      });
      let first = "";
      rl.on("line", (line) => {
        first = line;
        rl.close();
      });
      rl.on("close", () => {
        if (first.startsWith("{") || first.startsWith("[")) {
          return true;
        }
        if (this.options.delimiter === void 0) {
          const firstLineSplit = first.split(this.options.delimiter);
          if (firstLineSplit.length === this.source.columns.length) {
            this.source.type = "csv";
            return true;
          }
        }
        throw new Error("failed-to-detect-mime-type");
      });
      throw Error(`Unsupported file type ${mimeType}`);
    });
  }
  fileSize() {
    return __async(this, null, function* () {
      const fstat = yield stat(this.options.source);
      this.source.fileSize = fstat.size;
    });
  }
  sanitizeColumnNames(columns) {
    return columns.map((column) => column.replace(/[^a-zA-Z0-9]/g, "_"));
  }
  preview() {
    return __async(this, null, function* () {
      const mlr = millerCmd();
      const args = mlr.getCmd() + mlr.jsonOutput().head(5).fileSource(this.options.source).getArgs().join(" ");
      const preview = yield execify(args);
      if (preview.stderr !== "") {
        throw new Error(preview.stderr);
      }
      const rows = JSON.parse(preview.stdout);
      if (rows.length === 0) {
        throw new Error("failed-to-get-preview: no rows found");
      }
      this.source.preview = rows;
    });
  }
};
function createCatalog(opt) {
  return __async(this, null, function* () {
    return yield new Promise((resolve, reject) => {
      if (opt === void 0) {
        reject(new Error("missing-catalog-options"));
      }
      if (opt.source === void 0 || opt.source === "") {
        reject(new Error("failed-to-create-catalog: no source provided"));
      }
      if (opt.destination === void 0 || opt.destination === "") {
        reject(new Error("failed-to-create-catalog: no destination provided"));
      }
      const catalogOpt = Object.assign({}, opt);
      if (opt.input === void 0) {
        switch (path.extname(opt.source)) {
          case ".csv":
            catalogOpt.input = "csv";
            break;
          case ".json":
            catalogOpt.input = "json";
            break;
          default:
            reject(new Error("failed-to-create-catalog: unsupported input file type"));
        }
      }
      if (opt.output === void 0) {
        switch (path.extname(opt.destination)) {
          case ".csv":
            catalogOpt.output = "csv";
            break;
          case ".json":
            catalogOpt.output = "json";
            break;
          default:
            reject(new Error("failed-to-create-catalog: unsupported output file type"));
        }
      }
      const catalog = new Catalog(catalogOpt);
      Promise.all([
        catalog.validateSource(),
        catalog.validateDestination(),
        catalog.columnHeader(),
        catalog.fileSize(),
        catalog.fileType(),
        catalog.rowCount()
      ]).then(() => {
        console.log(`created catalog ${catalog.getSource().path.name}`);
        resolve(catalog);
      }).catch((err) => reject(err));
    });
  });
}

// lib/analyzer.ts
var Analyzer = class {
  constructor(catalog, stmt) {
    this.stmt = stmt;
    this.catalog = catalog;
    this.plan = {
      cmd: "",
      args: []
    };
  }
  analyze() {
    console.log("analyzing query:");
    const mlr = millerCmd();
    this.plan.cmd = mlr.getPath();
    if (this.stmt.type !== "select") {
      throw Error("Only select queries are supported at this time");
    }
    if (this.stmt.from.length !== 1) {
      throw Error("Multi-table queries are not supported");
    }
    const table = this.stmt.from[0].relname;
    console.log("table:", table);
    const source = this.catalog.options.source;
    if (this.stmt.columns.length === 1) {
      if (this.stmt.columns[0].name === "*") {
        console.log("columns: *");
        this.plan.args = mlr.csvInput().jsonOutput().cat().fileSource(source).getArgs();
        return this.plan;
      }
      const singleField = this.stmt.columns[0].name.replace(/[^a-zA-Z0-9]/g, "_");
      if (!this.catalog.source.columns.includes(singleField)) {
        throw new Error(`column-not-found: ${singleField}`);
      }
      this.plan.args = mlr.csvInput().jsonOutput().implicitCsvHeader(this.catalog.getColumns()).fileSource(source).getArgs();
      return this.plan;
    }
    if (this.stmt.columns.length > 1) {
      const fields = this.stmt.columns.map((column) => {
        const sanitized = column.name.replace(/[^a-zA-Z0-9]/g, "_");
        if (!this.catalog.source.columns.includes(sanitized)) {
          throw new Error(`column ${column.name} is not in the list of columns`);
        }
        return sanitized;
      }).join(",");
      this.plan.args = ["--icsv", "--ojson", "--implicit-csv-header", "label", `${this.catalog.source.columns.join(",")}`, "then", "cut", "-o", "-f", fields, source];
      return this.plan;
    }
    throw Error("Error: no columns specified");
  }
};
function createPlan(catalog, stmt) {
  const analyzer = new Analyzer(catalog, stmt);
  return analyzer.analyze();
}

// lib/parser.ts
import { parse as sqlParser } from "pgsql-parser";
var Parser = class {
  constructor(raw) {
    this.query = raw;
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
      where: {
        operator: "",
        left: "",
        right: ""
      },
      group: [],
      having: [],
      orderBy: [],
      limit: {
        type: "",
        val: ""
      }
    };
  }
  getStmt() {
    return this.stmt;
  }
  getColumns() {
    return this.stmt.columns.map((c) => c.name);
  }
  isDistinct() {
    return this.stmt.distinct;
  }
  getWhere() {
    return this.stmt.where;
  }
  limit() {
    return parseInt(this.stmt.limit.val);
  }
  getTable() {
    return this.stmt.from[0].relname;
  }
  getType() {
    return this.stmt.type;
  }
  parse() {
    var _a, _b;
    const raw = this.query;
    if (raw.trim() === "") {
      throw new Error("invalid-query: no query found");
    }
    const rawAST = sqlParser(raw);
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
    if (ast.fromClause !== void 0) {
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
    }
    if (ast.whereClause !== void 0) {
      if (ast.whereClause !== null && ((_a = ast == null ? void 0 : ast.whereClause) == null ? void 0 : _a.A_Expr.kind) === "AEXPR_OP") {
        const expr = ast.whereClause.A_Expr;
        const where = {
          operator: "",
          left: "",
          right: ""
        };
        where.operator = expr.name[0].String.str;
        if (expr.lexpr !== void 0) {
          where.left = expr.lexpr.ColumnRef.fields[0].String.str;
        }
        if (expr.rexpr !== void 0) {
          if (expr.rexpr.ColumnRef !== void 0 && Object.keys(expr.rexpr.ColumnRef.fields[0]).includes("String")) {
            where.right = expr.rexpr.ColumnRef.fields[0].String.str;
          }
          if (expr.rexpr.A_Const !== void 0) {
            where.right = expr.rexpr.A_Const.val.Integer.ival;
          }
        }
        this.stmt.where = where;
      }
      if (ast.whereClause.A_Expr !== void 0 && ((_b = ast == null ? void 0 : ast.whereClause) == null ? void 0 : _b.A_Expr.kind) === "AEXPR_IN") {
      }
      if (ast.whereClause.BoolExpr !== void 0) {
        if (ast.whereClause.BoolExpr.boolop === "AND_EXPR") {
        }
        if (ast.whereClause.BoolExpr.boolop === "OR_EXPR") {
        }
      }
    }
    return this.stmt;
  }
};
function parser(query2) {
  const p = new Parser(query2);
  p.parse();
  return p;
}

// lib/engine.ts
import { spawn } from "child_process";
import { createWriteStream } from "fs";
function query(raw, opt) {
  return __async(this, null, function* () {
    if (raw === void 0 || raw === "") {
      throw new Error("No query provided");
    }
    const query2 = parser(raw);
    if (query2.getType() !== "select") {
      throw new Error("Only select queries are supported at this time");
    }
    const catalog = yield createCatalog(opt);
    const plan = createPlan(catalog, query2.getStmt());
    const proc = spawn(plan.cmd, plan.args);
    proc.on("error", (err) => {
      console.error(err);
    });
    if (proc.stdout === null) {
      throw new Error("stdout is null");
    }
    proc.stdout.pipe(createWriteStream(opt.destination));
  });
}
export {
  createCatalog,
  parser,
  query
};
