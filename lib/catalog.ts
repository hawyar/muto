import path, { ParsedPath } from 'path'
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
  path: ParsedPath
  type: DataType
  columns: string[]
  header: boolean
  fileSize: number
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
      path: {
        root: '',
        dir: '',
        base: '',
        ext: '',
        name: ''
      },
      type: 'csv',
      columns: [],
      header: false,
      fileSize: 0,
      rowCount: 0,
      spanMultipleLines: false,
      quotes: false,
      delimiter: ',',
      errors: {},
      warnings: {},
      preview: []
    }
    this.destination = {
      path: {
        root: '',
        dir: '',
        base: '',
        ext: '',
        name: ''
      },
      type: 'csv',
      columns: [],
      header: false,
      fileSize: 0,
      rowCount: 0,
      spanMultipleLines: false,
      quotes: false,
      delimiter: ',',
      errors: {},
      warnings: {},
      preview: []
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
    const args = mlr.getCmd() + ' ' + mlr.jsonOutput().count().fileSource(this.options.source).getArgs().join(' ')

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
    this.source.rowCount = rowCount[0].count
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
      this.source.columns.push(columns[0][c])
    }
    this.source.header = true
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

  async validateDestination (): Promise<void> {
    this.destination.path = path.parse(this.options.destination)
  }

  async fileType (): Promise<void> {
    if (os.platform() !== 'linux' && os.platform() !== 'darwin') {
      throw new Error('unsupported-platform')
    }

    const { stdout, stderr } = await execify(`file ${this.options.source} --mime-type`)

    if (stderr !== '') {
      throw new Error(`failed-to-detect-mime-type: ${stderr}`)
    }

    const mimeType = stdout.split(':')[1].trim()

    if (mimeType === 'application/json') {
      throw new Error('failed-to-detect-mime-type')
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

    // TODO: find a better way! we could still be wrong
    const rl = createInterface({
      input: createReadStream(this.options.source)
    })

    let first = ''

    rl.on('line', line => {
      first = line
      rl.close()
    })

    rl.on('close', () => {
      if (first.startsWith('{') || first.startsWith('[')) {
        return true
      }

      if (this.options.delimiter === undefined) {
        const firstLineSplit = first.split(this.options.delimiter)

        if (firstLineSplit.length === this.source.columns.length) {
          this.source.type = 'csv'
          return true
        }
      }

      throw new Error('failed-to-detect-mime-type')
    })
    throw Error(`Unsupported file type ${mimeType}`)
  }

  async fileSize (): Promise<void> {
    const fstat = await stat(this.options.source)
    this.source.fileSize = fstat.size
  }

  sanitizeColumnNames (columns: string[]): string[] {
    return columns.map(column => column.replace(/[^a-zA-Z0-9]/g, '_'))
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

    const catalog = new Catalog(catalogOpt)

    Promise.all([
      catalog.validateSource(),
      catalog.validateDestination(),
      catalog.columnHeader(),
      catalog.fileSize(),
      catalog.fileType(),
      catalog.rowCount()
    ])
      .then(() => {
        console.log(`created catalog ${catalog.getSource().path.name}`)
        resolve(catalog)
      })
      .catch((err) => reject(err))
  })
}
