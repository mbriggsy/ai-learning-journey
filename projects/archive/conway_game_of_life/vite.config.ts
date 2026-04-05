import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "Conway's Game of Life",
        short_name: 'Conway',
        description: 'Cinematic cellular automata with bioluminescent cells',
        theme_color: '#050508',
        background_color: '#050508',
        display: 'standalone',
        icons: [{
          src: '/icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        }],
      },
    }),
  ],

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
