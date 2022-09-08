declare enum Delimiter {
    Comma = ","
}
declare enum Format {
    CSV = "csv",
    JSON = "json"
}
interface Metadata {
    source: string;
    destination: string;
    type: Format;
    header: boolean;
    columns: string[];
    rowCount: number;
    fileSize: number;
    spanMultipleLines: boolean;
    quotes: boolean;
    delimiter: Delimiter;
    sanitizedColumnName: string[];
}
export interface CatalogOptions {
    source: string;
    destination: string;
    inputFormat?: Format;
    outputFormat?: Format;
    delimiter?: Delimiter;
    onEnd?: () => void;
}
export declare class Catalog {
    options: CatalogOptions;
    metadata: Metadata;
    constructor(opt: CatalogOptions);
    validateSource(): Promise<void>;
    rowCount(): Promise<void>;
    fileSize(): Promise<void>;
    sanitizeColumnNames(): string[];
    hasQuotes(): Promise<void>;
    columnHeader(): Promise<void>;
}
export declare function createCatalog(opt: CatalogOptions): Promise<Catalog>;
export {};
