import { Catalog } from './catalog';
import { Stmt } from './parser';
interface ExecutePlan {
    cmd: string;
    args: string[];
}
export declare function createPlan(catalog: Catalog, stmt: Stmt): ExecutePlan;
export {};
