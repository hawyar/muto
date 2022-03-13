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
import fs from "fs";
import { spawn } from "child_process";
import os from "os";
import path, { join } from "path";
import { VFile } from "vfile";
import { parse } from "pgsql-parser";
import { createInterface } from "readline";
import {
  CreateMultipartUploadCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
const mlr = join(process.cwd(), "node_modules", ".bin", "mlr@v6.0.0");
var Delimiter = /* @__PURE__ */ ((Delimiter2) => {
  Delimiter2["COMMA"] = ",";
  Delimiter2["TAB"] = "	";
  Delimiter2["SPACE"] = " ";
  Delimiter2["PIPE"] = "|";
  Delimiter2["SEMICOLON"] = ";";
  Delimiter2["COLON"] = ":";
  return Delimiter2;
})(Delimiter || {});
const credentials = (profile) => {
  return fromIni({
    profile,
    mfaCodeProvider: (mfaSerial) => __async(void 0, null, function* () {
      return mfaSerial;
    })
  });
};
function s3Client(config) {
  return new S3Client(config);
}
function parseS3Uri(uri, options) {
  const opt = {
    file: options.file ? options.file : false
  };
  if (!uri.startsWith("s3://") || uri.split(":/")[0] !== "s3") {
    throw new Error(`invalid-s3-uri: ${uri}`);
  }
  let err = "";
  const result = {
    bucket: "",
    key: "",
    file: ""
  };
  const src = uri.split(":/")[1];
  const [bucket, ...keys] = src.split("/").splice(1);
  result.bucket = bucket;
  result.key = keys.join("/");
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      const last = k.split(".").length;
      if (opt.file && last === 1) {
        err = `uri should be a given, given: ${uri}`;
      }
      if (!opt.file && last === 1)
        return;
      if (!opt.file && last > 1) {
        err = `Invalid S3 uri, ${uri} should not end with a file name`;
        return;
      }
      if (!opt.file && k.split(".")[1] !== "" && last > 1) {
        err = `${uri} should not be a file endpoint: ${k}`;
      }
      if (last > 1 && k.split(".")[1] !== "")
        result.file = k;
    }
  });
  return {
    data: result,
    err
  };
}
class Catalog {
  constructor(options) {
    this.name = options.name !== "" ? options.name : path.basename(options.source);
    this.options = options;
    this.env = "local";
    this.init = new Date();
    this.state = "init";
    this.pcount = 0;
    this.columns = [];
    this.connector = null;
    this.loader = null;
    this.vfile = new VFile({ path: this.options.source });
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
      sort: [],
      where: {},
      group: [],
      orderBy: [],
      having: [],
      limit: {
        type: "",
        val: ""
      }
    };
  }
  toJson() {
    return __async(this, null, function* () {
      const json = this.exec(mlr, [
        "--icsv",
        "--ojson",
        "clean-whitespace",
        this.options.source,
        ">",
        this.options.destination
      ]);
      return json;
    });
  }
  rowCount() {
    return __async(this, null, function* () {
      const count = yield this.exec(mlr, ["--ojson", "count", this.options.source]);
      const rowCountExec = yield this.promisifyProcessResult(count);
      if (rowCountExec.code !== 0) {
        throw new Error(`Error while counting rows: ${rowCountExec.stderr}`);
      }
      if (rowCountExec.stderr !== "") {
        throw new Error(rowCountExec.stderr);
      }
      const rowCount = JSON.parse(rowCountExec.stdout);
      if (rowCount.length === 0) {
        throw new Error("Error while counting rows");
      }
      if (rowCount[0].count === void 0) {
        throw new Error("Error while counting rows");
      }
      return rowCount[0].count;
    });
  }
  headerColumn() {
    return __async(this, null, function* () {
      const res = yield this.exec(mlr, [
        "--icsv",
        "--ojson",
        "head",
        "-n",
        "1",
        this.options.source
      ]);
      const colExec = yield this.promisifyProcessResult(res);
      if (colExec.code !== 0) {
        throw new Error(`Error while getting column header: ${colExec.stderr}`);
      }
      const columns = JSON.parse(colExec.stdout);
      if (columns.length === 0) {
        throw new Error("No columns found");
      }
      this.columns = Object.keys(columns[0]);
    });
  }
  preview(count = 20, streamTo) {
    return __async(this, null, function* () {
      if (streamTo === void 0) {
        throw new Error("stream-destination-undefined");
      }
      if (streamTo !== null && streamTo !== this.options.source && fs.createWriteStream(streamTo) instanceof fs.WriteStream) {
        const write = fs.createWriteStream(streamTo);
        const previewExec2 = yield this.exec(mlr, [
          "--icsv",
          "--ojson",
          "head",
          "-n",
          count.toString(),
          this.options.source
        ]);
        previewExec2.stdout.pipe(write);
        console.warn(`preview saved to: ${streamTo}`);
        return streamTo;
      }
      const previewExec = yield this.exec(mlr, [
        "--icsv",
        "--ojson",
        "head",
        "-n",
        count.toString(),
        this.options.source
      ]);
      const prev = yield this.promisifyProcessResult(previewExec);
      if (prev.stderr !== "") {
        throw new Error(prev.stderr);
      }
      if (prev.code !== 0) {
        throw new Error("Error while executing mlr command");
      }
      this.vfile.data.preview = JSON.parse(prev.stdout);
      return JSON.parse(prev.stdout);
    });
  }
  determineShape() {
    return __async(this, null, function* () {
      const path2 = this.options.source;
      const shape = {
        type: "",
        size: 0,
        columns: [],
        header: false,
        encoding: "utf-8",
        bom: false,
        spanMultipleLines: false,
        quotes: false,
        delimiter: ",",
        errors: {},
        warnings: {},
        preview: []
      };
      shape.size = yield this.fileSize();
      if (os.platform() === "win32") {
        throw new Error("scream");
      }
      const mime = this.exec("file", [path2, "--mime-type"]);
      const res = yield this.promisifyProcessResult(mime);
      if (res.stderr !== "") {
        throw new Error(`failed-to-detect-mime-type: ${res.stderr}`);
      }
      if (res.code !== 0) {
        throw new Error(`failed-to-detect-mime-type: ${res.stderr}`);
      }
      shape.type = res.stdout.split(":")[1].trim();
      const readLine = createInterface({
        input: fs.createReadStream(path2),
        crlfDelay: Infinity
      });
      let count = 0;
      const max = 20;
      const first = {
        row: [""],
        del: ""
      };
      let previous = "";
      const delimiters = [",", ";", "	", "|", ":", " ", "|"];
      readLine.on("line", (current) => {
        if (count === 0) {
          delimiters.forEach((d) => {
            if (current.split(d).length > 1) {
              first.row = current.split(d);
              first.del = d;
            }
          });
          if (first.del === "" || first.row.length <= 1) {
            shape.errors.unrecognizedDelimiter = `${path2} does not have a recognized delimiter`;
            shape.header = false;
          }
          first.row.forEach((r) => {
            if (!isNaN(parseInt(r.substring(0, 3)))) {
              shape.header = false;
              shape.warnings.noHeader = "no header found";
              count++;
            }
          });
          shape.header = true;
          shape.delimiter = first.del;
          shape.columns = first.row;
        }
        if (count > 0 && count < max) {
          const inlineQuotes = current.split('"').length - 1;
          if (previous !== "") {
            if (inlineQuotes % 2 !== 0) {
              shape.spanMultipleLines = true;
            }
          }
          if (inlineQuotes % 2 !== 0 && current.split('""').length - 1 !== 1) {
            previous = current;
          }
          const width = current.split(first.del).length;
          if (width !== first.row.length) {
            shape.errors.rowWidthMismatch = "row width mismatch";
            return;
          }
          shape.preview.push(current.split(first.del));
        }
        count++;
      });
      readLine.on("close", () => {
        this.vfile.data.shape = shape;
      });
    });
  }
  determineLoader() {
    if (this.options.destination.startsWith("s3://")) {
      this.loader = s3Client({
        credentials: credentials("default"),
        region: "us-east-2"
      });
      return;
    }
    if (this.options.source.startsWith("/") || this.options.source.startsWith("../") || this.options.source.startsWith("./")) {
      this.loader = fs.createReadStream(this.options.source);
      return;
    }
    throw new Error("unsupported-loader");
  }
  determineConnector() {
    switch (this.env) {
      case "local":
        if (!fs.existsSync(this.options.source)) {
          throw new Error(`file: ${this.options.source} not found, please provide a valid file path`);
        }
        this.connector = fs.createReadStream(this.options.source);
        break;
      case "aws":
        this.connector = s3Client({
          credentials: credentials("default"),
          region: "us-east-2"
        });
        break;
      default:
        throw new Error(`unsupported-source for: ${this.options.source}`);
    }
  }
  determineEnv() {
    const source = this.options.source;
    if (source.startsWith("/") || source.startsWith("../") || source.startsWith("./")) {
      this.env = "local";
      return;
    }
    if (source.startsWith("s3://")) {
      this.env = "aws";
      return;
    }
    throw new Error(`invalid-source-type: ${source}`);
  }
  fileSize() {
    return __async(this, null, function* () {
      const source = this.options.source;
      const max = 50 * 1024 * 1024;
      const stat = yield fs.promises.stat(source);
      if (stat.size > max) {
        throw new Error(`file-size-exceeds-limit: ${source} is too large, please limit to under 50MB for now`);
      }
      this.vfile.data.size = stat.size;
      return stat.size;
    });
  }
  uploadToS3() {
    return __async(this, null, function* () {
      const source = this.options.source;
      const destination = this.options.destination;
      if (source === "") {
        throw new Error("source not definded");
      }
      if (destination === "") {
        throw new Error("destination not definded");
      }
      const fStream = fs.createReadStream(source);
      if (!fStream.readable) {
        throw new Error("failed-to-read-source: Make sure the provided file is readable");
      }
      const size = yield this.fileSize();
      if (size > 100 * 1024 * 1024) {
        console.warn(`file size ${size} is larger`);
      }
      const { data: uri, err } = parseS3Uri(destination, {
        file: true
      });
      if (err.toString().startsWith("invalid-s3-uri")) {
        throw new Error(`failed-to-parse-s3-uri: ${err}`);
      }
      if (uri.file === "") {
        uri.file = path.basename(source);
        console.warn("Destination filename not provided. Using source source basename" + uri.file);
      }
      console.log(`uploading ${source} to ${destination}`);
      const s3 = s3Client({
        region: "us-east-2"
      });
      const res = yield s3.send(new PutObjectCommand({
        Bucket: uri.bucket,
        Key: uri.key + uri.file,
        Body: fStream
      })).catch((err2) => {
        throw new Error(`failed-upload-s3: Error while uploading to S3: ${err2}`);
      }).finally(() => {
        fStream.close();
      });
      if (res.$metadata.httpStatusCode !== void 0 && res.$metadata.httpStatusCode !== 200) {
        throw new Error(`failed-upload-s3: Error while uploading to S3: ${res.$metadata.httpStatusCode}`);
      }
      if (res.$metadata.requestId === void 0) {
        throw new Error("failed-upload-s3");
      }
      return res.$metadata.requestId;
    });
  }
  initMultipartUpload(bucket, key) {
    return __async(this, null, function* () {
      const client = s3Client({
        credentials: credentials("default"),
        region: "us-east-2"
      });
      const command = new CreateMultipartUploadCommand({
        Bucket: bucket,
        ContentEncoding: "utf8",
        ContentType: "text/csv",
        Key: key
      });
      const result = yield client.send(command);
      if (result.UploadId === void 0 || result.$metadata.httpStatusCode !== 200) {
        throw new Error("failed-multipart-upload");
      }
      if (result.UploadId === void 0) {
        throw new Error("failed-multipart-upload");
      }
      return result.UploadId;
    });
  }
  exec(cmd, args) {
    console.log(`exec: ${cmd} ${args.join(" ")}`);
    if (this.pcount > 5) {
      throw new Error(`too-many-processes: ${this.pcount}`);
    }
    this.pcount++;
    return spawn(cmd, args, {});
  }
  promisifyProcessResult(child) {
    return __async(this, null, function* () {
      const result = {
        stdout: "",
        stderr: "",
        code: 0
      };
      return yield new Promise((resolve, reject) => {
        child.stdout.on("data", (data) => {
          result.stdout += data;
        });
        child.on("close", (code) => {
          result.code = code === 0 ? 0 : 1;
          resolve(result);
        });
        child.on("error", (err) => {
          reject(err);
        });
      });
    });
  }
}
function createCatalog(opt) {
  return __async(this, null, function* () {
    return yield new Promise((resolve, reject) => {
      if (opt.source === "" || opt.source === void 0) {
        reject(new Error("invalid-source: the source path is required"));
      }
      if (opt.destination === "") {
        reject(new Error("failed-to-create-dataset: destination is required"));
      }
      if (!opt.source.endsWith(".csv")) {
        reject(new Error(`invalid-file-type: expected a .csv file, ${opt.source} is not`));
      }
      const catalog = new Catalog(opt);
      Promise.all([
        catalog.determineEnv(),
        catalog.determineShape(),
        catalog.determineConnector(),
        catalog.determineLoader(),
        catalog.headerColumn(),
        catalog.fileSize(),
        catalog.rowCount()
      ]).then(() => {
        console.log(`created catalog for: ${opt.name}`);
        resolve(catalog);
      }).catch((err) => reject(err));
    });
  });
}
class Workflow {
  constructor(name) {
    this.name = name;
    this.catalogs = /* @__PURE__ */ new Map();
    this.createdAt = new Date();
    this.env = "local";
    this.stmt = "";
  }
  list() {
    return Array.from(this.catalogs.values());
  }
  remove(dataset) {
    this.catalogs.delete(dataset.options.source);
  }
  get(source) {
    if (this.catalogs.get(source) != null) {
      return this.catalogs.get(source);
    }
    return void 0;
  }
  add(catalog) {
    if (Array.isArray(catalog)) {
      if (catalog.length === 1 && catalog[0].name !== "") {
        const c = catalog[0];
        if (this.catalogs.has(c.name)) {
          throw new Error(`duplicate-dataset: ${c.name}`);
        }
        this.catalogs.set(c.name, c);
        return c.name;
      }
      catalog.forEach((c) => {
        if (this.catalogs.has(c.name)) {
          throw new Error(`duplicate-dataset: ${c.name}`);
        }
        console.log(`added ${c.name} to the workflow`);
        this.catalogs.set(c.name, c);
      });
      return catalog.map((c) => c.name);
    }
    if (this.catalogs.has(catalog.name)) {
      throw new Error(`duplicate-dataset: ${catalog.name}`);
    }
    this.catalogs.set(catalog.name, catalog);
    console.log(`added ${catalog.name} to the workflow`);
    return catalog.name;
  }
  promisifyProcessResult(child) {
    return __async(this, null, function* () {
      const result = {
        stdout: "",
        stderr: "",
        code: 0
      };
      return yield new Promise((resolve, reject) => {
        child.stdout.on("data", (data) => {
          result.stdout += data;
        });
        child.on("close", (code) => {
          result.code = code === 0 ? 0 : 1;
          resolve(result);
        });
        child.on("error", (err) => {
          reject(err);
        });
      });
    });
  }
  exec(cmd, args) {
    return __async(this, null, function* () {
      const run = spawn(cmd, args);
      const result = {
        stdout: "",
        stderr: "",
        code: 0
      };
      return yield new Promise((resolve, reject) => {
        run.stdout.on("data", (data) => {
          result.stdout += data;
        });
        run.on("close", (code) => {
          result.code = code === 0 ? 0 : 1;
          resolve(result);
        });
        run.on("error", (err) => {
          reject(err);
        });
      });
    });
  }
  query(raw) {
    return __async(this, null, function* () {
      let from = "";
      const parsed = new Parser().parse(raw);
      if (parsed.from.length === 1) {
        from = parsed.from[0].relname;
      }
      console.log(`raw query: ${raw}`);
      console.log(JSON.stringify(parsed, null, 2));
      if (!this.catalogs.has(from)) {
        throw new Error(`unknown-catalog: ${from}`);
      }
      const catalog = this.catalogs.get(from);
      if (catalog == null) {
        throw new Error(`catalog-not-found: ${from}`);
      }
      console.log(`querying catalog: ${catalog.name}`);
      const plan = new Analyzer(catalog, parsed).analyze();
      console.log(JSON.stringify(plan, null, 2));
    });
  }
}
function createWorkflow(name) {
  console.log(`created workflow: ${name}`);
  return new Workflow(name);
}
class Parser {
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
    const rawAST = parse(raw);
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
        if (t.ResTarget.name !== void 0) {
          return {
            as: t.ResTarget.name,
            name: col.String.str
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
}
class Analyzer {
  constructor(catalog, stmt) {
    this.stmt = stmt;
    this.catalog = catalog;
    this.plan = {
      name: "beepboop"
    };
  }
  analyze() {
    console.log("analyzing query");
    return this.plan;
  }
}
export {
  createCatalog,
  createWorkflow
};
