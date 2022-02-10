/// <reference types="node" />
import fs from "fs";
import { S3Client } from "@aws-sdk/client-s3";
import { ChildProcessWithoutNullStreams } from "child_process";
import { VFile } from "vfile";
export declare enum Delimiter {
    COMMA = ",",
    TAB = "\t",
    SPACE = " ",
    PIPE = "|",
    SEMICOLON = ";",
    COLON = ":"
}
export declare const mlr: string;
export declare const sqlparser: string;
export declare type env = "local" | "aws";
export declare type connectorType = S3Client | fs.ReadStream;
export declare type loaderType = S3Client | fs.ReadStream;
export declare type datasetStateType = "init" | "transforming" | "uploading" | "cancelled" | "uploaded" | "ready";
export declare type ProcessResult = {
    stdout: string;
    stderr: string;
    code: number;
};
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
    output: "csv" | "json";
    delimiter: Delimiter;
};
declare class Catalog {
    name: string;
    source: string;
    options: DatasetOptions;
    destination: string;
    init: Date;
    env: env;
    state: datasetStateType;
    vfile: VFile;
    pcount: number;
    constructor(source: string, options: DatasetOptions);
    toJson(): Promise<ChildProcessWithoutNullStreams>;
    toCSV(): Promise<ChildProcessWithoutNullStreams>;
    rowCount(): Promise<number>;
    getColumnHeader(): Promise<string[] | null>;
    preview(count?: number, streamTo?: string): Promise<string[][] | string>;
    detectShape(): Promise<void>;
    determineLoader(): void;
    determineConnector(): void;
    determineEnv(): void;
    fileSize(): number;
    uploadToS3(): Promise<string>;
    initMultipartUpload(bucket: string, key: string): Promise<string>;
    exec(cmd: string, args: string[]): ChildProcessWithoutNullStreams;
    promisifyProcessResult(child: ChildProcessWithoutNullStreams): Promise<ProcessResult>;
}
export declare function createCatalog(source: string, opt: DatasetOptions): Promise<Catalog>;
declare class Workflow {
    name: string;
    catalogs: Map<string, Catalog>;
    readonly createdAt: Date;
    env: env;
    qquery: string;
    constructor(name: string);
    list(): Catalog[];
    remove(dataset: Catalog): void;
    get(source: string): Catalog | null;
    add(d: Catalog): Promise<string>;
    query(q: string): Promise<string>;
}
export declare function createWorkflow(name: string): Workflow;
export {};
