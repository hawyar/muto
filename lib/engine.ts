import { createCatalog, CatalogOptions, Catalog } from './catalog'
import { exec } from 'child_process'
import { parseStmt, Stmt } from './parser'
import { join } from 'path'
import { createWriteStream } from 'fs'
export { parseStmt } from './parser'
export { createCatalog } from './catalog'
const mlr = join(process.cwd(), 'node_modules', '.bin', 'mlr@v6.0.0')

export async function query (query: string, opt: CatalogOptions): Promise<void> {
  const catalog = await createCatalog(query, opt)

  if (catalog == null) {
    throw new Error('failed-to-create-catalog')
  }

  const plan = new Analyzer(catalog, parseStmt(query)).analyze()

  console.log(JSON.stringify(catalog, null, 2))

  const { stdout } = exec(plan.cmd + ' ' + plan.args.join(' '), {
    maxBuffer: 1024 * 1024 * 1024
  })

  if (stdout === null) {
    throw new Error('failed-to-execute-query')
  }

  stdout.on('close', () => {
    console.log('done')
  })
  stdout.pipe(createWriteStream(catalog.options.destination))
}

interface ExecutePlan {
  cmd: string
  args: string[]
}

class Analyzer {
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
    console.log('analyzing query')

    this.plan.cmd = mlr

    if (this.stmt.type !== 'select') {
      throw new Error('not-implemented: only select queries are supported at this time')
    }

    if (this.stmt.from.length === 1) {
      const table = this.stmt.from[0].relname
      console.log('from table: ', table)

      const source = this.catalog.options.source
      const destination = this.catalog.options.destination

      console.log('destination: ', destination)

      if (this.stmt.columns.length === 1) {
        if (this.stmt.columns[0].name === '*') {
          this.plan.args = ['--icsv', '--ojson', 'cat', source]
          return this.plan
        }

        this.plan.args = ['--icsv', '--ojson', 'cut', '-f', this.stmt.columns[0].name, source]
      }

      if (this.stmt.columns.length > 1) {
        const fields = this.stmt.columns.map((col: { name: string }) => col.name).join(',')
        console.log('fields: ', fields)
        this.plan.args = ['--icsv', '--ojson', 'cut', '-o', '-f', fields, source]
        return this.plan
      }
    }
    return this.plan
  }
}
