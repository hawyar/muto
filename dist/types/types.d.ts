/// <reference types="node" />
import { S3Client } from "@aws-sdk/client-s3";
import fs from "fs";
import { ChildProcessWithoutNullStreams } from "child_process";
export declare enum Delimiter {
    COMMA = ",",
    TAB = "\t",
    SPACE = " ",
    PIPE = "|",
    SEMICOLON = ";",
    COLON = ":",
    NONE = ""
}
export declare const mlr: string;
export declare const sqlparser: string;
export declare type env = 'local' | 'aws';
export declare type connectorType = S3Client | fs.ReadStream;
export declare type loaderType = S3Client | fs.ReadStream;
export declare type datasetStateType = 'init' | 'transforming' | 'uploading' | 'cancelled' | 'uploaded' | 'ready';
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
export declare type DatasetOptions = {
    name: string;
    destination: string;
    columns: Array<string>;
    header: boolean;
    quotes: boolean;
    output: 'csv' | 'json';
    delimiter: Delimiter;
};
export interface Dataset {
    source: string;
    destination: string;
    addedAt: Date;
    options: DatasetOptions;
    shape: Shape;
    state: datasetStateType;
    connector: connectorType | null;
    loader: loaderType | null;
    toJson(): Promise<ChildProcessWithoutNullStreams>;
    toCSV(): Promise<ChildProcessWithoutNullStreams>;
    determineEnv(): env;
    determineConnector(): void;
    determineLoader(): void;
    getColumnHeader(): Promise<string[] | null>;
    rowCount(): Promise<number>;
    fileSize(): number;
    preview(count: number, streamTo?: string): Promise<string[][] | string>;
    detectShape(): Promise<Shape>;
    uploadToS3(bucket: string, key: string): Promise<string>;
    initMultipartUpload(bucket: string, key: string): Promise<string>;
}
export interface Workflow {
    name: string;
    createdAt: Date;
    datasets: Map<string, Dataset>;
    env: env;
    queryy: string;
    add(dataset: Dataset): Promise<string>;
    query(q: string): Promise<string>;
    remove(dataset: Dataset): void;
    get(name: string): Dataset | null;
    list(): Array<Dataset>;
}
export declare type ProcessResult = {
    stdout: string;
    stderr: string;
    code: number;
};
