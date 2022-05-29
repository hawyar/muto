import path, { ParsedPath } from 'path'
// import { createInterface } from 'readline'
import os from 'os'
import { constants } from 'fs'
import { exec } from 'child_process'
import util from 'util'
import { access, stat } from 'fs/promises'
import { millerCmd } from './miller'

const execify = util.promisify(exec)

type Delimiter = ','
type DataType = 'csv' | 'json'

interface Metadata {
  path: ParsedPath
  type: DataType
  columns: string[]
  header: boolean
  fileSize: number
  rowCount: number
  spanMultipleLines: boolean
  quotes: boolean
  delimiter: Delimiter
  errors?: { [key: string]: string }
  warnings?: { [key: string]: string }
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
  onEnd?: () => void
}

export class Catalog {
  source: Metadata
  destination: Metadata
  options: CatalogOptions
  createdAt: Date

  constructor (options: CatalogOptions) {
    this.options = options
    this.createdAt = new Date()
    this.source = {
      path: path.parse(''),
      type: 'csv',
      columns: [],
      header: false,
      fileSize: 0,
      rowCount: 0,
      spanMultipleLines: false,
      quotes: false,
      delimiter: ','
    }
    this.destination = {
      path: path.parse(this.options.destination),
      type: 'csv',
      columns: [],
      header: false,
      fileSize: 0,
      rowCount: 0,
      spanMultipleLines: false,
      quotes: false,
      delimiter: ','
    }
  }

  getSource (): Metadata {
    return this.source
  }

  getDestination (): Metadata {
    return this.destination
  }

  getOptions (): CatalogOptions {
    return this.options
  }

  getColumns (): string[] {
    return this.source.columns
  }

  async rowCount (): Promise<void> {
    const mlr = millerCmd()

    if (this.source.type === 'json') {
      return
    }
    const args = mlr.getCmd() + ' ' + mlr.jsonOutput().count().fileSource(this.options.source).getArgs().join(' ')

    const count = await execify(args)

    if (count.stderr !== '') {
      throw new Error(`failed to count rows: ${count.stderr}`)
    }

    const rowCount = JSON.parse(count.stdout)

    if (rowCount.length === 0) {
      throw new Error('failed to count rows: no rows found')
    }

    if (rowCount[0].count === undefined) {
      throw new Error('failed to count rows: no count found')
    }
    this.source.rowCount = rowCount[0].count
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

    this.source.path = path.parse(this.options.source)
  }

  validateDestination (): void {
    const ext = this.destination.path.ext
    if (ext === '.csv') {
      this.destination.type = 'csv'
      return
    }

    if (ext === '.json') {
      this.destination.type = 'json'
      return
    }
    throw new Error('Destination file extension is not supported')
  }

  async fileType (): Promise<void> {
    if (os.platform() !== 'linux' && os.platform() !== 'darwin') {
      throw new Error('Unsupported platform')
    }
    const { stdout, stderr } = await execify(`file ${this.options.source} --mime-type`)

    if (stderr !== '') {
      throw new Error(stderr)
    }

    const mimeType = stdout.split(':')[1].trim()

    if (mimeType === 'application/json') {
      this.source.type = 'json'
      return
    }

    if (mimeType === 'application/csv') {
      this.source.type = 'csv'
      return
    }

    if (mimeType === 'application/json') {
      this.source.type = 'json'
      return
    }

    if (mimeType === 'text/csv') {
      this.source.type = 'csv'
      return
    }

    if (mimeType === 'text/plain') {
      this.source.type = 'csv'
      return
    }

    throw new Error('Unsupported file type')

    // const rl = createInterface({
    //   input: createReadStream(this.options.source)
    // })

    // rl.on('line', line => {
    //   if (line === '') {
    //     throw new Error('Failed to detect file type')
    //   }

    //   if (line.includes('{')) {
    //     this.source.type = 'json'
    //     return
    //   }

    //   if (line.includes('"') || line.includes(',') || line.includes('\n')) {
    //     this.source.type = 'csv'
    //     return
    //   }
    //   throw new Error('Failed to detect file type')
    // })
  }

  async fileSize (): Promise<void> {
    const fstat = await stat(this.options.source)
    this.source.fileSize = fstat.size
  }

  sanitizeColumnNames (columns: string[]): string[] {
    return columns.map(column => column.replace(/[^a-zA-Z0-9]/g, '_'))
  }

  async columnHeader (): Promise<void> {
    if (this.source.type === 'csv') {
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
        this.source.columns.push(columns[0][c])
      }
      this.source.header = true
      return
    }

    if (this.source.type === 'json') {
      const mlr = millerCmd()
      const args = mlr.getCmd() + ' ' + mlr.jsonInput().jsonOutput().head(1).fileSource(this.options.source).getArgs().join(' ')

      const header = await execify(args)

      if (header.stderr !== '') {
        throw new Error(`failed-to-get-header-column: ${header.stderr}`)
      }

      const columns = JSON.parse(header.stdout)

      if (columns.length === 0) {
        throw new Error('failed-to-get-header-column: no columns found')
      }

      for (const c in columns[0]) {
        this.source.columns.push(c)
      }

      this.source.header = true
      return
    }

    throw new Error('Failed to get header column')
  }

  async preview (): Promise<void> {
    const mlr = millerCmd()
    const args = mlr.getCmd() + mlr.jsonOutput().head(5).fileSource(this.options.source).getArgs().join(' ')

    const preview = await execify(args)

    if (preview.stderr !== '') {
      throw new Error(preview.stderr)
    }

    const rows = JSON.parse(preview.stdout)

    if (rows.length === 0) {
      throw new Error('failed-to-get-preview: no rows found')
    }

    this.source.preview = rows
  }
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

    const c = new Catalog(catalogOpt)

    Promise.all([c.validateSource(), c.validateDestination(), c.fileType(), c.rowCount(), c.fileSize(), c.columnHeader()]).then(() => {
      resolve(c)
    }).catch(err => {
      reject(err)
    })
  })
}
