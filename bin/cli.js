#!/usr/bin/env node
const arg = require("arg");
const pkg = require("../package.json");
const fs = require("fs/promises");
const {createWorkflow} = require("../dist/index")
const path = require("path");

const usage = `
Usage:
  ${pkg.name} [options]
  
  commands:
  	upload	uploads the specified directory to S3

  options:
    -h, --help      output usage information \n -v, --version   output the version number
    -v, --version  output the version number
    
`;

const args = arg({
    "--help": Boolean,
    "--version": Boolean,
    "--from": String,
    "--to": String,

    // aliases
    "-h": "--help",
    "-v": "--version",
    "-f": "--from",
    "-t": "--to",
});

if (args["--help"]) {
    stdWrite(usage);
    process.exit(0);
}

if (args["--version"]) {
    stdWrite(`muto - v${pkg.version}`);
    process.exit(0);
}

const commands = args["_"];

if (Object.keys(args).length === 1) {
    stdWrite(usage);
    process.exit(0);
}

const operations = {
    upload: "UPLOAD",
};

void (async function run() {
    let config = {
        operation: "UPLOAD",
        from: "",
        to: "",
    };

    if (commands.indexOf("upload") !== -1) {
        config.operation = operations.upload;
    }

    if (!args["--from"]) {
        stdWrite(
            `Error: no source given for operation, provide a valid source path \nExample: \n \t File system: ./my-datasets  \n \t AWS S3: s3://my-bucket/datasets/
			`
        );
        process.exit(1);
    }

    if (!args["--to"]) {
        stdWrite(
            `Error: no destination given for operation, provide a valid destination path \nExample: \n \t File system: ./my-datasets  \n \t AWS S3: s3://my-bucket/datasets/
			`
        );
        process.exit(1);
    }

    config.from = args["--from"];
    config.to = args["--to"];

    const w = createWorkflow("my_etl");

    // if fs and not dir throw before initializing engine

    if (
        config.from.startsWith("/") ||
        config.from.startsWith("./") ||
        config.from.startsWith("../")
    ) {
        const isDir = await fs
            .stat(config.from)
            .then((stat) => stat.isDirectory())
            .catch((err) => {
                stdWrite("Error: given source is not a valid directory");
                process.exit(1);
            });

        if (!isDir) {
            stdWrite(
                "Error: unable to open source, please make sure source is a valid path"
            );
            process.exit(1);
        }

        stdWrite(`Created new worklow`);

        const files = await fs
            .readdir(config.from)
            .then((files) => files)
            .catch((err) => {
                stdWrite(err);
                process.exit(1);
            });

        for (const file of files) {
            if (!file.endsWith(".csv")) return;
            const src = "./" + path.normalize(path.join(config.from, file));

            stdWrite(`Adding ${src} to workflow`);
            const d1 = await w
                .add(src, {
                    delimiter: ",",
                    quote: '"',
                    header: true,
                })
                .catch((err) => {
                    console.log(err);
                });

            console.log(d1);
        }
    }

    process.exit(0);
})();

function stdWrite(msg) {
    typeof msg === "string"
        ? process.stdout.write(`${msg} \n`)
        : process.stdout.write(`${JSON.stringify(msg, null, 2)}\n`);
}

// catch unhandled promises
process.on("unhandledRejection", (reason, promise) => {
    stdWrite(reason);
    process.exit(1);
});