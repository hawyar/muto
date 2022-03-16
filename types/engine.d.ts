/// <reference types="node" />
import fs from 'fs';
import { VFile } from 'vfile';
import { S3Client } from '@aws-sdk/client-s3';
declare type env = 'local' | 'aws';
declare type connectorType = S3Client | fs.WriteStream;
declare type loaderType = S3Client | fs.ReadStream;
declare type catalogStateType = 'init' | 'transforming' | 'uploading' | 'cancelled' | 'uploaded' | 'ready';
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
    input: 'csv';
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
    rowCount(): Promise<number>;
    headerColumn(): Promise<void>;
    preview(count?: number, streamTo?: string): Promise<string[][] | string>;
    fileType(): Promise<string>;
    determineShape(): Promise<void>;
    determineLoader(): void;
    determineConnector(): void;
    determineEnv(): void;
    fileSize(): Promise<number>;
    uploadToS3(): Promise<string>;
    initMultipartUpload(bucket: string, key: string): Promise<string>;
}
export declare function createCatalog(opt: CatalogOptions): Promise<Catalog>;
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
    query(raw: string): Promise<void>;
}
export declare function createWorkflow(name: string): Workflow;
export {};
