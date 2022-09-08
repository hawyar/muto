declare type Delimiter = ',';
declare type DataType = 'csv' | 'json';
interface Metadata {
    source: string;
    destination: string;
    type: DataType;
    columns: string[];
    header: boolean;
    fileSize: number;
    rowCount: number;
    spanMultipleLines: boolean;
    quotes: boolean;
    delimiter: Delimiter;
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
    options: CatalogOptions;
    metadata: Metadata;
    constructor(opt: CatalogOptions);
    getSource(): string;
    getDestination(): string;
    getColumns(): string[];
    rowCount(): Promise<void>;
    validateSource(): Promise<void>;
    validateDestination(): Promise<void>;
    fileType(): Promise<void>;
    fileSize(): Promise<void>;
    sanitizeColumnNames(columns: string[]): string[];
    hasQuotes(): Promise<void>;
    columnHeader(): Promise<void>;
    preview(): Promise<void>;
}
export declare function createCatalog(opt: CatalogOptions): Promise<Catalog>;
export {};
