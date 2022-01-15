import * as fs from "fs";
import * as os from "os";
import {createInterface} from "readline"
import {spawn} from "child_process";
import {fromIni} from "@aws-sdk/credential-providers"
import * as fastq from "fastq";
// import type {queueAsPromised} from "fastq";
import path from "path";
import {readFileSync, writeFileSync} from 'atomically';
import {
    S3Client,
    GetObjectCommand,
    S3ClientConfig,
    CreateMultipartUploadCommand
} from "@aws-sdk/client-s3";

// type ShapeErrType = 'unrecognizedDelimiter' | 'noHeader' | 'invalidFileType' | 'rowWidthMismatch'

type supportedDelimiters = "," | ";" | "|" | ":" | "\t" | " " | "^" | "~" | "*" | "!" | "-" | "_"
type env = 'local' | 'remote'
type connectorType = S3Client | fs.ReadStream


// TODO: better error message for errors happening in transform
type datasetStateType = 'init' | 'transforming' | 'uploading' | 'cancelled' | 'uploaded' | 'ready'

// Shape of a dataset object
interface Shape {
    type: string,
    columns: Array<string>,
    header: boolean,
    encoding: string,
    bom: boolean,
    spanMultipleLines: boolean,
    quotes: boolean,
    delimiter: string,
    errors: { [key: string]: string }
    warnings: { [key: string]: string },
    preview: string[][],
}


// Dataset represents a file from a supported a data source
interface Dataset {
    source: string
    options: Options;
    shape?: Shape
    data?: string[][];
    createdAt: Date;
    state: datasetStateType
    connector: connectorType;
}

// Options for a dataset
interface Options {
    destination: string;
    columns: Array<string>,
    header: boolean,
    transform: (row: object) => object
    bom: boolean,
    delimiter: supportedDelimiters
}

type Args = {
    source: string,
    options: Options
}


const credentials = (profile: string) => fromIni({
    profile: profile,
    mfaCodeProvider: async (mfaSerial) => {
        return mfaSerial
    },
});

class Dataset {
    source: string
    options: Options
    createdAt: Date
    state: datasetStateType

    constructor({source, options}: Args) {
        this.source = source;
        this.options = options;
        this.createdAt = new Date();
        this.state = 'init'
    }
}

interface Cache {
    path: string
    init: Date

    get(key: string): Dataset | undefined

    set(key: string, value: Dataset): void

    has(key: string): boolean

    delete(key: string): void

    clear(): void

    size(): number

    keys(): string[]
}

const queue = (function () {
    let q: fastq.queueAsPromised<Args, void>;

    async function worker(arg: Args) {
        console.log(arg)
    }

    return {
        getInstance: () => {
            if (!q) {
                q = fastq.promise(worker, 10)
            }
            return q;
        }
    }
})();

const cache = (function (): { getInstance: () => Cache } {
    let cache: Cache;

    function init() {
        const cachePath = path.join(process.cwd(), '.muto-cache')

        if (!fs.existsSync(cachePath)) {
            writeFileSync(cachePath, JSON.stringify({}))
        }

        return {
            init: new Date(),
            path: cachePath,
            get: (key: string): Dataset | undefined => {
                const file = readFileSync(cachePath)
                const cache = JSON.parse(file.toString())

                if (cache[key].source !== key) {
                    return undefined
                }
                return cache[key]
            },
            set: (key: string, value: Dataset): string => {
                const file = readFileSync(cachePath)
                const cache = JSON.parse(file.toString())

                cache[key] = value
                writeFileSync(cachePath, JSON.stringify(cache))
                return key
            },
            has: (key: string): boolean => {
                const file = readFileSync(cachePath)
                const cache = JSON.parse(file.toString())
                return cache[key].source === key
            },
            delete: (key: string) => {
                const file = readFileSync(cachePath)
                const cache = JSON.parse(file.toString())

                delete cache[key]

                writeFileSync(cachePath, JSON.stringify(cache))
            },
            clear: () => {
                writeFileSync(cachePath, JSON.stringify({}))
            },
            size: () => {
                const file = readFileSync(cachePath)
                const cache = JSON.parse(file.toString())
                return Object.keys(cache).length
            },
            keys: () => {
                const file = readFileSync(cachePath)
                const cache = JSON.parse(file.toString())
                return Object.keys(cache)
            }
        }
    }

    return {
        getInstance: () => {
            if (!cache) {
                cache = init()
            }
            return cache
        }
    }
})()

function s3Connector(config: S3ClientConfig) {
    const client = new S3Client(config);
    return Object.freeze({
        getObject: (command: GetObjectCommand) => client.send(command),
        createMultipartUpload: (command: CreateMultipartUploadCommand) => client.send(command),
    });
}

function fsConnector(filePath: string) {
    return Object.freeze({
        readStream(): Promise<fs.ReadStream> {
            return new Promise((resolve, reject) => {
                const stream = fs.createReadStream(filePath);
                stream.on('error', (err) => {
                    reject(err);
                });
                stream.on('open', () => {
                    resolve(stream);
                });
            });
        },
        writeStream(): Promise<fs.WriteStream> {
            return new Promise((resolve, reject) => {
                const stream = fs.createWriteStream(filePath);
                stream.on('error', (err) => {
                    reject(err);
                });
                stream.on('open', () => {
                    resolve(stream);
                });
            });
        },
    })
}


class Workflow {
    name: string;
    datasets: Map<string, Dataset>;
    readonly createdAt: Date;
    env: env;
    // queue: queueAsPromised<Args>
    lcache: Cache

    constructor(name: string) {
        this.name = name;
        this.datasets = new Map();
        this.createdAt = new Date();
        this.env = 'local';
        // this.queue = queue.getInstance();
        this.lcache = cache.getInstance()
    }

    // async #worker({source, options}: Args): Promise<Dataset> {}

    list(): Dataset[] {
        return Array.from(this.datasets.values());
    }

    remove(dataset: Dataset) {
        this.datasets.delete(dataset.source);
    }

    add(source: string, options: Options): Promise<string> {
        return new Promise((resolve, reject) => {
            if (options.destination === "") {
                console.warn(`dataset-source-not-provided: Dataset ${source} does not have a destination`);
            }

            if (this.lcache.has(source)) {
                console.log("cache hit")
                const dataset = this.lcache.get(source)
                resolve(source)
            }

            const type = this.#determineSource(source);

            if (type === 'local') {
                const fsConn = fsConnector(source)
                const dataset = new Dataset({source, options});

                this.lcache.set(source, dataset);
                resolve(source);
            }

            // if (type === "remote") {
            //     const exists = this.#existsInS3(source);
            //
            //     if (exists) {
            //
            //         const conn = s3Connector({
            //             credentials: credentials("default"),
            //             region: "us-east-2",
            //         });
            //         const dataset = new Dataset({source, options}, conn);
            //
            //         this.datasets.set(source, dataset);
            //         resolve(source);
            //     }
            // }
        });
    }

    /**
     * Checks if file exists in a S3 bucket
     * @param source
     * @param options
     * @returns
     */
    #existsInS3(source: string): boolean {
        const {data, err} = this.#parseS3URI(source, {
            file: true,
        });

        if (err || !data.file) {
            console.error(`Invalid S3 URI: ${source}, URI must point to a file`);
            return false;
        }

        const conn = this.#s3Connector({
            credentials: credentials("default"),
            region: "us-east-2",
        });

        const getObjectCommand = new GetObjectCommand({
            Bucket: data.bucket,
            Key: data.file,
        });

        conn.send(getObjectCommand).then((res) => {
                if (res.$metadata.httpStatusCode === 200 && res.ContentType === "text/csv") {
                    return true
                }
                return false
            }
        ).catch((err) => {
            console.error(err);
            return false;
        });
        return false
    }

    #determineSource(source: string): string {
        if (
            source.startsWith("/") ||
            source.startsWith("../") ||
            source.startsWith("./")
        ) {
            return "local";
        }

        if (source.startsWith("s3://")) {
            return "s3";
        }

        throw new Error(`invalid-source-type: ${source}`);
    }

    /**
     * Returns a readable stream for a local file
     * @param path
     * @returns {fs.Dirent[]}
     */
    #fsConnector(path: string): fs.ReadStream {
        return fs.createReadStream(path);
    }

    #s3Connector(opt: S3ClientConfig): S3Client {
        if (!opt.region) {
            opt.region = 'us-east-2';
        }
        return new S3Client(opt);
    }

    #detectShape(path: string): Shape {
        const shape: Shape = {
            type: '',
            columns: [''],
            header: false,
            encoding: 'utf-8',
            bom: false,
            spanMultipleLines: false,
            quotes: false,
            delimiter: ',',
            errors: {},
            warnings: {},
            preview: [['']],
        };

        if (!fs.existsSync(path)) {
            throw new Error(`${path} does not exist, provide a valid path to a CSV file`)
        }

        if (os.platform() === "win32") {
            console.error(`handle windows later`)
            return shape;
        }

        const mime = spawn("file", [path, "--mime-type"])

        mime.stdout.on("data", (data) => {
            const type = data.toString().split(":")[1].trim();

            if (type === "text/csv" || type === "text/plain") {
                shape.type = type;
            } else {
                shape.errors["incorrectType"] = `${path} is not a CSV file`;
            }
        });

        mime.on("close", (code) => {
            if (code !== 0 || shape.type === "") {
                console.warn("unable to use file() cmd");
            }
        });

        const readLine = createInterface({
            input: fs.createReadStream(path),
            crlfDelay: Infinity,
        });

        let count = 0;
        const max = 20;

        // to store the column header if it exists for further checks
        const first = {
            row: [''],
            del: "",
        };

        // hold the previous line while rl proceeds to next line using \r\n as a delimiter
        let previous = "";

        // create an array of delimiter from supported delimiter
        const delimiters = [",", ";", "\t", "|", ":", " ", "|"];

        readLine.on("line", (current) => {
            if (count === 0) {
                delimiters.forEach((d) => {
                    if (current.split(d).length > 1) {
                        first.row = current.split(d)
                        first.del = d;
                    }
                });

                if (first.del === "" || first.row.length <= 1) {
                    shape.errors["unrecognizedDelimiter"] = `${path} does not have a recognized delimiter`;
                    shape.header = false;
                }

                const isDigit = /\d+/;

                // betting on numbers should not appear as header values
                const hasDigitInHeader = first.row.some((el) => isDigit.test(el));

                if (hasDigitInHeader) {
                    shape.header = false;
                    shape.warnings["noHeader"] = `no header found`;
                    count++;
                    return;
                }

                shape.header = true;
                shape.delimiter = first.del;
                shape.columns = first.row;
            }

            if (count > 0 && count < max) {
                // there is a chance the record spans next line
                const inlineQuotes = current.split(`"`).length - 1;

                if (previous) {
                    if (inlineQuotes % 2 !== 0) {
                        // TODO: make sure previous + current
                        // console.log(previous + l);
                        shape.spanMultipleLines = true;
                    }
                }
                // if odd number of quotes and consider escaped quotes such as: "aaa","b""bb","ccc"
                if (
                    inlineQuotes % 2 !== 0 &&
                    current.split(`""`).length - 1 !== 1
                ) {
                    previous = current;
                }

                const width = current.split(first.del).length;

                if (width !== first.row.length) {
                    shape.errors['rowWidthMismatch'] = `row width mismatch`;
                    return;
                }
                shape.preview.push(current.split(first.del));
            }
            count++;
        });
        return shape;
    }

    #checkFileSize(path: string): number {
        const max = 1024 * 1024 * 50
        if (!fs.existsSync(path)) {
            throw new Error(`path-doesnt-exists: ${path} ,provide a valid path to a CSV file`)
        }
        const file = fs.statSync(path)

        if (file.size > max) {
            throw new Error(`file-size-exceeds-limit: ${path} is too large, please limit to 50MB`)
        }
        return fs.statSync(path).size
    }

    /**
     * Initiates a multipart upload and returns an upload ID
     * @returns {string} uploadID
     * @private
     */
    #initMultipartUpload(
        d: Dataset,
        bucket: string,
        key: string
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const conn = this.#s3Connector({
                    credentials: credentials("default"),
                    region: "us-east-2",
                });

                if (!(conn instanceof S3Client))
                    // TODO: dont throw here, throw in the caller
                    throw new Error(`invalid-operation: Invalid operation for ${d.source}`);

                const command = new CreateMultipartUploadCommand({
                    Bucket: bucket,
                    ContentEncoding: "utf8",
                    ContentType: "text/csv",
                    Key: key,
                });

                conn
                    .send(command)
                    .then((data) => {
                        if (data.UploadId) {
                            resolve(data.UploadId);
                        }
                        reject(new Error("noop"))
                    })
                    .catch((error) => {
                        reject(error);
                    })
                    .finally(() => {
                        console.log("init multipart upload");
                    });
            } catch (err) {
                reject(err);
            }
        });
    }

    #parseS3URI(
        uri: string,
        options: {
            file: boolean;
        }
    ): {
        data: {
            bucket: string;
            key: string;
            file: string;
        };
        err: string;
    } {
        const opt = {
            file: options && options.file ? options.file : false,
        };

        if (!uri.startsWith("s3://") || uri.split(":/")[0] !== "s3") {
            throw new Error(`invalid-s3-uri: ${uri}`);
        }

        let err = "";

        const result = {
            bucket: "",
            key: "",
            file: "",
        };

        const src = uri.split(":/")[1];
        const [bucket, ...keys] = src.split("/").splice(1);

        result.bucket = bucket;
        result.key = keys.join("/");

        keys.forEach((k, i) => {
            if (i === keys.length - 1) {
                const last = k.split(".").length;
                if (opt.file && last === 1) err = `uri should be a given, given: ${uri}`;

                if (!opt.file && last === 1) return;

                if (!opt.file && last > 1) {
                    err = `Invalid S3 uri, ${uri} should not end with a file name`;
                    return;
                }

                if (!opt.file && k.split(".")[1] !== "" && last > 1)
                    err = `${uri} should not be a file endpoint: ${k}`;

                if (last > 1 && k.split(".")[1] !== "") result.file = k;
            }
        });
        return {
            data: result,
            err: err,
        };
    }
}

/**
 * Returns a new workflow
 * @param {string} name - Name of the workflow
 * @returns {Workflow} - New workflow
 */
export function createWorkflow(name: string): Workflow {
    return new Workflow(name);
}