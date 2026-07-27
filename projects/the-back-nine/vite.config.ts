import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Vite 8 / Rolldown convention (mirrors projects/burned): `rolldownOptions`, not
// `rollupOptions`; `resolve.tsconfigPaths` (native, no vite-tsconfig-paths plugin);
// `import.meta.dirname`. Single-entry SPA, so no explicit build.input is needed —
// the engine worker emits as its own hashed chunk via `new URL(...)` in
// src/store/engineClient.ts and is precached through the globPatterns below.
export default defineConfig(({ mode }) => ({
  plugins: [
    // `pnpm dev:phone` only (mode 'phone'): self-signed HTTPS so a PHONE on the LAN
    // gets a SECURE CONTEXT. WebCrypto (`crypto.subtle`) does not exist on a plain-HTTP
    // LAN-IP origin — the `?vault=` plant/unlock (PBKDF2 importKey) dies before the
    // unlock screen mounts and the app silently renders footer-only (caught live on
    // Briggsy's phone, 2026-07-10; localhost is exempt, which is why laptop dev never
    // hit it). NEVER default: the fit/caddie/CSP harnesses probe http://127.0.0.1
    // webServer URLs, and mode 'phone' keeps DEV true (seeds stay live) while leaving
    // every other mode byte-identical.
    ...(mode === 'phone' ? [basicSsl()] : []),
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
        // The fontsource CSS registers every language subset behind unicode-range —
        // the browser lazily fetches only what it renders (English UI: latin, plus
        // latin-ext for diacritic names), but the precache would eagerly fetch ALL
        // of them. Keep the dead subsets out of the offline cache; if one is ever
        // genuinely rendered online it still loads + HTTP-caches normally.
        globIgnores: ['**/*-greek*', '**/*-cyrillic*', '**/*-vietnamese*'],
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
  test: {
    // Vitest owns the co-located unit/integration suite (`*.test.ts`). The browser
    // CSP-enforcement e2e (`e2e/*.spec.ts`) is Playwright's — exclude it so Vitest does
    // not try to run a Playwright spec (it has no page fixture → it would fail). Run it
    // via `pnpm verify:csp`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    // A HANG GUARD, NOT A PERFORMANCE BUDGET — and deliberately not the "blanket bump" the queue
    // warns against. That warning was CONDITIONED on the culprit being the Monte-Carlo battery, in
    // which case a per-file timeout is right (and those files already carry explicit 120s-900s
    // timeouts declaring their real cost). It is not that. Vitest's 5000ms default governed every
    // arm that did not opt out, and across FOUR sightings it took down a DIFFERENT file each time —
    // heavy engine tests that pass in isolation, two different MC goldens, and finally
    // `App.test.tsx`'s survivor-door arm (CI run 30285582342), a jsdom test whose only crime is
    // driving PBKDF2-600k twice through a real recovery flow. Nothing links them but CPU contention
    // in a 3164-test parallel run on a shared runner.
    //
    // 5s is simply the wrong ceiling for that: it is short enough that scheduling noise reads as
    // failure, which is how this cost three sessions of "capture it next time" without ever being
    // named. 20s still fails a genuinely STUCK test — it just stops calling a starved one broken.
    // A test that is slow for a REAL reason must still say so with its own explicit `{ timeout }`;
    // this changes nothing about that contract, and `slowTestThreshold` keeps the signal visible in
    // the reporter rather than hiding it behind a pass.
    testTimeout: 20_000,
    slowTestThreshold: 3_000,
  },
}))
