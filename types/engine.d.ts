import { createCatalog, CatalogOptions } from './catalog';
import { parser } from './parser';
declare function query(raw: string, opt: CatalogOptions): Promise<void>;
export { query, parser, createCatalog };
