import tap from 'tap'
import path from 'path'
import { createCatalog, createWorkflow } from '../dist/muto.mjs'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

tap.test('create catalog', async (t) => {
  const catalog = await createCatalog({
    source: path.join(dirname, 'example', 'albums.csv'),
    name: 'albums',
    output: 'json',
    destination: path.join(process.cwd(), 'beep.json')
  })

  // console.log(JSON.stringify(catalog, null, 2))
  const workflow = createWorkflow('my_etl')
  workflow.add(catalog)
  await workflow.query('SELECT album_title, num_of_sales FROM albums')
  t.ok('ok')
  t.end()
})
