import {S3Client} from "@aws-sdk/client-s3";
import {join} from "path";
import fs from "fs";
import {ChildProcessWithoutNullStreams,} from "child_process";

export enum Delimiter {
    COMMA = ",",
    TAB = "\t",
    SPACE = " ",
    PIPE = "|",
    SEMICOLON = ";",
    COLON = ":",
    NONE = "",
}

export const mlr = join(process.cwd(), 'node_modules', '.bin', 'mlr@v6.0.0')
export const sqlparser = join(process.cwd(), 'node_modules', '.bin', "sqlparser@v0.1.4")

export type env = 'local' | 'aws'
export type connectorType = S3Client | fs.ReadStream
export type loaderType = S3Client | fs.ReadStream

// TODO: better error message for errors in transform
export type datasetStateType = 'init' | 'transforming' | 'uploading' | 'cancelled' | 'uploaded' | 'ready'
// type ShapeErrType = 'unrecognizedDelimiter' | 'noHeader' | 'invalidFileType' | 'rowWidthMismatch'

export type Shape = {
    type: string,
    columns: Array<string>,
    header: boolean,
    encoding: string,
    bom: boolean,
    size: number,
    spanMultipleLines: boolean,
    quotes: boolean,
    delimiter: string,
    errors: { [key: string]: string }
    warnings: { [key: string]: string },
    preview: string[][],
}
export type DatasetOptions = {
    name: string,
    destination: string;
    columns: Array<string>,
    header: boolean,
    quotes: boolean,
    output: 'csv' | 'json'
    delimiter: Delimiter
}

export interface Dataset {
    source: string
    destination: string
    addedAt: Date;
    options: DatasetOptions;
    shape: Shape
    state: datasetStateType
    connector: connectorType | null
    loader: loaderType | null


    toJson(): Promise<ChildProcessWithoutNullStreams>

    toCSV(): Promise<ChildProcessWithoutNullStreams>

    determineEnv(): env

    determineConnector(): void

    determineLoader(): void

    getColumnHeader(): Promise<string[] | null>

    rowCount(): Promise<number>

    fileSize(): number

    preview(count: number, streamTo?: string): Promise<string[][] | string>

    detectShape(): Promise<Shape>

    uploadToS3(bucket: string, key: string): Promise<string>

    initMultipartUpload(bucket: string, key: string): Promise<string>

}


export interface Workflow {
    name: string
    createdAt: Date
    datasets: Map<string, Dataset>
    env: env
    queryy: string

    add(dataset: Dataset): Promise<string>

    query(q: string): Promise<string>

    remove(dataset: Dataset): void

    get(name: string): Dataset | null

    list(): Array<Dataset>
}

export type ProcessResult = {
    stdout: string,
    stderr: string,
    code: number
}
