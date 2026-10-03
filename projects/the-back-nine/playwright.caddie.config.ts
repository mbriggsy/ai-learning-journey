import { defineConfig } from '@playwright/test'

// Run-stamped bundle root (increment 2): a re-walk must never overwrite a bundle a reader is
// mid-read on (it did exactly that on the first live run, 2026-07-10). Minted ONCE here in the
// runner process; worker processes inherit the runner's env, so their own `??=` is a no-op and
// every test in one invocation shares one stamp. `CADDIE_RUN=name` overrides for a named run.
process.env.CADDIE_RUN ??= new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')

// Increment 6 (the solve arc): a `solve:` target runs a full-precision (16k-path) solve per viewport on
// the WORKER POOL — one solve already fills 12 eval workers (~30 s a solve, ~40 s a whole walk, measured
// 2026-10-03). Two in parallel would split the same cores and can push a solve past its 300 s lockup wait
// (e2e/caddie-walk.spec.ts SOLVE_LOCKUP_MS), so a solve run SERIALIZES (workers 1); the fast
// seed/vault/intake targets keep the default parallelism.
const hasSolveTarget = (process.env.CADDIE_TARGETS ?? '').includes('solve:')

/**
 * The Caddie's capture harness (`pnpm caddie:walk`) — NOT a CI gate. Drives a `?seed=`/`?vault=`
 * surface to its settled final frame at the canonical review viewports (e2e/reviewSurface.ts)
 * and emits the cold-read capture bundle to temp/caddie/ (see .claude/skills/caddie/SKILL.md).
 *
 * A third harness, deliberately separate (the playwright.config.ts / playwright.fit.config.ts
 * precedent): it boots `pnpm dev` because the seed routes are DCE'd out of dist/, and it must
 * never share a port with the CSP pair (4180/4181), the fit gate (4190), or Briggsy's own dev
 * server (5173). Port 4195, `--strictPort` fails loud on a collision.
 *
 * Not in tsconfig.json's `include`, so `tsc --noEmit` skips it; Playwright compiles it itself.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/caddie-walk.spec.ts',
  fullyParallel: true,
  // A solve run serializes so each full-precision solve gets the whole machine (see hasSolveTarget
  // above); every other run keeps the runner's default parallelism (undefined ⇒ Playwright's default).
  workers: hasSolveTarget ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: 0, // a flaky capture must be SEEN, not silently retried into a different frame
  reporter: 'list',
  // The walk drives multi-state interactions (open the panel, land a worsening edit) and each
  // state waits for a real engine recompute — generous per-test budget.
  timeout: 240_000,
  use: {
    baseURL: 'http://127.0.0.1:4195', // 127.0.0.1, NOT localhost (the IPv4/IPv6 readiness flake)
    serviceWorkers: 'block', // PWA disabled in dev — blocked anyway so a stray registration can
    // never serve a stale shell into a capture.
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm dev --port 4195 --strictPort',
    url: 'http://127.0.0.1:4195',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 500 },
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
