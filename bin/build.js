import path from 'path'
import esbuild from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import fs from 'fs'
import os from 'os'
import download from 'download'

async function build () {
  const semver = '6.2.0'
  const mlr = 'mlr@' + 'v' + semver

  const bin = path.join(process.cwd(), 'node_modules', '.bin', mlr)

  const osMap = {
    darwin: 'macos',
    linux: 'linux',
    win32: 'windows'
  }

  if (os.platform() === 'win32') {
    throw new Error('unsupported-platform: windows')
  }

  const url = `https://github.com/johnkerl/miller/releases/download/v${semver}/miller-${semver}-${osMap[os.platform()]}-${os.arch()}.tar.gz`

  if (!fs.existsSync(bin)) {
    await download(url, path.join(process.cwd(), mlr), {
      extract: true

    }).catch((err) => {
      console.error(err)
      process.exit(1)
    })
      .finally(() => {
        console.log(`Downloaded mlr@v${semver} into ${bin}`)
        fs.renameSync(path.join(process.cwd(), mlr, 'miller-' + semver + '-' + osMap[os.platform()] + '-' + os.arch(), 'mlr'), bin)
        fs.rm(path.join(process.cwd(), mlr), {
          recursive: true
        }, (err) => {
          if (err) {
            console.error(err)
            process.exit(1)
          }
        })
      })
  } else {
    console.log('Miller already installed')
  }

  // minify is off for better debugging
  const esm = await esbuild.build({
    entryPoints: [path.join(process.cwd(), 'lib/engine.ts')],
    // minify: true,
    bundle: true,
    target: 'es6',
    platform: 'node',
    logLevel: 'info',
    format: 'esm',
    outfile: path.join(process.cwd(), 'dist/muto.mjs'),
    plugins: [nodeExternalsPlugin()]
  })

  const cjs = await esbuild.build({
    entryPoints: [path.join(process.cwd(), 'lib/engine.ts')],
    // minify: true,
    bundle: true,
    target: 'es6',
    platform: 'node',
    logLevel: 'info',
    format: 'cjs',
    outfile: path.join(process.cwd(), 'dist/muto.cjs'),
    plugins: [nodeExternalsPlugin()]
  })

  await Promise.all([cjs, esm]).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
})
