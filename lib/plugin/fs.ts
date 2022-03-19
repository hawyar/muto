import fs from 'fs'
import os from 'os'
import { exec } from 'child_process'
import util from 'util'

const execify = util.promisify(exec)

class LocalFile {
  path: string
  constructor (path: string) {
    this.path = path
  }

  async exists (file: string): Promise<boolean> {
    return await fs.promises.stat(file).then(() => true).catch(() => false)
  }

  async size (file: string): Promise<number> {
    return await fs.promises.stat(file).then(stat => stat.size).catch(() => 0)
  }

  async fileType (): Promise<string> {
    if (os.platform() !== 'linux' && os.platform() !== 'darwin') {
      throw new Error('unsupported-platform')
    }

    const mime = await execify(`file ${this.path} --mime-type`)

    if (mime.stderr !== '') {
      throw new Error(`failed-to-detect-mime-type: ${mime.stderr}`)
    }

    const type = mime.stdout.split(':')[1].trim()

    if (type === '') {
      throw new Error('failed-to-detect-mime-type')
    }

    return type
  }
}

export function newLocalFile (path: string): LocalFile {
  return new LocalFile(path)
}
