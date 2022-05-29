import tap from 'tap'
import path from 'path'
import { createCatalog } from '../dist/muto.mjs'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

tap.test('create catalog, csv -> json', async (t) => {
  const catalog = await createCatalog({
    source: path.join(dirname, 'fixture', 'sales.csv'),
    destination: path.join(dirname, 'fixture', 'sales.json'),
    onEnd: () => {
      console.log('done')
    }
  })
  t.same( catalog.getColumns(), [
    'Region',
    'Country',
    'Item Type',
    'Sales Channel',
    'Order Priority',
    'Order Date',
    'Order ID',
    'Ship Date',
    'Units Sold',
    'Unit Price',
    'Unit Cost',
    'Total Revenue',
    'Total Cost',
    'Total Profit'
  ])
  t.same(catalog.getDestination().path.base, 'sales.json')
  t.end()
})

tap.test('create catalog, csv -> json', async (t) => {
  const catalog = await createCatalog({
    source: path.join(dirname, 'fixture', 'players.csv'),
    destination: path.join(dirname, 'fixture', 'players.json'),
    onEnd: () => {
      console.log('done')
    }
  })
  t.same(catalog.getDestination().path.base, 'players.json')
  t.end()
})


// tap.test('create catalog, json -> csv', async (t) => {
//   const catalog = await createCatalog({
//     source: path.join(dirname, 'fixture', 'sales.csv'),
//     destination: path.join(dirname, 'fixture', 'sales.json'),
//     onEnd: () => {
//       console.log('done')
//     }
//   })
//   t.same([
//     'Region',
//     'Country',
//     'Item Type',
//     'Sales Channel',
//     'Order Priority',
//     'Order Date',
//     'Order ID',
//     'Ship Date',
//     'Units Sold',
//     'Unit Price',
//     'Unit Cost',
//     'Total Revenue',
//     'Total Cost',
//     'Total Profit'
//   ], catalog.getColumns())
//   t.same(catalog.getDestination().path.base, 'sales.json')
//   t.end()
// })

