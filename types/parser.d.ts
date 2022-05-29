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
            external: {
                s3: {
                    bucket: string;
                    key: string;
                    file: string;
                };
            };
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
    getLimit(): number;
    getTable(): string;
    getType(): string;
    getGroupBy(): string[];
    isExternal(): boolean;
    parse(): Stmt;
}
export declare function parser(query: string): Parser;
export {};
