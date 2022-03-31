import path from 'path'
import { createInterface } from 'readline'
import os from 'os'
import { constants, createReadStream } from 'fs'
import { exec } from 'child_process'
import util from 'util'
import { access, stat } from 'fs/promises'
import { millerCmd } from './miller'

const execify = util.promisify(exec)

type Delimiter = ','
type DataType = 'csv' | 'json'

interface Metadata {
  root: string
  dir: string
  base: string
  ext: string
  fileName: string
  type: DataType
  columns: string[]
  header: boolean
  filesize: number
  rowCount: number
  spanMultipleLines: boolean
  quotes: boolean
  delimiter: Delimiter
  errors: { [key: string]: string }
  warnings: { [key: string]: string }
  preview?: string[][]
}

export interface CatalogOptions {
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
  options: CatalogOptions
  metadata: Metadata
  createdAt: Date

  constructor (options: CatalogOptions) {
    this.options = options
    this.createdAt = new Date()
    this.metadata = {
      root: process.cwd(),
      dir: '',
      base: '',
      ext: '',
      fileName: '',
      type: 'csv',
      columns: [],
      header: false,
      filesize: 0,
      rowCount: 0,
      spanMultipleLines: false,
      quotes: false,
      delimiter: ',',
      errors: {},
      warnings: {}
    }
  }

  getSource (): string {
    return this.options.source
  }

  getDestination (): string {
    return this.options.destination
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
    const mlr = millerCmd()
    const args = mlr.getCmd() + ' ' + mlr.jsonOutput().count().fileSource(this.getSource()).getArgs().join(' ')

    const count = await execify(args)

    if (count.stderr !== '') {
      throw new Error(`failed-to-get-row-count: ${count.stderr}`)
    }

    const rowCount = JSON.parse(count.stdout)

    if (rowCount.length === 0) {
      throw new Error('failed-to-get-row-count: no rows found')
    }

    if (rowCount[0].count === undefined) {
      throw new Error('failed-to-get-row-count: no count found')
    }
    this.metadata.rowCount = rowCount[0].count
  }

  async columnHeader (): Promise<void> {
    const mlr = millerCmd()
    const args = mlr.getCmd() + ' ' + mlr.jsonOutput().head(1).fileSource(this.options.source).getArgs().join(' ')

    const header = await execify(args)

    if (header.stderr !== '') {
      throw new Error(`failed-to-get-header-column: ${header.stderr}`)
    }
    const columns = JSON.parse(header.stdout)

    if (columns.length === 0) {
      throw new Error('failed-to-get-header-column: no columns found')
    }

    for (const c in columns[0]) {
      this.metadata.columns.push(columns[0][c])
    }
    this.metadata.header = true
  }

  async validateSource (): Promise<void> {
    const fstat = await stat(this.options.source)

    if (!fstat.isFile()) {
      throw Error('Source path is not a file')
    }

    await access(this.options.source, constants.R_OK).catch(() => {
      throw Error('Source file is not readable')
    })

    if (fstat.size === 0) {
      throw Error('Source file is empty')
    }

    const fpath = path.parse(this.options.source)

    this.metadata.dir = fpath.dir
    this.metadata.base = fpath.base
    this.metadata.ext = fpath.ext
    this.metadata.fileName = fpath.name
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

    // TODO: find a bette way? this is risky we could still be wrong
    const rl = createInterface({
      input: createReadStream(this.options.source)
    })

    let firstLine = ''

    rl.on('line', line => {
      firstLine = line
      rl.close()
    })

    rl.on('close', () => {
      if (firstLine.startsWith('{') || firstLine.startsWith('[')) {
        this.metadata.type = 'json'
        return true
      }

      if (firstLine.startsWith('"') || firstLine.startsWith('\'')) {
        this.metadata.type = 'csv'
        return true
      }
    })

    throw Error(`Error: Unsupported file type ${type}`)
  }

  async fileSize (): Promise<void> {
    const fstat = await stat(this.options.source)
    this.metadata.filesize = fstat.size
  }

  sanitizeColumnNames (columns: string[]): string[] {
    return columns.map(column => column.replace(/[^a-zA-Z0-9]/g, '_'))
  }

  // async preview (): Promise<void> {
  //   const mlr = millerCmd()
  //   const args = mlr.getCmd() + mlr.jsonOutput().head(5).getArgs().join(' ')

  //   const preview = await execify(args)

  //   if (preview.stderr !== '') {
  //     throw new Error(preview.stderr)
  //   }

  //   const rows = JSON.parse(preview.stdout)

  //   if (rows.length === 0) {
  //     throw new Error('failed-to-get-preview: no rows found')
  //   }

  //   this.metadata.preview = rows
  // }
}

export async function createCatalog (opt: CatalogOptions): Promise<Catalog> {
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
      catalog.validateSource(),
      catalog.columnHeader(),
      catalog.fileSize(),
      catalog.fileType(),
      catalog.rowCount()
    ])
      .then(() => {
        console.log(`created catalog ${catalog.getMetadata().fileName}`)
        resolve(catalog)
      })
      .catch((err) => reject(err))
  })
}
