/// <reference types="node" />
import * as fs from "fs";
import { S3Client } from "@aws-sdk/client-s3";
declare enum Delimiters {
    COMMA = ",",
    SEMICOLON = ";",
    PIPE = "|",
    COLON = ":",
    TAB = "\t",
    SPACE = " ",
    TILDE = "~",
    DASH = "-",
    UNDERSCORE = "_"
}
declare type env = 'local' | 'remote';
declare type connectorType = S3Client | fs.ReadStream;
declare type datasetStateType = 'init' | 'transforming' | 'uploading' | 'cancelled' | 'uploaded' | 'ready';
interface Shape {
    type: string;
    columns: Array<string>;
    header: boolean;
    encoding: string;
    bom: boolean;
    spanMultipleLines: boolean;
    quotes: boolean;
    delimiter: string;
    errors: {
        [key: string]: string;
    };
    warnings: {
        [key: string]: string;
    };
    preview: string[][];
}
interface Dataset {
    source: string;
    cached: boolean;
    options: DatasetOptions;
    destination: string;
    shape: Shape;
    createdAt: Date;
    state: datasetStateType;
    connector: connectorType;
}
interface DatasetOptions {
    destination: string;
    columns: Array<string>;
    header: boolean;
    quotes: boolean;
    transform: (row: object) => object;
    delimiter: Delimiters;
}
interface Cache {
    path: string;
    init: Date;
    get(key: string): Dataset | undefined;
    set(key: string, value: Dataset): void;
    has(key: string): boolean;
    delete(key: string): void;
    clear(): void;
    size(): number;
    keys(): string[];
}
declare class Dataset {
    #private;
    source: string;
    destination: string;
    _rowsCount: number;
    options: DatasetOptions;
    createdAt: Date;
    shape: Shape;
    state: datasetStateType;
    processCount: number;
    cached: boolean;
    constructor(source: string, options: DatasetOptions);
    toJson(): Promise<string>;
    rowsCount(): Promise<number>;
    columns(): Promise<string[] | null>;
    preview(count: number, streamTo?: string): Promise<string[][] | string>;
}
declare class Workflow {
    #private;
    name: string;
    datasets: Map<string, Dataset>;
    readonly createdAt: Date;
    env: env;
    lcache: Cache;
    constructor(name: string);
    list(): Dataset[];
    remove(dataset: Dataset): void;
    add(source: string, options: DatasetOptions): Promise<string>;
}
/**
 * Returns a new workflow
 * @param {string} name - Name of the workflow
 * @returns {Workflow} - New workflow
 */
declare function createWorkflow(name: string): Workflow;
/**
 * Returns a new dataset
 * @param {string} name - Source of the dataset
 * @returns {Options} - Options for the dataset
 */
declare function createDataset(source: string, options: DatasetOptions): Dataset;
export { createDataset, createWorkflow, };
