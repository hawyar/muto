// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { parse } from 'pgsql-parser'

export interface Stmt {
  type: string
  distinct: boolean
  columns: [{
    name: string
    type: string
  }]
  from: [{
    schemaname: string
    relname: string
    inh: string
  }]
  sort: {}
  where: {}
  group: string[]
  having: string[]
  orderBy: string[]
  limit: {
    type: string
    val: string
  }
}

class Parser {
  query: string
  stmt: Stmt
  constructor () {
    this.query = ''
    this.stmt = {
      type: '',
      distinct: false,
      columns: [{
        name: '',
        type: ''
      }],
      from: [{
        schemaname: '',
        relname: '',
        inh: ''
      }],
      sort: {},
      where: {},
      group: [],
      having: [],
      orderBy: [],
      limit: {
        type: '',
        val: ''
      }
    }
  }

  parse (raw: string): Stmt {
    if (raw.trim() === '') {
      throw new Error('invalid-query: no query found')
    }

    console.log(`raw: ${raw}`)
    const rawAST = parse(raw)

    if (Object.keys(rawAST[0].RawStmt.stmt)[0] === 'SelectStmt') {
      this.stmt.type = 'select'
    }

    const ast = rawAST[0].RawStmt.stmt.SelectStmt
    const limit = ast.limitOption

    if (limit === 'LIMIT_OPTION_DEFAULT') {
      this.stmt.limit = {
        type: ast.limitOption,
        val: ''
      }
    }

    if (limit === 'LIMIT_OPTION_COUNT' && ast.limitCount !== '') {
      this.stmt.limit = {
        type: ast.limitOption,
        val: ast.limitCount.A_Const.val.Integer.ival
      }
    }

    if (ast.distinctClause !== undefined) {
      this.stmt.distinct = true
    }

    if (ast.targetList !== undefined) {
      this.stmt.columns = ast.targetList.map(
        (t: {
          ResTarget: { val: { ColumnRef: { fields: any[] } }}
        }) => {
          const col = t.ResTarget.val.ColumnRef.fields[0]

          if (col.A_Star !== undefined) {
            return {
              name: '*'
            }
          }
          return {
            name: col.String.str
          }
        }
      )
    }

    if (ast.fromClause !== undefined) {
      this.stmt.from = ast.fromClause.map((from: { RangeVar: any }) => {
        const source = {
          schemaname: '',
          relname: '',
          inh: ''
        }

        const t = from.RangeVar

        if (t.schemaname !== undefined) {
          source.schemaname = t.schemaname
        }

        if (t.relname !== undefined) {
          source.relname = t.relname
        }

        if (t.inh !== undefined) {
          source.inh = t.inh
        }

        return source
      })
    }

    // if (ast["sortClause"]) {
    //     console.log(ast["sortClause"][0].SortBy)
    // }

    if (ast.whereClause !== undefined) {
      if (ast.whereClause !== null && ast?.whereClause?.A_Expr.kind === 'AEXPR_OP') {
        const expr = ast.whereClause.A_Expr

        const where = {
          operator: '',
          left: {},
          right: {}
        }

        where.operator = expr.name[0].String.str

        if (expr.lexpr !== undefined) {
          where.left = expr.lexpr.ColumnRef.fields[0].String.str
        }

        if (expr.rexpr !== undefined) {
          if (expr.rexpr.ColumnRef !== undefined && Object.keys(expr.rexpr.ColumnRef.fields[0]).includes('String')) {
            where.right = expr.rexpr.ColumnRef.fields[0].String.str
          }
          if (expr.rexpr.A_Const !== undefined) {
            where.right = expr.rexpr.A_Const.val.Integer.ival
          }
        }
        this.stmt.where = where
      }

      if (ast.whereClause.A_Expr !== undefined && ast?.whereClause?.A_Expr.kind === 'AEXPR_IN') {
        // const expr = ast.whereClause.A_Expr
      }

      if (ast.whereClause.BoolExpr !== undefined) {
        if (ast.whereClause.BoolExpr.boolop === 'AND_EXPR') {
          // const args = ast.whereClause.BoolExpr.args
        }

        if (ast.whereClause.BoolExpr.boolop === 'OR_EXPR') {
          // const args = ast.whereClause.BoolExpr.args
        }
      }
    }
    return this.stmt
  }
}

export function parseStmt (query: string): Stmt {
  return new Parser().parse(query)
}
