import { parser } from '../dist/muto.mjs'
import tap from 'tap'

tap.test('select * from s3', async (t) => {
  const parsed = parser('select * from "s3://superbucket/more/files/stats.csv"')
  t.same(parsed.getColumns()[0], "*")
  t.same(parsed.getTable(), "s3://superbucket/more/files/stats.csv")
  t.end()
})

tap.test('select item2, item4 from localtmp', async (t) => {
  t.same(parser('select * from "../tmp/stats.csv"').getTable(), "../tmp/stats.csv")
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
  t.same(5, parser('select team, score from dd limit 5').getLimit())
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

tap.test('external source with where clause', async (t) => {
  const parsed = parser('select * from "s3://superbucket/more/files/stats.csv" where item == "green" group by color')
  t.same(parsed.getGroupBy(), ['color']);
  t.same(parsed.getWhere(), {
    left: 'item',
    operator: '==',
    right: 'green'
  })
  t.end()
})
