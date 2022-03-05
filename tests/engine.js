import tap from 'tap'
import path from 'path'
import { createCatalog } from '../dist/muto.mjs'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

tap.test('create catalog', async (t) => {
  const source = path.join(dirname, 'example', 'albums.csv')

  const catalog = await createCatalog(source, {
    name: 'albums',
    output: 'json',
    destination: './beep.json'
  })

  console.log(catalog)

  // const workflow = createWorkflow('untitled_work')

  // workflow.query('SELECT id, beep as boop from albums')

  // t.ok(workflow)
  t.ok('ok')
  t.end()
})
