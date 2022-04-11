import { join } from 'path'

// TODO: improve the type using template literals for the args
class Miller {
  path: string
  version: string
  args: string[]
  constructor () {
    this.version = '6.0.0'
    this.path = ''
    this.args = []
  }

  getCmd (): string {
    return this.path
  }

  getArgs (): string[] {
    return this.args
  }

  getPath (): string {
    if (this.path === '') {
      throw new Error('miller-path-not-set: missing miller binary path')
    }
    return this.path
  }

  fileSource (file: string): Miller {
    if (this.args.length === 0) {
      throw new Error('First specifiy the arguments then add the source file')
    }
    this.args.push(file)
    return this
  }

  csvInput (): Miller {
    this.args.push('--icsv')
    return this
  }

  jsonInput (): Miller {
    this.args.push('--ijson')
    return this
  }

  csvOutput (): Miller {
    this.args.push('--ocsv')
    return this
  }

  jsonOutput (): Miller {
    this.args.push('--ojson')
    return this
  }

  implicitCsvHeader (fields: string[]): Miller {
    this.args.push(`--implicit-csv-header label ${fields.join(',')}`)
    return this
  }

  // non flag arg
  count (): Miller {
    this.args.push('count')
    return this
  }

  cat (): Miller {
    this.args.push('cat')
    return this
  }

  // preserveHeaderColumnOrder (): Miller {
  //   if (!this.args.includes('cut')) {
  //     throw new Error('cut must be specified before choosing to preserve header column order')
  //   }
  //   this.args.push('-o')
  //   return this
  // }

  cut (fields: string[]): Miller {
    const wihthQuotes = fields.map(f => `"${f}"`)
    this.args.push(`cut -o -f ${wihthQuotes.join(',')}`)
    return this
  }

  head (count: number): Miller {
    this.args.push(`head -n ${count}`)
    return this
  }

  determinePath (): void {
    // TODO: if installed globally then use global npm path
    this.path = join('node_modules', '.bin', 'mlr@v' + this.version)
  }
}

export function millerCmd (): Miller {
  const mlr = new Miller()
  mlr.determinePath()
  return mlr
}
