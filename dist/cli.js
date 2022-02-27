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
import arg from "arg";
import { createCatalog } from "../dist/muto.js";
const usage = `
Usage:
  $muto [options]
  
  commands:
    upload    uploads the specified file to S3

  options:
    -v, --version  current version

    -f --from      Path of the file to source from
    -t --to        Destination path of where to save the output to
`;
const args = arg({
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
const commands = args["_"];
if (Object.keys(args).length === 1) {
  stdWrite(usage);
  process.exit(0);
}
const operations = {
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
    const dataset = yield createCatalog(input.from, {
      name: "albums",
      destination: "s3://hwyr-cms/testme/albums.csv",
      output: "json"
    });
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
