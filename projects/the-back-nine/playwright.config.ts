import { defineConfig } from '@playwright/test'

/**
 * The `verify:csp` gate's harness. Its headline arm is CSP browser-ENFORCEMENT — proving a real
 * browser enforces the strict `vercel.json` CSP, distinct from `scripts/__tests__/csp-headers.test.ts`,
 * which is a vitest regex on the JSON string — but the `testIgnore` DENYLIST below is what actually
 * scopes the run, so the gate also carries `design-tokens.spec.ts` (the self-hosted fonts + the figure
 * law) and `vault.spec.ts` (the real-IndexedDB trust loop, on the no-CSP control origin). `webServer`
 * owns the harness lifecycle (no orphan); the harness serves the EXISTING `dist/` (build first — CI
 * does; locally run `pnpm build` before `pnpm verify:csp`).
 *
 * TWO browser projects: `chromium` runs every collected spec; `webkit` runs ONLY the
 * `@cross-browser`-tagged vault arms (see the `projects` comment below for why it must never be
 * handed the whole directory). CSP enforcement itself is still proven in Chromium alone.
 *
 * NOTE: NEVER set `bypassCSP` — its default (false) is what keeps the browser enforcing the CSP.
 * Setting it true would make the enforced assertions pass vacuously.
 *
 * Not in tsconfig.json's `include`, so `tsc --noEmit` skips it; Playwright compiles it itself.
 */
export default defineConfig({
  testDir: './e2e',
  // The vertical-fit gate, the RecommendationViz solve arm and the Caddie walk ride their OWN
  // harnesses (playwright.fit.config.ts / playwright.fit-rv.config.ts / playwright.caddie.config.ts —
  // dev servers, because their `?seed=` routes are DCE'd out of dist/). Against THIS dist harness
  // those specs would fail confusingly (no seeds) — keep each harness to its own specs. Run them via
  // `pnpm verify:fit` / `pnpm verify:fit:rv` / `pnpm caddie:walk`. This is a DENYLIST: a new
  // e2e/*.spec.ts is collected here by default, so a new dev-server spec must be added to it.
  testIgnore: [
    '**/vertical-fit.spec.ts',
    '**/chart-text.spec.ts',
    '**/chart-text-rv.spec.ts',
    '**/intake-fold.spec.ts',
    '**/caddie-walk.spec.ts',
  ],
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
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    // WebKit runs ONLY the @cross-browser-tagged vault arms — NEVER the whole directory. All three
    // collected specs carry Chromium-specific arms by construction: csp.spec.ts corroborates on Chromium's
    // granular `violatedDirective` (`script-src-elem` for an inline element), design-tokens.spec.ts
    // measures font advance widths, and vault.spec.ts's KDF-location spike records a verdict about
    // Chromium's WebCrypto thread pool. Handing those to WebKit would red the gate for the wrong
    // reason — and the fix for that red would be to weaken an assertion. Scope here instead.
    { name: 'webkit', use: { browserName: 'webkit' }, grep: /@cross-browser/ },
  ],
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
