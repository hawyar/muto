import tap from 'tap'
import path from 'path'
import { query } from '../dist/muto.mjs'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

tap.test('select *', async (t) => {
  await query("select * from albums", {
    name: 'albums',
    input: 'csv',
    // source: '/Users/hawyar/Personal/ares/tests/fixtures/albums.csv',
    // source: "/Users/hawyar/Downloads/MUP_PHY_R21_P04_V10_D19_Prov.csv",
    source: "/Users/hawyar/Downloads/redbull.csv",
    output: 'json',
    destination: './beep22.json',
  })
  t.end()
})

