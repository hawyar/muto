import path, { join } from 'path'
import os from 'os'
import fs from 'fs'
import { exec } from 'child_process'
import util from 'util'

const execify = util.promisify(exec)

const mlr = join(process.cwd(), 'node_modules', '.bin', 'mlr@v6.0.0')

type Delimiter = ',' | '\t'
type DataType = 'csv' | 'json'

interface Metadata {
  fileName: string
  type: DataType
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
  input: DataType
  source: string
  destination: string
  columns: string[]
  header: boolean
  quotes: boolean
  output: DataType
  delimiter: Delimiter
}

export class Catalog {
  name: string
  options: CatalogOptions
  metadata: Metadata
  createdAt: Date

  constructor (options: CatalogOptions) {
    this.name = options.name !== '' ? options.name : path.basename(options.source)
    this.options = options
    this.createdAt = new Date()
    this.metadata = {
      fileName: path.basename(options.source),
      type: 'csv',
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

  getName (): string {
    return this.name
  }

  getOptions (): CatalogOptions {
    return this.options
  }

  getMetadata (): Metadata {
    return this.metadata
  }

  getColumns (): string[] {
    return this.metadata.columns
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

  async columnHeader (): Promise<void> {
    const header = await execify(`${mlr} --icsv --ojson head -n 1 ${this.options.source}`)

    if (header.stderr !== '') {
      throw new Error(`failed-to-get-header-column: ${header.stderr}`)
    }
    const columns = JSON.parse(header.stdout)

    if (columns.length === 0) {
      throw new Error('failed-to-get-header-column: no columns found')
    }
    this.metadata.columns = this.sanitizeColumnNames(Object.keys(columns[0]))
  }

  sanitizeColumnNames (columns: string[]): string[] {
    return columns.map(column => column.replace(/[^a-zA-Z0-9]/g, '_'))
  }

  fileExtension (): void {
    if (this.options.source.endsWith('.csv')) {
      this.metadata.extension = 'csv'
    }

    if (this.options.source.endsWith('.json')) {
      this.metadata.extension = 'json'
    }
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

    if (type === 'text/csv') {
      this.metadata.type = 'csv'
      return
    }

    if (type === 'application/json') {
      this.metadata.type = 'json'
      return
    }

    throw new Error('unsupported-file-type')
  }

  async fileSize (): Promise<void> {
    const stat = await fs.promises.stat(this.options.source)
    this.metadata.size = stat.size
  }
}

export async function createCatalog (query: String, opt: CatalogOptions): Promise<Catalog> {
  return await new Promise((resolve, reject) => {
    if (opt === undefined) {
      reject(new Error('missing-catalog-options'))
    }
    if (opt.source === undefined || opt.source === '') {
      reject(new Error('failed-to-create-catalog: no source provided'))
    }

    if (opt.destination === undefined || opt.destination === '') {
      reject(new Error('failed-to-create-catalog: no destination provided'))
    }

    const catalogOpt = Object.assign({}, opt)

    if (opt.name === undefined || opt.name === '') {
      catalogOpt.name = path.basename(opt.source).split('.')[0]
    }

    if (opt.input === undefined) {
      switch (path.extname(opt.source)) {
        case '.csv':
          catalogOpt.input = 'csv'
          break
        case '.json':
          catalogOpt.input = 'json'
          break
        default:
          reject(new Error('failed-to-create-catalog: unsupported input file type'))
      }
    }

    if (opt.output === undefined) {
      switch (path.extname(opt.destination)) {
        case '.csv':
          catalogOpt.output = 'csv'
          break
        case '.json':
          catalogOpt.output = 'json'
          break
        default:
          reject(new Error('failed-to-create-catalog: unsupported output file type'))
      }
    }

    const catalog = new Catalog(catalogOpt)

    Promise.all([
      catalog.fileSize(),
      catalog.fileType(),
      catalog.fileExtension(),
      catalog.rowCount(),
      catalog.columnHeader()
    ])
      .then(() => {
        console.log(`processing file: ${catalog.getMetadata().fileName}`)
        resolve(catalog)
      })
      .catch((err) => reject(err))
  })
}
