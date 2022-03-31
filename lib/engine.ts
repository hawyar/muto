import { createCatalog, CatalogOptions } from './catalog'
import { createPlan } from './analyzer'
import { parser } from './parser'
import { spawn } from 'child_process'
import { createWriteStream } from 'fs'

async function query (raw: string, opt: CatalogOptions): Promise<void> {
  if (raw === undefined || raw === '') {
    throw new Error('No query provided')
  }

  const query = parser(raw)

  if (query.getType() !== 'select') {
    throw new Error('Only select queries are supported at this time')
  }

  const catalog = await createCatalog(opt)

  const plan = createPlan(catalog, query.getStmt())

  const proc = spawn(plan.cmd, plan.args)

  proc.on('error', (err) => {
    console.error(err)
  })

  if (proc.stdout === null) {
    throw new Error('stdout is null')
  }

  const ws = createWriteStream(catalog.getDestination())
  proc.stdout.pipe(ws)
}

export {
  query,
  parser,
  createCatalog
}
