/**
 * THE WORKER-POOL INSTRUMENT — the pooled solve in REAL Chrome, against the single-worker solve, at the
 * production path count (the worker pool, commit 2; design wf_c61881ba-752). An INSTRUMENT, never a
 * gate (e2e/held/ — no CI config collects it; scripts/__tests__/playwright-harness-partition.test.ts
 * proves it). It answers the three questions vitest cannot:
 *
 *  1. CROSS-ISOLATE DETERMINISM — ARGUED in `evalPool.ts` (one candidate's `simulate` is a pure
 *     function of `(params, seed)`), never assumed: every pooled run's `bitDigest` of the payload AND
 *     the packed wire must equal the sync run's, at 16,000 paths, with each candidate simulated in a
 *     DIFFERENT V8 isolate (a dedicated Worker) than the coordinator that ranks it.
 *  2. THE WALL CLOCK at each pool size P — the sync run first, in the SAME session (his laptop's state
 *     swings a solve ~2× across days — TODO's LANDMINES: never mix days in one table).
 *  3. THE HEAP per worker — `Runtime.getHeapUsage` on every worker target (a page CDP session
 *     auto-attached to its dedicated workers), sampled while each solve runs; the max per role.
 *
 * THE METHOD. `solvePoolHarness.ts` is bundled at spec time (vite JS API, IIFE) and evaluated in Blob
 * workers on the dist CONTROL origin (:4181 — no CSP, so Blob workers construct; the pool's CSP proof
 * is `pnpm verify:csp`'s pooled arm on the enforced origin). The request is built ONCE in the page by
 * the app's own builder and cloned to every role. Roles: ONE sync worker; per P, ONE coordinator + P
 * eval workers wired by `MessageChannel`s — the app's topology (`engineClient.ts`), the same code.
 *
 * SERIAL, ON A QUIET MACHINE — nothing else heavy beside it (the load landmine).
 *
 *     pnpm build
 *     SOLVE_POOL_OUT=temp/solve-pool/<name> SOLVE_POOL_TARGETS="retired:tax,healthnc:tax" SOLVE_POOL_PS="4,8,12,18" \
 *       pnpm exec playwright test --config e2e/held/solve-timing.config.ts solve-pool
 */
import { expect, test, type CDPSession, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'vite'

import type { RecommendationGoal } from '../../src/shared/model'
import type { PoolRunReport } from './solvePoolHarness'

const ROOT = resolve(import.meta.dirname, '../..')
const OUT = resolve(ROOT, process.env.SOLVE_POOL_OUT ?? 'temp/solve-pool/adhoc')
const GOALS: Record<string, RecommendationGoal> = { tax: 'pay-less-tax', leave: 'leave-more' }

const TARGETS = (process.env.SOLVE_POOL_TARGETS ?? 'retired:tax').split(',').map((raw) => {
  const [seed, goal] = raw.trim().split(':')
  if (!seed || !goal || !Object.hasOwn(GOALS, goal)) throw new Error(`SOLVE_POOL_TARGETS: "${raw}" is not <seed>:<tax|leave>`)
  return { seed, goal: GOALS[goal]!, goalKey: goal }
})
const PS = (process.env.SOLVE_POOL_PS ?? '4,8,12,18').split(',').map((s) => {
  const p = Number(s.trim())
  if (!Number.isInteger(p) || p < 1) throw new Error(`SOLVE_POOL_PS: "${s}" is not a positive integer`)
  return p
})

/** The role script every Blob worker runs after the bundle. */
const ROLE = `
self.onmessage = async (e) => {
  const m = e.data
  try {
    if (m.op === 'sync') self.postMessage({ ok: SolvePoolHarness.solveSync(m.req) })
    else if (m.op === 'serve') { SolvePoolHarness.serve(m.port); self.postMessage({ ok: 'serving' }) }
    else if (m.op === 'pooled') self.postMessage({ ok: await SolvePoolHarness.solvePooled(m.req, m.ports) })
  } catch (err) { self.postMessage({ error: String((err && err.stack) || err) }) }
}`

declare global {
  interface Window {
    SolvePoolHarness: { request(seed: string, goal: RecommendationGoal): unknown }
    __poolRun?: Promise<PoolRunReport>
  }
}

/** The heap of every dedicated worker the page spawns, via a non-flattened auto-attach (Playwright's
 *  CDPSession has no child-session routing, so messages ride `Target.sendMessageToTarget`). */
class WorkerHeaps {
  private readonly sessions = new Set<string>()
  private readonly pending = new Map<number, (v: { usedSize: number; totalSize: number } | null) => void>()
  private nextId = 1
  private constructor(private readonly cdp: CDPSession) {}

  static async attach(page: Page): Promise<WorkerHeaps> {
    const cdp = await page.context().newCDPSession(page)
    const heaps = new WorkerHeaps(cdp)
    cdp.on('Target.attachedToTarget', (e) => {
      if (e.targetInfo.type === 'worker') heaps.sessions.add(e.sessionId)
    })
    cdp.on('Target.detachedFromTarget', (e) => {
      if (e.sessionId) heaps.sessions.delete(e.sessionId)
    })
    cdp.on('Target.receivedMessageFromTarget', (e) => {
      const msg = JSON.parse(e.message) as { id?: number; result?: { usedSize: number; totalSize: number } }
      if (msg.id === undefined) return
      heaps.pending.get(msg.id)?.(msg.result ?? null)
      heaps.pending.delete(msg.id)
    })
    await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: false })
    return heaps
  }

  /** One heap read per live worker (MB used); a worker busy in a long synchronous task answers when
   *  it next yields, so each read is bounded and a non-answer is dropped, never invented. */
  async sample(): Promise<number[]> {
    const reads = [...this.sessions].map(
      (sessionId) =>
        new Promise<number | null>((done) => {
          const id = this.nextId++
          const timer = setTimeout(() => {
            this.pending.delete(id)
            done(null)
          }, 5_000)
          this.pending.set(id, (r) => {
            clearTimeout(timer)
            done(r === null ? null : Math.round((r.usedSize / 1_048_576) * 10) / 10)
          })
          void this.cdp
            .send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method: 'Runtime.getHeapUsage' }) })
            .catch(() => done(null))
        }),
    )
    return (await Promise.all(reads)).filter((v): v is number => v !== null)
  }
}

/** Sample the heaps every 3 s until `run` settles; the max of each sample's largest + its count. */
async function whileSampling<T>(heaps: WorkerHeaps, run: Promise<T>): Promise<{ result: T; maxWorkerMB: number; maxTotalMB: number; samples: number }> {
  let settled = false
  const out = run.finally(() => {
    settled = true
  })
  let maxWorkerMB = 0
  let maxTotalMB = 0
  let samples = 0
  while (!settled) {
    await Promise.race([out.catch(() => undefined), new Promise((r) => setTimeout(r, 3_000))])
    if (settled) break
    const s = await heaps.sample()
    if (s.length === 0) continue
    samples += 1
    maxWorkerMB = Math.max(maxWorkerMB, ...s)
    maxTotalMB = Math.max(maxTotalMB, s.reduce((a, b) => a + b, 0))
  }
  return { result: await out, maxWorkerMB, maxTotalMB, samples }
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
      lib: { entry: resolve(ROOT, 'e2e/held/solvePoolHarness.ts'), name: 'SolvePoolHarness', formats: ['iife'], fileName: () => 'solve-pool-harness.js' },
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
  test(`${seed} · ${goalKey}: pooled vs sync in real Chrome — digest, wall clock, heap`, async ({ page, browser }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.stack ?? err.message))
    await page.goto('/')
    await expect(page.locator('h1').first(), 'the production app never mounted').toBeAttached({ timeout: 60_000 })
    await page.addScriptTag({ content: harnessBundle })
    expect(await page.evaluate(() => typeof window.SolvePoolHarness), `the harness did not load:\n${pageErrors.join('\n---\n')}`).toBe('object')
    const heaps = await WorkerHeaps.attach(page)

    // Build the app's request ONCE, in the page, and keep it there for every role.
    await page.evaluate(([s, g]) => {
      ;(window as unknown as { __req: unknown }).__req = window.SolvePoolHarness.request(s, g)
    }, [seed, goal] as const)

    // 1. THE SAME-SESSION BASELINE: the sync solve in one dedicated worker.
    await page.evaluate(
      ([code, role]) => {
        const w = new Worker(URL.createObjectURL(new Blob([`${code}\n${role}`], { type: 'text/javascript' })))
        window.__poolRun = new Promise<PoolRunReport>((done, fail) => {
          w.onmessage = (e: MessageEvent<{ ok?: PoolRunReport; error?: string }>) => {
            w.terminate()
            if (e.data.ok) done(e.data.ok)
            else fail(new Error(e.data.error))
          }
          w.onerror = (e) => fail(new Error(`sync worker error: ${e.message}`))
        })
        w.postMessage({ op: 'sync', req: (window as unknown as { __req: unknown }).__req })
      },
      [harnessBundle, ROLE] as const,
    )
    const syncRun = await whileSampling(heaps, page.evaluate(() => window.__poolRun!))
    const sync = syncRun.result
    expect(sync.paths, `${seed}: not the production path count`).toBe(16_000)
    expect(sync.payloadKind, `${seed}: the sync solve did not recommend`).toBe('recommended')
    console.log(`[solve-pool] ${seed} · ${goalKey}: SYNC ${(sync.solveMs / 1000).toFixed(1)} s · heap ${syncRun.maxWorkerMB} MB (${sync.candidateCount} candidates)`)

    // 2. Each P: ONE coordinator + P eval workers over MessageChannels — the app's topology.
    const pooled: Array<{ p: number; seconds: number; speedup: number; maxWorkerMB: number; maxTotalMB: number; samples: number; identical: boolean }> = []
    for (const p of PS) {
      await page.evaluate(
        async ([code, role, n]) => {
          const spawn = () => new Worker(URL.createObjectURL(new Blob([`${code}\n${role}`], { type: 'text/javascript' })))
          const evals = Array.from({ length: n }, spawn)
          const coordinator = spawn()
          const all = [...evals, coordinator]
          const ask = (w: Worker, msg: unknown, transfer: Transferable[] = []) =>
            new Promise<unknown>((done, fail) => {
              w.onmessage = (e: MessageEvent<{ ok?: unknown; error?: string }>) => (e.data.error ? fail(new Error(e.data.error)) : done(e.data.ok))
              w.onerror = (e) => fail(new Error(`pool worker error: ${e.message}`))
              w.postMessage(msg, transfer)
            })
          const channels = evals.map(() => new MessageChannel())
          await Promise.all(evals.map((w, i) => ask(w, { op: 'serve', port: channels[i]!.port2 }, [channels[i]!.port2])))
          const ports = channels.map((c) => c.port1)
          window.__poolRun = (
            ask(coordinator, { op: 'pooled', req: (window as unknown as { __req: unknown }).__req, ports }, ports) as Promise<PoolRunReport>
          ).finally(() => {
            for (const w of all) w.terminate()
          })
        },
        [harnessBundle, ROLE, p] as const,
      )
      const run = await whileSampling(heaps, page.evaluate(() => window.__poolRun!))
      const r = run.result
      const identical = r.payloadDigest === sync.payloadDigest && r.wireDigest === sync.wireDigest
      const seconds = Math.round(r.solveMs / 100) / 10
      pooled.push({ p, seconds, speedup: Math.round((sync.solveMs / r.solveMs) * 100) / 100, maxWorkerMB: run.maxWorkerMB, maxTotalMB: run.maxTotalMB, samples: run.samples, identical })
      console.log(
        `[solve-pool] ${seed} · ${goalKey}: P=${p} ${seconds} s (×${(sync.solveMs / r.solveMs).toFixed(2)}) · ` +
          `heap max ${run.maxWorkerMB} MB/worker, ${run.maxTotalMB} MB all workers · digest ${identical ? 'IDENTICAL' : 'MOVED'}`,
      )
    }

    const record = {
      seed,
      goal,
      sync: { ...sync, seconds: Math.round(sync.solveMs / 100) / 10, maxWorkerMB: syncRun.maxWorkerMB, heapSamples: syncRun.samples },
      pooled,
      browser: `${browser.browserType().name()} ${browser.version()}`,
      cpu: cpus()[0]?.model ?? 'unknown',
      logicalCores: cpus().length,
      head: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf-8' }).trim(),
    }
    mkdirSync(OUT, { recursive: true })
    writeFileSync(join(OUT, `${seed}-${goalKey}.json`), `${JSON.stringify(record, null, 2)}\n`)
    // The proof: every pool size reproduced the sync payload and wire bit for bit.
    for (const row of pooled) expect(row.identical, `${seed} at P = ${row.p}: the pooled payload or wire MOVED`).toBe(true)
  })
}
