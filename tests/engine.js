import tap from 'tap'
import path from 'path'
import { query } from '../dist/muto.mjs'
import { fileURLToPath } from 'url'

tap.test('select Country, "Order ID" from sales', async (t) => {
  // const dirname = path.dirname(fileURLToPath(import.meta.url))
  // await query('select * from sales', {
  //   source: path.join(dirname, 'fixture', 'sales.csv'),
  //   destination: path.join(dirname, 'fixture', 'sales.json'),
  //   onEnd: () => {
  //     console.log('query complete')
  //   }
  // })
  t.end()
})
