var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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
  parser: () => parser,
  query: () => query
});
module.exports = __toCommonJS(engine_exports);

// lib/catalog.ts
var import_path2 = __toESM(require("path"), 1);
var import_os = __toESM(require("os"), 1);
var import_fs = require("fs");
var import_child_process = require("child_process");
var import_util = __toESM(require("util"), 1);
var import_promises = require("fs/promises");

// lib/miller.ts
var import_path = require("path");
var import_process = require("process");
var Miller = class {
  constructor() {
    this.version = "6.2.0";
    this.path = "";
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
  cut(fields) {
    const wihthQuotes = fields.map((f) => `"${f}"`);
    this.args.push(`cut -f ${wihthQuotes.join(",")}`);
    return this;
  }
  head(count) {
    this.args.push(`head -n ${count}`);
    return this;
  }
  determinePath() {
    if ((0, import_process.cwd)().split("/").pop() === "muto") {
      this.path = (0, import_path.join)((0, import_process.cwd)(), "node_modules", ".bin", "mlr@v" + this.version);
      return;
    }
    this.path = (0, import_path.join)((0, import_process.cwd)(), "node_modules", "muto", "node_modules", ".bin", "mlr@v" + this.version);
  }
};
function millerCmd() {
  const cmd = new Miller();
  cmd.determinePath();
  return cmd;
}

// lib/catalog.ts
var execify = import_util.default.promisify(import_child_process.exec);
var Catalog = class {
  constructor(options) {
    this.options = options;
    this.createdAt = new Date();
    this.source = {
      path: import_path2.default.parse(""),
      type: "csv",
      columns: [],
      header: false,
      fileSize: 0,
      rowCount: 0,
      spanMultipleLines: false,
      quotes: false,
      delimiter: ","
    };
    this.destination = {
      path: import_path2.default.parse(this.options.destination),
      type: "csv",
      columns: [],
      header: false,
      fileSize: 0,
      rowCount: 0,
      spanMultipleLines: false,
      quotes: false,
      delimiter: ","
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
      if (this.source.type === "json") {
        return;
      }
      const args = mlr.getCmd() + " " + mlr.jsonOutput().count().fileSource(this.options.source).getArgs().join(" ");
      const count = yield execify(args);
      if (count.stderr !== "") {
        throw new Error(`failed to count rows: ${count.stderr}`);
      }
      const rowCount = JSON.parse(count.stdout);
      if (rowCount.length === 0) {
        throw new Error("failed to count rows: no rows found");
      }
      if (rowCount[0].count === void 0) {
        throw new Error("failed to count rows: no count found");
      }
      this.source.rowCount = rowCount[0].count;
    });
  }
  validateSource() {
    return __async(this, null, function* () {
      const fstat = yield (0, import_promises.stat)(this.options.source);
      if (!fstat.isFile()) {
        throw Error("Source path is not a file");
      }
      yield (0, import_promises.access)(this.options.source, import_fs.constants.R_OK).catch(() => {
        throw Error("Source file is not readable");
      });
      if (fstat.size === 0) {
        throw Error("Source file is empty");
      }
      this.source.path = import_path2.default.parse(this.options.source);
    });
  }
  validateDestination() {
    const ext = this.destination.path.ext;
    if (ext === ".csv") {
      this.destination.type = "csv";
      return;
    }
    if (ext === ".json") {
      this.destination.type = "json";
      return;
    }
    throw new Error("Destination file extension is not supported");
  }
  fileType() {
    return __async(this, null, function* () {
      if (import_os.default.platform() !== "linux" && import_os.default.platform() !== "darwin") {
        throw new Error("Unsupported platform");
      }
      const { stdout, stderr } = yield execify(`file ${this.options.source} --mime-type`);
      if (stderr !== "") {
        throw new Error(stderr);
      }
      const mimeType = stdout.split(":")[1].trim();
      if (mimeType === "application/json") {
        this.source.type = "json";
        return;
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
      throw new Error("Unsupported file type");
    });
  }
  fileSize() {
    return __async(this, null, function* () {
      const fstat = yield (0, import_promises.stat)(this.options.source);
      this.source.fileSize = fstat.size;
    });
  }
  sanitizeColumnNames(columns) {
    return columns.map((column) => column.replace(/[^a-zA-Z0-9]/g, "_"));
  }
  columnHeader() {
    return __async(this, null, function* () {
      if (this.source.type === "csv") {
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
        return;
      }
      if (this.source.type === "json") {
        const mlr = millerCmd();
        const args = mlr.getCmd() + " " + mlr.jsonInput().jsonOutput().head(1).fileSource(this.options.source).getArgs().join(" ");
        const header = yield execify(args);
        if (header.stderr !== "") {
          throw new Error(`failed-to-get-header-column: ${header.stderr}`);
        }
        const columns = JSON.parse(header.stdout);
        if (columns.length === 0) {
          throw new Error("failed-to-get-header-column: no columns found");
        }
        for (const c in columns[0]) {
          this.source.columns.push(c);
        }
        this.source.header = true;
        return;
      }
      throw new Error("Failed to get header column");
    });
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
        switch (import_path2.default.extname(opt.source)) {
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
        switch (import_path2.default.extname(opt.destination)) {
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
      const c = new Catalog(catalogOpt);
      Promise.all([c.validateSource(), c.validateDestination(), c.fileType(), c.rowCount(), c.fileSize(), c.columnHeader()]).then(() => {
        resolve(c);
      }).catch((err) => {
        reject(err);
      });
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
      const singleField = this.stmt.columns[0].name;
      if (!this.catalog.source.columns.includes(singleField)) {
        throw new Error(`Column not found,  ${singleField}`);
      }
      console.log("columns:", this.stmt.columns[0].name);
      this.plan.args = mlr.csvInput().jsonOutput().cut([this.stmt.columns[0].name]).fileSource(source).getArgs();
      return this.plan;
    }
    if (this.stmt.columns.length > 1) {
      const fields = this.stmt.columns.map((column) => {
        if (!this.catalog.source.columns.includes(column.name)) {
          throw new Error(`column ${column.name} is not in the list of columns`);
        }
        return `"${column.name}"`;
      });
      this.plan.args = mlr.csvInput().jsonOutput().cut(fields).fileSource(source).getArgs();
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
var import_pgsql_parser = require("pgsql-parser");
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
        inh: "",
        external: {
          s3: {
            bucket: "",
            key: "",
            file: ""
          }
        }
      }],
      sort: {},
      where: {
        operator: "",
        left: "",
        right: ""
      },
      groupBy: [],
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
  getLimit() {
    return parseInt(this.stmt.limit.val);
  }
  getTable() {
    if (this.stmt.from[0].external.s3.bucket !== "") {
      return "s3://" + this.stmt.from[0].external.s3.bucket + "/" + this.stmt.from[0].external.s3.key;
    }
    return this.stmt.from[0].relname;
  }
  getType() {
    return this.stmt.type;
  }
  getGroupBy() {
    return this.stmt.groupBy;
  }
  isExternal() {
    return this.stmt.from[0].external.s3.bucket !== "" && this.stmt.from[0].external.s3.key !== "";
  }
  parse() {
    var _a, _b;
    const raw = this.query;
    if (raw.trim() === "") {
      throw new Error("invalid-query: no query found");
    }
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
          inh: "",
          external: {
            s3: {
              bucket: "",
              key: ""
            }
          }
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
        if (source.relname.startsWith("s3://")) {
          source.external.s3 = parseS3URI(source.relname);
        }
        return source;
      });
    }
    if (ast.groupClause !== void 0) {
      const group = ast.groupClause.map((g) => {
        return g.ColumnRef.fields[0].String.str;
      });
      this.stmt.groupBy = group;
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
function parseS3URI(uri) {
  var _a;
  if (typeof uri !== "string" || uri === "")
    throw new Error(`invalid or empty uri: ${uri}`);
  if (!uri.startsWith("s3://") || uri.split(":/")[0] !== "s3")
    throw new Error('uri must start with "s3://"');
  const result = {
    bucket: "",
    key: "",
    file: ""
  };
  const src = uri.split(":/")[1];
  const [bucket, ...keys] = src.split("/").splice(1);
  if (bucket === "")
    throw new Error("bucket name cannot be empty");
  result.bucket = bucket;
  result.key += keys.join("/");
  if (result.key.split(".").length > 1) {
    result.file = (_a = result.key.split("/").pop()) != null ? _a : "";
  }
  return result;
}
function parser(query2) {
  const p = new Parser(query2);
  p.parse();
  return p;
}

// lib/engine.ts
var import_fs2 = require("fs");
var import_child_process2 = require("child_process");
function query(raw, opt) {
  return __async(this, null, function* () {
    var _a;
    const query2 = parser(raw);
    if (query2.getType() !== "select") {
      throw new Error("Only select queries are supported at this time");
    }
    console.log(query2.getStmt());
    const catalog = yield createCatalog(opt);
    const plan = createPlan(catalog, query2.getStmt());
    console.log(`${plan.cmd} ${plan.args.join(" ")}`);
    const proc = (0, import_child_process2.execFile)(plan.cmd, plan.args, {
      maxBuffer: 1024 * 1024 * 1024
    }, (err, stdout, stderr) => {
      if (err != null) {
        console.error(err);
      }
      if (stderr !== "") {
        console.error(stderr);
      }
    });
    if (proc.stdout != null) {
      (_a = proc.stdout) == null ? void 0 : _a.pipe((0, import_fs2.createWriteStream)(catalog.getOptions().destination));
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createCatalog,
  parser,
  query
});
