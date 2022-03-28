import tap from 'tap'
import path from 'path'
import { query , createCatalog} from '../dist/muto.mjs'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

tap.test('select *', async (t) => {
  const catalog = await createCatalog('select * from sales',{
    name: 'sales',
    input: 'csv',
    source: `./tests/sales.csv`,
    output: 'json',
    destination: `./sales.json`,
  })
  console.log(JSON.stringify(catalog, null, 2))
  t.ok("ok for now")
  t.end()
})

