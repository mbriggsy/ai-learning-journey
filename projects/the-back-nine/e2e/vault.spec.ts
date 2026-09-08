/**
 * U4 vault e2e — the REAL-browser proof (vitest's fake-indexeddb/node-BroadcastChannel
 * greens are a map; this is Earth): real IndexedDB transactions, real Web Locks, real
 * cross-TAB BroadcastChannel, and the KDF-location spike measured in a real renderer.
 *
 * Runs on the CONTROL origin (:4181 — no CSP header) because the harness is INJECTED
 * script, which the enforced origin's `script-src 'self'` would (correctly) block.
 * That weakens nothing: the vault code paths under test are origin-agnostic, and CSP
 * enforcement has its own spec (csp.spec.ts).
 *
 * The store/crypto source is bundled at spec time with vite's JS API — no separate
 * build artifact to go stale, no new dependency.
 *
 * CROSS-BROWSER SCOPE — and its honest boundary. The two `@cross-browser`-tagged arms below
 * ALSO run under WebKit (playwright.config.ts's second project greps for that tag); the KDF
 * spike stays Chromium-only, because its recorded verdict is about Chromium's WebCrypto
 * thread pool. What the WebKit arms prove: the IndexedDB / Web Locks / BroadcastChannel paths
 * RUN there, and the `vault-caps` annotation RECORDS which storage capabilities that engine
 * exposes. What they do NOT prove: Safari's eviction behaviour. Nothing in this repo executes
 * a real eviction — both harnesses model it with a wipe (`clearVault`).
 */
import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { build } from 'vite'

import type { KdfSpikeReport, RecomputeSpikeReport, TrustLoopReport } from './vaultHarness'

const CONTROL_ORIGIN = 'http://127.0.0.1:4181'
const ROOT = resolve(import.meta.dirname, '..')

let harnessBundle: string

test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    resolve: { alias: { '@shared': resolve(ROOT, 'src/shared'), '@engine': resolve(ROOT, 'src/engine') } },
    build: {
      write: false,
      minify: false,
      lib: {
        entry: resolve(ROOT, 'e2e/vaultHarness.ts'),
        name: 'VaultHarness',
        formats: ['iife'],
        fileName: () => 'vault-harness.js',
      },
    },
  })
  const outputs = Array.isArray(result) ? result : [result]
  const first = outputs[0]
  if (!first || !('output' in first)) throw new Error('vite returned no harness bundle')
  const chunk = first.output.find((o) => o.type === 'chunk')
  if (!chunk || chunk.type !== 'chunk') throw new Error('no chunk in harness bundle')
  harnessBundle = chunk.code
})

declare global {
  interface Window {
    VaultHarness: {
      runTrustLoop(): Promise<TrustLoopReport>
      setupActiveWriter(): Promise<{ ok: boolean }>
      unlockFromSecondTab(): Promise<{ ok: boolean; readOnly: boolean; saveRefused: boolean }>
      releaseActiveWriter(): Promise<{ ok: boolean }>
      kdfSpike(): Promise<KdfSpikeReport>
      recomputeSpike(): Promise<RecomputeSpikeReport>
    }
  }
}

test('the full trust loop holds on real IndexedDB: save → lock → unlock → export → wipe → restore', { tag: '@cross-browser' }, async ({
  page,
}, testInfo) => {
  await page.goto(CONTROL_ORIGIN)
  await page.addScriptTag({ content: harnessBundle })
  const report = await page.evaluate(() => window.VaultHarness.runTrustLoop())

  expect(report.firstSaveOk).toBe(true)
  expect(report.lockedStatus).toBe('locked')
  expect(report.wrongPassphraseReason).toBe('wrong-passphrase')
  expect(report.unlockOk).toBe(true)
  expect(report.unlockReadOnly).toBe(false)
  expect(report.modelRoundTripped).toBe(true)
  expect(report.seedRoundTripped).toBe(true)
  expect(report.saveOk).toBe(true)
  expect(report.exportOk).toBe(true)
  expect(report.vaultClearedToNoVault).toBe(true)
  expect(report.restoreOk).toBe(true)
  expect(report.reopenWithNewPassphraseOk).toBe(true)
  expect(report.restoredModelEqual).toBe(true)

  // WHICH platform the green above was earned on — recorded per project, following the KDF
  // spike's pattern (annotation + console line). Without it a WebKit green could prove less
  // than this spec's own sentence: `underWebLock` in src/store/db.ts falls through to a bare
  // `fn()` when Web Locks is absent, so the single-active-writer story would then be riding on
  // session.ts's BroadcastChannel alone.
  const capsLine =
    `[vault-caps] project=${testInfo.project.name} webLocks=${report.caps.hasWebLocks} ` +
    `persist=${report.caps.hasPersist} broadcastChannel=${report.caps.hasBroadcastChannel}`
  testInfo.annotations.push({ type: 'vault-caps', description: capsLine })
  console.log(capsLine)

  // Assert the ONE capability the loop's claim depends on. `storage.persist()` is deliberately
  // ADVISORY in this product — `requestPersist` in src/store/db.ts returns null when it is
  // missing and swallows a throw, on the rule that a throwing persist() must never turn a
  // committed save into a failure — so asserting it would red the gate for a capability the
  // shipped code does not require. A browser missing it is the recorded line above, not a red.
  expect(
    report.caps.hasWebLocks,
    'the trust loop must run under a REAL Web Lock, not underWebLock’s bare-fn fallback in src/store/db.ts',
  ).toBe(true)
})

test('a REAL second tab unlocking an active vault is read-only and its write is refused', { tag: '@cross-browser' }, async ({
  context,
}) => {
  const page1 = await context.newPage()
  await page1.goto(CONTROL_ORIGIN)
  await page1.addScriptTag({ content: harnessBundle })
  expect(await page1.evaluate(() => window.VaultHarness.setupActiveWriter())).toEqual({ ok: true })

  // A genuinely separate tab — real cross-tab BroadcastChannel, shared origin storage.
  const page2 = await context.newPage()
  await page2.goto(CONTROL_ORIGIN)
  await page2.addScriptTag({ content: harnessBundle })
  const probe = await page2.evaluate(() => window.VaultHarness.unlockFromSecondTab())
  expect(probe.ok).toBe(true)
  expect(probe.readOnly).toBe(true)
  expect(probe.saveRefused).toBe(true)

  // Once the writer locks, a fresh unlock claims writer-hood.
  await page1.evaluate(() => window.VaultHarness.releaseActiveWriter())
  const second = await page2.evaluate(() => window.VaultHarness.unlockFromSecondTab())
  expect(second.ok).toBe(true)
  expect(second.readOnly).toBe(false)
})

test('the KDF-location spike: measure whether PBKDF2-600k blocks the Chromium main thread', async ({
  page,
}, testInfo) => {
  await page.goto(CONTROL_ORIGIN)
  await page.addScriptTag({ content: harnessBundle })
  const spike = await page.evaluate(() => window.VaultHarness.kdfSpike())

  // The spike's job is a TRUSTWORTHY measurement, not a pass/fail vibe: the derivation
  // must have really happened and the heartbeat must have really run through it.
  expect(spike.deriveMs).toBeGreaterThan(10)
  expect(spike.ticksDuringDerive).toBeGreaterThan(0)

  testInfo.annotations.push({
    type: 'kdf-spike',
    description:
      `deriveMs=${spike.deriveMs.toFixed(1)} ` +
      `maxGapDuringDerive=${spike.maxGapDuringDeriveMs.toFixed(1)}ms ` +
      `controlMaxGap=${spike.controlMaxGapMs.toFixed(1)}ms ` +
      `ticksDuringDerive=${spike.ticksDuringDerive}`,
  })
  console.log(
    `[kdf-spike] deriveMs=${spike.deriveMs.toFixed(1)} maxGapDuringDerive=${spike.maxGapDuringDeriveMs.toFixed(1)}ms ` +
      `controlMaxGap=${spike.controlMaxGapMs.toFixed(1)}ms ticks=${spike.ticksDuringDerive}`,
  )

  // The architecture decision rule (U4 plan): if the derive window's worst gap is in
  // the multi-hundred-ms class while the control window stays small, the main thread
  // IS blocked and the dedicated crypto worker fallback gets built. Chromium runs
  // WebCrypto on a background thread pool, so the expectation is NO blocking — this
  // assertion is the spike's recorded verdict, and a platform regression fails loud.
  expect(spike.maxGapDuringDeriveMs).toBeLessThan(Math.max(200, spike.controlMaxGapMs * 4 + 50))
})

test('the U8 decrypt-on-return recompute spike: the 16k-path "restoring…" wall-clock in a real renderer', async ({
  page,
}, testInfo) => {
  // OPT-IN: three 16k sweeps (~24s). Reproducible on the reference device on demand, but
  // skipped by default so it never taxes the CI CSP gate. Run:
  //   PROFILE=1 pnpm exec playwright test vault.spec.ts -g "recompute spike"
  test.skip(!process.env.PROFILE, 'perf profile — set PROFILE=1 to run (~24s of real 16k sweeps)')
  await page.goto(CONTROL_ORIGIN)
  await page.addScriptTag({ content: harnessBundle })
  const spike = await page.evaluate(() => window.VaultHarness.recomputeSpike())

  // Trustworthy measurement, not a pass/fail vibe: the profiled sweep must have really crowned
  // dates (a rejected input measures validation, not compute) and produced finite, ordered times.
  expect(spike.outcomeKind).toBe('dates')
  expect(spike.finalSingleSimulateMs).toBeGreaterThan(0)
  expect(spike.finalSweepMs).toBeGreaterThan(spike.finalSingleSimulateMs)

  // The Fork-D recompute takes ONE of two shapes: a single 16k run (already-retired household →
  // the spine headline) or the full 16k date sweep (still-working household). Both are the wait
  // the "restoring…" state must honestly cover; combine with the kdf-spike deriveMs for the total.
  const line =
    `[recompute-spike] final-single-16k(retired spine)=${spike.finalSingleSimulateMs.toFixed(1)}ms ` +
    `final-sweep-16k(working, ${spike.finalCandidateCount} candidates)=${spike.finalSweepMs.toFixed(1)}ms ` +
    `ratioVsSingle=${spike.finalRatioVsSingle.toFixed(1)} provisional-sweep-2k=${spike.provisionalSweepMs.toFixed(1)}ms`
  testInfo.annotations.push({ type: 'recompute-spike', description: line })
  console.log(line)
})
