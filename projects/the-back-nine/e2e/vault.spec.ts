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
 */
import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { build } from 'vite'

import type { KdfSpikeReport, TrustLoopReport } from './vaultHarness'

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
    }
  }
}

test('the full trust loop holds on real IndexedDB: save → lock → unlock → export → wipe → restore', async ({
  page,
}) => {
  await page.goto(CONTROL_ORIGIN)
  await page.addScriptTag({ content: harnessBundle })
  const report = await page.evaluate(() => window.VaultHarness.runTrustLoop())

  expect(report.firstSaveOk).toBe(true)
  expect(report.phraseWords).toBe(12)
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
})

test('a REAL second tab unlocking an active vault is read-only and its write is refused', async ({ context }) => {
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
