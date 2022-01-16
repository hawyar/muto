import * as fs from "fs";
import {createInterface, Interface} from "readline";
import path from "path";
import {readFileSync, writeFileSync} from 'atomically';
import {CreateMultipartUploadCommand, GetObjectCommand, S3Client, S3ClientConfig} from "@aws-sdk/client-s3";
import {fromIni} from "@aws-sdk/credential-providers";
import {ChildProcessWithoutNullStreams, spawn} from "child_process";
import os from "os";

enum Delimiters {
    COMMA = ",",
    SEMICOLON = ";",
    PIPE = "|",
    COLON = ":",
    TAB = "\t",
    SPACE = " ",
    TILDE = "~",
    DASH = "-",
    UNDERSCORE = "_"
}


type env = 'local' | 'remote'
type connectorType = S3Client | fs.ReadStream


// TODO: better error message for errors in transform
type datasetStateType = 'init' | 'transforming' | 'uploading' | 'cancelled' | 'uploaded' | 'ready'
type ShapeErrType = 'unrecognizedDelimiter' | 'noHeader' | 'invalidFileType' | 'rowWidthMismatch'


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

interface Dataset {
    source: string
    cached: boolean
    options: DatasetOptions;
    destination: string
    shape: Shape
    createdAt: Date;
    state: datasetStateType
    connector: connectorType;
}

interface DatasetOptions {
    destination: string;
    columns: Array<string>,
    header: boolean,
    quotes: boolean,
    transform: (row: object) => object
    delimiter: Delimiters
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

type ProcessResult = {
    stdout: string,
    stderr: string,
    code: number
}


const credentials = (profile: string) => fromIni({
    profile: profile,
    mfaCodeProvider: async (mfaSerial) => {
        return mfaSerial
    },
});


const mlrCmd = path.join(process.cwd(), 'node_modules', '.bin', 'mlr@v6.0.0')


class Dataset {
    source: string
    destination: string
    _rowsCount: number
    options: DatasetOptions
    createdAt: Date
    shape: Shape
    state: datasetStateType
    processCount: number
    cached: boolean

    constructor(source: string, options: DatasetOptions) {
        this.source = source;
        this.cached = false;
        this._rowsCount = 0;
        this.destination = options.destination || process.cwd()
        this.options = options;
        this.shape = {
            type: '',
            columns: [],
            header: false,
            encoding: '',
            bom: false,
            spanMultipleLines: false,
            quotes: false,
            delimiter: '',
            errors: {},
            warnings: {},
            preview: []
        }
        this.createdAt = new Date();
        this.state = 'init'
        this.processCount = 0
    }

    async toJson(): Promise<string> {
        const write = fs.createWriteStream(this.destination)

        const json = this.#exec(mlrCmd, ["--icsv", "--ojson", "clean-whitespace", "cat", this.source])

        json.stdout.pipe(write)

        return new Promise((resolve, reject) => {
            write.on('close', () => {
                resolve(this.source)
            })
            write.on('error', (err) => {
                reject(err)
            })
        })
    }

    async rowsCount(): Promise<number> {
        const res = await this.#exec(mlrCmd, [`--ojson`, `count`, this.source])

        const rowCountExec = await this.#promisifyProcessResult(res)

        if (rowCountExec.code !== 0) {
            throw new Error(`Error while counting rows: ${rowCountExec.stderr}`)
        }

        if (rowCountExec.stderr) {
            throw new Error(rowCountExec.stderr)
        }

        const r = JSON.parse(rowCountExec.stdout)

        if (r.length === 0) {
            throw new Error('No rows found')
        }
        this._rowsCount = r[0].count
        return r[0].count
    }

    async columns(): Promise<string[] | null> {
        const res = await this.#exec(mlrCmd, [`--icsv`, `--ojson`, `head`, `-n`, `1`, this.source])

        const colExec = await this.#promisifyProcessResult(res)

        if (colExec.code !== 0) {
            return null
        }

        if (colExec.stderr) {
            throw new Error(colExec.stderr)
        }
        const columns = JSON.parse(colExec.stdout)


        if (columns.length === 0) {
            this.shape.header = false
            return null
        }

        this.shape.columns = Object.keys(columns[0])
        this.shape.header = true

        return this.shape.columns
    }

    async preview(count: number, streamTo?: string): Promise<string[][] | string> {

        let write: fs.WriteStream

        const maxPreview = 1024 * 1024 * 10

        const fsp = fs.promises
        const stat = await fsp.stat(this.source)

        if (streamTo && streamTo !== this.source && fs.createWriteStream(streamTo) instanceof fs.WriteStream || stat.size > maxPreview) {
            try {
                if (streamTo === undefined) throw new Error('stream-destination-undefined')
                write = fs.createWriteStream(streamTo)
            } catch (err) {
                throw new Error(`${streamTo} is not writable`)
            }

            const previewExec = await this.#exec(mlrCmd, [`--icsv`, `--ojson`, `head`, `-n`, count.toString(), this.source])
            previewExec.stdout.pipe(write)

            console.warn(`👀 Preview saved to: ${streamTo}`)
            return streamTo
        }

        const previewExec = await this.#exec(mlrCmd, [`--icsv`, `--ojson`, `head`, `-n`, count.toString(), this.source])

        const prev = await this.#promisifyProcessResult(previewExec)

        if (prev.stderr) {
            throw new Error(prev.stderr)
        }

        if (prev.code !== 0) {
            throw new Error(`Error while executing mlr command`)
        }

        const parsed = JSON.parse(prev.stdout)
        this.shape.preview = parsed

        return this.shape.preview
    }

    #promisifyProcessResult(child: ChildProcessWithoutNullStreams): Promise<ProcessResult> {
        const result: ProcessResult = {
            stdout: '',
            stderr: '',
            code: 0
        }

        return new Promise((resolve, reject) => {
            child.stdout.on('data', (data) => {
                result.stdout += data
            })

            child.stderr.on('data', (data) => {
                result.stderr += data
            })

            child.on('close', (code) => {
                result.code = code === 0 ? 0 : 1
                resolve(result)
            })

            child.on('error', (err) => {
                reject(err)
            })
        })
    }


    #exec(cmd: string, args: string[]): ChildProcessWithoutNullStreams {
        this.processCount++
        return spawn(cmd, args)
    }

    async #fileType(): Promise<void> {
        const path = this.source;

        if (!fs.existsSync(path)) {
            throw new Error(`${path} does not exist, provide a valid path to a CSV file`)
        }

        if (os.platform() === "win32") {
            // TODO: handle
            return;
        }

        const mime = this.#exec("file", [path, "--mime-type"])

        mime.stdout.on("data", (data) => {
            const type = data.toString().split(":")[1].trim();

            if (type === "text/csv" || type === "text/plain") {
                this.shape.type = type;
            } else {
                this.shape.errors["incorrectType"] = `${path} is not a CSV file`;
            }
        });

        mime.stderr.on("error", (err) => {
            console.warn(err);
        });

        mime.on("close", (code) => {
            if (code !== 0 || this.shape.type === "") {
                console.warn("unable to use file() cmd");
            }
        });
    }
}


const cache = (function (): { getInstance: () => Cache } {
    let cache: Cache;

    function init() {
        const cachePath = path.join(process.cwd(), '.muto-cache')

        if (!fs.existsSync(cachePath)) {
            console.log('creating cache file at', cachePath)
            writeFileSync(cachePath, JSON.stringify({}))
        } else {
            console.log('loading cache from', cachePath)
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
            set: (key: string, value: Dataset): string | void => {
                const file = readFileSync(cachePath)
                const cache = JSON.parse(file.toString())

                if (cache[key]) {
                    return
                }

                cache[key] = value
                writeFileSync(cachePath, JSON.stringify(cache))
                return key
            },
            has: (key: string): boolean => {
                const file = readFileSync(cachePath)
                const cache = JSON.parse(file.toString())

                if (cache[key]) {
                    return true
                }
                return false
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
        readline(): Promise<Interface> {
            return new Promise((resolve, reject) => {
                const stream = fs.createReadStream(filePath);
                stream.on('error', (err) => {
                    reject(err);
                });
                stream.on('open', () => {
                    const rl = createInterface({
                        input: stream,
                        crlfDelay: Infinity
                    });
                    resolve(rl);
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
    lcache: Cache

    constructor(name: string) {
        this.name = name;
        this.datasets = new Map();
        this.createdAt = new Date();
        this.env = 'local';
        this.lcache = cache.getInstance()
    }

    list(): Dataset[] {
        return Array.from(this.datasets.values());
    }

    remove(dataset: Dataset) {
        this.datasets.delete(dataset.source);
    }

    async add(source: string, options: DatasetOptions): Promise<string> {
        if (options.destination === "") {
            console.warn(`destination-not-provided: provide a destination for ${source}`);
        }

        if (this.lcache.has(source)) {
            return source
        }

        const dataset = new Dataset(source, options);

        const defaultPreviewCount = 10

        await Promise.all([dataset.columns(), dataset.preview(defaultPreviewCount), dataset.toJson()]);

        console.log(dataset);
        this.datasets.set(source, dataset);
        this.lcache.set(source, dataset)
        return source
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
function createWorkflow(name: string): Workflow {
    return new Workflow(name);
}


/**
 * Returns a new dataset
 * @param {string} name - Source of the dataset
 * @returns {Options} - Options for the dataset
 */
function createDataset(source: string, options: DatasetOptions): Dataset {
    return new Dataset(source, options);
}


export {
    createDataset,
    createWorkflow,
}