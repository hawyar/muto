import { parseStmt } from '../dist/muto.mjs'
import tap from 'tap'

tap.test('select *', async (t) => {
  t.same("*", parseStmt('select *').columns[0].name)
  t.end()
})

tap.test('select field1, field2', async (t) => {
  t.same('users',parseStmt('select id, name from users').from[0].relname)
  t.end()
})

tap.test('select "FIELD"', async (t) => {
  t.same('WEEKLY_RATINGS',parseStmt('select player_name, "WEEKLY_RATINGS" from season_2021').columns[1].name)
  t.end()
})


tap.test('distinct clause', async (t) => {
  t.same(true, parseStmt('select distinct id, name from t.users').distinct)
  t.end()
})

tap.test('limit clause', async (t) => {
  t.same('5', parseStmt('select team, score from dd limit 5').limit.val)
  t.end()
})

tap.test('where clause', async (t) => {
  t.same('43', parseStmt('select team, score from bb where id = 43 limit 5').where.right)
  t.end()
})
