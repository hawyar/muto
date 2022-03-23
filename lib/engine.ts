import { createCatalog, CatalogOptions, Catalog } from './catalog'
import { exec } from 'child_process'
import { parseQuery, Stmt } from './parser'
import { join } from 'path'

const mlr = join(process.cwd(), 'node_modules', '.bin', 'mlr@v6.0.0')

export async function query (query: string, opt: CatalogOptions): Promise<void> {
  const ast = parseQuery(query)

  const catalog = await createCatalog(query, opt)

  if (catalog == null) {
    throw new Error('failed-to-create-catalog')
  }

  console.log(`created catalog for: ${catalog.name}`)

  const plan = new Analyzer(catalog, ast).analyze()

  console.log(`plan: ${JSON.stringify(plan, null, 2)}`)

  const { stdout, stderr } = exec(plan.cmd + ' ' + plan.args.join(' '))

  console.log(`stdout: ${stdout}`)
  console.log(`stderr: ${stderr}`)
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

    console.log(this.stmt)

    if (this.stmt.from.length === 1) {
      const table = this.stmt.from[0].relname
      console.log('from table: ', table)

      const source = this.catalog.options.source
      // const destination = this.catalog.options.destination
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
