import { createCatalog } from './catalog';
import { parser } from './parser';
declare function query(raw: string): Promise<void>;
export { query, parser, createCatalog };
