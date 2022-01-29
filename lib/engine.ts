import * as fs from "fs";
import {readFileSync, writeFileSync} from 'atomically';
import {CreateMultipartUploadCommand, PutObjectCommand, S3Client, S3ClientConfig} from "@aws-sdk/client-s3";
import {fromIni} from "@aws-sdk/credential-providers";
import {AthenaClient, AthenaClientConfig} from "@aws-sdk/client-athena";
import {ChildProcessWithoutNullStreams, spawn} from "child_process";
import os from "os";
import path from "path";
import {createInterface} from "readline";
import {
    Cache,
    connectorType,
    Dataset,
    DatasetOptions,
    datasetStateType,
    env,
    mlrCmd,
    ProcessResult,
    Shape
} from "./types"

const credentials = (profile: string) => fromIni({
    profile: profile,
    mfaCodeProvider: async (mfaSerial) => {
        return mfaSerial
    },
});

let s3: S3Client;
let athena: AthenaClient

/**
 * Creates a new S3 client if one already doesn't exist.
 *  @param {S3ClientConfig} config
 *  @returns {S3Client}
 */
function s3Client(config: S3ClientConfig): S3Client {
    if (!s3) {
        console.log('creating s3 client')
        s3 = new S3Client(config);
    }
    return s3;
}

/**
 * Creates a new athena client if one already doesn't exist.
 *  @param {AthenaClientConfig} config
 *  @returns {AthenaClient}
 */
function athenaClient(config: AthenaClientConfig): AthenaClient {
    if (!s3) {
        console.log('creating athena client')
        athena = new AthenaClient(config);
    }
    return athena;
}

// TODO: amke sure dataet is uploaded to s3,  prepare athena query, run athena query, create function query(``)


/**
 * Parses S3 (s3://) style URIs
 */
function parseS3Uri(
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

/**
 * Dataset represent a file for processing
 */
class _Dataset implements Dataset {
    source: string;
    destination: string;
    addedAt: Date;
    options: DatasetOptions;
    shape: Shape
    cached: boolean;
    state: datasetStateType
    connector: connectorType | null
    env: string

    constructor(source: string, options: DatasetOptions) {
        this.source = source;
        this.cached = false;
        this.destination = options.destination
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
        }
        this.addedAt = new Date();
        this.state = 'init'
        this.connector = null
    }

    setDestination(destination: string) {
        this.destination = destination
    }

    /**
     * Convert CSV to JSON
     * @return {Promise<string>} source of the dataset
     */
    async toJson(): Promise<string> {
        const write = fs.createWriteStream(this.destination)

        const json = this.exec(mlrCmd, ["--icsv", "--ojson", "clean-whitespace", "cat", this.source])
        json.stdout.pipe(write)

        write.on('close', () => {
            console.log("📝 Dataset converted to JSON")
            return this.destination
        })

        write.on('error', (err) => {
            throw new Error(err.message)
        })
        return this.destination
    }

    /**
     * Count number of rows
     * @return {Promise<string>} number of rows
     */
    async rowCount(): Promise<number> {
        const count = await this.exec(mlrCmd, [`--ojson`, `count`, this.source])

        const rowCountExec = await this.promisifyProcessResult(count)

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

        return r[0].count
    }

    /**
     * Extracts the header row from the dataset, defined columns
     * @return Promise<string[] | null> header row or null if no header
     */
    async getColumnHeader(): Promise<string[] | null> {
        const res = await this.exec(mlrCmd, [`--icsv`, `--ojson`, `head`, `-n`, `1`, this.source])

        const colExec = await this.promisifyProcessResult(res)

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

    async formatValues() {
        // --opprint format-values
        const res = await this.exec(mlrCmd, [`--icsv`, `format-values`, this.source])
        const formatVal = await this.promisifyProcessResult(res)

        if (formatVal.code !== 0) {
            return null
        }

        if (formatVal.stderr) {
            throw new Error(formatVal.stderr)
        }

        return this.shape.columns
    }

    /**
     * Extracts rows from the dataset for preview.
     * If the dataset is too large to preview then it will stream the result and return the file path
     * @param {number} count - number of rows to preview
     * @param {string} streamTo - path to the file to stream to
     * @return Promise<string[][] | string> - preview rows or path to the file the preview was streamed to
     */
    async preview(count = 20, streamTo?: string): Promise<string[][] | string> {
        let write: fs.WriteStream

        const maxPreview = 1024 * 1024 * 10

        const fsp = fs.promises
        const stat = await fsp.stat(this.source)

        if (streamTo && streamTo !== this.source && fs.createWriteStream(streamTo) instanceof fs.WriteStream || stat.size > maxPreview) {

            if (streamTo === undefined) throw new Error('stream-destination-undefined')
            write = fs.createWriteStream(streamTo)

            const previewExec = await this.exec(mlrCmd, [`--icsv`, `--ojson`, `head`, `-n`, count.toString(), this.source])

            previewExec.stdout.pipe(write)

            console.warn(`👀 Preview saved to: ${streamTo}`)
            return streamTo
        }

        const previewExec = await this.exec(mlrCmd, [`--icsv`, `--ojson`, `head`, `-n`, count.toString(), this.source])

        const prev = await this.promisifyProcessResult(previewExec)

        if (prev.stderr) {
            throw new Error(prev.stderr)
        }

        if (prev.code !== 0) {
            throw new Error(`Error while executing mlr command`)
        }

        this.shape.preview = JSON.parse(prev.stdout)
        return this.shape.preview
    }


    async detectShape(): Promise<Shape> {
        const path = this.source
        const shape: Shape = {
            type: '',
            size: 0,
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
            throw new Error(`path-doesnt-exists: ${path} ,provide a valid path to a CSV file`)
        }

        const stat = fs.statSync(path)
        this.shape.size = stat.size

        if (stat.size > 1024 * 1024 * 1024) {
            throw new Error(`file-size-exceeds-limit: ${path} is too large, please limit to under 1GB for now`)
        }

        if (!fs.existsSync(path)) {
            throw new Error(`${path} does not exist, provide a valid path to a CSV file`)
        }

        if (os.platform() === "win32") {
            // TODO: handle
            throw new Error(`scream`)
        }

        const mime = this.exec("file", [path, "--mime-type"])

        const mimeRes = await this.promisifyProcessResult(mime)

        if (mimeRes.stderr) {
            throw new Error(`failed-to-detect-mime-type: ${mimeRes.stderr}`)
        }

        if (mimeRes.code !== 0) {
            throw new Error(`failed-to-detect-mime-type: ${mimeRes.stderr}`)
        }

        const mimeType = mimeRes.stdout.trim()

        const readLine = createInterface({
            input: fs.createReadStream(path),
            crlfDelay: Infinity,
        });

        let count = 0;
        const max = 20;

        const first = {
            row: [''],
            del: "",
        };

        // hold the previous line while rl proceeds to next line using \r\n as a delimiter
        let previous = "";

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

                // assuming that numbers shouldn't start as column header
                const hasDigitInHeader = first.row.some((el) => isDigit.test(el));
                // if (hasDigitInHeader) {
                //     shape.header = false;
                //     shape.warnings["noHeader"] = `no header found`;
                //     count++;
                //     return;
                // }
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

    determineConnector(): connectorType {
        const env = this.determineSource();
        if (env === "local") {
            const stream = fs.createReadStream(this.source);
            return stream
        }

        if (env === "aws") {
            const client = s3Client({
                credentials: credentials("default"),
                region: "us-east-2",
            });
            return client
        }
        throw new Error(`unsupported-source for: ${this.source}`)
    }

    determineSource(): string {
        if (
            this.source.startsWith("/") ||
            this.source.startsWith("../") ||
            this.source.startsWith("./")
        ) {
            return "local";
        }

        if (this.source.startsWith("s3://")) {
            return "remote";
        }

        throw new Error(`invalid-source-type: ${this.source}`);
    }

    fileSize(): number {
        const max = 1024 * 1024 * 50

        if (!fs.existsSync(this.source)) {
            throw new Error(`path-doesnt-exists: ${this.source} ,provide a valid path to a CSV file`)
        }

        const stat = fs.statSync(this.source)

        if (stat.size > max) {
            throw new Error(`file-size-exceeds-limit: ${this.source} is too large, please limit to 50MB`)
        }
        return stat.size
    }

    async uploadToS3(): Promise<string> {
        if (!this.source || !this.destination) {
            throw new Error('source or destination not set. Both must be defined to upload to S3')
        }

        const fStream = fs.createReadStream(this.source)

        if (!fStream.readable) {
            throw new Error('failed-to-read-source: Make sure the provided file is readable')
        }

        const fSize = this.fileSize()

        if (fSize > 100 * 1024 * 1024) {
            //TODO: init multipart upload then upload parts
            console.warn(`file size ${fSize} is larger than 100MB`)
        }

        const {data: uri, err} = parseS3Uri(this.destination, {
            file: true,
        });

        if (err.toString().startsWith(`invalid-s3-uri`)) {
            throw new Error(`failed-to-parse-s3-uri: ${err}`)
        }

        if (!uri.file) {
            uri.file = path.basename(this.source)
            console.warn("Destination filename not provided. Using source source basename" + uri.file)
        }

        console.log(`uploading ${this.source} to ${this.destination}`);

        const s3 = s3Client({
            region: "us-east-2",
        })

        const res = await s3.send(new PutObjectCommand({
            Bucket: uri.bucket,
            Key: uri.key + uri.file,
            Body: fStream,
        })).catch(err => {
            throw new Error(`failed-upload-s3: Error while uploading to S3: ${err}`)
        }).finally(() => {
            fStream.close()
        })
        if (res.$metadata.httpStatusCode !== 200) {
            throw new Error(`failed-upload-s3: Error while uploading to S3: ${res.$metadata.httpStatusCode}`)
        }

        if (!res.$metadata.requestId) throw new Error(`failed-upload-s3: Error while uploading to S3: ${res.$metadata.httpStatusCode}`)
        return res.$metadata.requestId
    }

    /**
     * Initiates a multipart upload and returns an upload ID
     * @returns {string} uploadID
     * @private
     */
    async initMultipartUpload(
        bucket: string,
        key: string
    ): Promise<string> {

        const client = s3Client({
            credentials: credentials("default"),
            region: "us-east-2",
        });

        const command = new CreateMultipartUploadCommand({
            Bucket: bucket,
            ContentEncoding: "utf8",
            ContentType: "text/csv",
            Key: key,
        });

        const result = await client.send(command);

        if (result.$metadata.httpStatusCode !== 200) {
            throw new Error(`failed-multipart-upload: Error while creating multipart upload: ${result.UploadId} with status code ${result.$metadata.httpStatusCode}`)
        }

        if (!result.UploadId) {
            throw new Error(`failed-multipart-upload: Error while creating multipart upload: ${result.UploadId}`)
        }

        return result.UploadId
    }

    exec(cmd: string, args: string[]): ChildProcessWithoutNullStreams {
        console.log(`exec: ${cmd} ${args.join(' ')}`)
        return spawn(cmd, args)
    }

    promisifyProcessResult(child: ChildProcessWithoutNullStreams): Promise<ProcessResult> {
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
}

/**
 * Returns a new dataset
 * @param {string} source - Source of the dataset
 * @returns {Options} options - Options for the dataset
 */
export function createDataset(source: string, options: DatasetOptions): Dataset {
    const d = new _Dataset(source, options);
    Promise.all([d.detectShape(), d.determineSource(), d.determineConnector()]).then((val) => {
        // console.log(val)
    }).catch((err) => {
        throw new Error(err)
    })
    return d;
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

class Workflow {
    name: string;
    datasets: Map<string, Dataset>;
    readonly createdAt: Date;
    env: env;
    lcache: Cache | null

    constructor(name: string) {
        this.name = name;
        this.datasets = new Map();
        this.createdAt = new Date();
        this.env = 'local';
        this.lcache = null;
        // this.lcache = cache.getInstance()
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

        // if (this.lcache.has(source)) {
        //     return source
        // }
        const dataset = new _Dataset(source, options);

        this.datasets.set(source, dataset);
        return source
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
