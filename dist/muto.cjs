var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, copyDefault, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && (copyDefault || key !== "default"))
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toESM = (module2, isNodeMode) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", !isNodeMode && module2 && module2.__esModule ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};
var __toCommonJS = /* @__PURE__ */ ((cache) => {
  return (module2, temp) => {
    return cache && cache.get(module2) || (temp = __reExport(__markAsModule({}), module2, 1), cache && cache.set(module2, temp), temp);
  };
})(typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : 0);
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

// lib/engine.ts
var engine_exports = {};
__export(engine_exports, {
  createCatalog: () => createCatalog,
  parseStmt: () => parseStmt,
  query: () => query
});

// lib/catalog.ts
var import_path = __toESM(require("path"), 1);
var import_os = __toESM(require("os"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_child_process = require("child_process");
var import_util = __toESM(require("util"), 1);
var execify = import_util.default.promisify(import_child_process.exec);
var mlr = (0, import_path.join)(process.cwd(), "node_modules", ".bin", "mlr@v6.0.0");
var Catalog = class {
  constructor(options) {
    this.name = options.name !== "" ? options.name : import_path.default.basename(options.source);
    this.options = options;
    this.createdAt = new Date();
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
  columnHeader() {
    return __async(this, null, function* () {
      const header = yield execify(`${mlr} --icsv --ojson head -n 1 ${this.options.source}`);
      if (header.stderr !== "") {
        throw new Error(`failed-to-get-header-column: ${header.stderr}`);
      }
      const columns = JSON.parse(header.stdout);
      if (columns.length === 0) {
        throw new Error("failed-to-get-header-column: no columns found");
      }
      this.metadata.columns = this.sanitizeColumnNames(Object.keys(columns[0]));
    });
  }
  sanitizeColumnNames(columns) {
    return columns.map((column) => column.replace(/[^a-zA-Z0-9]/g, "_"));
  }
  fileType() {
    return __async(this, null, function* () {
      if (import_os.default.platform() !== "linux" && import_os.default.platform() !== "darwin") {
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
      const stat = yield import_fs.default.promises.stat(this.options.source);
      this.metadata.size = stat.size;
    });
  }
};
function createCatalog(query2, opt) {
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
      if (opt.name === void 0 || opt.name === "") {
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
        catalog.columnHeader(),
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

// lib/engine.ts
var import_child_process2 = require("child_process");

// lib/parser.ts
var import_pgsql_parser = require("pgsql-parser");
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
    var _a, _b;
    if (raw.trim() === "") {
      throw new Error("invalid-query: no query found");
    }
    console.log(`raw: ${raw}`);
    const rawAST = (0, import_pgsql_parser.parse)(raw);
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
          left: {},
          right: {}
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
function parseStmt(query2) {
  return new Parser().parse(query2);
}

// lib/engine.ts
var import_path2 = require("path");
var import_fs2 = require("fs");
var mlr2 = (0, import_path2.join)(process.cwd(), "node_modules", ".bin", "mlr@v6.0.0");
function query(query2, opt) {
  return __async(this, null, function* () {
    const catalog = yield createCatalog(query2, opt);
    if (catalog == null) {
      throw new Error("failed-to-create-catalog");
    }
    const plan = new Analyzer(catalog, parseStmt(query2)).analyze();
    console.log(JSON.stringify(catalog, null, 2));
    const { stdout } = (0, import_child_process2.exec)(plan.cmd + " " + plan.args.join(" "), {
      maxBuffer: 1024 * 1024 * 1024
    });
    if (stdout === null) {
      throw new Error("failed-to-execute-query");
    }
    stdout.on("close", () => {
      console.log("done");
    });
    stdout.pipe((0, import_fs2.createWriteStream)(catalog.options.destination));
  });
}
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
    console.log("analyzing query");
    this.plan.cmd = mlr2;
    if (this.stmt.type !== "select") {
      throw new Error("not-implemented: only select queries are supported at this time");
    }
    if (this.stmt.from.length === 1) {
      const table = this.stmt.from[0].relname;
      console.log("from table: ", table);
      const source = this.catalog.options.source;
      const destination = this.catalog.options.destination;
      console.log("destination: ", destination);
      if (this.stmt.columns.length === 1) {
        if (this.stmt.columns[0].name === "*") {
          this.plan.args = ["--icsv", "--ojson", "cat", source];
          return this.plan;
        }
        this.plan.args = ["--icsv", "--ojson", "cut", "-f", this.stmt.columns[0].name, source];
      }
      if (this.stmt.columns.length > 1) {
        const fields = this.stmt.columns.map((col) => col.name).join(",");
        console.log("fields: ", fields);
        this.plan.args = ["--icsv", "--ojson", "cut", "-o", "-f", fields, source];
        return this.plan;
      }
    }
    return this.plan;
  }
};
module.exports = __toCommonJS(engine_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createCatalog,
  parseStmt,
  query
});