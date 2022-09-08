import { createCatalog, CatalogOptions, Catalog } from './catalog'
import { createPlan } from './analyzer'
import { sqlStatementParser } from './parser'
import { createWriteStream } from 'fs'
import { execFile } from 'child_process'

async function query (raw: string): Promise<void> {
  const query = sqlStatementParser(raw)

  if (query.getType() !== 'select') throw new Error('Only select queries are supported at this time')

  const source = query.getTable()
  const destination = query.getDestination()

  const catalog = await createCatalog({
    source: query.getTable(),
    destination: './tmp.json'
  })

  // const plan = createPlan(catalog, query.getStmt())
  //
  // const proc = execFile(plan.cmd, plan.args, {
  //   maxBuffer: 1024 * 1024 * 1024
  // }, (err, stdout, stderr) => {
  //   if (err != null) {
  //     console.error(err)
  //   }
  //
  //   if (stderr !== '') throw new Error(stderr)
  // })
  //
  // if (proc.stdout != null) proc.stdout?.pipe(createWriteStream(catalog.metadata.destination))

}

(async function main () {
  await query('select * from "./tests/fixture/csv/sales.csv" to "./tmp.json"')
})()

export {
  query,
  sqlStatementParser,
  createCatalog
}
