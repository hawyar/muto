declare class Miller {
    path: string;
    version: string;
    cmd: string;
    args: string[];
    constructor();
    binPath(): void;
}
export declare function millerCmd(): Miller;
export {};
