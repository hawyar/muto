import path from 'path';
import esbuild from 'esbuild';
import {nodeExternalsPlugin} from 'esbuild-node-externals'
import fs from 'fs';
import os from 'os';
import download from 'download';

(async function build() {
    // get this from releases but for now pin to latest which is 6.0.0
    const mlrSemver = '6.0.0';
    const mlr = "mlr@" + "v" + mlrSemver;

    const inBin = path.join(process.cwd(), 'node_modules', '.bin', mlr);

    if (!fs.existsSync(inBin)) {
        console.log("miller not found, downloading latest release");

        const archMap = {
            'x64': 'amd64',
            'x86': '386'
        };

        const osMap = {
            'darwin': 'darwin',
            'linux': 'linux',
            'win32': 'windows'
        };

        await download(`https://github.com/johnkerl/miller/releases/download/v${mlrSemver}/miller_${mlrSemver}_${osMap[os.platform()]}_${archMap[os.arch()]}.tar.gz`, path.join(process.cwd(), mlr), {
            extract: true,
        }).catch(err => {
            console.error(err);
            process.exit(1);
        });

        console.log('Downloaded mlr@v' + mlrSemver);

        fs.renameSync(path.join(process.cwd(), mlr, 'mlr'), inBin);
        fs.rmdirSync(path.join(process.cwd(), mlr), {
            recursive: true
        });
        console.log("cleaning up")
    } else {
        console.log(mlr + " already downloaded");
    }

    await esbuild.build({
        entryPoints: [path.join(process.cwd(), "lib/index.ts")],
        bundle: true,
        minify: false,
        sourcemap: true,
        target: 'es6',
        platform: 'node',
        format: 'esm',
        outfile: path.join(process.cwd(), "dist/muto.js"),
        plugins: [nodeExternalsPlugin()],
    }).catch(err => {
        console.error(err);
        process.exit(1);
    }).finally(() => {
        console.log('built muto');
    });


    await esbuild.build({
        entryPoints: [path.join(process.cwd(), "bin/cli.js")],
        bundle: true,
        minify: false,
        sourcemap: true,
        target: 'es6',
        platform: 'node',
        format: 'esm',
        outfile: path.join(process.cwd(), "dist/cli.js"),
        plugins: [nodeExternalsPlugin()],
    }).catch(err => {
        console.error(err);
        process.exit(1);
    }).finally(() => {
        console.log("built cli");
    });
})();

