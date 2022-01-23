import {S3Client} from "@aws-sdk/client-s3";
import {join} from "path";
import fs from "fs";

export enum Delimiters {
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

export type env = 'local' | 'aws'
export type connectorType = S3Client | fs.ReadStream
export const mlrCmd = join(process.cwd(), 'node_modules', '.bin', 'mlr@v6.0.0')


// TODO: better error message for errors in transform
export type datasetStateType = 'init' | 'transforming' | 'uploading' | 'cancelled' | 'uploaded' | 'ready'
export type ShapeErrType = 'unrecognizedDelimiter' | 'noHeader' | 'invalidFileType' | 'rowWidthMismatch'


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

export interface Dataset {
    source: string
    destination: string
    addedAt: Date;
    options: DatasetOptions;
    shape: Shape
    cached: boolean
    state: datasetStateType
    connector: connectorType | null

    detectShape(): Promise<Shape>

    determineSource(): string

    determineSource(): string

    determineConnector(): connectorType

    uploadToS3(): Promise<string>

    initMultipartUpload(bucket: string, key: string): Promise<string>

    toJson(): Promise<string>

    rowCount(): Promise<number>

    fileSize(): number

    preview(count: number, streamTo?: string): Promise<string[][] | string>
}

export type DatasetOptions = {
    destination: string;
    columns: Array<string>,
    header: boolean,
    quotes: boolean,
    transform: (row: object) => object
    delimiter: Delimiters
}

export interface Cache {
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

export type ProcessResult = {
    stdout: string,
    stderr: string,
    code: number
}
