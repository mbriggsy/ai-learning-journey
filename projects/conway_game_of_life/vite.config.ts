import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',

  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
  },

  esbuild: {
    target: 'es2022',
  },

  server: {
    port: 5173,
    strictPort: true,
    open: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  test: {
    include: ['tests/**/*.test.ts'],
    globals: false,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
    },
  },
})
