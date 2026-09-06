import { defineConfig } from '@playwright/test'

/**
 * The real-browser VERTICAL-FIT gate (`verify:fit`) — council-mandated (2026-07-08,
 * wf_a2d93977-960): the one-frame fit law (`--laptop-fit-height`, tokens.css) is enforced by a
 * REAL-BROWSER height assertion, never a token-sum (vertical fit is reflow-dominated — line wraps,
 * door wrap-count, the survivor face — which no layout-less arithmetic can see).
 *
 * A SEPARATE harness from playwright.config.ts (the CSP gate), deliberately:
 *  - the fit spec drives the DEV-only `?seed=` routes (src/ui/devSeeds.ts), which are DCE'd out of
 *    dist/ — the dist harness structurally cannot reach them, so this config boots `pnpm dev`;
 *  - the CSP gate must keep reading the BUILT artifact with the real vercel.json headers — mixing
 *    the two harnesses would couple "is the layout right" to "is dist fresh" (insight 057's
 *    stale-artifact trap) and boot both servers for either gate.
 * playwright.config.ts carries the mirror `testIgnore` so neither harness runs the other's specs.
 *
 * Port 4190: dedicated — never 5173 (Briggsy's own dev server may hold it; `reuseExistingServer`
 * against HIS instance would measure uncommitted local state) and never 4180/4181 (the CSP
 * harness's enforced/control pair). `--strictPort` fails loud on a collision.
 *
 * Not in tsconfig.json's `include`, so `tsc --noEmit` skips it; Playwright compiles it itself.
 */
export default defineConfig({
  testDir: './e2e',
  // The chart TEXT gate (e2e/chart-text.spec.ts, 2026-09-05) rides this harness: like the fit law it
  // needs the dev-only `?seed=` routes and a real browser's layout — and riding `verify:fit` is what
  // makes it CI-enforced (a gate wired into no workflow is not a gate).
  testMatch: ['**/vertical-fit.spec.ts', '**/chart-text.spec.ts'],
  fullyParallel: true,
  // The date seeds are CPU-BOUND: a 16k-path final across two arms takes ~60 s alone, and the two
  // specs render ~26 of them. Playwright's default (50% of logical cores) is 10 workers on a 20-thread
  // laptop — ten concurrent solves saturate the cores and stretch a 60 s final past the tier wait
  // (measured 2026-09-05: the datesplit arms timed out only once the chart-text spec grew to 18 date
  // renders). Locally, cap to the solve's real cost; CI (ubuntu-latest, 4 vCPU → 2 workers) is left
  // at the default, where contention never arose.
  workers: process.env.CI ? undefined : '30%',
  forbidOnly: !!process.env.CI, // a stray test.only fails CI rather than silently narrowing the gate
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  // Each spec waits for the FINAL engine tier (provisional tags gone) before measuring — the
  // 16k-path final across two-arm seeds is slow on CI hardware, and two tests here render a date
  // seed TWICE (the reduced-motion and reader's-font comparisons), so the per-test budget holds two
  // finals (reviewSurface FINAL_TIER_MS) plus the measurement.
  timeout: 180_000,
  use: {
    baseURL: 'http://127.0.0.1:4190', // 127.0.0.1, NOT localhost (dodges the IPv4/IPv6 readiness flake)
    serviceWorkers: 'block', // PWA is disabled in dev (devOptions.enabled:false) — blocked anyway so a
    // stray registration from a past session can never serve a stale shell into a layout measurement.
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm dev --port 4190 --strictPort',
    url: 'http://127.0.0.1:4190',
    reuseExistingServer: !process.env.CI, // CI: fresh server (strictPort throws if occupied — fail loud)
    timeout: 120_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 500 }, // clean Node exit on Linux CI (ignored on Windows)
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
