/// <reference types="node" />
import * as fs from "fs";
import { S3Client } from "@aws-sdk/client-s3";
declare type supportedDelimiters = "," | ";" | "|" | ":" | "\t" | " " | "^" | "~" | "*" | "!" | "-" | "_";
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
    options: Options;
    shape?: Shape;
    data?: string[][];
    createdAt: Date;
    state: datasetStateType;
    connector: connectorType;
}
interface Options {
    destination: string;
    columns: Array<string>;
    header: boolean;
    transform: (row: object) => object;
    bom: boolean;
    delimiter: supportedDelimiters;
}
declare type Args = {
    source: string;
    options: Options;
};
declare class Dataset {
    source: string;
    options: Options;
    createdAt: Date;
    state: datasetStateType;
    constructor({ source, options }: Args);
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
    add(source: string, options: Options): Promise<string>;
}
/**
 * Returns a new workflow
 * @param {string} name - Name of the workflow
 * @returns {Workflow} - New workflow
 */
export declare function createWorkflow(name: string): Workflow;
export {};
