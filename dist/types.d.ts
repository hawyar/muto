import * as fs from "fs";
import { S3Client } from "@aws-sdk/client-s3";
type supportedDelimiters = "," | ";" | "|" | ":" | "\t" | " " | "^" | "~" | "*" | "!" | "-" | "_" | "|";
type env = 'local' | 'aws';
type connectorType = S3Client | fs.ReadStream;
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
declare class Workflow {
    #private;
    name: string;
    datasets: Map<string, Dataset>;
    readonly createdAt: Date;
    env: env;
    constructor(name: string);
    /**
     * List datasets in the workflow
     * @param options
     * @returns
     */
    list(): Dataset[];
    /**
     * Removes dataset from the workflow
     * @param source
     * @param options
     */
    remove(dataset: Dataset): void;
    /**
     * Adds a dataset to workflow
     * @param source
     * @param options
     * @returns
     */
    add(source: string, opt: Options): Promise<Dataset | Error>;
}
/**
 * Returns a new workflow
 * @param {string} name - Name of the workflow
 * @returns {Workflow} - New workflow
 */
export function createWorkflow(name: string): Workflow;

//# sourceMappingURL=types.d.ts.map
