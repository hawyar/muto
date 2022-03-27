import { CatalogOptions } from './catalog';
export { parseStmt, Stmt } from './parser';
export declare function query(query: string, opt: CatalogOptions): Promise<void>;
