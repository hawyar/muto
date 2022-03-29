import tap from 'tap'
import path from 'path'
import { createCatalog } from '../dist/muto.mjs'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

tap.test('select *', async (t) => {
  const query = 'select * from sales'
  const catalog = await createCatalog(query, {
    source: path.join(dirname, 'fixture', 'sales.csv'),
    destination: path.join(dirname, 'fixture', 'sales.json')
  })

  console.log(JSON.stringify(catalog, null, 2))
  t.ok(catalog)
  t.end()
})
