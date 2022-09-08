import path from 'path'
import esbuild from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import fs from 'fs'
import download from 'download'
import { Octokit } from "@octokit/rest"

async function build () {
  const octo = new Octokit()
  const { data: release } = await octo.repos.getLatestRelease({
    owner: 'johnkerl',
    repo: 'miller'
  })

  const latest = release.tag_name

  const bin = path.join(process.cwd(), 'node_modules', '.bin')
  const files = await fs.promises.readdir(bin)

  const platform = {
    darwin: 'macos',
    linux: 'linux',
    win32: 'windows'
  }

  const exists = files.filter((file) => file.startsWith('mlr'))[0]
  const needed = `miller-${latest.replace('v', '')}-${platform[process.platform]}-${process.arch}`
  const asset = release.assets.filter((asset) => asset.name === needed + ".tar.gz")[0]

  if (exists) {
    const current = exists.split('@')[1]
    if (current === latest) {
      console.log('Miller is up to date')
      return
    }
    console.log(`Updating Miller from ${current} to ${latest}`)
    await download(asset.browser_download_url, "./", { extract: true }).then(() => {
      fs.renameSync(path.join(process.cwd(), needed + "/mlr"), path.join(bin, `mlr@${latest}`))
      fs.unlinkSync(path.join(bin, exists))
    })
    return
  }

  await download(asset.browser_download_url, "./", { extract: true }).then(() => {
    fs.renameSync(path.join(process.cwd(), needed + "/mlr"), path.join(bin, `mlr@${latest}`))
    // fs.unlinkSync(path.join(process.cwd(), needed))
  })

  // TODO: turn on minify
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
