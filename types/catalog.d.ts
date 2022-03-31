declare type Delimiter = ',';
declare type DataType = 'csv' | 'json';
interface Metadata {
    root: string;
    dir: string;
    base: string;
    ext: string;
    fileName: string;
    type: DataType;
    columns: string[];
    header: boolean;
    filesize: number;
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
}
export declare class Catalog {
    options: CatalogOptions;
    metadata: Metadata;
    createdAt: Date;
    constructor(options: CatalogOptions);
    getSource(): string;
    getDestination(): string;
    getOptions(): CatalogOptions;
    getMetadata(): Metadata;
    getColumns(): string[];
    rowCount(): Promise<void>;
    columnHeader(): Promise<void>;
    validateSource(): Promise<void>;
    fileType(): Promise<void>;
    fileSize(): Promise<void>;
    sanitizeColumnNames(columns: string[]): string[];
}
export declare function createCatalog(opt: CatalogOptions): Promise<Catalog>;
export {};
