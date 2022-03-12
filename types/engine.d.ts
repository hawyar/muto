/// <reference types="node" />
import fs from 'fs';
import { ChildProcessWithoutNullStreams } from 'child_process';
import { VFile } from 'vfile';
import { S3Client } from '@aws-sdk/client-s3';
declare enum Delimiter {
    COMMA = ",",
    TAB = "\t",
    SPACE = " ",
    PIPE = "|",
    SEMICOLON = ";",
    COLON = ":"
}
declare type env = 'local' | 'aws';
declare type connectorType = S3Client | fs.ReadStream;
declare type loaderType = S3Client | fs.ReadStream;
declare type catalogStateType = 'init' | 'transforming' | 'uploading' | 'cancelled' | 'uploaded' | 'ready';
interface ProcessResult {
    stdout: string;
    stderr: string;
    code: number;
}
interface CatalogOptions {
    name: string;
    destination: string;
    columns: string[];
    header: boolean;
    quotes: boolean;
    output: 'csv' | 'json';
    delimiter: Delimiter;
}
interface Stmt {
    type: string;
    distinct: boolean;
    columns: any[];
    from: any[];
    sort: {};
    where: {};
    group: never[];
    having: never[];
    limit: {
        type: string;
        val: string;
    };
}
declare class Catalog {
    name: string;
    source: string;
    options: CatalogOptions;
    destination: string;
    init: Date;
    env: env;
    state: catalogStateType;
    vfile: VFile;
    pcount: number;
    stmt: Stmt;
    connector: connectorType | null;
    loader: loaderType | null;
    constructor(source: string, options: CatalogOptions);
    toJson(): Promise<ChildProcessWithoutNullStreams>;
    toCSV(): Promise<ChildProcessWithoutNullStreams>;
    rowCount(): Promise<number>;
    getColumnHeader(): Promise<void>;
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
export declare function createCatalog(source: string, opt: CatalogOptions): Promise<Catalog>;
declare class Workflow {
    name: string;
    catalogs: Map<string, Catalog>;
    readonly createdAt: Date;
    env: env;
    stmt: string;
    constructor(name: string);
    list(): Catalog[];
    remove(dataset: Catalog): void;
    get(source: string): Catalog | undefined;
    add(catalog: Catalog | [Catalog]): string | string[];
    query(raw: string): Promise<void>;
}
export declare function createWorkflow(name: string): Workflow;
export {};
