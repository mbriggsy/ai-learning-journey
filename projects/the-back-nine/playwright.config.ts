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
  // Since 2026-09-11 the PARTITION is gated (scripts/__tests__/playwright-harness-partition.test.ts
  // runs every config's real collector): a spec claimed by TWO harnesses (wired to its own dev
  // harness but not denied here) or by none reds, and anything under e2e/held/ claimed by a CI
  // gate reds. A dev-server spec wired to NO harness still lands here and fails loudly in CI —
  // that is this denylist doing its job. (c61dea7e shipped the held instrument without the entry
  // below; this harness collected its six arms against dist/, and CI ran red for three commits.)
  testIgnore: [
    '**/vertical-fit.spec.ts',
    '**/chart-text.spec.ts',
    '**/chart-text-rv.spec.ts',
    '**/intake-fold.spec.ts',
    '**/caddie-walk.spec.ts',
    '**/held/**', // INSTRUMENTS, never gates — e2e/held/shots.config.ts owns them, on demand
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
    // WebKit runs ONLY the @cross-browser-tagged vault arms — NEVER the whole directory; the tag and
    // this grep are pinned against each other by scripts/__tests__/playwright-projects.test.ts (rename
    // the tag on one side and this project collects ZERO tests, which Playwright does NOT treat as an
    // error). Each collected spec is held back for its OWN reason, and only two are about the ENGINE:
    // design-tokens.spec.ts measures Chromium font advance widths, and vault.spec.ts's KDF-location
    // spike records a verdict about Chromium's WebCrypto thread pool — each would red under WebKit for
    // the wrong reason. csp.spec.ts is NOT one of them: its corroborations are already engine-tolerant
    // by construction (`violatedDirective.startsWith('script-src')` at e2e/csp.spec.ts:72, and the same
    // prefix match at :104 / :118 / :136 / :152 — written so Chromium's granular `script-src-elem` and a
    // bare `script-src` both pass). What holds IT back is COST: its worker/intake walk is a full intake
    // plus two engine round trips on a Chromium-tuned budget (`test.setTimeout(180_000)`, csp.spec.ts:162,
    // sized for a 4-vCPU runner), so tagging the spec would drive that whole walk a second time on an
    // engine whose wall clock nobody has measured. Its fast enforced/control arms (six today) COULD be
    // tagged later if cross-browser CSP proof is ever wanted — never the walk.
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
