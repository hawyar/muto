/// <reference types="node" />
import fs from 'fs';
import { ChildProcessWithoutNullStreams } from 'child_process';
import { VFile } from 'vfile';
import { S3Client } from '@aws-sdk/client-s3';
declare type env = 'local' | 'aws';
declare type connectorType = S3Client | fs.ReadStream;
declare type loaderType = S3Client | fs.ReadStream;
declare type catalogStateType = 'init' | 'transforming' | 'uploading' | 'cancelled' | 'uploaded' | 'ready';
interface ProcessResult {
    stdout: string;
    stderr: string;
    code: number;
}
declare enum Delimiter {
    COMMA = ",",
    TAB = "\t",
    SPACE = " ",
    PIPE = "|",
    SEMICOLON = ";",
    COLON = ":"
}
interface CatalogOptions {
    name: string;
    source: string;
    destination: string;
    columns: string[];
    header: boolean;
    quotes: boolean;
    output: 'csv' | 'json';
    delimiter: Delimiter;
}
declare class Catalog {
    name: string;
    options: CatalogOptions;
    init: Date;
    env: env;
    state: catalogStateType;
    vfile: VFile;
    columns: string[];
    pcount: number;
    stmt: Stmt;
    connector: connectorType | null;
    loader: loaderType | null;
    constructor(options: CatalogOptions);
    toJson(): Promise<ChildProcessWithoutNullStreams>;
    rowCount(): Promise<number>;
    headerColumn(): Promise<void>;
    preview(count?: number, streamTo?: string): Promise<string[][] | string>;
    determineShape(): Promise<void>;
    determineLoader(): void;
    determineConnector(): void;
    determineEnv(): void;
    fileSize(): Promise<number>;
    uploadToS3(): Promise<string>;
    initMultipartUpload(bucket: string, key: string): Promise<string>;
    exec(cmd: string, args: string[]): ChildProcessWithoutNullStreams;
    promisifyProcessResult(child: ChildProcessWithoutNullStreams): Promise<ProcessResult>;
}
export declare function createCatalog(opt: CatalogOptions): Promise<Catalog>;
declare class Workflow {
    name: string;
    catalogs: Map<string, Catalog>;
    createdAt: Date;
    env: env;
    stmt: string;
    constructor(name: string);
    list(): Catalog[];
    remove(dataset: Catalog): void;
    get(source: string): Catalog | undefined;
    add(catalog: Catalog | [Catalog]): string | string[];
    promisifyProcessResult(child: ChildProcessWithoutNullStreams): Promise<ProcessResult>;
    exec(cmd: string, args: string[]): Promise<ProcessResult>;
    query(raw: string): Promise<void>;
}
export declare function createWorkflow(name: string): Workflow;
interface Stmt {
    type: string;
    distinct: boolean;
    columns: [
        {
            name: string;
            type: string;
        }
    ];
    from: [
        {
            schemaname: string;
            relname: string;
            inh: string;
        }
    ];
    sort: {};
    where: {};
    group: string[];
    having: string[];
    orderBy: string[];
    limit: {
        type: string;
        val: string;
    };
}
export {};
