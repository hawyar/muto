declare type Delimiter = ',' | '\t';
declare type DataType = 'csv' | 'json' | 'tsv';
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
    name: string;
    options: CatalogOptions;
    metadata: Metadata;
    createdAt: Date;
    constructor(options: CatalogOptions);
    getName(): string;
    getOptions(): CatalogOptions;
    getMetadata(): Metadata;
    getColumns(): string[];
    rowCount(): Promise<void>;
    columnHeader(): Promise<void>;
    sanitizeColumnNames(columns: string[]): string[];
    fileType(): Promise<void>;
    fileSize(): Promise<void>;
}
export declare function createCatalog(query: String, opt: CatalogOptions): Promise<Catalog>;
export {};
