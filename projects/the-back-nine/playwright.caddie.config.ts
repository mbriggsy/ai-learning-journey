import { defineConfig } from '@playwright/test'

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
