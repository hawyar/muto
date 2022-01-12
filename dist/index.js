var $hIgQ1$fs = require("fs");
var $hIgQ1$awssdkcredentialproviders = require("@aws-sdk/credential-providers");
var $hIgQ1$awssdkclients3 = require("@aws-sdk/client-s3");
var $hIgQ1$os = require("os");
var $hIgQ1$readline = require("readline");
var $hIgQ1$child_process = require("child_process");

function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "createWorkflow", () => $661245fd40567e34$export$771cf478395a0d22);






const $661245fd40567e34$var$credentials = (profile)=>$hIgQ1$awssdkcredentialproviders.fromIni({
        profile: profile,
        mfaCodeProvider: async (mfaSerial)=>{
            return mfaSerial;
        }
    })
;
// Represents a workflow with a list of datasets in a local or cloud env
class $661245fd40567e34$var$Workflow {
    constructor(name){
        this.name = name;
        this.datasets = new Map();
        this.createdAt = new Date();
        this.env = 'local';
    }
    /**
     * Creates new dataset, a connector must be provided
     * @param source
     * @param options
     */  #newDataset(source, options, connector) {
        return {
            source: source,
            options: options,
            createdAt: new Date(),
            connector: connector
        };
    }
    /**
     * List datasets in the workflow
     * @param options
     * @returns
     */ list() {
        return Array.from(this.datasets.values());
    }
    /**
     * Adds a dataset to workflow
     * @param source
     * @param options
     * @returns
     */ add(source1, opt) {
        return new Promise((resolve, reject)=>{
            if (this.datasets.has(source1)) reject(new Error(`Dataset ${opt.destination} already exists in the workflow`));
            if (opt.destination === "") console.warn(`Dataset ${source1} does not have a destination`);
            if (opt.destination && opt.destination.startsWith("s3://")) {
                // const {data, err} = parseS3URI(opt.destination, {
                //     file: false,
                // });
                //
                // if (err) {
                //     reject(err);
                // }
                const conn = this.s3Connector({
                    credentials: $661245fd40567e34$var$credentials('default'),
                    region: 'us-east-2'
                });
                const dataset = this.#newDataset(source1, opt, conn);
                this.datasets.set(source1, dataset);
                resolve(dataset.source);
            }
            if (source1.startsWith("/") || source1.startsWith("../") || source1.startsWith("./")) {
                if (!source1.endsWith(".csv")) reject(new Error(`${source1} is not a CSV file`));
                const conn = $hIgQ1$fs.createReadStream(source1);
                const dataset = this.#newDataset(source1, opt, conn);
                this.datasets.set(source1, dataset);
                resolve(dataset.source);
            }
            reject(new Error(`Invalid source ${source1} type`));
        });
    }
    /**
     * Connects to given path directory in the filesystem
     * @param path
     * @returns {fs.Dirent[]}
     */ fsConnector(path) {
        return $hIgQ1$fs.readdirSync(path, {
            withFileTypes: true
        });
    }
    /**
     * Creates a new S3 client
     * @param opt - S3 client config
     * @returns S3Client
     */ s3Connector(opt) {
        if (!opt.region) opt.region = 'us-east-2';
        return new $hIgQ1$awssdkclients3.S3Client(opt);
    }
    // Early on we check the csv file for some attributes to determine the shape of the data
     #detectShape(d) {
        const shape = {
            type: '',
            columns: [
                ''
            ],
            header: false,
            encoding: 'utf-8',
            bom: false,
            spanMultipleLines: false,
            quotes: false,
            delimiter: ',',
            errors: {
            },
            warnings: {
            },
            preview: [
                [
                    ''
                ]
            ]
        };
        if (!$hIgQ1$fs.existsSync(d.source)) throw new Error(`${d.source} does not exist, provide a valid path to a CSV file`);
        if ($hIgQ1$os.platform() === "win32") {
            console.error(`handle windows later`);
            return shape;
        }
        const mime = $hIgQ1$child_process.spawn("file", [
            d.source,
            "--mime-type"
        ]);
        mime.stdout.on("data", (data)=>{
            const type = data.toString().split(":")[1].trim();
            if (type === "text/csv" || type === "text/plain") shape.type = type;
            else shape.errors["incorrectType"] = `${d.source} is not a CSV file`;
        });
        mime.on("close", (code)=>{
            if (code !== 0 || shape.type === "") console.warn("unable to use file() cmd");
        });
        const readLine = $hIgQ1$readline.createInterface({
            input: $hIgQ1$fs.createReadStream(d.source),
            crlfDelay: Infinity
        });
        let count = 0;
        const max = 20;
        // to store the column header if it exists for further checks
        const first = {
            row: [
                ''
            ],
            del: ""
        };
        // hold the previous line while rl proceeds to next line using \r\n as a delimiter
        let previous = "";
        // create an array of delimiter from supported delimiter
        const delimiters = [
            ",",
            ";",
            "\t",
            "|",
            ":",
            " ",
            "|"
        ];
        readLine.on("line", (current)=>{
            if (count === 0) {
                delimiters.forEach((d1)=>{
                    if (current.split(d1).length > 1) {
                        first.row = current.split(d1);
                        first.del = d1;
                    }
                });
                if (first.del === "" || first.row.length <= 1) {
                    shape.errors["unrecognizedDelimiter"] = `${d.source} does not have a recognized delimiter`;
                    shape.header = false;
                }
                const isDigit = /\d+/;
                // betting on numbers should not appear as header values
                const hasDigitInHeader = first.row.some((el)=>isDigit.test(el)
                );
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
                // if odd number of quotes on current line then there is a chance the record spans the next line
                const inlineQuotes = current.split(`"`).length - 1;
                if (previous) {
                    if (inlineQuotes % 2 !== 0) // TODO: make sure previous + current
                    // console.log(previous + l);
                    shape.spanMultipleLines = true;
                }
                // check if odd number of quotes and consider escaped quotes such as: "aaa","b""bb","ccc"
                if (inlineQuotes % 2 !== 0 && current.split(`""`).length - 1 !== 1) previous = current;
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
    /**
     * Parse (s3://) style uri
     */  #parseS3URI(uri, options1) {
        const opt = {
            file: options1 && options1.file ? options1.file : false
        };
        if (!uri.startsWith("s3://") || uri.split(":/")[0] !== "s3") throw new Error("Invalid S3 URI");
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
        keys.forEach((k, i)=>{
            if (i === keys.length - 1) {
                const last = k.split(".").length;
                if (opt.file && last === 1) err = `uri should be a given, given: ${uri}`;
                if (!opt.file && last === 1) return;
                if (!opt.file && last > 1) {
                    err = `Invalid S3 uri, ${uri} should not end with a file name`;
                    return;
                }
                if (!opt.file && k.split(".")[1] !== "" && last > 1) err = `${uri} should not be a file endpoint: ${k}`;
                if (last > 1 && k.split(".")[1] !== "") result.file = k;
            }
        });
        return {
            data: result,
            err: err
        };
    }
}
function $661245fd40567e34$export$771cf478395a0d22(name) {
    return new $661245fd40567e34$var$Workflow(name);
} // listFilesInS3(path: { bucket: string, key: string }) {
 //     try {
 //         const client = this.s3Connector({})
 //
 //         const command = new ListObjectsCommand({
 //             // eslint-disable-next-line no-mixed-spaces-and-tabs
 //             Bucket: bucket,
 //             Prefix: key,
 //         });
 //
 //         const response = client.send(command);
 //
 //         if (response.$metadata.httpStatusCode !== 200) {
 //             console.log(response.$metadata)
 //             return
 //         }
 //         return response.Contents
 //     } catch (err) {
 //         console.log(err)
 //     }
 // }
 // // get the first line (header column)
 // const rl = readline.createInterface({
 // 	input: d.options.connector,
 // 	crlfDelay: Infinity,
 // });
 // let count = 0;
 // // first 200 rows on open
 // let firstViewMax = 200;
 // rl.on("line", (line: any) => {
 // 	if (count === 0) {
 // 		d.options.columns = line.split(",");
 // 		count++;
 // 		return;
 // 	}
 // 	if (count > firstViewMax) {
 // 		rl.close();
 // 		return;
 // 	}
 // 	const row = line.split(",");
 // 	d.data.push(row);
 // 	count++;
 // }).on("close", () => {
 // 	rl.close();
 // });
 // }
 // this.datasets.set(d.source, d);
 // /**
 //  * Initiates a multipart upload and returns an upload ID
 //  * @returns {string} uploadID
 //  * @private
 //  */
 // initMultipartUpload(
 // 	d: Dataset,
 // 	bucket: string,
 // 	key: string
 // ): Promise<string> {
 // 	return new Promise((resolve, reject) => {
 // 		try {
 // 			const client = d.options.loader;
 // 			if (!(client instanceof S3Client))
 // 				throw new Error(`Invalid operation for ${d.source}`);
 // 			const command = new CreateMultipartUploadCommand({
 // 				Bucket: bucket,
 // 				ContentEncoding: "utf8",
 // 				ContentType: "text/csv",
 // 				Key: key,
 // 			});
 // 			client
 // 				.send(command)
 // 				.then((data) => {
 // 					if (data.UploadId) {
 // 						resolve(data.UploadId);
 // 					}
 // 					reject(new Error("Invalid upload ID"));
 // 				})
 // 				.catch((error) => {
 // 					reject(error);
 // 				})
 // 				.finally(() => {
 // 					console.log("initialized multipart upload");
 // 				});
 // 		} catch (err) {
 // 			reject(err);
 // 		}
 // 	});
 // }
 // /**
 //  * Saves the dataset to the storage (AWS S3 or Fs)
 //  * @param source
 //  * @param options
 //  * @private
 //  */
 // save(d: Dataset) {
 // 	return new Promise((resolve, reject) => {
 // 		try {
 // 			const size = fs.fstatSync(d.source).size;
 // 			if (size > 50000) {
 // 				console.log(
 // 					"file size is greater than threshold of 50MB, breaking into chunks"
 // 				);
 // 			}
 // 		} catch (err) {
 // 			reject(err);
 // 		}
 // 	});
 // }
 //
 // /**
 //  * Loads a CSV file into a dataset
 //  * @param path
 //  * @param options
 //  * @returns Promise<Dataset>
 //  */
 // CsvLoader(d: Dataset): Promise<Dataset> {
 //     return new Promise((resolve, reject) => {
 //         try {
 //             if (typeof d.source !== "string") {
 //                 reject(new Error("Not implemented"));
 //             }
 //
 //             if (
 //                 d.options.isRemote &&
 //                 d.source.startsWith("s3://") &&
 //                 d.source.split(":/")[0] === "s3"
 //             ) {
 //                 // remove the s3://
 //                 const src = d.source.split(":/")[1];
 //
 //                 const [bucket, ...keys] = src.split("/").splice(1);
 //
 //                 console.log(bucket);
 //                 console.log(keys.join("/"));
 //
 //                 // const command = new GetObjectCommand({
 //                 // 	Bucket: bucket,
 //                 // 	Key: key,
 //                 // 	Range: "bytes=0-1",
 //                 // });
 //
 //                 // const result = await s3.send(command);
 //
 //                 // if (result.$metadata.httpStatusCode !== 200) {
 //                 // 	reject(new Error("File could not be read"));
 //                 // }
 //
 //                 // if (result.ContentType !== "text/csv") {
 //                 // 	reject(new Error("File is not a CSV file"));
 //                 // }
 //
 //                 // if (result.ContentLength === 0) {
 //                 // 	reject(new Error("File is empty"));
 //                 // }
 //
 //                 // if (result.Body) {
 //                 // 	const columns = result.Body.toString();
 //
 //                 // 	console.log(columns);
 //
 //                 // 	resolve(d);
 //                 // }
 //             }
 //             resolve(d);
 //         } catch (err) {
 //             reject(err);
 //         }
 //     });
 // }




//# sourceMappingURL=index.js.map
