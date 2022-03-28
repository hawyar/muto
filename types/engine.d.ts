import { CatalogOptions } from './catalog';
export { parseStmt } from './parser';
export { createCatalog } from './catalog';
export declare function query(query: string, opt: CatalogOptions): Promise<void>;
