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
  Result: ({
    save,
    backup,
    onReview,
    stalenessNote = false,
  }: {
    save: { kind: string }
    backup?: { onSave: () => void }
    onReview: () => void
    stalenessNote?: boolean
  }) => (
    <div data-save-kind={save.kind} data-backup={backup ? 'offered' : 'none'} data-staleness={String(stalenessNote)}>
      result stub
      <button type="button" onClick={onReview}>
        review-stub
      </button>
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
// Props-echo for the intake phase (the bogus-seed provenance pin + the completed-intake
// period-disarm block below) — the hydrate tests never mount it (they land on the Result
// phase). The complete-stub button drives IntakeApp's REAL `complete()` (the terminal-advance
// callback); the prop→behavior link (periodConfirmed ⇒ the spend-step advance sails through
// the real rule) is pinned with the REAL IntakeFlow in src/intake/__tests__/flow.test.tsx.
vi.mock('@intake/flow', () => ({
  IntakeFlow: ({
    periodConfirmed = false,
    onComplete,
  }: {
    periodConfirmed?: boolean
    onComplete?: () => void
  }) => (
    <div data-period-confirmed={String(periodConfirmed)}>
      flow stub
      <button type="button" onClick={() => onComplete?.()}>
        complete-stub
      </button>
    </div>
  ),
}))

import IntakeApp from '../IntakeApp'
import { appModel } from '../appModel'
import { scenarioFromDraft } from '../scenarioFromDraft'
import { DEV_SEEDS } from '../devSeeds'
import { copy } from '../copy'

// A complete, persistable household — the same fixture the seeds prove against the real engine.
const ready = scenarioFromDraft(DEV_SEEDS.retired)
if (!ready.ready) throw new Error('IntakeApp.test: the retired dev seed must build a persistable scenario')
h.model = ready.scenario

// P3·U13: the recompute is GATED behind the re-entry confirm (constraint (b)) — the spy both
// fakes the engine and lets the gate-order arms count dispatches.
const recomputeSpy = vi.spyOn(appModel, 'recompute').mockResolvedValue(undefined)

/** Walk the U13 re-entry gate (every hydrate mount lands on it before the result). */
async function affirmGate(readOnly = false) {
  const name = readOnly ? copy.reentryContinueCta : copy.reentryAffirmCta
  fireEvent.click(await screen.findByRole('button', { name }))
}

beforeEach(() => {
  h.hasBackup = false // default: no backup on record (the door-armed baseline); tests override
  recomputeSpy.mockClear()
})
afterEach(cleanup)

describe('IntakeApp — the read-only verdict reaches deriveResultSave (Fork C ii glue)', () => {
  it('a READ-ONLY hydrated session derives NO save claim (kills the dropped-3rd-arg mutant)', async () => {
    render(<IntakeApp hydrateFromVault readOnly />)
    await affirmGate(true)
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-save-kind', 'none')
  })

  it('the WRITABLE twin derives the clean saved badge — the flag is the verdict, not a global mute', async () => {
    render(<IntakeApp hydrateFromVault />)
    await affirmGate()
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-save-kind', 'clean')
  })
})

describe('IntakeApp — the re-offer backup door (U8-tail: hydrated + writable + no note on record)', () => {
  it('OFFERS the door when a writable return has no backup on record', async () => {
    h.hasBackup = false
    render(<IntakeApp hydrateFromVault />)
    await affirmGate()
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-backup', 'offered')
  })

  it('NO door when the note already exists (a household with a backup is never re-nagged)', async () => {
    h.hasBackup = true
    render(<IntakeApp hydrateFromVault />)
    await affirmGate()
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-backup', 'none')
  })

  it('NO door on a READ-ONLY return, even with no note (the standing view-only banner is disclosure enough — v1 scope)', async () => {
    h.hasBackup = false
    render(<IntakeApp hydrateFromVault readOnly />)
    await affirmGate(true)
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-backup', 'none')
  })

  it('finishing the backup step DISSOLVES the door and returns to the answer', async () => {
    h.hasBackup = false
    render(<IntakeApp hydrateFromVault />)
    await affirmGate()
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
    await affirmGate()
    const offered = await screen.findByText('result stub')
    expect(offered).toHaveAttribute('data-backup', 'offered')
    fireEvent.click(screen.getByRole('button', { name: 'save-backup-stub' }))
    fireEvent.click(await screen.findByRole('button', { name: 'cancel-backup-stub' }))
    // Back on the answer: nothing recorded, needsBackup intact, the quiet door remains available.
    const back = await screen.findByText('result stub')
    expect(back).toHaveAttribute('data-backup', 'offered')
  })
})

describe('IntakeApp — the U13 re-entry gate (council 2026-07-09, constraints (a)+(b))', () => {
  it('the confirm GATES the reveal: zero recompute dispatches while the gate is up; the affirm fires provisional→final and lands the result (never verdict-then-ask)', async () => {
    render(<IntakeApp hydrateFromVault />)
    // The gate is up — the read-back heading renders and NOTHING has been dispatched.
    await screen.findByRole('button', { name: copy.reentryAffirmCta })
    expect(screen.getByRole('heading', { name: copy.reentryHeading })).toBeInTheDocument()
    expect(recomputeSpy).not.toHaveBeenCalled()
    // Affirm → the held recompute pair fires and the result mounts.
    fireEvent.click(screen.getByRole('button', { name: copy.reentryAffirmCta }))
    await screen.findByText('result stub')
    expect(recomputeSpy.mock.calls.map((c) => c[0])).toEqual(['provisional', 'final'])
  })

  it('the update route lands in the walk-through (answers preserved, no recompute — the terminal advance owns it)', async () => {
    render(<IntakeApp hydrateFromVault />)
    fireEvent.click(await screen.findByRole('button', { name: copy.reentryUpdateCta }))
    await screen.findByText('flow stub')
    expect(recomputeSpy).not.toHaveBeenCalled()
  })

  it('a READ-ONLY return shows Continue ONLY — the update affordance is withheld (session.save would refuse; a dead-end CTA is the lying-remedy shape)', async () => {
    render(<IntakeApp hydrateFromVault readOnly />)
    await screen.findByRole('button', { name: copy.reentryContinueCta })
    expect(screen.queryByRole('button', { name: copy.reentryUpdateCta })).toBeNull()
    expect(screen.queryByRole('button', { name: copy.reentryAffirmCta })).toBeNull()
  })

  it('doctored OLD vault stamps → the staleness note reaches Result AND the badge stays CLEAN; the fresh twin reads false (constraint (a): derived from the RAW model)', async () => {
    const fresh = h.model
    try {
      h.model = {
        ...(fresh as Record<string, unknown>),
        taxVintageDetail: { taxYear: 2019, legalBasis: 'TCJA (pre-OBBBA)' },
      }
      render(<IntakeApp hydrateFromVault />)
      await affirmGate()
      const stale = await screen.findByText('result stub')
      expect(stale).toHaveAttribute('data-staleness', 'true')
      // THE BADGE LAW under drift (ultramode 2026-07-09, the glue-mutant pin): persist is
      // seeded from the RE-STAMPED normalized scenario, so an UNTOUCHED drifted vault reads
      // CLEAN — drift discloses via the note, never via a 'dirty' badge lying about mouse
      // activity (resultSave.ts's own law). Seeding persist from the raw model instead
      // (identity strips only savedAt; taxVintageDetail differs raw-vs-normalized) would
      // flip this to 'dirty' and survive every other arm in the suite.
      expect(stale).toHaveAttribute('data-save-kind', 'clean')
      cleanup()
      h.model = fresh
      render(<IntakeApp hydrateFromVault />)
      await affirmGate()
      const freshStub = await screen.findByText('result stub')
      expect(freshStub).toHaveAttribute('data-staleness', 'false')
      expect(freshStub).toHaveAttribute('data-save-kind', 'clean')
    } finally {
      h.model = fresh
    }
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

describe('IntakeApp — the completed-intake period disarm (the council-ratified NARROW fix, F10 carry-in)', () => {
  // The disarm's proof rides the DRAFT at completion: a draft that trips the spend-period gate
  // (probed with no touches / no provenance) can only have advanced past the spend step via an
  // explicit period answer. These pin the prop; flow.test.tsx ('periodConfirmed disarms the
  // force-confirm end-to-end') pins prop→behavior against the REAL flow + rule.
  const seedSpend = (annualSpendingReal: number | undefined, spendEntryPeriod: 'month' | 'year') =>
    appModel.update((d) => ({ ...d, annualSpendingReal, spendEntryPeriod }))

  it('a completion whose draft TRIPS the gate disarms the Review remount (the explicit answer was the only way through)', async () => {
    // $60k under an explicit 'year' — ambiguous-band ($60k ≥ the $8k floor), so the real flow
    // could only have advanced the spend step after the segment tap this draft records.
    seedSpend(60_000, 'year')
    render(<IntakeApp />)
    // Pre-completion the disarm is off — the first pass keeps the R19 force-confirm armed.
    expect(screen.getByText('flow stub')).toHaveAttribute('data-period-confirmed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'complete-stub' }))
    await screen.findByText('result stub')
    fireEvent.click(screen.getByRole('button', { name: 'review-stub' }))
    // The Review remount: the flow's touched state is gone, but the provenance survives.
    expect(screen.getByText('flow stub')).toHaveAttribute('data-period-confirmed', 'true')
  })

  it('a FRESH session that never completed still fires the force-confirm (kills the hardcoded-disarm mutant)', () => {
    // The 12× shape itself: $50k/mo under the unconfirmed 'month' default. No completion —
    // the prop must stay false so the real flow's gate blocks the spend-step advance.
    seedSpend(600_000, 'month')
    render(<IntakeApp />)
    expect(screen.getByText('flow stub')).toHaveAttribute('data-period-confirmed', 'false')
  })

  it('a completion whose draft NEVER trips the gate does NOT disarm — a Review-first ambiguous entry is a fresh first answer', async () => {
    // No spend figure at all: the intake completes (absent inputs are never a hard wall) but
    // proves nothing about the period. A bare completed-once flag would disarm here and let a
    // Review-entered $50k/mo-as-'month' sail through unconfirmed — the exact 12× silent
    // misentry the rule exists to catch.
    seedSpend(undefined, 'month')
    render(<IntakeApp />)
    fireEvent.click(screen.getByRole('button', { name: 'complete-stub' }))
    await screen.findByText('result stub')
    fireEvent.click(screen.getByRole('button', { name: 'review-stub' }))
    expect(screen.getByText('flow stub')).toHaveAttribute('data-period-confirmed', 'false')
  })
})
