/// <reference types="node" />
import { ChildProcessWithoutNullStreams } from "child_process";
import { VFile } from "vfile";
declare enum Delimiter {
    COMMA = ",",
    TAB = "\t",
    SPACE = " ",
    PIPE = "|",
    SEMICOLON = ";",
    COLON = ":"
}
declare type env = "local" | "aws";
declare type catalogStateType = "init" | "transforming" | "uploading" | "cancelled" | "uploaded" | "ready";
declare type ProcessResult = {
    stdout: string;
    stderr: string;
    code: number;
};
declare type CatalogOptions = {
    name: string;
    destination: string;
    columns: Array<string>;
    header: boolean;
    quotes: boolean;
    output: "csv" | "json";
    delimiter: Delimiter;
};
declare type ParsedStatement = {
    Cache?: string;
    Comments?: string;
    Distinct?: string;
    Hints?: string;
    SelectExprs?: [];
    From?: [];
    Where?: string;
    GroupBy?: null;
    Having?: null;
    OrderBy?: [];
    Limit?: null;
    Lock?: "";
};
declare class Catalog {
    name: string;
    source: string;
    options: CatalogOptions;
    destination: string;
    init: Date;
    env: env;
    state: catalogStateType;
    vfile: VFile;
    pcount: number;
    constructor(source: string, options: CatalogOptions);
    toJson(): Promise<ChildProcessWithoutNullStreams>;
    toCSV(): Promise<ChildProcessWithoutNullStreams>;
    rowCount(): Promise<number>;
    getColumnHeader(): Promise<string[] | null>;
    preview(count?: number, streamTo?: string): Promise<string[][] | string>;
    detectShape(): Promise<void>;
    determineLoader(): void;
    determineConnector(): void;
    determineEnv(): void;
    fileSize(): number;
    uploadToS3(): Promise<string>;
    initMultipartUpload(bucket: string, key: string): Promise<string>;
    exec(cmd: string, args: string[]): ChildProcessWithoutNullStreams;
    promisifyProcessResult(child: ChildProcessWithoutNullStreams): Promise<ProcessResult>;
}
export declare function createCatalog(source: string, opt: CatalogOptions): Promise<Catalog>;
declare class Workflow {
    name: string;
    catalogs: Map<string, Catalog>;
    readonly createdAt: Date;
    env: env;
    stmt: string;
    constructor(name: string);
    list(): Catalog[];
    remove(dataset: Catalog): void;
    get(source: string): Catalog | null;
    add(c: Catalog): string;
    query(raw: string): Promise<ParsedStatement>;
}
export declare function createWorkflow(name: string): Workflow;
export {};
