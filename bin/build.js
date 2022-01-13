import path from 'path';
import esbuild from 'esbuild';
import {nodeExternalsPlugin} from 'esbuild-node-externals'

(function build() {
    esbuild.build({
            entryPoints: [path.join(process.cwd(), "lib/index.ts")],
            bundle: true,
            minify: true,
            sourcemap: true,
            target: 'es6',
            platform: 'node',
            format: 'esm',
            outfile: path.join(process.cwd(), "dist/muto.js"),
            plugins: [nodeExternalsPlugin()],
        }
    ).catch(() => process.exit(1));
})();

