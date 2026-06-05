import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Vite 8 / Rolldown convention (mirrors projects/burned): `rolldownOptions`, not
// `rollupOptions`; `resolve.tsconfigPaths` (native, no vite-tsconfig-paths plugin);
// `import.meta.dirname`. Single-entry SPA, so no explicit build.input is needed —
// the engine worker emits as its own hashed chunk via `new URL(...)` in
// src/store/engineClient.ts and is precached through the globPatterns below.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt', NOT 'autoUpdate': autoUpdate's skipWaiting+clientsClaim can reload
      // a tab mid-encrypt-write and tear an IndexedDB write (U4). The update is
      // surfaced as a toast and only applied once the store signals no write is in
      // flight (the deferred-skipWaiting contract — interface defined in src/ui,
      // integration test lands in P2 with the real save flow).
      registerType: 'prompt',
      // The useRegisterSW React hook performs registration. The default
      // injectRegister:'auto' injects an INLINE <script> that the strict CSP
      // (script-src 'self', no inline) would block — so registration is owned by
      // the hook and nothing is injected.
      injectRegister: false,
      // Hand-authored manifest at public/manifest.webmanifest (linked from index.html).
      manifest: false,
      workbox: {
        // Precache the shell INCLUDING the hashed engine-worker .js chunk so the
        // offline shell can spin the engine on a second visit.
        globPatterns: ['**/*.{js,css,html,webmanifest,woff2}'],
        // Offline SPA navigations fall back to the precached shell.
        navigateFallback: 'index.html',
        // Explicit (agent F): the 2 MiB default silently drops larger precache
        // entries — leave headroom for the worker chunk and a future wasm engine.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Explicit, not inherited: activation is user-driven via the toast, gated
        // on the no-write-in-flight signal. Never auto-claim / auto-skip.
        skipWaiting: false,
        clientsClaim: false,
      },
      // Don't run the service worker in dev (avoids dev-time cache confusion).
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: true,
  },
  build: {
    // Native modulepreload is universal on our target (modern browsers; 2026
    // personal tool). Disabling Vite's polyfill removes the INLINE polyfill
    // <script> it would otherwise inject — which a strict CSP (script-src 'self',
    // no inline) would block, breaking the app on Vercel as well as locally.
    // This is what makes the CSP achievable without 'unsafe-inline'.
    modulePreload: { polyfill: false },
  },
})
