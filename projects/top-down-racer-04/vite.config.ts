import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const ORT_DIST = path.resolve('node_modules/onnxruntime-web/dist');
const ORT_PREFIX = '/assets/ort/';

/**
 * Serve onnxruntime-web WASM + MJS files without Vite module transformation.
 *
 * Dev only: custom middleware serves files from node_modules before Vite's
 * transform pipeline intercepts them (fixes .mjs dynamic import issue).
 *
 * Build: handled by scripts/copy-ort-wasm.cjs → public/assets/ort/ → dist/.
 */
function ortWasmPlugin() {
  return {
    name: 'ort-wasm',

    // Dev: serve ORT files directly from node_modules
    configureServer(server: { middlewares: { use: Function } }) {
      server.middlewares.use(
        (req: { url?: string }, res: { setHeader: Function; end: Function }, next: Function) => {
          if (!req.url?.startsWith(ORT_PREFIX)) return next();
          const filename = req.url.slice(ORT_PREFIX.length).replace(/\?.*$/, '');
          if (filename.includes('..')) return next();
          const filepath = path.join(ORT_DIST, filename);
          if (!fs.existsSync(filepath)) return next();
          const ext = path.extname(filename);
          const mime: Record<string, string> = {
            '.wasm': 'application/wasm',
            '.mjs': 'application/javascript',
            '.js': 'application/javascript',
          };
          res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
          res.end(fs.readFileSync(filepath));
        },
      );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [ortWasmPlugin()],
  build: {
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  assetsInclude: ['**/*.onnx'],
  optimizeDeps: {
    include: ['pixi.js'],
    exclude: ['onnxruntime-web'],
  },
});
