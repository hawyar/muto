export interface Catalog {
    source: string
    destination: string
    init: Date;
    options: DatasetOptions;
    shape: Shape
    state: datasetStateType
    connector: connectorType | null
    loader: loaderType | null


    toJson(): Promise<ChildProcessWithoutNullStreams>

    toCSV(): Promise<ChildProcessWithoutNullStreams>

    determineEnv(): env

    determineConnector(): void

    determineLoader(): void

    getColumnHeader(): Promise<string[] | null>

    rowCount(): Promise<number>

    fileSize(): number

    preview(count: number, streamTo?: string): Promise<string[][] | string>

    detectShape(): Promise<Shape>

    uploadToS3(bucket: string, key: string): Promise<string>

    initMultipartUpload(bucket: string, key: string): Promise<string>

}


export interface Workflow {
    name: string
    createdAt: Date
    catalogs: Map<string, Catalog>
    env: env
    qquery: string

    add(dataset: Catalog): Promise<string>

    query(q: string): Promise<string>

    remove(dataset: Catalog): void

    get(name: string): Catalog | null

    list(): Array<Catalog>

}

