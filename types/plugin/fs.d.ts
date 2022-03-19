declare class LocalFile {
    path: string;
    constructor(path: string);
    exists(file: string): Promise<boolean>;
    size(file: string): Promise<number>;
    fileType(): Promise<string>;
}
export declare function newLocalFile(path: string): LocalFile;
export {};
