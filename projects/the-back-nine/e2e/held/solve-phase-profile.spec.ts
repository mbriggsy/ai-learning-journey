/**
 * THE SOLVE-PHASE-PROFILE INSTRUMENT — WHERE the production solve's minutes go (register: Tier 2 *The
 * recommendation's pending line promises "a few minutes"…*; `solve-timing.spec.ts` beside this file
 * measured HOW LONG — 8.9–26.0 min — and this one splits it). An INSTRUMENT, never a gate (e2e/held/ —
 * no CI config collects it; scripts/__tests__/playwright-harness-partition.test.ts proves it).
 *
 * THE METHOD. `solvePhaseHarness.ts` is bundled at spec time (vite JS API, IIFE, unminified so the
 * profile keeps the source's function names) and injected on the dist CONTROL origin (:4181 — injected
 * script is what the enforced origin's CSP blocks). It builds the request the app builds and runs
 * `solveWithMint` on the page's MAIN thread under a CDP CPU profile (`Profiler.start` / `.stop`):
 * Playwright cannot reach the engine worker's own CDP target, so the harness runs the same code on the
 * same V8 in the same installed Chrome (`channel: 'chrome'`, new headless). The main thread is blocked
 * for the whole solve — nothing else is measured, so nothing else needs it.
 *
 * WHAT IT REPORTS. For every sample, each DISTINCT function on its stack is charged the sample's time
 * once (inclusive time; recursion never double-counts). The phases are named functions of the engine:
 * `runOptimalityOracle` · `runRankingStability` · `mintOracleToken` · `solve` → `runSearch` (split by
 * whether `namedDriverProbe` is on the stack — the probe's own re-search vs the crown's search) ·
 * `gradeSolveRecommendation` · `namedDriverProbe`; plus `simulate` / `evaluateCandidates` totals and the
 * top self-time functions (the hot loop the design phase will read). A function name the bundler
 * renamed (`foo$1`) is matched by its prefix and the raw name is recorded.
 *
 * SERIAL, ONE SOLVE AT A TIME, ON A QUIET MACHINE — the solve-timing instrument's load landmine.
 *
 *     pnpm build
 *     SOLVE_PROFILE_OUT=temp/solve-profile/<name> SOLVE_PROFILE_TARGETS="retired:tax" \
 *       pnpm exec playwright test --config e2e/held/solve-timing.config.ts solve-phase-profile
 *
 * Targets: `<dev seed>:<goal>`, goal ∈ {tax, leave}. Each target writes `<out>/<seed>-<goal>.json`.
 */
import { expect, test } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'vite'

import type { RecommendationGoal } from '../../src/shared/model'
import type { PhaseRunReport } from './solvePhaseHarness'

const ROOT = resolve(import.meta.dirname, '../..')
const OUT = resolve(ROOT, process.env.SOLVE_PROFILE_OUT ?? 'temp/solve-profile/adhoc')

const GOALS: Record<string, RecommendationGoal> = { tax: 'pay-less-tax', leave: 'leave-more' }

const TARGETS = (process.env.SOLVE_PROFILE_TARGETS ?? 'retired:tax').split(',').map((raw) => {
  const [seed, goal] = raw.trim().split(':')
  if (!seed || !goal || !Object.hasOwn(GOALS, goal)) {
    throw new Error(`SOLVE_PROFILE_TARGETS: "${raw}" is not <seed>:<tax|leave>`)
  }
  return { seed, goal: GOALS[goal]!, goalKey: goal }
})

/** `main` (default) profiles the solve on the page's main thread; `worker` runs the SAME bundle inside
 *  a dedicated Worker (the thread the app solves on) and records the wall-clock only — the CDP profiler
 *  cannot reach it. Comparing the two isolates the THREAD from the code. */
const THREAD = process.env.SOLVE_PROFILE_THREAD ?? 'main'
if (THREAD !== 'main' && THREAD !== 'worker') throw new Error(`SOLVE_PROFILE_THREAD: "${THREAD}" is not main|worker`)

/** 10 ms sampling: a 25-min solve is ~150k samples — ample resolution for phases of minutes. */
const SAMPLING_US = 10_000

/** The phases, by function name. Order is the report's order. */
const PHASES = [
  'solveWithMint',
  'runOptimalityOracle',
  'runRankingStability',
  'mintOracleToken',
  'solve',
  'runSearch',
  'selectRecommendation',
  'gradeSolveRecommendation',
  'namedDriverProbe',
  'evaluateCandidates',
  'simulate',
] as const

declare global {
  interface Window {
    SolvePhaseHarness: { run(seed: string, goal: RecommendationGoal): PhaseRunReport }
  }
}

interface ProfileNode {
  readonly id: number
  readonly callFrame: { readonly functionName: string; readonly url: string; readonly lineNumber: number }
  readonly children?: readonly number[]
}
interface CpuProfile {
  readonly nodes: readonly ProfileNode[]
  readonly startTime: number
  readonly endTime: number
  readonly samples: readonly number[]
  readonly timeDeltas: readonly number[]
}

/** A bundler may suffix a colliding name (`runSearch$1`); the phase is the source name. */
const baseName = (fn: string): string => fn.replace(/\$\d+$/, '')

/** Reduce the profile to inclusive time per phase (+ the probe-split of runSearch) and top self-time. */
function reduceProfile(profile: CpuProfile) {
  const byId = new Map<number, ProfileNode>()
  const parent = new Map<number, number>()
  for (const n of profile.nodes) {
    byId.set(n.id, n)
    for (const c of n.children ?? []) parent.set(c, n.id)
  }
  const inclusiveUs = new Map<string, number>()
  const selfUs = new Map<string, number>()
  const rawNames = new Set<string>()
  let runSearchInProbeUs = 0
  let runSearchDirectUs = 0
  let evalInStabilityUs = 0
  let evalInSearchUs = 0
  let evalInGradeUs = 0
  let totalUs = 0
  // `timeDeltas[i]` is the gap BEFORE sample i — charged to sample i (the DevTools convention).
  profile.samples.forEach((leafId, i) => {
    const dt = profile.timeDeltas[i] ?? 0
    totalUs += dt
    const leaf = byId.get(leafId)!
    const leafName = leaf.callFrame.functionName || '(anonymous)'
    selfUs.set(leafName, (selfUs.get(leafName) ?? 0) + dt)
    const seen = new Set<string>()
    for (let id: number | undefined = leafId; id !== undefined; id = parent.get(id)) {
      const raw = byId.get(id)!.callFrame.functionName
      if (raw === '') continue
      const name = baseName(raw)
      if (name !== raw) rawNames.add(raw)
      seen.add(name)
    }
    for (const name of seen) inclusiveUs.set(name, (inclusiveUs.get(name) ?? 0) + dt)
    if (seen.has('runSearch')) {
      if (seen.has('namedDriverProbe')) runSearchInProbeUs += dt
      else runSearchDirectUs += dt
    }
    if (seen.has('evaluateCandidates')) {
      if (seen.has('runRankingStability')) evalInStabilityUs += dt
      else if (seen.has('gradeSolveRecommendation')) evalInGradeUs += dt
      else if (seen.has('runSearch')) evalInSearchUs += dt
    }
  })
  const s = (us: number): number => Math.round(us / 100_000) / 10
  const pct = (us: number): number => (totalUs > 0 ? Math.round((us / totalUs) * 1000) / 10 : 0)
  const phases = Object.fromEntries(
    PHASES.map((p) => {
      const us = inclusiveUs.get(p) ?? 0
      return [p, { seconds: s(us), percent: pct(us) }]
    }),
  )
  const topSelf = [...selfUs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([name, us]) => ({ name, seconds: s(us), percent: pct(us) }))
  return {
    profiledSeconds: s(totalUs),
    samples: profile.samples.length,
    phases,
    runSearchSplit: {
      crownSearch: { seconds: s(runSearchDirectUs), percent: pct(runSearchDirectUs) },
      insideNamedDriverProbe: { seconds: s(runSearchInProbeUs), percent: pct(runSearchInProbeUs) },
    },
    evaluateCandidatesSplit: {
      rankingStability: { seconds: s(evalInStabilityUs), percent: pct(evalInStabilityUs) },
      runSearch: { seconds: s(evalInSearchUs), percent: pct(evalInSearchUs) },
      grade: { seconds: s(evalInGradeUs), percent: pct(evalInGradeUs) },
    },
    topSelf,
    renamedFunctions: [...rawNames].sort(),
  }
}

let harnessBundle: string

test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    root: ROOT,
    logLevel: 'silent',
    resolve: { tsconfigPaths: true },
    // Library mode leaves `process.env.NODE_ENV` for its consumer; the browser has no `process`.
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      write: false,
      minify: false, // the profile reads function NAMES
      lib: {
        entry: resolve(ROOT, 'e2e/held/solvePhaseHarness.ts'),
        name: 'SolvePhaseHarness',
        formats: ['iife'],
        fileName: () => 'solve-phase-harness.js',
      },
    },
  })
  const outputs = Array.isArray(result) ? result : [result]
  const first = outputs[0]
  if (!first || !('output' in first)) throw new Error('vite returned no harness bundle')
  const chunk = first.output.find((o) => o.type === 'chunk')
  if (!chunk || chunk.type !== 'chunk') throw new Error('no chunk in the harness bundle')
  harnessBundle = chunk.code
})

for (const { seed, goal, goalKey } of TARGETS) {
  test(`${seed} · ${goalKey}: the solve's phase split on the main thread`, async ({ page, browser }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.stack ?? err.message))

    await page.goto('/')
    await expect(page.locator('h1').first(), 'the production app never mounted').toBeAttached({ timeout: 60_000 })
    await page.addScriptTag({ content: harnessBundle })
    // `addScriptTag` RESOLVES on a throwing script — assert the global, with the page's errors.
    expect(
      await page.evaluate(() => typeof window.SolvePhaseHarness),
      `the harness bundle did not load — page errors:\n${pageErrors.join('\n---\n')}`,
    ).toBe('object')

    if (THREAD === 'worker') {
      // The SAME bundle, evaluated in a dedicated Worker from a Blob (the control origin carries no
      // CSP, so `worker-src` does not apply); the report's `solveMs` is the worker's own clock.
      const report = await page.evaluate(
        ([code, s, g]) =>
          new Promise<PhaseRunReport>((done, fail) => {
            const src = `${code}\nself.onmessage = (e) => { try { self.postMessage({ ok: SolvePhaseHarness.run(e.data[0], e.data[1]) }) } catch (err) { self.postMessage({ error: String(err && err.stack || err) }) } }`
            const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })))
            w.onmessage = (e: MessageEvent<{ ok?: PhaseRunReport; error?: string }>) =>
              e.data.ok ? done(e.data.ok) : fail(new Error(e.data.error))
            w.onerror = (e) => fail(new Error(`worker error: ${e.message}`))
            w.postMessage([s, g])
          }),
        [harnessBundle, seed, goal] as const,
      )
      expect(report.payloadKind, `${seed}: the solve did not recommend`).toBe('recommended')
      const record = {
        ...report,
        thread: 'worker',
        solveSeconds: Math.round(report.solveMs / 100) / 10,
        browser: `${browser.browserType().name()} ${browser.version()}`,
        cpu: cpus()[0]?.model ?? 'unknown',
        head: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf-8' }).trim(),
      }
      mkdirSync(OUT, { recursive: true })
      writeFileSync(join(OUT, `${seed}-${goalKey}-worker.json`), `${JSON.stringify(record, null, 2)}\n`)
      console.log(`[solve-profile] ${seed} · ${goalKey}: ${record.solveSeconds} s in a dedicated Worker (${report.candidateCount} candidates)`)
      return
    }

    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Profiler.enable')
    await cdp.send('Profiler.setSamplingInterval', { interval: SAMPLING_US })
    await cdp.send('Profiler.start')
    const report = await page.evaluate(([s, g]) => window.SolvePhaseHarness.run(s, g), [seed, goal] as const)
    const { profile } = (await cdp.send('Profiler.stop')) as unknown as { profile: CpuProfile }
    await cdp.send('Profiler.disable')

    // NON-VACUITY: a short-circuited solve (refused / withheld / token-withheld / mint-failed) stopped
    // before the grade and the probe — its split would describe a different program.
    expect(report.payloadKind, `${seed}: the solve did not recommend — its split is not a full solve's`).toBe(
      'recommended',
    )
    const reduced = reduceProfile(profile)
    // The profile must cover the solve: a profiler that saw a fraction of it would split a fraction.
    expect(reduced.profiledSeconds, `${seed}: the profile covers less than the solve it profiled`).toBeGreaterThanOrEqual(
      (report.solveMs / 1000) * 0.95,
    )
    expect(reduced.phases.solveWithMint!.seconds, `${seed}: solveWithMint is not on the profile's stacks`).toBeGreaterThan(0)

    const record = {
      ...report,
      solveSeconds: Math.round(report.solveMs / 100) / 10,
      ...reduced,
      browser: `${browser.browserType().name()} ${browser.version()}`,
      cpu: cpus()[0]?.model ?? 'unknown',
      hardwareConcurrency: cpus().length,
      head: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf-8' }).trim(),
    }
    mkdirSync(OUT, { recursive: true })
    writeFileSync(join(OUT, `${seed}-${goalKey}.json`), `${JSON.stringify(record, null, 2)}\n`)
    const p = reduced.phases
    console.log(
      `[solve-profile] ${seed} · ${goalKey}: ${record.solveSeconds} s (${report.payloadKind}, ${report.candidateCount} candidates) — ` +
        `stability ${p.runRankingStability!.seconds} s · crown search ${reduced.runSearchSplit.crownSearch.seconds} s · ` +
        `probe ${p.namedDriverProbe!.seconds} s · grade ${p.gradeSolveRecommendation!.seconds} s · oracle ${p.runOptimalityOracle!.seconds} s`,
    )
  })
}
