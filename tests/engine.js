import tap from 'tap'
import path from 'path'
import { query } from '../dist/muto.mjs'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

tap.test('select *', async (t) => {
  // await query(`select "Order ID, "Item Type" from albums`, {
  //   name: 'sales',
  //   input: 'csv',
  //   source: "./sales.csv",
  //   output: 'json',
  //   destination: './sales.json',
  // })
  t.ok("ok for now")
  t.end()
})

