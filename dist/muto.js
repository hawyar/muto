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
import fs from "fs";
import {
  CreateMultipartUploadCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
import { AthenaClient } from "@aws-sdk/client-athena";
import { spawn } from "child_process";
import os from "os";
import path, { join } from "path";
import { VFile } from "vfile";
import { createInterface } from "readline";
var mlr = join(process.cwd(), "node_modules", ".bin", "mlr@v6.0.0");
var sqlparser = join(process.cwd(), "node_modules", ".bin", "sqlparser@v0.1.4");
var Catalog = class {
  constructor(source, options) {
    this.name = options && options.name ? options.name : path.basename(source);
    this.source = source;
    this.options = options;
    this.destination = options.destination;
    this.env = "local";
    this.init = new Date();
    this.state = "init";
    this.pcount = 0;
    this.vfile = new VFile({ path: this.source });
  }
  toJson() {
    return __async(this, null, function* () {
      const json = this.exec(mlr, [
        "--icsv",
        "--ojson",
        "clean-whitespace",
        this.source
      ]);
      if (!json.stdout) {
        throw new Error(`failed to convert ${this.source} from CSV to JSON`);
      }
      return json;
    });
  }
  toCSV() {
    return __async(this, null, function* () {
      const json = this.exec(mlr, ["--icsv", "--ocsv", "cat", this.source]);
      if (!json.stdout) {
        throw new Error(`failed to convert ${this.source} from JSON to CSV`);
      }
      return json;
    });
  }
  rowCount() {
    return __async(this, null, function* () {
      const count = yield this.exec(mlr, [`--ojson`, `count`, this.source]);
      const rowCountExec = yield this.promisifyProcessResult(count);
      if (rowCountExec.code !== 0) {
        throw new Error(`Error while counting rows: ${rowCountExec.stderr}`);
      }
      if (rowCountExec.stderr) {
        throw new Error(rowCountExec.stderr);
      }
      const r = JSON.parse(rowCountExec.stdout);
      if (r.length === 0) {
        throw new Error("No rows found");
      }
      return r[0].count;
    });
  }
  getColumnHeader() {
    return __async(this, null, function* () {
      const res = yield this.exec(mlr, [
        `--icsv`,
        `--ojson`,
        `head`,
        `-n`,
        `1`,
        this.source
      ]);
      const colExec = yield this.promisifyProcessResult(res);
      if (colExec.code !== 0) {
        return null;
      }
      if (colExec.stderr) {
        throw new Error(colExec.stderr);
      }
      const columns = JSON.parse(colExec.stdout);
      if (columns.length === 0) {
        return null;
      }
      const first = Object.keys(columns[0]);
      this.vfile.data.columns = first;
      return first;
    });
  }
  preview(count = 20, streamTo) {
    return __async(this, null, function* () {
      let write;
      const maxPreview = 1024 * 1024 * 10;
      const fsp = fs.promises;
      const stat = yield fsp.stat(this.source);
      if (streamTo && streamTo !== this.source && fs.createWriteStream(streamTo) instanceof fs.WriteStream || stat.size > maxPreview) {
        if (streamTo === void 0)
          throw new Error("stream-destination-undefined");
        write = fs.createWriteStream(streamTo);
        const previewExec2 = yield this.exec(mlr, [
          `--icsv`,
          `--ojson`,
          `head`,
          `-n`,
          count.toString(),
          this.source
        ]);
        previewExec2.stdout.pipe(write);
        console.warn(`\u{1F440} Preview saved to: ${streamTo}`);
        return streamTo;
      }
      const previewExec = yield this.exec(mlr, [
        `--icsv`,
        `--ojson`,
        `head`,
        `-n`,
        count.toString(),
        this.source
      ]);
      const prev = yield this.promisifyProcessResult(previewExec);
      if (prev.stderr) {
        throw new Error(prev.stderr);
      }
      if (prev.code !== 0) {
        throw new Error(`Error while executing mlr command`);
      }
      this.vfile.data.preview = JSON.parse(prev.stdout);
      return JSON.parse(prev.stdout);
    });
  }
  detectShape() {
    return __async(this, null, function* () {
      const path2 = this.source;
      const shape = {
        type: "",
        size: 0,
        columns: [""],
        header: false,
        encoding: "utf-8",
        bom: false,
        spanMultipleLines: false,
        quotes: false,
        delimiter: ",",
        errors: {},
        warnings: {},
        preview: [[""]]
      };
      if (!fs.existsSync(path2)) {
        throw new Error(`path-doesnt-exists: ${path2} ,provide a valid path to a CSV file`);
      }
      const stat = fs.statSync(path2);
      shape.size = stat.size;
      if (stat.size > 1024 * 1024 * 1024) {
        throw new Error(`file-size-exceeds-limit: ${path2} is too large, please limit to under 1GB for now`);
      }
      if (!fs.existsSync(path2)) {
        throw new Error(`${path2} does not exist, provide a valid path to a CSV file`);
      }
      if (os.platform() === "win32") {
        throw new Error(`scream`);
      }
      const mime = this.exec("file", [path2, "--mime-type"]);
      const mimeRes = yield this.promisifyProcessResult(mime);
      if (mimeRes.stderr) {
        throw new Error(`failed-to-detect-mime-type: ${mimeRes.stderr}`);
      }
      if (mimeRes.code !== 0) {
        throw new Error(`failed-to-detect-mime-type: ${mimeRes.stderr}`);
      }
      shape.type = mimeRes.stdout.trim();
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
            shape.errors["unrecognizedDelimiter"] = `${path2} does not have a recognized delimiter`;
            shape.header = false;
          }
          const isDigit = /\d+/;
          shape.header = true;
          shape.delimiter = first.del;
          shape.columns = first.row;
        }
        if (count > 0 && count < max) {
          const inlineQuotes = current.split(`"`).length - 1;
          if (previous) {
            if (inlineQuotes % 2 !== 0) {
              shape.spanMultipleLines = true;
            }
          }
          if (inlineQuotes % 2 !== 0 && current.split(`""`).length - 1 !== 1) {
            previous = current;
          }
          const width = current.split(first.del).length;
          if (width !== first.row.length) {
            shape.errors["rowWidthMismatch"] = `row width mismatch`;
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
    if (this.destination.startsWith("s3://")) {
      this.vfile.data.loader = s3Client({
        credentials: credentials("default"),
        region: "us-east-2"
      });
      return;
    }
    if (this.source.startsWith("/") || this.source.startsWith("../") || this.source.startsWith("./")) {
      this.vfile.data.loader = fs.createReadStream(this.source);
      return;
    }
  }
  determineConnector() {
    switch (this.env) {
      case "local":
        if (!fs.existsSync(this.source)) {
          throw new Error(`file: ${this.source} not found, please provide a valid file path`);
        }
        this.vfile.data.connector = fs.createReadStream(this.source);
        break;
      case "aws":
        this.vfile.data.connector = s3Client({
          credentials: credentials("default"),
          region: "us-east-2"
        });
        break;
      default:
        throw new Error(`unsupported-source for: ${this.source}`);
    }
  }
  determineEnv() {
    this.vfile.data.source = this.source;
    if (this.source.startsWith("/") || this.source.startsWith("../") || this.source.startsWith("./")) {
      this.env = "local";
      return;
    }
    if (this.source.startsWith("s3://")) {
      this.env = "aws";
      return;
    }
    throw new Error(`invalid-source-type: ${this.source}`);
  }
  fileSize() {
    const max = 1024 * 1024 * 50;
    if (!fs.existsSync(this.source)) {
      throw new Error(`path-doesnt-exists: ${this.source} ,provide a valid path to a CSV file`);
    }
    const stat = fs.statSync(this.source);
    if (stat.size > max) {
      throw new Error(`file-size-exceeds-limit: ${this.source} is too large, please limit to 50MB`);
    }
    return stat.size;
  }
  uploadToS3() {
    return __async(this, null, function* () {
      if (!this.source || !this.destination) {
        throw new Error("source or destination not set. Both must be defined to upload to S3");
      }
      const fStream = fs.createReadStream(this.source);
      if (!fStream.readable) {
        throw new Error("failed-to-read-source: Make sure the provided file is readable");
      }
      const fSize = this.fileSize();
      if (fSize > 100 * 1024 * 1024) {
        console.warn(`file size ${fSize} is larger than 100MB`);
      }
      const { data: uri, err } = parseS3Uri(this.destination, {
        file: true
      });
      if (err.toString().startsWith(`invalid-s3-uri`)) {
        throw new Error(`failed-to-parse-s3-uri: ${err}`);
      }
      if (!uri.file) {
        uri.file = path.basename(this.source);
        console.warn("Destination filename not provided. Using source source basename" + uri.file);
      }
      console.log(`uploading ${this.source} to ${this.destination}`);
      const s32 = s3Client({
        region: "us-east-2"
      });
      const res = yield s32.send(new PutObjectCommand({
        Bucket: uri.bucket,
        Key: uri.key + uri.file,
        Body: fStream
      })).catch((err2) => {
        throw new Error(`failed-upload-s3: Error while uploading to S3: ${err2}`);
      }).finally(() => {
        fStream.close();
      });
      if (res.$metadata.httpStatusCode !== 200) {
        throw new Error(`failed-upload-s3: Error while uploading to S3: ${res.$metadata.httpStatusCode}`);
      }
      if (!res.$metadata.requestId)
        throw new Error(`failed-upload-s3: Error while uploading to S3: ${res.$metadata.httpStatusCode}`);
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
      if (result.$metadata.httpStatusCode !== 200) {
        throw new Error(`failed-multipart-upload: Error while creating multipart upload: ${result.UploadId} with status code ${result.$metadata.httpStatusCode}`);
      }
      if (!result.UploadId) {
        throw new Error(`failed-multipart-upload: Error while creating multipart upload: ${result.UploadId}`);
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
    const result = {
      stdout: "",
      stderr: "",
      code: 0
    };
    return new Promise((resolve, reject) => {
      child.stdout.on("data", (data) => {
        result.stdout += data;
      });
      child.stderr.on("data", (data) => {
        result.stderr += data;
      });
      child.on("close", (code) => {
        result.code = code === 0 ? 0 : 1;
        resolve(result);
      });
      child.on("error", (err) => {
        reject(err);
      });
    });
  }
};
function createCatalog(source, opt) {
  return __async(this, null, function* () {
    return new Promise((resolve, reject) => {
      if (!source) {
        reject(new Error(`failed-to-create-dataset: source is required`));
      }
      if (!opt || !opt.destination) {
        reject(new Error(`failed-to-create-dataset: destination is required`));
      }
      if (!source.endsWith(".csv")) {
        reject(new Error(`failed to create dataset: ${source}, source must be a csv file`));
      }
      const catalog = new Catalog(source, opt);
      Promise.all([
        catalog.determineEnv(),
        catalog.detectShape(),
        catalog.determineConnector(),
        catalog.determineLoader()
      ]).then(() => {
        console.log(`created catalog for ${source}`);
        resolve(catalog);
      }).catch((err) => reject(err));
    });
  });
}
function parseQuery(query) {
  const qq = {
    query,
    select: [],
    from: [],
    where: [],
    orderBy: [],
    groupBy: [],
    limit: null,
    offset: null
  };
  const child = spawn(sqlparser, [qq.query]);
  return new Promise((resolve, reject) => {
    child.on("error", (err) => {
      reject(err);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(`failed-sqlparser: Error while parsing query: ${code}`);
      }
    });
    child.stdout.on("data", (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.error) {
        reject(`failed-sqlparser: Error while parsing query: ${parsed.error}`);
      }
      resolve(parsed);
    });
  });
}
var Workflow = class {
  constructor(name) {
    this.name = name;
    this.catalogs = /* @__PURE__ */ new Map();
    this.createdAt = new Date();
    this.env = "local";
    this.qquery = "";
  }
  list() {
    return Array.from(this.catalogs.values());
  }
  remove(dataset) {
    this.catalogs.delete(dataset.source);
  }
  get(source) {
    return this.catalogs.get(source) || null;
  }
  add(d) {
    return new Promise((resolve, reject) => {
      if (this.catalogs.has(d.source)) {
        reject(`failed-add-dataset: Dataset with source ${d.source} already exists`);
      }
      Promise.all([d.determineConnector(), d.determineLoader()]).catch((err) => {
        throw new Error(err);
      }).then(() => {
        this.catalogs.set(d.source, d);
        resolve(d.source);
      }).catch((err) => {
        reject(err);
      });
    });
  }
  query(q) {
    parseQuery(q).then((parsed) => {
      this.qquery = q;
      console.log(parsed);
    }).catch((err) => {
      throw new Error(err);
    });
    return new Promise((resolve, reject) => {
      resolve("ok");
    });
  }
};
function createWorkflow(name) {
  return new Workflow(name);
}
var credentials = (profile) => fromIni({
  profile,
  mfaCodeProvider: (mfaSerial) => __async(void 0, null, function* () {
    return mfaSerial;
  })
});
var s3;
function s3Client(config) {
  if (!s3) {
    console.log("setting up s3 client");
    s3 = new S3Client(config);
  }
  return s3;
}
function parseS3Uri(uri, options) {
  const opt = {
    file: options && options.file ? options.file : false
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
      if (opt.file && last === 1)
        err = `uri should be a given, given: ${uri}`;
      if (!opt.file && last === 1)
        return;
      if (!opt.file && last > 1) {
        err = `Invalid S3 uri, ${uri} should not end with a file name`;
        return;
      }
      if (!opt.file && k.split(".")[1] !== "" && last > 1)
        err = `${uri} should not be a file endpoint: ${k}`;
      if (last > 1 && k.split(".")[1] !== "")
        result.file = k;
    }
  });
  return {
    data: result,
    err
  };
}
export {
  createCatalog,
  createWorkflow
};
//# sourceMappingURL=muto.js.map
