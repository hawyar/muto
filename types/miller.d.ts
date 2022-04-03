declare class Miller {
    path: string;
    version: string;
    args: string[];
    constructor();
    getCmd(): string;
    getArgs(): string[];
    getPath(): string;
    fileSource(file: string): Miller;
    csvInput(): Miller;
    jsonInput(): Miller;
    csvOutput(): Miller;
    jsonOutput(): Miller;
    implicitCsvHeader(fields: string[]): Miller;
    count(): Miller;
    cat(): Miller;
    cut(fields: string[]): Miller;
    head(count: number): Miller;
    determinePath(): void;
}
export declare function millerCmd(): Miller;
export {};
