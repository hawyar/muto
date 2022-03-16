import tap from 'tap'
import path from 'path'
import { createCatalog, createWorkflow } from '../dist/muto.mjs'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

tap.test('select *', async (t) => {
  const catalog = await createCatalog({
    source: path.join(dirname, 'example', 'albums.csv'),
    name: 'albums',
    output: 'json',
    destination: path.join(process.cwd(), 'result1.json')
  })

  const workflow = createWorkflow('my_etl')
  workflow.add(catalog)
  await workflow.query('SELECT * FROM albums')

  t.ok(catalog)
  t.end()
})

// tap.test('select *', async (t) => {
//   const catalog = await createCatalog({
//     source: path.join(dirname, 'example', 'albums.csv'),
//     name: 'albums',
//     output: 'json',
//     destination: path.join(process.cwd(), 'result2.json')
//   })

//   const workflow = createWorkflow('my_etl')
//   workflow.add(catalog)
//   await workflow.query('SELECT album_title FROM albums WITH ( format = "json" source = "./test/example/albums.csv" destination = "result3.json" )')

//   t.ok(catalog)
//   t.end()
// })
