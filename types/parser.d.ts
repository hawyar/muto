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
    where: {};
    group: string[];
    having: string[];
    orderBy: string[];
    limit: {
        type: string;
        val: string;
    };
}
export declare function parseQuery(query: string): Stmt;
