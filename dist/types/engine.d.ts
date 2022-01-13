/// <reference types="node" />
import * as fs from "fs";
import type { queueAsPromised } from "fastq";
import { S3Client } from "@aws-sdk/client-s3";
declare type supportedDelimiters = "," | ";" | "|" | ":" | "\t" | " " | "^" | "~" | "*" | "!" | "-" | "_" | "|";
declare type env = 'local' | 'aws';
declare type connectorType = S3Client | fs.ReadStream;
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
    connector: connectorType;
}
interface Options {
    destination: string;
    columns: Array<string>;
    header: boolean;
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
    connector: connectorType;
    constructor(args: Args, connector: connectorType);
}
interface Cache {
    path: string;
    init: Date;
    get(key: string): Dataset;
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
    queue: queueAsPromised<Args>;
    cache: Cache;
    constructor(name: string);
    /**
     * List datasets in the workflow
     * @param options
     * @returns
     */
    list(): Dataset[];
    /**
     * Removes dataset from workflow
     * @param source
     * @param options
     */
    remove(dataset: Dataset): void;
    /**
     * Add dataset to workflow
     * @param source
     * @param options
     * @returns
     */
    add(source: string, opt: Options): Promise<unknown>;
    checkFileSize(path: string): number;
}
/**
 * Returns a new workflow
 * @param {string} name - Name of the workflow
 * @returns {Workflow} - New workflow
 */
export declare function createWorkflow(name: string): Workflow;
export {};
