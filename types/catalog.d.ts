/// <reference types="node" />
import { ParsedPath } from 'path';
declare type Delimiter = ',';
declare type DataType = 'csv' | 'json';
interface Metadata {
    path: ParsedPath;
    type: DataType;
    columns: string[];
    header: boolean;
    fileSize: number;
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
    input: DataType;
    source: string;
    destination: string;
    columns: string[];
    header: boolean;
    quotes: boolean;
    output: DataType;
    delimiter: Delimiter;
    onEnd?: () => void;
}
export declare class Catalog {
    source: Metadata;
    destination: Metadata;
    options: CatalogOptions;
    createdAt: Date;
    constructor(options: CatalogOptions);
    getSource(): Metadata;
    getDestination(): Metadata;
    getOptions(): CatalogOptions;
    getColumns(): string[];
    rowCount(): Promise<void>;
    columnHeader(): Promise<void>;
    validateSource(): Promise<void>;
    validateDestination(): Promise<void>;
    fileType(): Promise<void>;
    fileSize(): Promise<void>;
    sanitizeColumnNames(columns: string[]): string[];
    preview(): Promise<void>;
}
export declare function createCatalog(opt: CatalogOptions): Promise<Catalog>;
export {};
