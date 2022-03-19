import { parseQuery } from '../dist/muto.mjs'
import tap from 'tap'

tap.test('select *', async (t) => {
  console.log(parseQuery('select * from my_albums'))
  t.ok('ok')
  t.end()
})

tap.test('select field1, field2', async (t) => {
  console.log(parseQuery('select id, name from users'))
  t.ok('ok')
  t.end()
})

tap.test('distinct', async (t) => {
  t.same(true, parseQuery('select distinct id, name from t.users').distinct)
  t.end()
})

tap.test('limit', async (t) => {
  t.same('5', parseQuery('select team, score from dd limit 5').limit.val)
  t.end()
})
