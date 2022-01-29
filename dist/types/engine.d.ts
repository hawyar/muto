import { Cache, Dataset, DatasetOptions, env } from "./types";
/**
 * Returns a new dataset
 * @param {string} source - Source of the dataset
 * @returns {Options} options - Options for the dataset
 */
export declare function createDataset(source: string, options: DatasetOptions): Dataset;
declare class Workflow {
    name: string;
    datasets: Map<string, Dataset>;
    readonly createdAt: Date;
    env: env;
    lcache: Cache | null;
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
export declare function createWorkflow(name: string): Workflow;
export {};
