import tap from 'tap'
import path from 'path'
import { createCatalog } from '../dist/muto.mjs'
import { fileURLToPath } from 'url'
import fs from 'fs'

const dirname = path.dirname(fileURLToPath(import.meta.url))

tap.test('create catalog', async (t) => {
  const source = path.join(dirname, 'example', 'albums.csv')

  const catalog = await createCatalog(source, {
    name: 'albums',
    output: 'json',
    destination: path.join(process.cwd(), 'beep.json')
  })

  fs.writeFileSync('eeee.json'), JSON.stringify(catalog, null, 2))

  // const workflow = createWorkflow('untitled_work')

  // workflow.add(catalog)

  // await workflow.query('SELECT album_title, num_of_sales FROM albums')

  t.ok('ok')
  t.end()
})
