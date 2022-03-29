declare type Delimiter = ',' | '\t';
declare type DataType = 'csv' | 'json';
interface Metadata {
    fileName: string;
    type: DataType;
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
    fileExtension(): void;
    fileType(): Promise<void>;
    fileSize(): Promise<void>;
}
export declare function createCatalog(query: String, opt: CatalogOptions): Promise<Catalog>;
export {};
