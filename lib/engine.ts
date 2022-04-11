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

  console.log(`${plan.cmd} ${plan.args.join(' ')}`)

  const proc = spawn(plan.cmd, plan.args)

  proc.stdout.on('close', () => {
    if (opt.onEnd !== undefined) {
      opt.onEnd()
      return
    }
    console.log('query complete')
  })

  proc.on('error', (err) => {
    console.error(err)
    process.exit(1)
  })

  proc.on('exit', (code: number) => {
    if (code !== 0) {
      process.exit(code)
    }
  })
  proc.stdout.pipe(createWriteStream(opt.destination))
}

export {
  query,
  parser,
  createCatalog
}
