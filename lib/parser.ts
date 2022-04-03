// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { parse as sqlParser } from 'pgsql-parser'

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
  where: {
    operator: string
    left: string
    right: string
  }
  groupBy: string[]
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
  constructor (raw: string) {
    this.query = raw
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
      where: {
        operator: '',
        left: '',
        right: ''
      },
      groupBy: [],
      having: [],
      orderBy: [],
      limit: {
        type: '',
        val: ''
      }
    }
  }

  getStmt (): Stmt {
    return this.stmt
  }

  getColumns (): string[] {
    return this.stmt.columns.map(c => c.name)
  }

  isDistinct (): boolean {
    return this.stmt.distinct
  }

  getWhere (): { operator: string, left: string, right: string } {
    return this.stmt.where
  }

  limit (): number {
    return parseInt(this.stmt.limit.val)
  }

  getTable (): string {
    return this.stmt.from[0].relname
  }

  getType (): string {
    return this.stmt.type
  }

  getGroupBy (): string[] {
    return this.stmt.groupBy
  }

  parse (): Stmt {
    const raw = this.query

    if (raw.trim() === '') {
      throw new Error('invalid-query: no query found')
    }

    const rawAST = sqlParser(raw)

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

    if (ast.groupClause !== undefined) {
      const group = ast.groupClause.map((g: any) => {
        return g.ColumnRef.fields[0].String.str
      })

      this.stmt.groupBy = group
    }
    if (ast.whereClause !== undefined) {
      if (ast.whereClause !== null && ast?.whereClause?.A_Expr.kind === 'AEXPR_OP') {
        const expr = ast.whereClause.A_Expr

        const where = {
          operator: '',
          left: '',
          right: ''
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

export function parser (query: string): Parser {
  const p = new Parser(query)
  p.parse()
  return p
}
