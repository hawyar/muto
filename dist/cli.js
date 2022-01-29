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
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// bin/cli.js
import arg from "arg";

// dist/muto.js
import * as fs from "fs";
import { readFileSync, writeFileSync } from "atomically";
import { CreateMultipartUploadCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
import { AthenaClient } from "@aws-sdk/client-athena";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import { createInterface } from "readline";
import { join } from "path";
var __async2 = (__this, __arguments, generator) => {
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
var mlrCmd = join(process.cwd(), "node_modules", ".bin", "mlr@v6.0.0");
var credentials = (profile) => fromIni({
  profile,
  mfaCodeProvider: (mfaSerial) => __async2(void 0, null, function* () {
    return mfaSerial;
  })
});
var s3;
function s3Client(config) {
  if (!s3) {
    console.log("creating s3 client");
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
var _Dataset = class {
  constructor(source, options) {
    this.source = source;
    this.cached = false;
    this.destination = options.destination;
    this.options = options;
    this.env = this.determineSource();
    this.shape = {
      type: "",
      columns: [],
      header: false,
      encoding: "",
      bom: false,
      size: 0,
      spanMultipleLines: false,
      quotes: false,
      delimiter: "",
      errors: {},
      warnings: {},
      preview: [[]]
    };
    this.addedAt = new Date();
    this.state = "init";
    this.connector = null;
  }
  setDestination(destination) {
    this.destination = destination;
  }
  toJson() {
    return __async2(this, null, function* () {
      const write = fs.createWriteStream(this.destination);
      const json = this.exec(mlrCmd, ["--icsv", "--ojson", "clean-whitespace", "cat", this.source]);
      json.stdout.pipe(write);
      write.on("close", () => {
        console.log("\u{1F4DD} Dataset converted to JSON");
        return this.destination;
      });
      write.on("error", (err) => {
        throw new Error(err.message);
      });
      return this.destination;
    });
  }
  rowCount() {
    return __async2(this, null, function* () {
      const count = yield this.exec(mlrCmd, [`--ojson`, `count`, this.source]);
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
    return __async2(this, null, function* () {
      const res = yield this.exec(mlrCmd, [`--icsv`, `--ojson`, `head`, `-n`, `1`, this.source]);
      const colExec = yield this.promisifyProcessResult(res);
      if (colExec.code !== 0) {
        return null;
      }
      if (colExec.stderr) {
        throw new Error(colExec.stderr);
      }
      const columns = JSON.parse(colExec.stdout);
      if (columns.length === 0) {
        this.shape.header = false;
        return null;
      }
      this.shape.columns = Object.keys(columns[0]);
      this.shape.header = true;
      return this.shape.columns;
    });
  }
  formatValues() {
    return __async2(this, null, function* () {
      const res = yield this.exec(mlrCmd, [`--icsv`, `format-values`, this.source]);
      const formatVal = yield this.promisifyProcessResult(res);
      if (formatVal.code !== 0) {
        return null;
      }
      if (formatVal.stderr) {
        throw new Error(formatVal.stderr);
      }
      return this.shape.columns;
    });
  }
  preview(count = 20, streamTo) {
    return __async2(this, null, function* () {
      let write;
      const maxPreview = 1024 * 1024 * 10;
      const fsp = fs.promises;
      const stat = yield fsp.stat(this.source);
      if (streamTo && streamTo !== this.source && fs.createWriteStream(streamTo) instanceof fs.WriteStream || stat.size > maxPreview) {
        if (streamTo === void 0)
          throw new Error("stream-destination-undefined");
        write = fs.createWriteStream(streamTo);
        const previewExec2 = yield this.exec(mlrCmd, [`--icsv`, `--ojson`, `head`, `-n`, count.toString(), this.source]);
        previewExec2.stdout.pipe(write);
        console.warn(`\u{1F440} Preview saved to: ${streamTo}`);
        return streamTo;
      }
      const previewExec = yield this.exec(mlrCmd, [`--icsv`, `--ojson`, `head`, `-n`, count.toString(), this.source]);
      const prev = yield this.promisifyProcessResult(previewExec);
      if (prev.stderr) {
        throw new Error(prev.stderr);
      }
      if (prev.code !== 0) {
        throw new Error(`Error while executing mlr command`);
      }
      this.shape.preview = JSON.parse(prev.stdout);
      return this.shape.preview;
    });
  }
  detectShape() {
    return __async2(this, null, function* () {
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
      this.shape.size = stat.size;
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
      const mimeType = mimeRes.stdout.trim();
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
          const hasDigitInHeader = first.row.some((el) => isDigit.test(el));
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
      return shape;
    });
  }
  determineConnector() {
    const env2 = this.determineSource();
    if (env2 === "local") {
      const stream = fs.createReadStream(this.source);
      return stream;
    }
    if (env2 === "aws") {
      const client = s3Client({
        credentials: credentials("default"),
        region: "us-east-2"
      });
      return client;
    }
    throw new Error(`unsupported-source for: ${this.source}`);
  }
  determineSource() {
    if (this.source.startsWith("/") || this.source.startsWith("../") || this.source.startsWith("./")) {
      return "local";
    }
    if (this.source.startsWith("s3://")) {
      return "remote";
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
    return __async2(this, null, function* () {
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
    return __async2(this, null, function* () {
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
  exec(cmd, args2) {
    console.log(`exec: ${cmd} ${args2.join(" ")}`);
    return spawn(cmd, args2);
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
function createDataset(source, options) {
  const d = new _Dataset(source, options);
  Promise.all([d.detectShape(), d.determineSource(), d.determineConnector()]).then((val) => {
  }).catch((err) => {
    throw new Error(err);
  });
  return d;
}
var cache = function() {
  let cache2;
  function init() {
    const cachePath = path.join(process.cwd(), ".muto-cache");
    if (!fs.existsSync(cachePath)) {
      console.log("creating cache file at", cachePath);
      writeFileSync(cachePath, JSON.stringify({}));
    } else {
      console.log("loading cache from", cachePath);
    }
    return {
      init: new Date(),
      path: cachePath,
      get: (key) => {
        const file = readFileSync(cachePath);
        const cache3 = JSON.parse(file.toString());
        if (cache3[key].source !== key) {
          return void 0;
        }
        return cache3[key];
      },
      set: (key, value) => {
        const file = readFileSync(cachePath);
        const cache3 = JSON.parse(file.toString());
        if (cache3[key]) {
          return;
        }
        cache3[key] = value;
        writeFileSync(cachePath, JSON.stringify(cache3));
        return key;
      },
      has: (key) => {
        const file = readFileSync(cachePath);
        const cache3 = JSON.parse(file.toString());
        if (cache3[key]) {
          return true;
        }
        return false;
      },
      delete: (key) => {
        const file = readFileSync(cachePath);
        const cache3 = JSON.parse(file.toString());
        delete cache3[key];
        writeFileSync(cachePath, JSON.stringify(cache3));
      },
      clear: () => {
        writeFileSync(cachePath, JSON.stringify({}));
      },
      size: () => {
        const file = readFileSync(cachePath);
        const cache3 = JSON.parse(file.toString());
        return Object.keys(cache3).length;
      },
      keys: () => {
        const file = readFileSync(cachePath);
        const cache3 = JSON.parse(file.toString());
        return Object.keys(cache3);
      }
    };
  }
  return {
    getInstance: () => {
      if (!cache2) {
        cache2 = init();
      }
      return cache2;
    }
  };
}();

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
    const d = createDataset(input.from, {
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
