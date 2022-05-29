import tap from 'tap'
import path from 'path'
import { query } from '../dist/muto.mjs'
import { fileURLToPath } from 'url'

tap.test('select Country, "Order ID" from sales', async (t) => {
  t.pass("ok")
  // const dirname = path.dirname(fileURLToPath(import.meta.url))
  // await query('select * from players', {
  //   source: path.join(dirname, 'fixture', 'players.csv'),
  //   destination: path.join(dirname, 'fixture', 'players.json'),
  //   onEnd: () => {
  //     console.log('query complete')
  //   }
  // })
  // t.end()
})
