// import path, { ParsedPath } from 'path'
import { createInterface } from 'readline'
import os from 'os'
import { constants, createReadStream } from 'fs'
import { exec } from 'child_process'
import util from 'util'
import { access, stat } from 'fs/promises'
import { millerCmd } from './miller'

import path from 'path'
const execify = util.promisify(exec)

enum Delimiter {
    Comma = ',',
}

enum Format {
    CSV = 'csv',
    JSON = 'json'
}

interface Metadata {
  source: string
  destination: string
  type: Format
  header: boolean
  columns: string[]
  rowCount: number
  fileSize: number
  spanMultipleLines: boolean
  quotes: boolean
  delimiter: Delimiter
  preview?: string[][]
}

export interface CatalogOptions {
  source: string
  destination: string
  inputFormat: Format
  outputFormat: Format
  delimiter: Delimiter
  onEnd?: () => void
}

export class Catalog {
  options: CatalogOptions
  metadata: Metadata | null
  constructor (opt: CatalogOptions) {
    this.options = opt
    this.metadata = null
  }
  // async rowCount (): Promise<void> {
  //   const mlr = millerCmd()
  //
  //   if (this.metadata.type === 'json') {
  //     return
  //   }
  //   const args = mlr.getCmd() + ' ' + mlr.jsonOutput().count().fileSource(this.options.source).getArgs().join(' ')
  //
  //   const count = await execify(args)
  //
  //   if (count.stderr !== '') {
  //     throw new Error(`failed to count rows: ${count.stderr}`)
  //   }
  //
  //   const rowCount = JSON.parse(count.stdout)
  //
  //   if (rowCount.length === 0) {
  //     throw new Error('failed to count rows: no rows found')
  //   }
  //
  //   if (rowCount[0].count === undefined) {
  //     throw new Error('failed to count rows: no count found')
  //   }
  //   this.metadata.rowCount = rowCount[0].count
  // }

  // async validateSource (): Promise<void> {
  //   console.log('validating source')
  //   console.log(this.options.source)
  //
  //   console.log(this.options.source.split('://'))
  //
  //   if (this.options.source.split('://')[0] === 's3') {
  //     this.metadata.source = this.options.source
  //   } else {
  //     const fstat = await stat(this.options.source)
  //
  //     if (!fstat.isFile()) {
  //       throw Error('Source path is not a file')
  //     }
  //
  //     await access(this.options.source, constants.R_OK).catch(() => {
  //       throw Error('Source file is not readable')
  //     })
  //
  //     if (fstat.size === 0) {
  //       throw Error('Source file is empty')
  //     }
  //
  //     // path.parse(this.options.source)
  //     this.metadata.source = this.options.source
  //   }
  // }

  // async validateDestination (): Promise<void> {
  //   if (this.metadata.destination.startsWith('../') || this.metadata.destination.startsWith('./')) {
  //     const fstat = await stat(this.options.source)
  //
  //     if (!fstat.isFile()) {
  //       throw Error('Source path is not a file')
  //     }
  //
  //     await access(this.options.source, constants.R_OK).catch(() => {
  //       throw Error('Source file is not readable')
  //     })
  //
  //     if (fstat.size === 0) {
  //       throw Error('Source file is empty')
  //     }
  //   }
  //   throw new Error('Destination file extension is not supported')
  // }

  // async fileType (): Promise<void> {
  //   if (os.platform() !== 'linux' && os.platform() !== 'darwin') {
  //     throw new Error('Unsupported platform')
  //   }
  //   const { stdout, stderr } = await execify(`file ${this.options.source} --mime-type`)
  //
  //   if (stderr !== '') {
  //     throw new Error(stderr)
  //   }
  //
  //   const mimeType = stdout.split(':')[1].trim()
  //
  //   if (mimeType === 'application/json') {
  //     this.metadata.type = 'json'
  //     return
  //   }
  //
  //   if (mimeType === 'application/csv') {
  //     this.metadata.type = 'csv'
  //     return
  //   }
  //
  //   if (mimeType === 'application/json') {
  //     this.metadata.type = 'json'
  //     return
  //   }
  //
  //   if (mimeType === 'text/csv') {
  //     this.metadata.type = 'csv'
  //     return
  //   }
  //
  //   if (mimeType === 'text/plain') {
  //     this.metadata.type = 'csv'
  //     return
  //   }
  //
  //   throw new Error('Unsupported file type')
  // }

  // async fileSize (): Promise<void> {
  //   const fstat = await stat(this.options.source)
  //   this.metadata.fileSize = fstat.size
  // }
  //
  // sanitizeColumnNames (columns: string[]): string[] {
  //   return columns.map(column => column.replace(/[^a-zA-Z0-9]/g, '_'))
  // }

  // async hasQuotes (): Promise<void> {
  //   const rl = createInterface({
  //     input: createReadStream(this.options.source)
  //   })
  //
  //   let row = 0
  //
  //   rl.on('line', line => {
  //     if (row === 0) {
  //       const items = line.split(this.options.delimiter)
  //       console.log(items)
  //
  //       items.forEach(item => {
  //         if (item.match(/"(.*?)"/g) !== null && item.match(/'(.*?)'/g) !== null) {
  //           this.metadata.quotes = true
  //         }
  //       })
  //     }
  //     row++
  //   })
  // }

  // async columnHeader (): Promise<void> {
  //   if (this.metadata.type === 'csv') {
  //     const mlr = millerCmd()
  //     const args = mlr.getCmd() + ' ' + mlr.jsonOutput().head(1).fileSource(this.options.source).getArgs().join(' ')
  //
  //     const header = await execify(args)
  //
  //     if (header.stderr !== '') {
  //       throw new Error(`failed-to-get-header-column: ${header.stderr}`)
  //     }
  //     const columns = JSON.parse(header.stdout)
  //
  //     if (columns.length === 0) {
  //       throw new Error('failed-to-get-header-column: no columns found')
  //     }
  //
  //     for (const c in columns[0]) {
  //       this.metadata.columns.push(columns[0][c])
  //     }
  //     this.metadata.header = true
  //     return
  //   }
  //
  //   if (this.metadata.type === 'json') {
  //     const mlr = millerCmd()
  //     const args = mlr.getCmd() + ' ' + mlr.jsonInput().jsonOutput().head(1).fileSource(this.options.source).getArgs().join(' ')
  //
  //     const header = await execify(args)
  //
  //     if (header.stderr !== '') {
  //       throw new Error(`failed-to-get-header-column: ${header.stderr}`)
  //     }
  //
  //     const columns = JSON.parse(header.stdout)
  //
  //     if (columns.length === 0) {
  //       throw new Error('failed-to-get-header-column: no columns found')
  //     }
  //
  //     for (const c in columns[0]) {
  //       this.metadata.columns.push(c)
  //     }
  //
  //     this.metadata.header = true
  //     return
  //   }
  //
  //   throw new Error('Failed to get header column')
  // }

  // async preview (): Promise<void> {
  //   const mlr = millerCmd()
  //   const args = mlr.getCmd() + mlr.jsonOutput().head(5).fileSource(this.options.source).getArgs().join(' ')
  //
  //   const preview = await execify(args)
  //
  //   if (preview.stderr !== '') {
  //     throw new Error(preview.stderr)
  //   }
  //
  //   const rows = JSON.parse(preview.stdout)
  //
  //   if (rows.length === 0) {
  //     throw new Error('failed-to-get-preview: no rows found')
  //   }
  //
  //   this.metadata.preview = rows
  // }
}

export async function createCatalog (opt: CatalogOptions): Promise<Catalog> {
  return await new Promise((resolve, reject) => {
    if (opt === undefined) {
      reject('missing options')
    }

    if (opt.source === undefined || opt.source === '') {
      reject('failed to create catalog: missing source')
    }

    if (opt.destination === undefined || opt.destination === '') {
      reject('failed to create catalog: missing destination')
    }

    const catalogOpt = {
        source: opt.source,
        destination: opt.destination,
        inputFormat: Format.CSV,
        outputFormat: Format.CSV,
        delimiter: opt.delimiter || ',',
    }

    if (opt.inputFormat === undefined) {
      switch (path.extname(opt.source)) {
        case '.csv':
          catalogOpt.inputFormat = Format.CSV
          break
        case '.json':
          catalogOpt.inputFormat = Format.JSON
          break
        default:
          reject(new Error('failed to create catalog: unsupported source file type'))
      }
    }
    const c = new Catalog(catalogOpt)
    // run all functions after validate source and destination
    // Promise.all([c.validateSource(), c.validateDestination(), c.hasQuotes(), c.fileType(), c.rowCount(), c.fileSize(), c.columnHeader()]).then(() => {
    //   resolve(c)
    // }).catch(err => {
    //   reject(err)
    // })
  })
}
