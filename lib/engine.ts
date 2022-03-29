import { createCatalog, CatalogOptions, Catalog } from './catalog'
import { exec } from 'child_process'
import { parseStmt, Stmt } from './parser'
import { join } from 'path'
import { createWriteStream } from 'fs'
export { parseStmt } from './parser'
export { createCatalog } from './catalog'
export { parseS3URI, fileExists } from './plugin/s3'

const mlr = join(process.cwd(), 'node_modules', '.bin', 'mlr@v6.0.0')

export async function query (query: string, opt: CatalogOptions): Promise<void> {
  const catalog = await createCatalog(query, opt)

  if (catalog === null || catalog === undefined) {
    throw new Error('failed-to-create-catalog')
  }

  const plan = new Analyzer(catalog, parseStmt(query)).analyze()

  console.log(plan.cmd + ' ' + plan.args.join(' '))

  const { stdout } = exec(plan.cmd + ' ' + plan.args.join(' '), {
    maxBuffer: 1024 * 1024 * 1024
  })

  if (stdout === null) {
    throw new Error('failed-to-execute-query')
  }

  stdout.on('close', () => {
    console.log('done executing query')
  })
  stdout.pipe(createWriteStream(catalog.options.destination))
}

interface ExecutePlan {
  cmd: string
  args: string[]
}

export class Analyzer {
  catalog: Catalog
  stmt: Stmt
  plan: ExecutePlan
  constructor (catalog: Catalog, stmt: Stmt) {
    this.stmt = stmt
    this.catalog = catalog
    this.plan = {
      cmd: '',
      args: []
    }
  }

  analyze (): ExecutePlan {
    console.log('analyzing query:')

    this.plan.cmd = mlr

    if (this.stmt.type !== 'select') {
      throw new Error('not-implemented: only select queries are supported at this time')
    }

    if (this.stmt.from.length === 1) {
      const table = this.stmt.from[0].relname
      console.log('\t table:', table)

      const source = this.catalog.options.source

      if (this.stmt.columns.length === 1) {
        if (this.stmt.columns[0].name === '*') {
          this.plan.args = ['--icsv', '--ojson', '--implicit-csv-header', 'label', `${this.catalog.metadata.columns.join(',')}`, source]
          return this.plan
        }

        const singleField = this.stmt.columns[0].name.replace(/[^a-zA-Z0-9]/g, '_')

        if (!this.catalog.metadata.columns.includes(singleField)) {
          throw new Error(`column-not-found: ${singleField}`)
        }

        console.log('\t column:', singleField)

        this.plan.args = ['--icsv', '--ojson', '--implicit-csv-header', 'label', `${this.catalog.metadata.columns.join(',')}`, 'then', 'cut', '-f', singleField, source]

        return this.plan
      }

      if (this.stmt.columns.length > 1) {
        const fields = this.stmt.columns.map(column => {
          const sanitized = column.name.replace(/[^a-zA-Z0-9]/g, '_')
          if (!this.catalog.metadata.columns.includes(sanitized)) {
            throw new Error(`column ${column.name} is not in the list of columns`)
          }
          return sanitized
        }).join(',')

        console.log('\t columns: ', fields)
        this.plan.args = ['--icsv', '--ojson', '--implicit-csv-header', 'label', `${this.catalog.metadata.columns.join(',')}`, 'then', 'cut', '-o', '-f', fields, source]
        return this.plan
      }
    }
    return this.plan
  }
}
