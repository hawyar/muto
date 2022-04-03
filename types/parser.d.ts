export interface Stmt {
    type: string;
    distinct: boolean;
    columns: [
        {
            name: string;
            type: string;
        }
    ];
    from: [
        {
            schemaname: string;
            relname: string;
            inh: string;
        }
    ];
    sort: {};
    where: {
        operator: string;
        left: string;
        right: string;
    };
    groupBy: string[];
    having: string[];
    orderBy: string[];
    limit: {
        type: string;
        val: string;
    };
}
declare class Parser {
    query: string;
    stmt: Stmt;
    constructor(raw: string);
    getStmt(): Stmt;
    getColumns(): string[];
    isDistinct(): boolean;
    getWhere(): {
        operator: string;
        left: string;
        right: string;
    };
    limit(): number;
    getTable(): string;
    getType(): string;
    getGroupBy(): string[];
    parse(): Stmt;
}
export declare function parser(query: string): Parser;
export {};
