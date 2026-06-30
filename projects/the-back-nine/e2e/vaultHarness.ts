/**
 * The U4 vault e2e harness — bundled at spec time (vite JS API, IIFE) and injected
 * into a REAL Chromium page on the no-CSP control origin. Everything the vitest
 * suite proved against shims (fake-indexeddb, node BroadcastChannel, no Web Locks)
 * re-runs here against the real platform: real IndexedDB transactions/rollback,
 * real Web Locks, real cross-TAB BroadcastChannel, real `navigator.storage`.
 *
 * Each exported function returns plain JSON-able data (the spec asserts node-side).
 */
import { checkPassphraseFloor, derivePassphraseKey } from '../src/crypto/kdf'
import { clearVault, loadVault, openVaultDb } from '../src/store/db'
import { exportVault, restoreVault } from '../src/store/backup'
import { createSession, type VaultSession } from '../src/store/session'
import type { Scenario } from '../src/shared/model'

const MODEL: Scenario = {
  schemaVersion: 1,
  initialPortfolio: 1_100_000,
  annualSpendingReal: 50_000,
  stockWeight: 0.6,
  people: [
    {
      sex: 'female',
      currentAge: 53,
      retirementAge: 58,
      earnedIncomeReal: 95_000,
      socialSecurityReal: 27_000,
      socialSecurityClaimAge: 67,
    },
  ],
  survivorSpendingRatio: 1,
  drawdownPolicy: 'bracket-fill',
  seed: 0x0ddba11,
}

const PASSPHRASE = 'plinth otter vivid casket 92 lampoon'
const NEW_PASSPHRASE = 'gallant mosaic thunder eel 7 parquet'
/** The recovery credential — a second user-chosen passphrase, distinct from both dailies. */
const RECOVERY_PASSPHRASE = 'lattice harbor cinder vellum 48 thicket'

async function floor(passphrase: string) {
  const checked = await checkPassphraseFloor(passphrase)
  if (!checked.ok) throw new Error('harness passphrase below floor')
  return checked.passphrase
}

const modelsEqual = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)

// Held open across calls so a second page can probe against a live writer.
let heldSession: VaultSession | null = null

export interface TrustLoopReport {
  readonly firstSaveOk: boolean
  readonly lockedStatus: string
  readonly wrongPassphraseReason: string
  readonly unlockOk: boolean
  readonly unlockReadOnly: boolean
  readonly modelRoundTripped: boolean
  readonly seedRoundTripped: boolean
  readonly saveOk: boolean
  readonly exportOk: boolean
  readonly vaultClearedToNoVault: boolean
  readonly restoreOk: boolean
  readonly reopenWithNewPassphraseOk: boolean
  readonly restoredModelEqual: boolean
}

/** The full save → lock → unlock → export → wipe → restore loop on REAL IndexedDB. */
export async function runTrustLoop(): Promise<TrustLoopReport> {
  const db = await openVaultDb()
  await clearVault(db) // a clean slate even if a prior run leaked state

  const session = createSession(db)
  const saved = await session.firstSave(MODEL, await floor(PASSPHRASE), await floor(RECOVERY_PASSPHRASE))

  await session.lock()
  const lockedStatus = session.status()
  const wrong = await session.unlock('definitely not the passphrase')
  const wrongPassphraseReason = wrong.ok ? 'unexpected-ok' : wrong.reason

  const unlocked = await session.unlock(PASSPHRASE)
  const model = session.currentModel()
  const saveResult = await session.save({ ...MODEL, annualSpendingReal: 51_000 })

  const exported = await exportVault(db)
  await session.lock()

  await clearVault(db) // the wipe (models eviction / a new device)
  const afterClear = await loadVault(db)

  // Restore with the RECOVERY passphrase (the export carries only the recoveryWrap).
  const restored = exported.ok
    ? await restoreVault(db, exported.file, RECOVERY_PASSPHRASE, await floor(NEW_PASSPHRASE))
    : { ok: false as const, reason: 'export-failed' }

  const reopened = createSession(db)
  const reopenResult = await reopened.unlock(NEW_PASSPHRASE)
  const restoredModel = reopened.currentModel()
  await reopened.lock()

  return {
    firstSaveOk: saved.ok,
    lockedStatus,
    wrongPassphraseReason,
    unlockOk: unlocked.ok,
    unlockReadOnly: unlocked.ok ? unlocked.readOnly : true,
    modelRoundTripped: modelsEqual(model, MODEL),
    seedRoundTripped: (model as Scenario | null)?.seed === MODEL.seed,
    saveOk: saveResult.ok,
    exportOk: exported.ok,
    vaultClearedToNoVault: afterClear.kind === 'no-vault',
    restoreOk: restored.ok,
    reopenWithNewPassphraseOk: reopenResult.ok,
    restoredModelEqual: modelsEqual(restoredModel, { ...MODEL, annualSpendingReal: 51_000 }),
  }
}

/** Page-1 setup for the cross-tab test: create the vault and HOLD the writer session open. */
export async function setupActiveWriter(): Promise<{ ok: boolean }> {
  const db = await openVaultDb()
  await clearVault(db)
  heldSession = createSession(db)
  const saved = await heldSession.firstSave(MODEL, await floor(PASSPHRASE), await floor(RECOVERY_PASSPHRASE))
  return { ok: saved.ok }
}

/** Page-2 probe: unlock the same vault from a REAL second tab. */
export async function unlockFromSecondTab(): Promise<{ ok: boolean; readOnly: boolean; saveRefused: boolean }> {
  const db = await openVaultDb()
  const session = createSession(db)
  const unlocked = await session.unlock(PASSPHRASE)
  const save = await session.save({ ...MODEL, annualSpendingReal: 99_999 })
  await session.lock()
  return {
    ok: unlocked.ok,
    readOnly: unlocked.ok ? unlocked.readOnly : false,
    saveRefused: !save.ok && save.reason === 'not-writable',
  }
}

/** Release page-1's writer (the lock that frees the next unlock to claim writer-hood). */
export async function releaseActiveWriter(): Promise<{ ok: boolean }> {
  await heldSession?.lock()
  heldSession = null
  return { ok: true }
}

export interface KdfSpikeReport {
  /** Wall-clock of one PBKDF2-600k deriveKey. */
  readonly deriveMs: number
  /** Largest main-thread heartbeat gap WHILE deriving — the jank measurement. */
  readonly maxGapDuringDeriveMs: number
  /** Largest heartbeat gap during an idle control window (the baseline). */
  readonly controlMaxGapMs: number
  readonly ticksDuringDerive: number
}

/**
 * THE U4 KDF-LOCATION SPIKE: does a 600k-iteration deriveKey BLOCK the main thread?
 * A setTimeout(0) heartbeat runs through both an idle control window and the
 * derivation; if the platform runs PBKDF2 off-thread, the derive-window gaps match
 * the control baseline. If it blocks, one gap ≈ the whole derivation.
 */
export async function kdfSpike(): Promise<KdfSpikeReport> {
  const measureWindow = async (work: () => Promise<void>): Promise<{ maxGap: number; ticks: number }> => {
    const gaps: number[] = []
    let last = performance.now()
    let running = true
    const tick = (): void => {
      if (!running) return
      const now = performance.now()
      gaps.push(now - last)
      last = now
      setTimeout(tick, 0)
    }
    setTimeout(tick, 0)
    await work()
    running = false
    return { maxGap: gaps.length > 0 ? Math.max(...gaps) : 0, ticks: gaps.length }
  }

  const control = await measureWindow(() => new Promise((r) => setTimeout(r, 250)))

  let deriveMs = 0
  const derive = await measureWindow(async () => {
    const t0 = performance.now()
    await derivePassphraseKey('the spike measurement passphrase', new Uint8Array(16))
    deriveMs = performance.now() - t0
  })

  return {
    deriveMs,
    maxGapDuringDeriveMs: derive.maxGap,
    controlMaxGapMs: control.maxGap,
    ticksDuringDerive: derive.ticks,
  }
}
