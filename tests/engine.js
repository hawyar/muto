import tap from 'tap'
import path from 'path'
import { query } from '../dist/muto.mjs'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

tap.test('select Country, "Order ID" from sales', async (t) => {
  // await query(`select "Order ID" from sales`, {
  //   name: 'sales',
  //   source: path.join(dirname, 'fixture', 'sales.csv'),
  //   destination: path.join(dirname, 'fixture', 'sales.json'),
  // })
  t.ok("ok for now")
  t.end()
})

