import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
export declare const credentials: (profile: string) => any;
export declare function s3Client(config: S3ClientConfig): S3Client;
export declare class S3 {
    client: S3Client;
    bucket: string;
    constructor(S3Client: S3Client, bucket: string);
    fileExists(key: string): Promise<boolean>;
    parseS3Uri(uri: string, options: {
        file: boolean;
    }): {
        data: {
            bucket: string;
            key: string;
            file: string;
        };
        err: string;
    };
}
