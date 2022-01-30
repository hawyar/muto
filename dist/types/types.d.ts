/// <reference types="node" />
import { S3Client } from "@aws-sdk/client-s3";
import fs from "fs";
export declare enum Delimiters {
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
export declare type env = 'local' | 'aws';
export declare type connectorType = S3Client | fs.ReadStream;
export declare const mlrCmd: string;
export declare type datasetStateType = 'init' | 'transforming' | 'uploading' | 'cancelled' | 'uploaded' | 'ready';
export declare type ShapeErrType = 'unrecognizedDelimiter' | 'noHeader' | 'invalidFileType' | 'rowWidthMismatch';
export declare type Shape = {
    type: string;
    columns: Array<string>;
    header: boolean;
    encoding: string;
    bom: boolean;
    size: number;
    spanMultipleLines: boolean;
    quotes: boolean;
    delimiter: string;
    errors: {
        [key: string]: string;
    };
    warnings: {
        [key: string]: string;
    };
    preview: string[][];
};
export interface Dataset {
    source: string;
    destination: string;
    addedAt: Date;
    options: DatasetOptions;
    shape: Shape;
    cached: boolean;
    state: datasetStateType;
    connector: connectorType | null;
    setDestination(destination: string): void;
    toJson(): Promise<string>;
    getColumnHeader(): Promise<string[] | null>;
    rowCount(): Promise<number>;
    fileSize(): number;
    preview(count: number, streamTo?: string): Promise<string[][] | string>;
    detectShape(): Promise<Shape>;
    determineSource(): string;
    determineSource(): string;
    determineConnector(): connectorType;
    uploadToS3(bucket: string, key: string): Promise<string>;
    initMultipartUpload(bucket: string, key: string): Promise<string>;
}
export declare type DatasetOptions = {
    destination: string;
    columns: Array<string>;
    header: boolean;
    quotes: boolean;
    transform: (row: object) => object;
    delimiter: Delimiters;
    keepColumns: Array<string>;
    sortBy: string;
};
export interface Cache {
    path: string;
    init: Date;
    get(key: string): Dataset | undefined;
    set(key: string, value: Dataset): void;
    has(key: string): boolean;
    delete(key: string): void;
    clear(): void;
    size(): number;
    keys(): string[];
}
export declare type ProcessResult = {
    stdout: string;
    stderr: string;
    code: number;
};
