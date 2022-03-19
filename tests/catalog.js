import tap from 'tap'
import path from 'path'
import { createCatalog } from '../dist/muto.mjs'
// import { fileURLToPath } from 'url'

// const dirname = path.dirname(fileURLToPath(import.meta.url))

tap.test('create catalog from local dataset', async (t) => {
  const catalog = await createCatalog({
    source: '/Users/hawyar/Desktop/icd10pcs_list_findacode.csv',
    // source: path.join(dirname, 'example', ''),
    name: 'npi_data',
    output: 'json',
    destination: path.join(process.cwd(), 'result1.json')
  })

  console.log(JSON.stringify(catalog, null, 2))

  t.ok(catalog)
  t.end()
})

// tap.test('missing source', async (t) => {
//   t.rejects(async () => await createCatalog({
//     name: 'albums',
//     output: 'json',
//     destination: path.join(process.cwd(), 'result1.json')
//   }), 'failed-to-create-catalog: no source provided')
//   t.end()
// })

// tap.test('missing destination', async (t) => {
//   t.rejects(async () => await createCatalog({
//     source: path.join(dirname, 'example', 'albums.csv'),
//     name: 'albums',
//     output: 'json'
//   }), 'failed-to-create-catalog: no destination provided')
//   t.end()
// })

// SELECT Name
// FROM Customers
// WHERE EXISTS
//     (SELECT Item
//      FROM Orders
//      WHERE Customers.ID = Orders.ID
//        AND Price < 50)
