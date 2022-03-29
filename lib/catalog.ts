import path, { join } from 'path'
import os from 'os'
import fs from 'fs'
import { exec } from 'child_process'
import util from 'util'

const execify = util.promisify(exec)

const mlr = join(process.cwd(), 'node_modules', '.bin', 'mlr@v6.0.0')

type Delimiter = ',' | '\t'
type DataType = 'csv' | 'json' | 'tsv'

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

    const catalogOptions = Object.assign({}, opt)

    if (opt.name === undefined || opt.name === '') {
      catalogOptions.name = path.basename(catalogOptions.source).split('.')[0]
    }

    if (opt.input === undefined) {
      const assumeType = path.extname(opt.source) === '.csv' ? 'csv' : 'json'
      console.warn(`no-input-type-provided: assuming ${assumeType}`)
      catalogOptions.input = assumeType
    }

    if (opt.output === undefined) {
      const assumeType = path.extname(opt.destination) === '.csv' ? 'csv' : 'json'
      console.warn(`no-output-type-provided: assuming ${assumeType}`)
      catalogOptions.output = assumeType
    }
    const catalog = new Catalog(catalogOptions)

    Promise.all([
      catalog.columnHeader(),
      catalog.fileSize(),
      catalog.fileType(),
      catalog.rowCount()
    ])
      .then(() => {
        console.log(`created catalog: ${catalog.getName()}`)
        resolve(catalog)
      })
      .catch((err) => reject(err))
  })
}
