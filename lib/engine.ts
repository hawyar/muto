import * as fs from "fs";
import * as os from "os";
import {createInterface} from "readline"
import {spawn} from "child_process";
import {fromIni} from "@aws-sdk/credential-providers"
import * as fastq from "fastq";
import type {queueAsPromised} from "fastq";
import path from "path";
import {readFileSync, writeFileSync} from 'atomically';
import {
    S3Client,
    GetObjectCommand,
    S3ClientConfig,
    CreateMultipartUploadCommand
} from "@aws-sdk/client-s3";

type ShapeErrType = 'unrecognizedDelimiter' | 'noHeader' | 'invalidFileType' | 'rowWidthMismatch'

type supportedDelimiters = "," | ";" | "|" | ":" | "\t" | " " | "^" | "~" | "*" | "!" | "-" | "_" | "|"
type env = 'local' | 'aws'
type connectorType = S3Client | fs.ReadStream

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
    connector: connectorType;
}

// Options for a dataset
interface Options {
    destination: string;
    columns: Array<string>,
    header: boolean,
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
    connector: connectorType

    constructor(args: Args, connector: connectorType) {
        this.source = args.source;
        this.options = args.options;
        this.createdAt = new Date();
        this.connector = connector;
    }
}

interface Cache {
    path: string
    init: Date

    get(key: string): Dataset

    set(key: string, value: Dataset): void

    has(key: string): boolean

    delete(key: string): void

    clear(): void

    size(): number

    keys(): string[]
}


const queue = (function () {
    let q: queueAsPromised<Dataset>;

// this func is private by scope
    async function worker(arg: any) {
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
            get: (key: string): any => {
                const file = readFileSync(cachePath)
                const cache = JSON.parse(file.toString())

                if (cache[key] !== key) {
                    throw new Error('Cache key does not match')
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
                return cache[key] === key
            },
            delete: (key: string) => {
                const file = readFileSync(path.join(process.cwd(), '.muto-cache'))
                const cache = JSON.parse(file.toString())

                delete cache[key]

                writeFileSync(cachePath, JSON.stringify(cache))
            },
            clear: () => {
                const file = readFileSync(path.join(process.cwd(), '.muto-cache'))

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

// Represents a workflow with a list of datasets in a local or cloud env
class Workflow {
    name: string;
    datasets: Map<string, Dataset>;
    readonly createdAt: Date;
    env: env;
    queue: queueAsPromised<Args>
    cache: Cache

    constructor(name: string) {
        this.name = name;
        this.datasets = new Map();
        this.createdAt = new Date();
        this.env = 'local';
        this.queue = queue.getInstance();
        this.cache = cache.getInstance()
    }

    // async #worker({source, options}: Args): Promise<Dataset> {
    //     return new Promise((resolve, reject) => {
    //         if (this.datasets.has(source)) {
    //             reject(new Error(`Dataset ${options.destination} already exists in the workflow`).message);
    //         }
    //
    //         if (options.destination === "") {
    //             console.warn(`Dataset ${source} does not have a destination`);
    //         }
    //
    //         if (options.destination && options.destination.startsWith("s3://")) {
    //             const exists = this.#existsInS3(source);
    //
    //             if (exists) {
    //                 const conn = this.#s3Connector({
    //                     credentials: credentials("default"),
    //                     region: "us-east-2",
    //                 });
    //                 const dataset = new Dataset({source, options}, conn);
    //                 this.datasets.set(source, dataset);
    //                 resolve(dataset);
    //             }
    //             reject(new Error(`Dataset ${source} does not exist in S3`));
    //         }
    //
    //         console.log("passed me")
    //
    //         if (
    //             source.startsWith("/") ||
    //             source.startsWith("../") ||
    //             source.startsWith("./")
    //         ) {
    //             if (!source.endsWith(".csv")) {
    //                 reject(new Error(`${source} is not a CSV file`));
    //             }
    //
    //             const dataset = new Dataset({source, options}, this.#fsConnector(source));
    //
    //             this.queue.push({source, options})
    //             console.log("added to queue, curr len: ", this.queue.length)
    //             this.datasets.set(source, dataset);
    //             resolve(dataset);
    //         }
    //         reject(new Error(`Invalid source ${source} type`));
    //     });
    //
    // }

    /**
     * List datasets in the workflow
     * @param options
     * @returns
     */
    list(): Dataset[] {
        return Array.from(this.datasets.values());
    }

    /**
     * Removes dataset from workflow
     * @param source
     * @param options
     */
    remove(dataset: Dataset) {
        this.datasets.delete(dataset.source);
    }

    /**
     * Add dataset to workflow
     * @param source
     * @param options
     * @returns
     */
    add(source: string, opt: Options) {
        // add the dataset to the queue
        return new Promise((resolve, reject) => {
            this.queue.push({source, options: opt})
            console.log("added to queue, curr len: ", this.queue.length())
        })
        // return new Promise((resolve, reject) => {
        //     if (this.datasets.has(source)) {
        //         reject(new Error(`Dataset ${opt.destination} already exists in the workflow`).message);
        //     }
        //
        //     if (opt.destination === "") {
        //         console.warn(`Dataset ${source} does not have a destination`);
        //     }
        //
        //     if (opt.destination && opt.destination.startsWith("s3://")) {
        //         const exists = this.#existsInS3(source);
        //
        //         if (exists) {
        //             const conn = this.#s3Connector({
        //                 credentials: credentials("default"),
        //                 region: "us-east-2",
        //             });
        //             const dataset = new Dataset({source, options: opt}, conn);
        //
        //             this.datasets.set(source, dataset);
        //             resolve(dataset);
        //         }
        //         // push new dataset to the workflow
        //         reject(new Error(`Dataset ${source} does not exist in S3`));
        //     }
        //
        //     if (
        //         source.startsWith("/") ||
        //         source.startsWith("../") ||
        //         source.startsWith("./")
        //     ) {
        //         if (!source.endsWith(".csv")) {
        //             reject(new Error(`${source} is not a CSV file`));
        //         }
        //
        //         const dataset = new Dataset({source, options: opt}, this.#fsConnector(source));
        //         this.datasets.set(source, dataset);
        //         resolve(dataset);
        //     }
        //     reject(new Error(`Invalid source ${source} type`));
        // });
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

    /**
     * Returns a readable stream for a local file
     * @param path
     * @returns {fs.Dirent[]}
     */
    #fsConnector(path: string): fs.ReadStream {
        return fs.createReadStream(path);
    }

    /**
     * Returns a S3 client
     * @param opt - S3 client config
     * @returns S3Client
     */
    #s3Connector(opt: S3ClientConfig): S3Client {
        if (!opt.region) {
            opt.region = 'us-east-2';
        }
        return new S3Client(opt);
    }

    /**
     * Detects the shape of a CSV file to know as much as possible early on regardless of given options.
     * @param  {string} path - Path to the file
     * @returns S3Client
     */
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

    // check fileSize sync
    checkFileSize(path: string): number {
        const max = 1024 * 1024 * 50
        if (!fs.existsSync(path)) {
            throw new Error(`${path} does not exist, provide a valid path to a CSV file`)
        }
        const file = fs.statSync(path)


        file.blocks = Math.ceil(file.size / 512)

        return fs.statSync(path).size
    }

    // /**
    //  * Initiates a multipart upload and returns an upload ID
    //  * @returns {string} uploadID
    //  * @private
    //  */
    // #uploadToS3(d: Dataset) {
    //     // grab the connector of the dataset
    //     const c = d.connector;
    //
    //
    // }

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
                    throw new Error(`Invalid operation for ${d.source}`);

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

    /**
     * Parse (s3://) style uri
     */
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
            throw new Error("Invalid S3 URI");
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

