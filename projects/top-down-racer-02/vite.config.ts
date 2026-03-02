import { defineConfig, normalizePath } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'node:path';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(
            path.resolve(
              __dirname,
              'node_modules/onnxruntime-web/dist/*.wasm',
            ),
          ),
          dest: 'assets/ort',
        },
      ],
    }),
  ],
  assetsInclude: ['**/*.onnx'],
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
});
