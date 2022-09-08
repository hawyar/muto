import { createCatalog} from './catalog'
import { createPlan } from './analyzer'
import { sqlStatementParser } from './parser'
import { createWriteStream } from 'fs'
import { execFile } from 'child_process'

async function query (raw: string): Promise<void> {
  const query = sqlStatementParser(raw)

  if (query.getType() !== 'select') throw new Error('only select queries are supported at this time')

  const catalog = await createCatalog({
    source: query.getTable(),
    destination: query.getDestination()
  })

  const plan = createPlan(catalog, query.getStmt())

  const proc = execFile(plan.cmd, plan.args, {
    maxBuffer: 1024 * 1024 * 1024
  }, (err, stdout, stderr) => {
    if (err != null) {
      console.error(err)
    }

    if (stderr !== '') throw new Error(stderr)
  })

  // const out = createWriteStream(catalog.metadata.destination)
  // if (proc.stdout != null) proc.stdout?.pipe(out)
}

export {
  query,
  sqlStatementParser,
  createCatalog
}
