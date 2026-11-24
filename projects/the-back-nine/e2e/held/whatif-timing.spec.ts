/**
 * THE WHAT-IF TIMING INSTRUMENT — how long one working household's what-if run takes on a PRODUCTION build, at each
 * date-search tier (the workbench plan's U14 timing measurement; it picks KTD12's tier). An INSTRUMENT, never a gate
 * (e2e/held/ — no CI config collects it; scripts/__tests__/playwright-harness-partition.test.ts proves it).
 *
 * WHAT IS MEASURED, per seed (`dip`, and `datemixed` for the floor track), at the base offset the workbench builds on
 * (the final answer's band, `buildTableBase`):
 *  1. the store's own final date sweep (its wall clock: what a what-if waits behind);
 *  2. each tier (2,000 and 16,000 paths): ONE cold run in a fresh worker, then FIVE warm runs in that worker;
 *  3. the wait behind the store's final sweep: a run posted while the sweep runs (at a fifth, a half and four fifths
 *     of its measured length), timed from the post to the reply, page side — the round trip the household feels.
 *
 * THE METHOD (`solve-pool.spec.ts`'s): `whatIfTimingHarness.ts` is bundled at spec time and evaluated in Blob workers
 * on the dist CONTROL origin (:4181 — no CSP, so Blob workers construct). The INSTALLED Google Chrome, new headless,
 * never the headless shell. SERIAL, ON A QUIET MACHINE: nothing heavy beside it (the load landmine).
 *
 *     pnpm build
 *     WHATIF_TIMING_OUT=temp/whatif-timing/<name> pnpm exec playwright test --config e2e/held/solve-timing.config.ts whatif-timing
 *
 * Seeds: `WHATIF_TIMING_SEEDS="dip,datemixed"` (the default). Each writes `<out>/<seed>.json`.
 */
import { expect, test, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'vite'

import type { Prepared, RunTiming } from './whatIfTimingHarness'

const ROOT = resolve(import.meta.dirname, '../..')
const OUT = resolve(ROOT, process.env.WHATIF_TIMING_OUT ?? 'temp/whatif-timing/adhoc')
const SEEDS = (process.env.WHATIF_TIMING_SEEDS ?? 'dip,datemixed').split(',').map((s) => s.trim())
const TIERS = [2_000, 16_000] as const
const WARM_RUNS = 5
const SWEEP_POSITIONS = [0.2, 0.5, 0.8] as const

/** The role script every Blob worker runs after the bundle: one reply per message, keyed by id. A `run` posted
 *  while a `sweep` is in flight is handled at the sweep's next macrotask yield, as the app's worker handles it. */
const ROLE = `
self.onmessage = async (e) => {
  const m = e.data
  try {
    if (m.op === 'prepare') self.postMessage({ id: m.id, ok: await WhatIfTimingHarness.prepare(m.seed) })
    else if (m.op === 'run') self.postMessage({ id: m.id, ok: WhatIfTimingHarness.timeRun(m.seed, m.offset, m.paths) })
    else if (m.op === 'sweep') self.postMessage({ id: m.id, ok: await WhatIfTimingHarness.sweep(m.seed) })
  } catch (err) { self.postMessage({ id: m.id, error: String((err && err.stack) || err) }) }
}`

declare global {
  interface Window {
    __wt: {
      spawn(): number
      ask(w: number, msg: Record<string, unknown>): Promise<{ value: unknown; roundTripMs: number }>
      kill(w: number): void
    }
  }
}

let harnessBundle: string

test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    root: ROOT,
    logLevel: 'silent',
    resolve: { tsconfigPaths: true },
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      write: false,
      lib: { entry: resolve(ROOT, 'e2e/held/whatIfTimingHarness.ts'), name: 'WhatIfTimingHarness', formats: ['iife'], fileName: () => 'whatif-timing-harness.js' },
    },
  })
  const outputs = Array.isArray(result) ? result : [result]
  const first = outputs[0]
  if (!first || !('output' in first)) throw new Error('vite returned no harness bundle')
  const chunk = first.output.find((o) => o.type === 'chunk')
  if (!chunk || chunk.type !== 'chunk') throw new Error('no chunk in the harness bundle')
  harnessBundle = chunk.code
})

/** The page-side worker registry: spawn, ask (round trip timed in the page's clock), kill. */
async function installWorkers(page: Page): Promise<void> {
  await page.evaluate(
    ([code, role]) => {
      const workers = new Map<number, Worker>()
      const waiting = new Map<number, { done: (v: { value: unknown; roundTripMs: number }) => void; fail: (e: Error) => void; t0: number }>()
      let nextWorker = 1
      let nextId = 1
      window.__wt = {
        spawn() {
          const w = new Worker(URL.createObjectURL(new Blob([`${code}\n${role}`], { type: 'text/javascript' })))
          w.onmessage = (e: MessageEvent<{ id: number; ok?: unknown; error?: string }>) => {
            const t1 = performance.now()
            const p = waiting.get(e.data.id)
            if (p === undefined) return
            waiting.delete(e.data.id)
            if (e.data.error !== undefined) p.fail(new Error(e.data.error))
            else p.done({ value: e.data.ok, roundTripMs: t1 - p.t0 })
          }
          w.onerror = (e) => {
            for (const p of waiting.values()) p.fail(new Error(`worker error: ${e.message}`))
            waiting.clear()
          }
          const n = nextWorker++
          workers.set(n, w)
          return n
        },
        ask(n, msg) {
          const w = workers.get(n)
          if (w === undefined) return Promise.reject(new Error(`no worker ${n}`))
          const id = nextId++
          return new Promise((done, fail) => {
            waiting.set(id, { done, fail, t0: performance.now() })
            w.postMessage({ ...msg, id })
          })
        },
        kill(n) {
          workers.get(n)?.terminate()
          workers.delete(n)
        },
      }
    },
    [harnessBundle, ROLE] as const,
  )
}

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}
const round = (ms: number): number => Math.round(ms)

for (const seedName of SEEDS) {
  test(`${seedName}: a what-if run at each tier, cold and warm, and behind the store's final sweep`, async ({ page, browser }) => {
    test.setTimeout(30 * 60_000)
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.stack ?? err.message))
    await page.goto('/')
    await expect(page.locator('h1').first(), 'the production app never mounted').toBeAttached({ timeout: 60_000 })
    await installWorkers(page)

    // 1. The store's own final sweep, and the base the workbench builds on it.
    const prepWorker = await page.evaluate(() => window.__wt.spawn())
    const prepared = (await page.evaluate(([w, s]) => window.__wt.ask(w, { op: 'prepare', seed: s }), [prepWorker, seedName] as const)).value as Prepared
    await page.evaluate((w) => window.__wt.kill(w), prepWorker)
    console.log(`[whatif-timing] ${seedName}: final sweep ${round(prepared.sweepMs)} ms · base offset ${prepared.offset} (${prepared.route}, ${prepared.track} track)`)

    // 2. Each tier: a cold run in a fresh worker, then five warm runs in it.
    const tiers: Array<{ paths: number; coldMs: number; warmMs: number[]; warmMedianMs: number; warmWorstMs: number }> = []
    for (const paths of TIERS) {
      const w = await page.evaluate(() => window.__wt.spawn())
      const runOnce = async (): Promise<RunTiming> =>
        (await page.evaluate(([n, s, o, p]) => window.__wt.ask(n, { op: 'run', seed: s, offset: o, paths: p }), [w, seedName, prepared.offset, paths] as const))
          .value as RunTiming
      const cold = await runOnce()
      expect(cold.kind, `${seedName} at ${paths}: the run did not resolve`).toBe('resolved')
      const warm: number[] = []
      for (let i = 0; i < WARM_RUNS; i++) warm.push((await runOnce()).ms)
      await page.evaluate((n) => window.__wt.kill(n), w)
      const row = { paths, coldMs: round(cold.ms), warmMs: warm.map(round), warmMedianMs: round(median(warm)), warmWorstMs: round(Math.max(...warm)) }
      tiers.push(row)
      console.log(`[whatif-timing] ${seedName} @ ${paths}: cold ${row.coldMs} ms · warm median ${row.warmMedianMs} ms, worst ${row.warmWorstMs} ms (${row.warmMs.join(', ')})`)
    }

    // 3. Behind the store's final sweep: a run posted at a fifth, a half and four fifths of the sweep.
    const behind: Array<{ paths: number; position: number; roundTripMs: number; sweepMs: number }> = []
    for (const paths of TIERS) {
      for (const position of SWEEP_POSITIONS) {
        const w = await page.evaluate(() => window.__wt.spawn())
        const out = await page.evaluate(
          async ([n, s, o, p, delay]) => {
            const sweepAsk = window.__wt.ask(n, { op: 'sweep', seed: s })
            await new Promise((r) => setTimeout(r, delay))
            const run = await window.__wt.ask(n, { op: 'run', seed: s, offset: o, paths: p })
            const sw = await sweepAsk
            return { roundTripMs: run.roundTripMs, sweepMs: (sw.value as { ms: number }).ms }
          },
          [w, seedName, prepared.offset, paths, Math.round(prepared.sweepMs * position)] as const,
        )
        await page.evaluate((n) => window.__wt.kill(n), w)
        behind.push({ paths, position, roundTripMs: round(out.roundTripMs), sweepMs: round(out.sweepMs) })
        console.log(`[whatif-timing] ${seedName} @ ${paths} behind the sweep at ${position}: ${round(out.roundTripMs)} ms round trip (sweep ${round(out.sweepMs)} ms)`)
      }
    }

    const record = {
      seed: seedName,
      prepared: { ...prepared, sweepMs: round(prepared.sweepMs) },
      tiers,
      behind,
      browser: `${browser.browserType().name()} ${browser.version()}`,
      cpu: cpus()[0]?.model ?? 'unknown',
      logicalCores: cpus().length,
      head: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf-8' }).trim(),
    }
    mkdirSync(OUT, { recursive: true })
    writeFileSync(join(OUT, `${seedName}.json`), `${JSON.stringify(record, null, 2)}\n`)
    expect(pageErrors, pageErrors.join('\n---\n')).toEqual([])
  })
}
