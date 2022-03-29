import { join } from 'path'
import { cwd } from 'process'
import { execSync } from 'child_process'

import { existsSync } from 'fs'
class Miller {
  path: string
  version: string
  cmd: string
  args: string[]
  constructor () {
    this.path = ''
    this.version = '6.0.0'
    this.cmd = 'mlr@' + 'v' + this.version
    this.args = []
  }

  binPath (): void {
    const local = join(cwd(), '/node_modules', '.bin', this.cmd)
    if (existsSync(local)) {
      this.path = local
      return
    }

    const stdout = execSync('npm root -g')

    console.log(stdout.toString())

    if (stdout === null) {
      throw new Error('failed-command: "npm root -g"')
    }

    const global = stdout.toString().trim()

    if (existsSync(join(global, 'muto', 'node_modules', '.bin', this.cmd))) {
      this.path = join(global, 'muto', 'node_modules', '.bin', this.cmd)
      return
    }
    throw new Error('unable-to-find-mlr: make sure you the `npm run pre` is run')
  }
}

export function millerCmd (): Miller {
  const mlr = new Miller()

  // settle the .bin dir for mlr
  mlr.binPath()
  return mlr
}
