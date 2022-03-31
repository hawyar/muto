import isInstalledGlobally from 'is-installed-globally'
import { join } from 'path'
import { cwd } from 'process'
import { existsSync } from 'fs'
import { execSync } from 'child_process'

class Miller {
  path: string
  version: string
  args: string[]
  constructor () {
    this.version = '6.0.0'
    this.path = join(cwd(), 'node_modules', '.bin', 'mlr@v' + this.version)
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

  head (count: number): Miller {
    this.args.push(`head -n ${count}`)
    return this
  }

  determinePath (): void {
    if (isInstalledGlobally) {
      const stdout = execSync('npm root -g')

      if (stdout === null) {
        throw new Error('Failed to find global miller path')
      }

      const global = join(stdout.toString().trim(), 'muto', 'node_modules', '.bin', 'mlr@' + this.version)

      if (existsSync(global)) {
        this.path = global
      }
      return
    }

    if (this.path === '') {
      this.path = join(cwd(), 'node_modules', '.bin', 'mlr@' + this.version)
    }
  }
}

export function millerCmd (): Miller {
  const mlr = new Miller()
  mlr.determinePath()
  return mlr
}
