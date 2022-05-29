import { parser } from '../dist/muto.mjs'
import tap from 'tap'

tap.test('select *', async (t) => {
  t.same('*', parser('select * from mytable').getColumns()[0])
  t.end()
})

tap.test('select field1, "FIELD_2"', async (t) => {
  t.same(['field1', 'ffFIELD22'], parser('select field1, "ffFIELD22" from mytable').getColumns())
  t.end()
})

tap.test('distinct clause', async (t) => {
  t.ok(parser('select distinct id, name from t.users').isDistinct())
  t.end()
})

tap.test('limit clause', async (t) => {
  t.same(5, parser('select team, score from dd limit 5').limit())
  t.end()
})

tap.test('where clause', async (t) => {
  t.same({
    left: 'team',
    operator: '=',
    right: 'sd5432'
  }, parser('select team, score from dd where team = "sd5432"').getWhere())
  t.end()
})

tap.test('select * from store where item == "green" group by color ', async (t) => {
  t.same(['color', 'size'], parser('select * from store where item == "green" group by color, size').getGroupBy())
  const f = parser('select id, track from "s3://mybuck/to/fodlder/albums.csv"')

  console.log(JSON.stringify(f, null, 2))
  t.end()
})
