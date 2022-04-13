import { createCatalog, CatalogOptions } from './catalog'
import { createPlan } from './analyzer'
import { parser } from './parser'
import { createWriteStream } from 'fs'
import { execFile } from 'child_process'

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

  console.log(`${plan.cmd} ${plan.args.join(' ')}`)
  const proc = execFile(plan.cmd, plan.args, {
    maxBuffer: 1024 * 1024 * 1024
  }, (err, stdout, stderr) => {
    if (err != null) {
      console.error(err)
    }

    if (stderr !== '') {
      console.error(stderr)
    }
  })

  if (proc.stdout != null) {
    proc.stdout?.pipe(createWriteStream(catalog.getOptions().destination))
  }
}

export {
  query,
  parser,
  createCatalog
}
