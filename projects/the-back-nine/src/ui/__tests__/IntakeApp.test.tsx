// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'

/**
 * IntakeApp's read-only GLUE (Fork C ii) — the one link neither seam test reaches:
 * resultSave.test.ts pins `deriveResultSave(…, readOnly)` at the leaf, and App.test.tsx pins the
 * router's `entry.notice → readOnly` derivation against a props-echo stub — but nothing proved
 * IntakeApp actually FORWARDS its readOnly prop into the derivation (dropping the 3rd argument at
 * the call site left the whole suite green — ultramode 2026-07-03). Result is stubbed to an echo
 * of `save.kind` AND the new `backup` door prop (insight 066 — echo the props asserted, never a
 * swallowing marker); the vault session and the engine recompute are faked so the hydrate path runs
 * REAL (currentModel → draftFromScenario → scenarioFromDraft → deriveResultSave, plus the U8-tail
 * hasBackupRecord check) without the engine graph. BackupStep is stubbed to a Finish button so the
 * door's dissolve loop is drivable without the export/crypto graph.
 */

const h = vi.hoisted(() => ({ model: null as unknown, hasBackup: false }))
vi.mock('../vaultSession', () => ({
  getVaultSession: async () => ({ currentModel: () => h.model, hasBackupRecord: async () => h.hasBackup }),
}))
vi.mock('../Result', () => ({
  Result: ({ save, backup }: { save: { kind: string }; backup?: { onSave: () => void } }) => (
    <div data-save-kind={save.kind} data-backup={backup ? 'offered' : 'none'}>
      result stub
      {backup && (
        <button type="button" onClick={backup.onSave}>
          save-backup-stub
        </button>
      )}
    </div>
  ),
}))
vi.mock('../BackupStep', () => ({
  BackupStep: ({ onFinish, onCancel }: { onFinish: () => void; onCancel: () => void }) => (
    <div>
      <button type="button" onClick={onFinish}>
        finish-backup-stub
      </button>
      <button type="button" onClick={onCancel}>
        cancel-backup-stub
      </button>
    </div>
  ),
}))
// Props-echo for the intake phase (the bogus-seed provenance pin below) — the hydrate tests
// never mount it (they land on the Result phase).
vi.mock('@intake/flow', () => ({
  IntakeFlow: ({ periodConfirmed = false }: { periodConfirmed?: boolean }) => (
    <div data-period-confirmed={String(periodConfirmed)}>flow stub</div>
  ),
}))

import IntakeApp from '../IntakeApp'
import { appModel } from '../appModel'
import { scenarioFromDraft } from '../scenarioFromDraft'
import { DEV_SEEDS } from '../devSeeds'

// A complete, persistable household — the same fixture the seeds prove against the real engine.
const ready = scenarioFromDraft(DEV_SEEDS.retired)
if (!ready.ready) throw new Error('IntakeApp.test: the retired dev seed must build a persistable scenario')
h.model = ready.scenario

// The hydrate path awaits both recompute tiers; the derivation under test never reads the answer.
vi.spyOn(appModel, 'recompute').mockResolvedValue(undefined)

beforeEach(() => {
  h.hasBackup = false // default: no backup on record (the door-armed baseline); tests override
})
afterEach(cleanup)

describe('IntakeApp — the read-only verdict reaches deriveResultSave (Fork C ii glue)', () => {
  it('a READ-ONLY hydrated session derives NO save claim (kills the dropped-3rd-arg mutant)', async () => {
    render(<IntakeApp hydrateFromVault readOnly />)
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-save-kind', 'none')
  })

  it('the WRITABLE twin derives the clean saved badge — the flag is the verdict, not a global mute', async () => {
    render(<IntakeApp hydrateFromVault />)
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-save-kind', 'clean')
  })
})

describe('IntakeApp — the re-offer backup door (U8-tail: hydrated + writable + no note on record)', () => {
  it('OFFERS the door when a writable return has no backup on record', async () => {
    h.hasBackup = false
    render(<IntakeApp hydrateFromVault />)
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-backup', 'offered')
  })

  it('NO door when the note already exists (a household with a backup is never re-nagged)', async () => {
    h.hasBackup = true
    render(<IntakeApp hydrateFromVault />)
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-backup', 'none')
  })

  it('NO door on a READ-ONLY return, even with no note (the standing view-only banner is disclosure enough — v1 scope)', async () => {
    h.hasBackup = false
    render(<IntakeApp hydrateFromVault readOnly />)
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-backup', 'none')
  })

  it('finishing the backup step DISSOLVES the door and returns to the answer', async () => {
    h.hasBackup = false
    render(<IntakeApp hydrateFromVault />)
    const offered = await screen.findByText('result stub')
    expect(offered).toHaveAttribute('data-backup', 'offered')
    // Tap the door → the 'backup' phase mounts BackupStep (stubbed to a Finish button).
    fireEvent.click(screen.getByRole('button', { name: 'save-backup-stub' }))
    fireEvent.click(await screen.findByRole('button', { name: 'finish-backup-stub' }))
    // Back on the answer, the door no longer renders (needsBackup cleared, never re-armed).
    const back = await screen.findByText('result stub')
    expect(back).toHaveAttribute('data-backup', 'none')
  })

  it('DECLINING ("Not now") returns to the answer with the door STILL offered — an invited offer is never a trap', async () => {
    h.hasBackup = false
    render(<IntakeApp hydrateFromVault />)
    const offered = await screen.findByText('result stub')
    expect(offered).toHaveAttribute('data-backup', 'offered')
    fireEvent.click(screen.getByRole('button', { name: 'save-backup-stub' }))
    fireEvent.click(await screen.findByRole('button', { name: 'cancel-backup-stub' }))
    // Back on the answer: nothing recorded, needsBackup intact, the quiet door remains available.
    const back = await screen.findByText('result stub')
    expect(back).toHaveAttribute('data-backup', 'offered')
  })
})

describe('IntakeApp — dev-seed provenance flips only on an APPLIED seed (the R19 disarm stays armed)', () => {
  it('a BOGUS `?seed=` key applies no draft and never disarms the spend-period force-confirm', async () => {
    const { act } = await import('@testing-library/react')
    render(<IntakeApp seed="not-a-real-seed-key" />)
    // Flush the dynamic devSeeds import + its early return (resolveDevSeed → null, no apply).
    await act(async () => {})
    await act(async () => {})
    const stub = screen.getByText('flow stub')
    expect(stub).toHaveAttribute('data-period-confirmed', 'false')
  })
})
