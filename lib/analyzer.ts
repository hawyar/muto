import { Catalog } from './catalog'
import { Stmt } from './parser'
import { millerCmd } from './miller'

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
    console.log('analyzing query:')

    const mlr = millerCmd()

    this.plan.cmd = mlr.getPath()

    if (this.stmt.type !== 'select') {
      throw Error('Only select queries are supported at this time')
    }

    if (this.stmt.from.length !== 1) {
      throw Error('Multi-table queries are not supported')
    }
    const table = this.stmt.from[0].relname
    console.log('table:', table)

    const source = this.catalog.options.source

    if (this.stmt.columns.length === 1) {
      if (this.stmt.columns[0].name === '*') {
        console.log('columns: *')
        this.plan.args = mlr.csvInput().jsonOutput().cat().fileSource(source).getArgs()
        return this.plan
      }

      const singleField = this.stmt.columns[0].name.replace(/[^a-zA-Z0-9]/g, '_')

      if (!this.catalog.source.columns.includes(singleField)) {
        throw new Error(`column-not-found: ${singleField}`)
      }

      this.plan.args = mlr.csvInput().jsonOutput().implicitCsvHeader(this.catalog.getColumns()).fileSource(source).getArgs()
      return this.plan
    }

    if (this.stmt.columns.length > 1) {
      const fields = this.stmt.columns.map(column => {
        const sanitized = column.name.replace(/[^a-zA-Z0-9]/g, '_')
        if (!this.catalog.source.columns.includes(sanitized)) {
          throw new Error(`column ${column.name} is not in the list of columns`)
        }
        return sanitized
      }).join(',')

      this.plan.args = ['--icsv', '--ojson', '--implicit-csv-header', 'label', `${this.catalog.source.columns.join(',')}`, 'then', 'cut', '-o', '-f', fields, source]
      return this.plan
    }

    throw Error('Error: no columns specified')
  }
}

export function createPlan (catalog: Catalog, stmt: Stmt): ExecutePlan {
  const analyzer = new Analyzer(catalog, stmt)
  return analyzer.analyze()
}
