/// <reference types="node" />
import fs from 'fs';
import { S3Client } from '@aws-sdk/client-s3';
declare type env = 'local' | 's3';
declare type connectorType = S3Client | fs.ReadStream;
declare type loaderType = S3Client | fs.WriteStream;
declare type catalogStateType = 'init' | 'transforming' | 'uploading' | 'cancelled' | 'uploaded' | 'ready';
declare type Delimiter = ',' | '\t';
interface Metadata {
    type: string;
    columns: string[];
    header: boolean;
    extension: string;
    size: number;
    rowCount: number;
    spanMultipleLines: boolean;
    quotes: boolean;
    delimiter: Delimiter;
    errors: {
        [key: string]: string;
    };
    warnings: {
        [key: string]: string;
    };
    preview?: string[][];
}
export interface CatalogOptions {
    name: string;
    input: 'csv' | 'json';
    source: string;
    destination: string;
    columns: string[];
    header: boolean;
    quotes: boolean;
    output: 'csv' | 'json';
    delimiter: Delimiter;
}
export declare class Catalog {
    name: string;
    options: CatalogOptions;
    metadata: Metadata;
    env: env;
    state: catalogStateType;
    connector: connectorType | null;
    loader: loaderType | null;
    createdAt: Date;
    constructor(options: CatalogOptions);
    rowCount(): Promise<void>;
    headerColumn(): Promise<void>;
    fileType(): Promise<void>;
    fileSize(): Promise<void>;
    determineLoader(): void;
    determineConnector(): void;
}
export declare function createCatalog(query: String, opt: CatalogOptions): Promise<Catalog>;
export {};
