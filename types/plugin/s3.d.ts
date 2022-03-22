import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
export declare const credentials: (profile: string) => any;
export declare function s3Client(config: S3ClientConfig): S3Client;
export declare function parseS3Uri(uri: string, options: {
    file: boolean;
}): {
    data: {
        bucket: string;
        key: string;
        file: string;
    };
    err: string;
};
