export { createCatalog } from './catalog'
export { parseQuery } from './parser'
// import fs from 'fs'
// import { spawn } from 'child_process'
// import { parseQuery, Stmt } from './parser'
// import { Catalog } from './catalog'
// import { join } from 'path'

// class Workflow {
//   name: string
//   catalogs: Map<string, Catalog>
//   createdAt: Date
//   env: env
//   stmt: string

//   constructor (name: string) {
//     this.name = name
//     this.catalogs = new Map()
//     this.createdAt = new Date()
//     this.env = 'local'
//     this.stmt = ''
//   }

//   list (): Catalog[] {
//     return Array.from(this.catalogs.values())
//   }

//   remove (dataset: Catalog): void {
//     this.catalogs.delete(dataset.options.source)
//   }

//   get (source: string): Catalog | undefined {
//     if (this.catalogs.get(source) != null) {
//       return this.catalogs.get(source)
//     }
//     return undefined
//   }

//   add (catalog: Catalog | [Catalog]): string | string[] {
//     if (Array.isArray(catalog)) {
//       if (catalog.length === 1 && catalog[0].name !== '') {
//         const c = catalog[0]
//         if (this.catalogs.has(c.name)) {
//           throw new Error(`duplicate-dataset: ${c.name}`)
//         }
//         this.catalogs.set(c.name, c)
//         return c.name
//       }

//       catalog.forEach((c) => {
//         if (this.catalogs.has(c.name)) {
//           throw new Error(`duplicate-dataset: ${c.name}`)
//         }
//         console.log(`added ${c.name} to the workflow`)
//         this.catalogs.set(c.name, c)
//       })
//       return catalog.map((c) => c.name)
//     }

//     if (this.catalogs.has(catalog.name)) {
//       throw new Error(`duplicate-dataset: ${catalog.name}`)
//     }

//     this.catalogs.set(catalog.name, catalog)
//     console.log(`added ${catalog.name} to the workflow`)
//     return catalog.name
//   }

//   async query (raw: string): Promise<void> {
//     let from = ''

//     const ast = parseQuery(raw)

//     if (ast.from.length === 1) {
//       from = ast.from[0].relname
//     }

//     console.log(`raw query: ${raw}`)

//     if (!this.catalogs.has(from)) {
//       throw new Error(`unknown-catalog: ${from}`)
//     }

//     const catalog = this.catalogs.get(from)

//     if (catalog == null) {
//       throw new Error(`catalog-not-found: ${from}`)
//     }

//     console.log(`using catalog: ${catalog.name}`)

//     const plan = new Analyzer(catalog, ast).analyze()

//     console.log(`plan: ${JSON.stringify(plan, null, 2)}`)

//     if (catalog.connector instanceof fs.WriteStream) {
//       console.log(`${plan.cmd} ${plan.args.join(' ')}`)
//       const proc = spawn(plan.cmd, plan.args)
//       proc.stdout.pipe(catalog.connector)
//     }

//     // const outputF = fs.createWriteStream(catalog.options.destination)

//     // proc.stdout.pipe(catalog.connector)

//     // const mlrExec = await spawn(plan.cmd, plan.args)

//     // pipe to wriestream on catalog

//     // mlrExec.stdout.pipe(catalog.connector)

//     // console.log(`query result: ${res.stdout}`)
//   }
// }

// export function createWorkflow (name: string): Workflow {
//   console.log(`created workflow: ${name}`)
//   return new Workflow(name)
// }

// const mlr = join(process.cwd(), 'node_modules', 'muto', 'node_modules', '.bin', 'mlr@v6.0.0')

// type env = 'local' | 'aws'

// interface ExecutePlan {
//   cmd: string
//   args: string[]
// }

// class Analyzer {
//   catalog: Catalog
//   stmt: Stmt
//   plan: ExecutePlan
//   constructor (catalog: Catalog, stmt: Stmt) {
//     this.stmt = stmt
//     this.catalog = catalog
//     this.plan = {
//       cmd: '',
//       args: []
//     }
//   }

//   analyze (): ExecutePlan {
//     console.log('analyzing query')

//     this.plan.cmd = mlr

//     if (this.stmt.type !== 'select') {
//       throw new Error('not-implemented: only select queries are supported at this time')
//     }

//     console.log(this.stmt)

//     if (this.stmt.from.length === 1) {
//       const table = this.stmt.from[0].relname
//       console.log('from table: ', table)

//       const source = this.catalog.options.source
//       // const destination = this.catalog.options.destination
//       if (this.stmt.columns.length === 1) {
//         if (this.stmt.columns[0].name === '*') {
//           this.plan.args = ['--icsv', '--ojson', 'cat', source]
//           return this.plan
//         }

//         this.plan.args = ['--icsv', '--ojson', 'cut', '-f', this.stmt.columns[0].name, source]
//       }

//       if (this.stmt.columns.length > 1) {
//         const fields = this.stmt.columns.map((col: { name: string }) => col.name).join(',')
//         console.log('fields: ', fields)
//         this.plan.args = ['--icsv', '--ojson', 'cut', '-o', '-f', fields, source]
//         return this.plan
//       }
//     }
//     return this.plan
//   }
// }
