/**
 * THE SOLVE-TIMING INSTRUMENT — how long the recommendation's pending line ("Working out your
 * strategy — this can take a few minutes…", `copy.ts` `recommendPendingLabel`; its sibling
 * `recommendRecordReopenCost` makes the same promise) really stands on a PRODUCTION build.
 * Register: Tier 2 *The recommendation's pending line promises "a few minutes"…*. An INSTRUMENT,
 * never a gate (e2e/held/ — no CI config collects it; scripts/__tests__/playwright-harness-partition
 * .test.ts proves it).
 *
 * WHAT IS MEASURED. The shipped bundle: `pnpm build`, served by `scripts/serve-dist-with-headers.ts`
 * (its own config beside this file), in the INSTALLED Google Chrome (`channel: 'chrome'`, new
 * headless — the real browser, never the headless shell). The household arrives by a PLANT
 * (`solveTimingPlant.ts`: the dev seed written into the app's own IndexedDB — the seed routes are
 * DCE'd from dist/), then the drive is the user's: unlock → (the re-entry gate, if it mounts) → the
 * final-tier verdict → the invite → the GoalPicker → "See the strategy" → the lockup.
 *
 * THE CLOCK IS IN THE PAGE. Every mark is `performance.now()` in the app's own renderer: a click mark
 * is stamped in the same task that fires the native click, and a render mark by a 250 ms POLL that
 * reads the DOM and never writes it (a MutationObserver instrument that writes what it watches
 * re-fires itself and freezes the thread it measures — the b9-sotd landmine). Resolution ≤ 250 ms
 * plus main-thread latency; the solve runs in the engine worker, so the main thread is free to poll.
 * Never a node-side timing (node read the spend solve 5× slower than laptop Chromium).
 *
 * THE CONTROL ORIGIN (:4181, no CSP header) — the `vault.spec.ts` precedent: the plant is injected
 * script, which the enforced origin's `script-src 'self'` blocks. The worker's compute does not read
 * the CSP; everything else `vercel.json` ships is served on both ports.
 *
 * SERIAL, ONE SOLVE AT A TIME, ON A QUIET MACHINE (`workers: 1`): a second solve, a vitest run or
 * doc-stats beside it halves the cores a measurement sees (the load landmine) — the numbers are only
 * honest if nothing else heavy runs. Service workers are blocked (the shell would come from cache; the
 * solve does not).
 *
 *     pnpm build
 *     SOLVE_TIMING_OUT=temp/solve-timing/<name> pnpm exec playwright test --config e2e/held/solve-timing.config.ts
 *
 * Targets: `SOLVE_TIMING_TARGETS="retired:tax,nc:tax"` — `<dev seed>:<goal>`, goal ∈ {tax, leave}.
 * Each target writes `<out>/<seed>-<goal>.json`; the run prints one line per target.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'vite'

import { REAL, REAL_DPR } from '../reviewSurface'
import type { PlantReport } from './solveTimingPlant'

const ROOT = resolve(import.meta.dirname, '../..')
const OUT = resolve(ROOT, process.env.SOLVE_TIMING_OUT ?? 'temp/solve-timing/adhoc')

const GOALS = { tax: /Pay less tax/, leave: /Leave more behind/ } as const
type GoalKey = keyof typeof GOALS

/** The register's households: the retired spine, its NC twin, the ordering witness (3 real buckets,
 *  the slowest dev solve on record) and the priced pre-65 witness. */
const DEFAULT_TARGETS = 'retired:tax,nc:tax,healthnc:tax,buckets:tax'

const TARGETS = (process.env.SOLVE_TIMING_TARGETS ?? DEFAULT_TARGETS).split(',').map((raw) => {
  const [seed, goal] = raw.trim().split(':')
  if (!seed || !goal || !Object.hasOwn(GOALS, goal)) {
    throw new Error(`SOLVE_TIMING_TARGETS: "${raw}" is not <seed>:<tax|leave>`)
  }
  return { seed, goal: goal as GoalKey }
})

/** The verdict's own wait before the invite exists (a FINAL-tier recompute after unlock). */
const VERDICT_MS = 10 * 60_000
/** The solve's wait. Generous on purpose: a measurement must never be clipped by its own budget
 *  (the dev-build `buckets` solve read ~25 min at the v7 roster, and v8 grew rosters 41–121 %). */
const LOCKUP_MS = 95 * 60_000

/** The in-page probes: first-seen time of each, read by the poll. */
const PROBES = {
  verdict: 'main.result[data-answer-tier="final"]',
  invite: '.result-recommend-invite',
  pending: '.solve-pending',
  lockup: '.rec-held, .rec-committed',
} as const

interface TimingState {
  readonly marks: Record<string, number>
  readonly notes: Record<string, string>
}

declare global {
  interface Window {
    SolveTimingPlant: { plant(key: string): Promise<PlantReport> }
    __solveTiming?: TimingState
  }
}

let plantBundle: string

test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    root: ROOT,
    logLevel: 'silent',
    resolve: { tsconfigPaths: true },
    // Library mode leaves `process.env.NODE_ENV` for its consumer, and the browser has no `process` —
    // the bundle threw at load. The app's own build replaces it with "production"; so does this.
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      write: false,
      minify: false,
      lib: {
        entry: resolve(ROOT, 'e2e/held/solveTimingPlant.ts'),
        name: 'SolveTimingPlant',
        formats: ['iife'],
        fileName: () => 'solve-timing-plant.js',
      },
    },
  })
  const outputs = Array.isArray(result) ? result : [result]
  const first = outputs[0]
  if (!first || !('output' in first)) throw new Error('vite returned no plant bundle')
  const chunk = first.output.find((o) => o.type === 'chunk')
  if (!chunk || chunk.type !== 'chunk') throw new Error('no chunk in the plant bundle')
  plantBundle = chunk.code
})

test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

/** Install the poll. It READS the DOM and writes only its own window object. */
async function installClock(page: Page): Promise<void> {
  await page.evaluate((probes) => {
    const state: TimingState = { marks: {}, notes: {} }
    window.__solveTiming = state
    const tick = () => {
      const now = performance.now()
      for (const [key, selector] of Object.entries(probes)) {
        if (state.marks[key] !== undefined) continue
        const el = document.querySelector(selector)
        if (el === null) continue
        state.marks[key] = now
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 400)
        state.notes[key] = text
        if (key === 'lockup') state.notes.lockupKind = el.classList.contains('rec-committed') ? 'committed' : 'held'
      }
    }
    setInterval(tick, 250)
  }, PROBES)
}

/** Stamp `mark` and fire the native click in ONE task, so the mark is the click. */
async function stampClick(target: Locator, mark: string): Promise<void> {
  await target.evaluate((el, m) => {
    window.__solveTiming!.marks[m] = performance.now()
    ;(el as HTMLElement).click()
  }, mark)
}

const seconds = (ms: number | undefined): number | null => (ms === undefined ? null : Math.round(ms / 100) / 10)

for (const { seed, goal } of TARGETS) {
  test(`${seed} · ${goal}: invite → lockup on the production build`, async ({ page, browser }, testInfo) => {
    // Every uncaught page error is carried into the failure message — an injected bundle that throws
    // at load leaves its global undefined and the drive would otherwise fail one step later, mute.
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.stack ?? err.message))

    // 1. Plant the household into this origin's IndexedDB (a fresh context per test — no carry-over).
    await page.goto('/')
    await expect(page.locator('h1').first(), 'the production app never mounted').toBeAttached({ timeout: 60_000 })
    await page.addScriptTag({ content: plantBundle })
    expect(
      await page.evaluate(() => typeof window.SolveTimingPlant),
      `the plant bundle did not load — page errors:\n${pageErrors.join('\n---\n')}`,
    ).toBe('object')
    const planted = await page.evaluate((key) => window.SolveTimingPlant.plant(key), seed)
    expect(planted.result, `plantDevVault(${seed})`).toBe('ok')

    // 2. A fresh load: the app's own probe finds the vault → the unlock screen, as a returning user.
    await page.goto('/')
    const unlock = page.getByRole('button', { name: 'Open my plan' })
    await expect(unlock, `${seed}: the planted vault did not land on the unlock screen`).toBeVisible({ timeout: 60_000 })
    await page.locator('input[autocomplete="current-password"]').fill(planted.passphrase)
    await installClock(page)
    await stampClick(unlock, 'unlockClick')

    // 3. The re-entry gate holds the recompute until the household affirms — when it mounts.
    const affirm = page.getByRole('button', { name: /Still about right/ })
    await expect(page.locator(`${PROBES.verdict}, button:has-text("Still about right")`).first()).toBeAttached({ timeout: VERDICT_MS })
    if (await affirm.isVisible()) await stampClick(affirm, 'affirmClick')
    await expect(page.locator(PROBES.verdict), `${seed}: no final-tier verdict`).toBeAttached({ timeout: VERDICT_MS })

    // 4. The invite → the GoalPicker → the goal → "See the strategy" (the stamped click).
    const invite = page.locator(PROBES.invite)
    await expect(invite, `${seed}: the recommend-second invite never mounted — this household cannot be timed`).toBeVisible({ timeout: 60_000 })
    await invite.click()
    const dialog = page.getByRole('dialog')
    await expect(page.getByRole('heading', { name: 'What should your plan aim for?' }), `${seed}: the GoalPicker did not open`).toBeVisible()
    const radio = dialog.getByRole('radio', { name: GOALS[goal] })
    await radio.evaluate((el) => (el as HTMLInputElement).click())
    await expect(radio, `${seed}: the goal radio did not commit`).toBeChecked()
    await stampClick(dialog.getByRole('button', { name: 'See the strategy', exact: true }), 'confirmClick')

    // 5. The lockup — polled in the page, never slept on.
    await page.waitForFunction(() => window.__solveTiming?.marks.lockup !== undefined, null, {
      timeout: LOCKUP_MS,
      polling: 1000,
    })
    const state = (await page.evaluate(() => window.__solveTiming!)) as TimingState
    const m = state.marks
    const env = await page.evaluate(() => ({ cores: navigator.hardwareConcurrency, ua: navigator.userAgent }))

    // NON-VACUITY: the pending line must have mounted AFTER the confirm, and the lockup after it —
    // a lockup already on screen, or a refusal with no pending, is not a solve and times nothing.
    expect(m.pending, `${seed}: the pending line never mounted (a refusal renders no pending — nothing was solved)`).toBeDefined()
    expect(m.pending!, `${seed}: the pending line predates the confirm click`).toBeGreaterThanOrEqual(m.confirmClick!)
    expect(m.lockup!, `${seed}: the lockup predates the pending line`).toBeGreaterThanOrEqual(m.pending!)

    const record = {
      seed,
      goal,
      solveSeconds: seconds(m.lockup! - m.confirmClick!),
      pendingVisibleSeconds: seconds(m.lockup! - m.pending!),
      unlockToVerdictSeconds: seconds(m.verdict! - (m.affirmClick ?? m.unlockClick!)),
      reentryGate: m.affirmClick !== undefined,
      lockupKind: state.notes.lockupKind,
      lockupText: state.notes.lockup,
      pendingText: state.notes.pending,
      browser: `${browser.browserType().name()} ${browser.version()}`,
      userAgent: env.ua,
      hardwareConcurrency: env.cores,
      cpu: cpus()[0]?.model ?? 'unknown',
      head: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf-8' }).trim(),
      distBuiltAt: statSync(join(ROOT, 'dist', 'index.html')).mtime.toISOString(),
      marksMs: m,
    }
    mkdirSync(OUT, { recursive: true })
    writeFileSync(join(OUT, `${seed}-${goal}.json`), `${JSON.stringify(record, null, 2)}\n`)
    testInfo.annotations.push({ type: 'solve-timing', description: JSON.stringify(record) })
    console.log(
      `[solve-timing] ${seed} · ${goal}: ${record.solveSeconds} s confirm → ${record.lockupKind} ` +
        `(pending on screen ${record.pendingVisibleSeconds} s; unlock → verdict ${record.unlockToVerdictSeconds} s)`,
    )
  })
}
