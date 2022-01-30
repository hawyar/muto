import path from 'path';
import esbuild from 'esbuild';
import {nodeExternalsPlugin} from 'esbuild-node-externals'
import fs from 'fs';
import os from 'os';
import download from 'download';

(async function build() {
    // get this from releases but for now pin to latest v6
    const mlrSemver = '6.0.0';
    const mlr = "mlr@" + "v" + mlrSemver;

    const inBin = path.join(process.cwd(), 'node_modules', '.bin', mlr);


    const archMap = {
        'x64': 'amd64',
        'x86': '386'
    };

    const osMap = {
        'darwin': 'darwin',
        'linux': 'linux',
        'win32': 'windows'
    };


    if (os.platform() === 'win32') {
        throw new Error('TODO: windows support');
    }


    if (fs.existsSync(inBin)) {
        console.log(`skipped: ${mlr} already installed`);
        return;
    }

    await download(`https://github.com/johnkerl/miller/releases/download/v${mlrSemver}/miller_${mlrSemver}_${osMap[os.platform()]}_${os.arch()}.tar.gz`, path.join(process.cwd(), mlr), {
        extract: true,
    }).catch(err => {
        console.error(err);
        process.exit(1);
    }).finally(() => {
        console.log('got mlr@v' + mlrSemver);
        fs.renameSync(path.join(process.cwd(), mlr, 'mlr'), inBin);
        fs.rmdirSync(path.join(process.cwd(), mlr), {
            recursive: true
        });
    });

    // using https://github.com/blastrain/vitess-sqlparser as a sql query parser
    // we are using a wrapper https://github.com/hawyar/vitess-sqlparser so we can get the build
    const sqlparserSemver = '0.1.4';
    const sqlparser = "sqlparser@" + "v" + sqlparserSemver;

    await download(`https://github.com/hawyar/vitess-sqlparser/releases/download/v${sqlparserSemver}/sqlparser-v${sqlparserSemver}-${osMap[os.platform()]}-${os.arch()}.tar.gz`, path.join(process.cwd(), sqlparser), {
        extract: true,
    }).catch(err => {
        console.error(err);
        process.exit(1);
    }).finally(() => {
            console.log('got sqlparser@' + sqlparserSemver);
            fs.renameSync(path.join(process.cwd(), sqlparser, 'sqlparser'), path.join(process.cwd(), 'node_modules', '.bin', sqlparser));
            fs.rmdirSync(path.join(process.cwd(), sqlparser), {
                recursive: true
            });
        }
    );

    const mutoBuild = await esbuild.build({
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

    const cliBuild = await esbuild.build({
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

    await Promise.all([mutoBuild, cliBuild])
})();

