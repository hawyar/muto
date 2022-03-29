import { CatalogOptions, Catalog } from './catalog';
import { Stmt } from './parser';
export { parseStmt } from './parser';
export { createCatalog } from './catalog';
export { parseS3URI, fileExists } from './plugin/s3';
export declare function query(query: string, opt: CatalogOptions): Promise<void>;
interface ExecutePlan {
    cmd: string;
    args: string[];
}
export declare class Analyzer {
    catalog: Catalog;
    stmt: Stmt;
    plan: ExecutePlan;
    constructor(catalog: Catalog, stmt: Stmt);
    analyze(): ExecutePlan;
}
