import path from 'path'
import esbuild from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import fs from 'fs'
import os from 'os'
import download from 'download'

async function build () {
  // get this from miller's official release, pin to v6 for now
  const mlrSemver = '6.0.0'
  const mlr = 'mlr@' + 'v' + mlrSemver

  const inBin = path.join(process.cwd(), 'node_modules', '.bin', mlr)

  const osMap = {
    darwin: 'darwin',
    linux: 'linux',
    win32: 'windows'
  }

  // const archMap = {
  //   x64: 'amd64',
  //   x86: '386'
  // }

  if (os.platform() === 'win32') {
    console.log('TODO support windows')
    return
  }

  if (!fs.existsSync(inBin)) {
    await download(
            `https://github.com/johnkerl/miller/releases/download/v${mlrSemver}/miller_${mlrSemver}_${
                osMap[os.platform()]
            }_${os.arch()}.tar.gz`,
            path.join(process.cwd(), mlr),
            {
              extract: true
            }
    )
      .catch((err) => {
        console.error(err)
        process.exit(1)
      })
      .finally(() => {
        console.log('got mlr@v' + mlrSemver)
        fs.renameSync(path.join(process.cwd(), mlr, 'mlr'), inBin)
        fs.rmdirSync(path.join(process.cwd(), mlr), {
          recursive: true
        })
      })
  } else {
    console.log(`skipped, ${mlr} already installed`)
  }

  // using https://github.com/hawyar/vitess-sqlparse to parse query statements
  // fork of https://github.com/blastrain/vitess-sqlparser
  const sqlparserSemver = '0.1.4'
  const sqlparser = 'sqlparser@' + 'v' + sqlparserSemver
  const sqlparserInBin = path.join(
    process.cwd(),
    'node_modules',
    '.bin',
    sqlparser
  )

  if (!fs.existsSync(sqlparserInBin)) {
    await download(
            `https://github.com/hawyar/vitess-sqlparser/releases/download/v${sqlparserSemver}/sqlparser-v${sqlparserSemver}-${
                osMap[os.platform()]
            }-${os.arch()}.tar.gz`,
            path.join(process.cwd(), sqlparser),
            {
              extract: true
            }
    )
      .catch((err) => {
        console.error(err)
        process.exit(1)
      })
      .finally(() => {
        console.log('got sqlparser@' + sqlparserSemver)
        fs.renameSync(
          path.join(process.cwd(), sqlparser, 'sqlparser'),
          path.join(process.cwd(), 'node_modules', '.bin', sqlparser)
        )
        fs.rmdirSync(path.join(process.cwd(), sqlparser), {
          recursive: true
        })
      })
  } else {
    console.log(`skipped, ${sqlparser} already installed`)
  }

  console.log("bundling muto")
  
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

  const cli = await esbuild.build({
    entryPoints: [path.join(process.cwd(), 'bin/cli.js')],
    minify: true,
    bundle: true,
    target: 'es6',
    logLevel: 'info',
    platform: 'node',
    format: 'esm',
    outfile: path.join(process.cwd(), 'dist/cli.js'),
    plugins: [nodeExternalsPlugin()]
  })

  await Promise.all([cjs, esm, cli]).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
})
