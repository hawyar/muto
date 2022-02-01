#!/usr/bin/env node
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
    var step = (x2) => x2.done ? resolve(x2.value) : Promise.resolve(x2.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// bin/cli.js
import arg from "arg";

// dist/muto.js
import * as a from "fs";
import { CreateMultipartUploadCommand as D, PutObjectCommand as q, S3Client as k } from "@aws-sdk/client-s3";
import { fromIni as O } from "@aws-sdk/credential-providers";
import { AthenaClient as H } from "@aws-sdk/client-athena";
import { spawn as E } from "child_process";
import N from "os";
import P from "path";
import { createInterface as z } from "readline";
import { join as v } from "path";
var u = (i, t, e) => new Promise((r, o) => {
  var s = (n) => {
    try {
      d(e.next(n));
    } catch (c) {
      o(c);
    }
  }, l = (n) => {
    try {
      d(e.throw(n));
    } catch (c) {
      o(c);
    }
  }, d = (n) => n.done ? r(n.value) : Promise.resolve(n.value).then(s, l);
  d((e = e.apply(i, t)).next());
});
var p = v(process.cwd(), "node_modules", ".bin", "mlr@v6.0.0");
var C = v(process.cwd(), "node_modules", ".bin", "sqlparser@v0.1.4");
var x = class {
  constructor(t, e) {
    this.name = e && e.name ? e.name : P.basename(t), this.source = t, this.destination = e.destination, this.options = e, this.env = this.determineEnv(), this.shape = { type: "", columns: [], header: false, encoding: "", bom: false, size: 0, spanMultipleLines: false, quotes: false, delimiter: "", errors: {}, warnings: {}, preview: [] }, this.addedAt = new Date(), this.state = "init", this.connector = null, this.loader = null, this.pcount = 0;
  }
  toJson() {
    return u(this, null, function* () {
      let t = this.exec(p, ["--icsv", "--ojson", "clean-whitespace", this.source]);
      if (!t.stdout)
        throw new Error(`failed to convert ${this.source} from CSV to JSON`);
      return t;
    });
  }
  toCSV() {
    return u(this, null, function* () {
      let t = this.exec(p, ["--icsv", "--ocsv", "cat", this.source]);
      if (!t.stdout)
        throw new Error(`failed to convert ${this.source} from JSON to CSV`);
      return t;
    });
  }
  rowCount() {
    return u(this, null, function* () {
      let t = yield this.exec(p, ["--ojson", "count", this.source]), e = yield this.promisifyProcessResult(t);
      if (e.code !== 0)
        throw new Error(`Error while counting rows: ${e.stderr}`);
      if (e.stderr)
        throw new Error(e.stderr);
      let r = JSON.parse(e.stdout);
      if (r.length === 0)
        throw new Error("No rows found");
      return r[0].count;
    });
  }
  getColumnHeader() {
    return u(this, null, function* () {
      let t = yield this.exec(p, ["--icsv", "--ojson", "head", "-n", "1", this.source]), e = yield this.promisifyProcessResult(t);
      if (e.code !== 0)
        return null;
      if (e.stderr)
        throw new Error(e.stderr);
      let r = JSON.parse(e.stdout);
      return r.length === 0 ? (this.shape.header = false, null) : (this.shape.columns = Object.keys(r[0]), this.shape.header = true, this.shape.columns);
    });
  }
  formatValues() {
    return u(this, null, function* () {
      let t = yield this.exec(p, ["--icsv", "format-values", this.source]), e = yield this.promisifyProcessResult(t);
      if (e.code !== 0)
        return null;
      if (e.stderr)
        throw new Error(e.stderr);
      return this.shape.columns;
    });
  }
  preview(t = 20, e) {
    return u(this, null, function* () {
      let r, o = 1024 * 1024 * 10, l = yield a.promises.stat(this.source);
      if (e && e !== this.source && a.createWriteStream(e) instanceof a.WriteStream || l.size > o) {
        if (e === void 0)
          throw new Error("stream-destination-undefined");
        return r = a.createWriteStream(e), (yield this.exec(p, ["--icsv", "--ojson", "head", "-n", t.toString(), this.source])).stdout.pipe(r), console.warn(`\u{1F440} Preview saved to: ${e}`), e;
      }
      let d = yield this.exec(p, ["--icsv", "--ojson", "head", "-n", t.toString(), this.source]), n = yield this.promisifyProcessResult(d);
      if (n.stderr)
        throw new Error(n.stderr);
      if (n.code !== 0)
        throw new Error("Error while executing mlr command");
      return this.shape.preview = JSON.parse(n.stdout), this.shape.preview;
    });
  }
  detectShape() {
    return u(this, null, function* () {
      let t = this.source, e = { type: "", size: 0, columns: [""], header: false, encoding: "utf-8", bom: false, spanMultipleLines: false, quotes: false, delimiter: ",", errors: {}, warnings: {}, preview: [[""]] };
      if (!a.existsSync(t))
        throw new Error(`path-doesnt-exists: ${t} ,provide a valid path to a CSV file`);
      let r = a.statSync(t);
      if (this.shape.size = r.size, r.size > 1024 * 1024 * 1024)
        throw new Error(`file-size-exceeds-limit: ${t} is too large, please limit to under 1GB for now`);
      if (!a.existsSync(t))
        throw new Error(`${t} does not exist, provide a valid path to a CSV file`);
      if (N.platform() === "win32")
        throw new Error("scream");
      let o = this.exec("file", [t, "--mime-type"]), s = yield this.promisifyProcessResult(o);
      if (s.stderr)
        throw new Error(`failed-to-detect-mime-type: ${s.stderr}`);
      if (s.code !== 0)
        throw new Error(`failed-to-detect-mime-type: ${s.stderr}`);
      e.type = s.stdout.trim();
      let l = z({ input: a.createReadStream(t), crlfDelay: 1 / 0 }), d = 0, n = 20, c = { row: [""], del: "" }, h = "", b = [",", ";", "	", "|", ":", " ", "|"];
      return l.on("line", (f) => {
        if (d === 0) {
          b.forEach((m) => {
            f.split(m).length > 1 && (c.row = f.split(m), c.del = m);
          }), (c.del === "" || c.row.length <= 1) && (e.errors.unrecognizedDelimiter = `${t} does not have a recognized delimiter`, e.header = false);
          let w = /\d+/, W = c.row.some((m) => w.test(m));
          e.header = true, e.delimiter = c.del, e.columns = c.row;
        }
        if (d > 0 && d < n) {
          let w = f.split('"').length - 1;
          if (h && w % 2 !== 0 && (e.spanMultipleLines = true), w % 2 !== 0 && f.split('""').length - 1 !== 1 && (h = f), f.split(c.del).length !== c.row.length) {
            e.errors.rowWidthMismatch = "row width mismatch";
            return;
          }
          e.preview.push(f.split(c.del));
        }
        d++;
      }), e;
    });
  }
  determineLoader() {
    if (this.destination.startsWith("s3://")) {
      this.loader = g({ credentials: y("default"), region: "us-east-2" });
      return;
    }
    if (this.source.startsWith("/") || this.source.startsWith("../") || this.source.startsWith("./")) {
      this.loader = a.createReadStream(this.source);
      return;
    }
  }
  determineConnector() {
    if (this.env === "local") {
      this.connector = a.createReadStream(this.source);
      return;
    }
    if (this.env === "aws") {
      this.connector = g({ credentials: y("default"), region: "us-east-2" });
      return;
    }
    throw new Error(`unsupported-source for: ${this.source}`);
  }
  determineEnv() {
    if (this.source.startsWith("/") || this.source.startsWith("../") || this.source.startsWith("./"))
      return "local";
    if (this.source.startsWith("s3://"))
      return "aws";
    throw new Error(`invalid-source-type: ${this.source}`);
  }
  fileSize() {
    let t = 1024 * 1024 * 50;
    if (!a.existsSync(this.source))
      throw new Error(`path-doesnt-exists: ${this.source} ,provide a valid path to a CSV file`);
    let e = a.statSync(this.source);
    if (e.size > t)
      throw new Error(`file-size-exceeds-limit: ${this.source} is too large, please limit to 50MB`);
    return e.size;
  }
  uploadToS3() {
    return u(this, null, function* () {
      if (!this.source || !this.destination)
        throw new Error("source or destination not set. Both must be defined to upload to S3");
      let t = a.createReadStream(this.source);
      if (!t.readable)
        throw new Error("failed-to-read-source: Make sure the provided file is readable");
      let e = this.fileSize();
      e > 100 * 1024 * 1024 && console.warn(`file size ${e} is larger than 100MB`);
      let { data: r, err: o } = I(this.destination, { file: true });
      if (o.toString().startsWith("invalid-s3-uri"))
        throw new Error(`failed-to-parse-s3-uri: ${o}`);
      r.file || (r.file = P.basename(this.source), console.warn("Destination filename not provided. Using source source basename" + r.file)), console.log(`uploading ${this.source} to ${this.destination}`);
      let l = yield g({ region: "us-east-2" }).send(new q({ Bucket: r.bucket, Key: r.key + r.file, Body: t })).catch((d) => {
        throw new Error(`failed-upload-s3: Error while uploading to S3: ${d}`);
      }).finally(() => {
        t.close();
      });
      if (l.$metadata.httpStatusCode !== 200)
        throw new Error(`failed-upload-s3: Error while uploading to S3: ${l.$metadata.httpStatusCode}`);
      if (!l.$metadata.requestId)
        throw new Error(`failed-upload-s3: Error while uploading to S3: ${l.$metadata.httpStatusCode}`);
      return l.$metadata.requestId;
    });
  }
  initMultipartUpload(t, e) {
    return u(this, null, function* () {
      let r = g({ credentials: y("default"), region: "us-east-2" }), o = new D({ Bucket: t, ContentEncoding: "utf8", ContentType: "text/csv", Key: e }), s = yield r.send(o);
      if (s.$metadata.httpStatusCode !== 200)
        throw new Error(`failed-multipart-upload: Error while creating multipart upload: ${s.UploadId} with status code ${s.$metadata.httpStatusCode}`);
      if (!s.UploadId)
        throw new Error(`failed-multipart-upload: Error while creating multipart upload: ${s.UploadId}`);
      return s.UploadId;
    });
  }
  exec(t, e) {
    if (console.log(`exec: ${t} ${e.join(" ")}`), this.pcount > 5)
      throw new Error(`too-many-processes: ${this.pcount}`);
    return this.pcount++, E(t, e, {});
  }
  promisifyProcessResult(t) {
    let e = { stdout: "", stderr: "", code: 0 };
    return new Promise((r, o) => {
      t.stdout.on("data", (s) => {
        e.stdout += s;
      }), t.stderr.on("data", (s) => {
        e.stderr += s;
      }), t.on("close", (s) => {
        e.code = s === 0 ? 0 : 1, r(e);
      }), t.on("error", (s) => {
        o(s);
      });
    });
  }
};
function A(i, t) {
  return new x(i, t);
}
var y = (i) => O({ profile: i, mfaCodeProvider: (t) => u(void 0, null, function* () {
  return t;
}) });
var S;
function g(i) {
  return S || (console.log("creating s3 client"), S = new k(i)), S;
}
function I(i, t) {
  let e = { file: t && t.file ? t.file : false };
  if (!i.startsWith("s3://") || i.split(":/")[0] !== "s3")
    throw new Error(`invalid-s3-uri: ${i}`);
  let r = "", o = { bucket: "", key: "", file: "" }, s = i.split(":/")[1], [l, ...d] = s.split("/").splice(1);
  return o.bucket = l, o.key = d.join("/"), d.forEach((n, c) => {
    if (c === d.length - 1) {
      let h = n.split(".").length;
      if (e.file && h === 1 && (r = `uri should be a given, given: ${i}`), !e.file && h === 1)
        return;
      if (!e.file && h > 1) {
        r = `Invalid S3 uri, ${i} should not end with a file name`;
        return;
      }
      !e.file && n.split(".")[1] !== "" && h > 1 && (r = `${i} should not be a file endpoint: ${n}`), h > 1 && n.split(".")[1] !== "" && (o.file = n);
    }
  }), { data: o, err: r };
}

// bin/cli.js
var usage = `
Usage:
  $muto [options]
  
  commands:
    upload	uploads the specified file to S3

  options:
    -h, --help      output usage information 
 -v, --version   output the version number
    -v, --version  output the version number

    -f --from       The path to the file to source from
    -t --to         The path to the file to target to
`;
var args = arg({
  "--help": Boolean,
  "--version": Boolean,
  "--from": String,
  "--to": String,
  "-h": "--help",
  "-v": "--version",
  "-f": "--from",
  "-t": "--to"
});
if (args["--help"]) {
  stdWrite(usage);
  process.exit(0);
}
if (args["--version"]) {
  stdWrite(`v0.1.0`);
  process.exit(0);
}
var commands = args["_"];
if (Object.keys(args).length === 1) {
  stdWrite(usage);
  process.exit(0);
}
var operations = {
  upload: "UPLOAD"
};
void function run() {
  return __async(this, null, function* () {
    let input = {
      from: "",
      to: ""
    };
    if (args["--from"]) {
      input.from = args["--from"];
    }
    if (args["--to"]) {
      input.to = args["--to"];
    }
    if (commands.indexOf("upload") == -1) {
      input.operation = operations.upload;
    }
    const d = A(input.from, {
      delimiter: ","
    });
    const confirmed = yield d.uploadToS3();
    if (!confirmed) {
      stdWrite("Upload cancelled");
      process.exit(0);
    }
    console.log(confirmed);
    stdWrite("Upload complete");
    process.exit(0);
  });
}();
function stdWrite(msg) {
  typeof msg === "string" ? process.stdout.write(`${msg} 
`) : process.stdout.write(`${JSON.stringify(msg, null, 2)}
`);
}
process.on("unhandledRejection", (reason, promise) => {
  stdWrite(reason);
  process.exit(1);
});
//# sourceMappingURL=cli.js.map
