import path, { join } from 'path'
import os from 'os'
import fs from 'fs'
import { exec } from 'child_process'
import { S3Client } from '@aws-sdk/client-s3'
import { s3Client, credentials } from './plugin/s3'
import util from 'util'

const execify = util.promisify(exec)

const mlr = join(process.cwd(), 'node_modules', '.bin', 'mlr@v6.0.0')

type env = 'local' | 's3'

type connectorType = S3Client | fs.ReadStream
type loaderType = S3Client | fs.WriteStream

type catalogStateType = 'init' | 'transforming' | 'uploading' | 'cancelled' | 'uploaded' | 'ready'

type Delimiter = ',' | '\t'

interface Metadata {
  type: string
  columns: string[]
  header: boolean
  extension: string
  size: number
  rowCount: number
  spanMultipleLines: boolean
  quotes: boolean
  delimiter: Delimiter
  errors: { [key: string]: string }
  warnings: { [key: string]: string }
  preview?: string[][]
}

export interface CatalogOptions {
  name: string
  input: 'csv' | 'json'
  source: string
  destination: string
  columns: string[]
  header: boolean
  quotes: boolean
  output: 'csv' | 'json'
  delimiter: Delimiter
}

export class Catalog {
  name: string
  options: CatalogOptions
  metadata: Metadata
  env: env
  state: catalogStateType
  connector: connectorType | null
  loader: loaderType | null
  createdAt: Date

  constructor (options: CatalogOptions) {
    this.name = options.name !== '' ? options.name : path.basename(options.source)
    this.options = options
    this.env = 'local'
    this.createdAt = new Date()
    this.state = 'init'
    this.connector = null
    this.loader = null
    this.metadata = {
      type: '',
      columns: [],
      header: false,
      extension: '',
      size: 0,
      rowCount: 0,
      spanMultipleLines: false,
      quotes: false,
      delimiter: ',',
      errors: {},
      warnings: {}
    }
  }

  async rowCount (): Promise<void> {
    const rCount = await execify(`${mlr} --ojson count ${this.options.source}`)

    if (rCount.stderr !== '') {
      throw new Error(`failed-to-get-row-count: ${rCount.stderr}`)
    }

    const rowCount = JSON.parse(rCount.stdout)

    if (rowCount.length === 0) {
      throw new Error('failed-to-get-row-count: no rows found')
    }

    if (rowCount[0].count === undefined) {
      throw new Error('failed-to-get-row-count: no count found')
    }
    this.metadata.rowCount = rowCount[0].count
  }

  async headerColumn (): Promise<void> {
    const header = await execify(`${mlr} --icsv --ojson head -n 1 ${this.options.source}`)

    if (header.stderr !== '') {
      throw new Error(`failed-to-get-header-column: ${header.stderr}`)
    }

    console.log(header)

    const columns = JSON.parse(header.stdout)

    if (columns.length === 0) {
      throw new Error('failed-to-get-header-column: no columns found')
    }
    this.metadata.columns = Object.keys(columns[0])
  }

  async fileType (): Promise<void> {
    if (os.platform() !== 'linux' && os.platform() !== 'darwin') {
      throw new Error('unsupported-platform')
    }

    const mime = await execify(`file ${this.options.source} --mime-type`)

    if (mime.stderr !== '') {
      throw new Error(`failed-to-detect-mime-type: ${mime.stderr}`)
    }

    const type = mime.stdout.split(':')[1].trim()

    if (type === '') {
      throw new Error('failed-to-detect-mime-type')
    }

    if (this.options.source.endsWith('.csv')) {
      this.metadata.extension = 'csv'
    }

    if (this.options.source.endsWith('.json')) {
      this.metadata.extension = 'json'
    }

    this.metadata.type = type
  }

  async fileSize (): Promise<void> {
    const stat = await fs.promises.stat(this.options.source)
    this.metadata.size = stat.size
  }

  determineLoader (): void {
    if (this.options.destination.startsWith('s3://')) {
      this.loader = s3Client({
        credentials: credentials('default'),
        region: 'us-east-2'
      })
      return
    }

    if (
      this.options.source.startsWith('/') || this.options.source.startsWith('../') || this.options.source.startsWith('./')) {
      this.loader = fs.createWriteStream(this.options.destination)
      return
    }

    throw new Error('unsupported-loader')
  }

  determineConnector (): void {
    if (this.options.source.startsWith('/') || this.options.source.startsWith('../') || this.options.source.startsWith('./')) {
      if (!fs.existsSync(this.options.source)) {
        throw new Error(`file: ${this.options.source} not found, please provide a valid file path`)
      }
      this.connector = fs.createReadStream(this.options.source)
      return
    }

    if (this.options.source.startsWith('s3://')) {
      this.connector = s3Client({
        credentials: credentials('default'),
        region: 'us-east-2'
      })
      return
    }

    throw new Error(`unsupported-source for: ${this.options.source}`)
  }
}

export async function createCatalog (query: String, opt: CatalogOptions): Promise<Catalog> {
  return await new Promise((resolve, reject) => {
    if (opt.source === '' || opt.source === undefined) {
      reject(new Error('failed-to-create-catalog: no source provided'))
    }

    if (opt.destination === '' || opt.destination === undefined) {
      reject(new Error('failed-to-create-catalog: no destination provided'))
    }

    if (opt.name === '' || opt.name === undefined) {
      reject(new Error('failed-to-create-catalog: no name provided'))
    }

    if (opt.input === 'csv' && !opt.source.endsWith('.csv')) {
      reject(new Error('failed-to-create-catalog: file extension does not match input type'))
    }

    if (opt.input === 'json' && !opt.source.endsWith('.json')) {
      reject(new Error('failed-to-create-catalog: file extension does not match input type'))
    }

    const catalog = new Catalog(opt)

    Promise.all([
      catalog.determineConnector(),
      catalog.determineLoader(),
      catalog.headerColumn(),
      catalog.fileSize(),
      catalog.fileType(),
      catalog.rowCount()
    ])
      .then(() => {
        console.log(`created catalog for: ${opt.name}`)
        resolve(catalog)
      })
      .catch((err) => reject(err))
  })
}
