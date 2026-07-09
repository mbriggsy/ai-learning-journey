import { defineConfig } from '@playwright/test'

/**
 * CSP browser-ENFORCEMENT e2e (the `verify:csp` gate). Proves a real browser enforces the strict
 * `vercel.json` CSP — distinct from `scripts/__tests__/csp-headers.test.ts`, which is a vitest regex
 * on the JSON string. `webServer` owns the harness lifecycle (no orphan); the harness serves the
 * EXISTING `dist/` (build first — CI does; locally run `pnpm build` before `pnpm verify:csp`).
 *
 * NOTE: NEVER set `bypassCSP` — its default (false) is what keeps Chromium enforcing the CSP. Setting
 * it true would make the enforced assertions pass vacuously.
 *
 * Not in tsconfig.json's `include`, so `tsc --noEmit` skips it; Playwright compiles it itself.
 */
export default defineConfig({
  testDir: './e2e',
  // The vertical-fit gate rides its OWN harness (playwright.fit.config.ts — a dev server, because
  // its `?seed=` routes are DCE'd out of dist/). Against THIS dist harness the fit spec would fail
  // confusingly (no seeds) — keep each harness to its own specs. Run it via `pnpm verify:fit`.
  testIgnore: '**/vertical-fit.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // a stray test.only fails CI rather than silently narrowing the gate
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4180', // the ENFORCED origin (harness applies the real CSP here)
    serviceWorkers: 'block', // a cached PWA service worker could serve responses with stale headers and
    // bypass the live CSP — block it so the security proof can never be confounded (the engine is a
    // Web Worker, NOT a service worker, so this does not affect the worker round-trip test).
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm exec tsx scripts/serve-dist-with-headers.ts',
    url: 'http://127.0.0.1:4180', // 127.0.0.1, NOT localhost (dodges the IPv4/IPv6 readiness flake)
    reuseExistingServer: !process.env.CI, // CI: fresh server (throws if the port is occupied — fail loud)
    timeout: 120_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 500 }, // clean Node exit on Linux CI (ignored on Windows)
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
