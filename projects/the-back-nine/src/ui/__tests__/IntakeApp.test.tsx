// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react'

/**
 * IntakeApp's read-only GLUE (Fork C ii) — the one link neither seam test reaches:
 * resultSave.test.ts pins `deriveResultSave(…, readOnly)` at the leaf, and App.test.tsx pins the
 * router's `entry.notice → readOnly` derivation against a props-echo stub — but nothing proved
 * IntakeApp actually FORWARDS its readOnly prop into the derivation (dropping the 3rd argument at
 * the call site left the whole suite green — ultramode 2026-07-03). The shell's slot (the home since Act 6 · RC4) is
 * stubbed to an echo of `save.kind` AND the backup re-offer (insight 066 — echo the props asserted, never a
 * swallowing marker); the vault session and the engine recompute are faked so the hydrate path runs
 * REAL (currentModel → draftFromScenario → scenarioFromDraft → deriveResultSave, plus the U8-tail
 * hasBackupRecord check) without the engine graph. BackupStep is stubbed to a Finish button so the
 * door's dissolve loop is drivable without the export/crypto graph.
 */

const h = vi.hoisted(() => ({ model: null as unknown, hasBackup: false }))
vi.mock('../vaultSession', () => ({
  getVaultSession: async () => ({ currentModel: () => h.model, hasBackupRecord: async () => h.hasBackup }),
}))
// Since Act 6 · RC4 the shell is the home (the old answer page and its `result` phase are gone): the shell's slot is
// stubbed to an echo of the props IntakeApp hands it, the same props the Result stub echoed before (insight 066).
vi.mock('../shell/ShellSlot', () => ({
  ShellSlot: ({
    shell,
  }: {
    shell: {
      save: { kind: string; onKeep?: () => void }
      onBackup?: () => void
      backupOffered?: boolean
      onReview?: () => void
      stalenessNote?: boolean
      leftOverClauseHost?: boolean
      readOnly?: boolean
    }
  }) => (
    <div
      data-save-kind={shell.save.kind}
      data-backup={shell.backupOffered === true && shell.onBackup !== undefined ? 'offered' : 'none'}
      data-staleness={String(shell.stalenessNote ?? false)}
      data-left-over-host={String(shell.leftOverClauseHost ?? false)}
      data-read-only={String(shell.readOnly ?? false)}
    >
      result stub
      <button type="button" onClick={shell.onReview}>
        review-stub
      </button>
      {shell.save.kind === 'first' && (
        <button type="button" onClick={shell.save.onKeep}>
          keep-stub
        </button>
      )}
      {shell.backupOffered === true && shell.onBackup !== undefined && (
        <button type="button" onClick={shell.onBackup}>
          save-backup-stub
        </button>
      )}
    </div>
  ),
}))
// SaveFlow stubbed to its two callbacks so the unsaved-work guard's ceremony hand-off is drivable
// without the crypto graph: commit-stub = firstSave landed (onCommitted); done-stub = the Done tap.
vi.mock('../SaveFlow', () => ({
  SaveFlow: ({ onCommitted, onComplete }: { onCommitted: () => void; onComplete: () => void }) => (
    <div>
      save stub
      <button type="button" onClick={onCommitted}>
        save-commit-stub
      </button>
      <button type="button" onClick={onComplete}>
        save-done-stub
      </button>
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
import { scenarioFromDraft, currentEpochDay } from '../scenarioFromDraft'
import { DEV_SEEDS, doctorWorkingYearsStaleVault } from '../devSeeds'
import { copy, slots } from '../copy'
import { readyToApplyUpdate } from '../updateGate'
import { holdUnsavedBuffer } from '@intake/unsavedBuffer'
import type { ScenarioDraft } from '@store/memoryModel'
import { CURRENT_SCHEMA_VERSION, scenarioIdentityKey, type CurrentScenario } from '@shared/model'
import { decodeScenario, encodeScenario } from '@shared/scenarioCodec'

// A complete, persistable household — the same fixture the seeds prove against the real engine.
const ready = scenarioFromDraft(DEV_SEEDS.retired)
if (!ready.ready) throw new Error('IntakeApp.test: the retired dev seed must build a persistable scenario')
h.model = ready.scenario

// P3·U13: the recompute is GATED behind the re-entry confirm (constraint (b)) — the spy both
// fakes the engine and lets the gate-order arms count dispatches.
const recomputeSpy = vi.spyOn(appModel, 'recompute').mockResolvedValue(true)

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

describe('IntakeApp — the hydrate gate admits exactly the current version (the schema-v4, -v5 and -v6 bumps)', () => {
  // A version-3, -4 or -5 plan never reaches the gate as 3, 4 or 5 (the codec relabels each at unlock),
  // so what the gate refuses is null and the version-1/2 ladder members, which the codec decodes as-is. The CURRENT
  // model hydrating is every other hydrate test in this file (the fixture is a fresh mint).
  // Only the RELABELED arms can see the gate's version clause: the current two-person plan carrying
  // an old label passes `draftFromScenario` and re-mints at the current version, so with the clause
  // deleted it would hydrate. The version-1 model has ONE person (`draftFromScenario` refuses it
  // anyway), and null also lands on this face through the effect's catch — those two pin the
  // refusal end to end, not the clause (the schema-v4 whole-file review, wf_edc27bef-48a).
  const v1Model = {
    schemaVersion: 1,
    initialPortfolio: 1_000_000,
    annualSpendingReal: 52_000,
    stockWeight: 0.55,
    people: [{ sex: 'female', currentAge: 52, retirementAge: 59, earnedIncomeReal: 110_000, socialSecurityReal: 26_000, socialSecurityClaimAge: 67 }],
    survivorSpendingRatio: 1,
    drawdownPolicy: 'proportional',
    seed: 0x7eedf00d,
  }
  it.each([
    ['a version-1 model', v1Model],
    ['the current plan labeled 2', { ...ready.scenario, schemaVersion: 2 }],
    ['the current plan labeled 3', { ...ready.scenario, schemaVersion: 3 }],
    // The schema-v5 bump's arm: the two-person plan, no answer, labeled 4 — only the version clause refuses it.
    ['the current plan labeled 4', { ...ready.scenario, schemaVersion: 4 }],
    // The schema-v6 bump's arm: the same plan labeled 5 (the codec relabels a real one; the gate still refuses it).
    ['the current plan labeled 5', { ...ready.scenario, schemaVersion: 5 }],
    ['no model at all', null],
  ])('%s is refused to the restore-failed face — never hydrated, never computed', async (_label, model) => {
    const current = h.model
    h.model = model
    try {
      render(<IntakeApp hydrateFromVault />)
      expect(await screen.findByText(copy.unlockGeneric)).toBeInTheDocument()
      expect(screen.queryByText('result stub')).toBeNull()
      expect(recomputeSpy).not.toHaveBeenCalled()
    } finally {
      h.model = current
    }
  })

  it('the current model passes the gate (the fixture is a fresh mint, labeled with the constant)', async () => {
    expect((h.model as { schemaVersion: unknown }).schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    render(<IntakeApp hydrateFromVault />)
    await affirmGate()
    expect(await screen.findByText('result stub')).toBeInTheDocument()
  })
})

// Build 2's U14 (R12; obligation (f)): the vault arm that RENDERS IntakeApp's real hydrate effect — the one place
// a literal `leftOverStale: false` left at the call site would turn red (the devSeeds vault arms rebuild the call
// with their own literals and never run it).
describe('IntakeApp — build 2’s moved left over reaches the re-entry gate from the real hydrate path', () => {
  const plantedVault = (d: ScenarioDraft, doctor?: (s: CurrentScenario) => CurrentScenario) => {
    const built = scenarioFromDraft(d)
    if (!built.ready) throw new Error('[test setup] the seed must save')
    return doctor === undefined ? built.scenario : doctor(built.scenario)
  }

  it('`datesavedmoved`: the gate names both figures under the left-over lead, with the door sentence; the Result hears no clause host', async () => {
    const current = h.model
    h.model = plantedVault(DEV_SEEDS.datesavedmoved)
    try {
      render(<IntakeApp hydrateFromVault />)
      expect(
        await screen.findByText(
          `${copy.stalenessLeftOverNote} ${slots.stalenessLeftOverMoved('16,985', '27,537', '16,985')} ${copy.stalenessLeftOverGateDoor}`,
        ),
      ).toBeInTheDocument()
      await affirmGate()
      expect((await screen.findByText('result stub')).closest('[data-left-over-host]')?.getAttribute('data-left-over-host')).toBe('false')
    } finally {
      h.model = current
    }
  })

  it('`datesavedmoved` saved under an older working-years table: the clause rides that clock’s line, no second line speaks, and the Result hears the host', async () => {
    const current = h.model
    h.model = plantedVault(DEV_SEEDS.datesavedmoved, (s) => doctorWorkingYearsStaleVault(s, currentEpochDay()))
    try {
      render(<IntakeApp hydrateFromVault />)
      expect(
        await screen.findByText(`${copy.stalenessWorkingYears} ${slots.stalenessLeftOverClause('16,985', '27,537', '16,985')}`),
      ).toBeInTheDocument()
      expect(screen.queryByText(new RegExp(copy.stalenessLeftOverNote))).toBeNull()
      await affirmGate()
      const stub = (await screen.findByText('result stub')).closest('[data-left-over-host]')
      expect(stub?.getAttribute('data-left-over-host')).toBe('true')
      expect(stub?.getAttribute('data-staleness')).toBe('true')
    } finally {
      h.model = current
    }
  })

  // The walk-6 round review's pair (L3-3 / L1-5 / L2-5), through the real hydrate: `datesavedrisenlater` with its old
  // $84,000 TYPED back in (a fresh typed figure below the $105,000 of spending, the left over moved to $26,985 at it).
  // The moved words name the $84,000 their $26,985 rests on, wherever the gate says them. Since the walk-9 form council's
  // call (1a) that is decided once, in `composeReentry`: with no rules line fired, R1's line CARRIES the clause after its
  // counts sentence (no moved note of its own, and its door's scope sentence names the left over); with a working-years
  // line fired, the clause rides that line and R1's line is drawn plain. Typed by hand from the seed's documented figures.
  const typedLater = (): ScenarioDraft => {
    const later = DEV_SEEDS.datesavedrisenlater
    const w = later.workingYearCost
    if (w === undefined) throw new Error('[test setup] the witness holds a W')
    return { ...later, workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: w.stateTaxReading } }
  }
  // The clause in W8-R5 (b)'s words ("all the money left over in a working year"), one text on both of its hosts.
  const MOVED_AT_TYPED_CLAUSE =
    'You said all the money left over in a working year goes into your savings, when your first working year had $16,985 left over. At your figure of $84,000 a year, it has $26,985 left over now. So each working year adds at most $16,985 of its left over to your savings, the smaller of the two.'
  /** R1's opening on the gate around the clause (call (1a)'s order): the counts sentence before it; the lean, the cap
   *  sentence and the scoped lead after it. */
  const TYPED_COUNTS = 'Your answer counts a working year at your own figure of $84,000 a year, below your spending of $105,000 a year.'
  const TYPED_AFTER_CLAUSE =
    'A working year almost always costs at least your spending of $105,000 a year, so your answer can look better than it really is. ' +
    'At your spending, your first working year would have $5,985 left over, so the answer at that spending would add at most $5,985 in any working year. ' +
    'What each answer adds to your savings in each working year you’re both alive:'
  /** The typed-below door's route under the buttons, the same on both scope forms. */
  const TYPED_ROUTE =
    'After “Balances still about right — show my answer”, press “Update your figure for a working year” on your answer; “Something’s changed — update them” asks about it among its questions.'
  const doorText = () => {
    const door = document.querySelector('.save-actions + section.reentry-door')
    return { heading: door?.querySelector('h3')?.textContent, scope: door?.querySelector('p')?.textContent }
  }

  it('a typed figure below the spending, the left over moved at it, no rules line fired: R1’s line carries the clause naming the $84,000 its $26,985 rests on, after its counts sentence — no moved note of its own — and its door’s scope sentence names the left over', async () => {
    const current = h.model
    h.model = plantedVault(typedLater())
    try {
      render(<IntakeApp hydrateFromVault />)
      await screen.findByRole('button', { name: copy.reentryAffirmCta })
      // The rebuild's KTD6, host 2: R1's line is the block of TM's three runs, now the gate's ONE note (one cause, one
      // line: the clause rides it). TM opens the survivor gate (Sam, 60 and retired, can die from 66, in 2032, while Alex
      // works), so the block ends on the survivor part's paragraph, after the runs' ordered list (the walk-8 form council's
      // KD7 and KD8), every run labelled "…, while you’re still working" (the walk-9 form council's call (3)).
      const notes = Array.from(document.querySelector('.reentry-notes')!.children)
      expect(notes.map((c) => c.tagName), 'R1’s block alone: no moved note beside it').toEqual(['DIV'])
      expect(Array.from(notes[0]!.children).map((c) => `${c.tagName} ${c.className}`)).toEqual([
        'P note-parts__opening',
        'OL note-parts__runs',
        'P note-parts__closing',
      ])
      expect(notes[0]!.querySelector(':scope > p.note-parts__opening')?.textContent, 'the clause after the counts sentence, before the lean').toBe(
        `${TYPED_COUNTS} ${MOVED_AT_TYPED_CLAUSE} ${TYPED_AFTER_CLAUSE}`,
      )
      const gateText = document.querySelector('.reentry-notes')!.textContent ?? ''
      expect(gateText.split(MOVED_AT_TYPED_CLAUSE).length - 1, 'the moved fact said once').toBe(1)
      expect(gateText, 'no moved note’s lead').not.toContain(copy.stalenessLeftOverNote)
      expect(gateText, 'no moved note’s door sentence').not.toContain(copy.stalenessLeftOverGateDoor)
      expect(Array.from(notes[0]!.querySelectorAll('ol.note-parts__runs > li > p.note-parts__label')).map((p) => p.textContent)).toEqual([
        '2026 through 2028, while you’re still working',
        '2029 through 2032, while you’re still working',
        '2033 through 2035, while you’re still working',
      ])
      expect(
        notes[0]!.querySelector(':scope > p.note-parts__closing')?.textContent?.startsWith('In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $78,750 at your spending of $105,000 a year.'),
        'the condition is the survivor part’s, after the list, never one more run',
      ).toBe(true)
      expect(notes[0]!.querySelector('ol.note-parts__runs')?.textContent, 'and never inside the list').not.toContain('In a working year with only one of you alive')
      // The moved note's door fact moved into the typed-below door's scope sentence, under the buttons (the tab can save).
      expect(doorText()).toEqual({
        heading: 'To update your $84,000 figure',
        scope: `Neither button on this page updates your $84,000 figure or what you said about the money left over; both lead to where you can. ${TYPED_ROUTE}`,
      })
    } finally {
      h.model = current
    }
  })

  it('…saved under an older working-years table: the clause that line hosts names the $84,000 too, no moved line of its own speaks, and R1’s line and its door are drawn plain', async () => {
    const current = h.model
    h.model = plantedVault(typedLater(), (s) => doctorWorkingYearsStaleVault(s, currentEpochDay()))
    try {
      render(<IntakeApp hydrateFromVault />)
      expect(await screen.findByText(`${copy.stalenessWorkingYears} ${MOVED_AT_TYPED_CLAUSE}`)).toBeInTheDocument()
      expect(screen.queryByText(new RegExp(copy.stalenessLeftOverNote))).toBeNull()
      // R1's line opens on its counts sentence and goes straight to the lean: the clause is the rules line's alone.
      expect(document.querySelector('.reentry-notes p.note-parts__opening')?.textContent).toBe(`${TYPED_COUNTS} ${TYPED_AFTER_CLAUSE}`)
      expect(doorText()).toEqual({
        heading: 'To update your $84,000 figure',
        scope: `Neither button on this page updates your $84,000 figure; both lead to where you can. ${TYPED_ROUTE}`,
      })
    } finally {
      h.model = current
    }
  })

  // The moved line's door sentence promises a choice that leads to where the answer can change, so, like the
  // stale-W line's, it rides only a tab that can save (`canChange: !readOnly`, the `ReentryPayCheckStale` door
  // law). The go-live review found IntakeApp's own argument unpinned: a planted `canChange: true` stayed green.
  it('`datesavedmoved` on a READ-ONLY tab: the gate names both figures with NO door sentence; the writable twin (first arm) ends with it', async () => {
    const current = h.model
    h.model = plantedVault(DEV_SEEDS.datesavedmoved)
    try {
      render(<IntakeApp hydrateFromVault readOnly />)
      await screen.findByRole('button', { name: copy.reentryContinueCta })
      const lines = Array.from(document.querySelectorAll('.reentry-notes p')).map((p) => p.textContent ?? '')
      expect(lines, 'the moved line renders read-only, door sentence and all left off').toContain(
        `${copy.stalenessLeftOverNote} ${slots.stalenessLeftOverMoved('16,985', '27,537', '16,985')}`,
      )
      expect(lines.some((t) => t.includes(copy.stalenessLeftOverGateDoor)), 'no line offers a door the tab cannot open').toBe(false)
    } finally {
      h.model = current
    }
  })

  // R12's dollars clause on the GATE, through IntakeApp's own call (`workingYearCostStaleLine` over the hydrated
  // draft). The b9-6 mutant pass found this call unpinned: the gate's only stale-W arm above plants
  // `datecoststale`, which stores no answer, so its line is the W step's bare sentence either way, and the
  // `datesavedstale` arms in `reentry.test.tsx` call the core themselves. A call site reverted to the bare
  // sentence would drop the clause from the gate alone, every other test green.
  it('`datesavedstale`: the gate’s stale-W line is a block — the W step’s sentence and the either-way lead in “confirm or change”, then “This answer now” with the $16,985 a year not added and no amount guessed at; its door under the buttons, naming no W-row choice', async () => {
    const current = h.model
    h.model = plantedVault(DEV_SEEDS.datesavedstale)
    try {
      render(<IntakeApp hydrateFromVault />)
      await screen.findByRole('button', { name: copy.reentryAffirmCta })
      const block = document.querySelector('.reentry-notes > div.note-parts')
      expect(block, 'the clause rides the gate’s W line, as a block').not.toBeNull()
      // The W step's sentence for a yes to $84,000 the spending fell below ($78,000): no lean (the safe side).
      expect(block!.querySelector('p.note-parts__opening')?.textContent).toBe(
        [copy.stalenessPayCheckGateLead, slots.workingCostStaleQuote('84,000', '78,000'), copy.workingCostStaleEitherWayConfirm].join(' '),
      )
      expect(Array.from(block!.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual([copy.workingCostStaleLabelNow])
      expect(Array.from(block!.querySelectorAll('dd')).map((dd) => dd.textContent)).toEqual([
        [
          slots.workingCostStaleAfterWork('78,000', true),
          slots.workingCostStaleLeftOverAnswered('16,985'),
          slots.workingCostStaleLeftOverNoneConfirm('16,985', '84,000'),
          copy.workingCostStaleNoGuess,
        ].join(' '),
      ])
      // The door, through IntakeApp's own call (council `wf_22858e04-f7a` (2)): under the buttons, the heading, the
      // scope sentence, the route; the W row's choices ride the Result and the W row only (the move, (3)).
      const door = document.querySelector('.save-actions + section.reentry-door')
      expect(door?.querySelector('h3')?.textContent).toBe(slots.workingCostStaleDoorHeadingConfirm('84,000'))
      expect(door?.querySelector('p')?.textContent).toBe(
        [slots.workingCostStaleGateScopeConfirm('84,000'), slots.workingCostStaleGateRoute(copy.stalenessPayCheckCta)].join(' '),
      )
      const gateText = document.querySelector('main')?.textContent ?? ''
      expect(gateText).not.toContain(copy.workingCostStaleDoorHold)
      expect(gateText).not.toContain(copy.workingCostYes)
    } finally {
      h.model = current
    }
  })

  // …and the RISEN twin (the U11 walk's (ae)): the gate's W line carries R2's lean (no working year at $90,000 runs
  // short), the clause, and the most a check at the quote adds — year 0 at $90,000, hand-derived (150,000 − 11,475 −
  // 17,540 − 20,000 − 90,000 = $10,985). A call site reverted to the W step's note would drop the clause and the check.
  it('`datesavedrisen`: the gate’s stale-W line is the note (R2’s gap lean), the either-way lead in “update”, “This answer now”, “If a working year costs $90,000” with the most updating adds, what lowers it and what a lower figure does; the update door under the buttons', async () => {
    const current = h.model
    h.model = plantedVault(DEV_SEEDS.datesavedrisen)
    try {
      render(<IntakeApp hydrateFromVault />)
      await screen.findByRole('button', { name: copy.reentryAffirmCta })
      const block = document.querySelector('.reentry-notes > div.note-parts')!
      expect(block.querySelector('p.note-parts__opening')?.textContent).toBe(
        [
          copy.stalenessPayCheckGateLead,
          slots.workingCostStaleQuote('84,000', '90,000'),
          slots.workingCostStaleLeftOverInflated('84,000', '6,000', '90,000', true),
          copy.workingCostStaleEitherWayUpdate,
        ].join(' '),
      )
      // The survivor part (U11 walk 8's W8-R12 (a)): the block's closing paragraph after its segments (the gate's door is
      // its own section under the buttons).
      expect(block.querySelector(':scope > p.note-parts__closing')?.textContent).toBe(
        [
          slots.workingCostTypedBelowSurvivorCharges({ typed: '84,000', quote: '90,000', source: 'spending', names: 'answers' }, ['63,000', '67,500']),
          slots.workingCostTypedBelowSurvivorLess({ typed: '84,000', quote: '90,000', source: 'spending', names: 'answers' }, '4,500', 2),
        ].join(' '),
      )
      expect(Array.from(block.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual([
        copy.workingCostStaleLabelNow,
        slots.workingCostStaleLabelIf('90,000'),
      ])
      expect(Array.from(block.querySelectorAll('dd')).map((dd) => dd.textContent)).toEqual([
        [
          slots.workingCostStaleAfterWork('90,000', true),
          slots.workingCostStaleLeftOverAnswered('16,985'),
          slots.workingCostStaleLeftOverNoneUpdate('16,985', '84,000'),
          slots.workingCostStaleNoSmallerAmount('90,000'),
        ].join(' '),
        [
          slots.workingCostStaleLeftOverIfCapped('10,985', 2026, '90,000', false),
          slots.workingCostStaleEachDollar('90,000', '10,985'),
          slots.workingCostStaleLowerAddsMore('90,000', '10,985', '6,000', '16,985'),
        ].join(' '),
      ])
      const door = document.querySelector('.save-actions + section.reentry-door')
      expect(door?.querySelector('h3')?.textContent).toBe(slots.workingCostStaleDoorHeadingUpdate('84,000'))
      expect(door?.querySelector('p')?.textContent).toBe(
        [slots.workingCostStaleGateScopeUpdate('84,000'), slots.workingCostStaleGateRoute(copy.stalenessPayCheckCtaUpdate)].join(' '),
      )
    } finally {
      h.model = current
    }
  })
})

describe('IntakeApp — the read-only verdict reaches deriveResultSave (Fork C ii glue)', () => {
  it('a READ-ONLY hydrated session derives NO save claim (kills the dropped-3rd-arg mutant)', async () => {
    render(<IntakeApp hydrateFromVault readOnly />)
    await affirmGate(true)
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-save-kind', 'none')
    // …and Result itself is told, so the pay check's standing line offers no door into an edit this
    // tab could never keep (KTD21).
    expect(stub).toHaveAttribute('data-read-only', 'true')
  })

  it('the WRITABLE twin derives the clean saved badge — the flag is the verdict, not a global mute', async () => {
    render(<IntakeApp hydrateFromVault />)
    await affirmGate()
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-save-kind', 'clean')
    expect(stub).toHaveAttribute('data-read-only', 'false')
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

  it('the reveal’s provisional, superseded before it settled (an edit on the Result re-ran), sends NO final (W9-R7, KTD7) — with its settled-as-newest twin as the control', async () => {
    for (const settledAsNewest of [false, true]) {
      recomputeSpy.mockClear()
      let release!: (newest: boolean) => void
      const provisional = new Promise<boolean>((r) => (release = r))
      recomputeSpy.mockImplementationOnce(() => provisional)
      const view = render(<IntakeApp hydrateFromVault />)
      fireEvent.click(await screen.findByRole('button', { name: copy.reentryAffirmCta }))
      await screen.findByText('result stub')
      expect(recomputeSpy.mock.calls.map((c) => c[0])).toEqual(['provisional'])
      release(settledAsNewest)
      // The reveal awaited this promise before the test did, so its decision is made by the time this resumes.
      await provisional
      expect(recomputeSpy.mock.calls.map((c) => c[0]), `settled as newest: ${settledAsNewest}`).toEqual(
        settledAsNewest ? ['provisional', 'final'] : ['provisional'],
      )
      view.unmount()
    }
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

  // The stale-W line (b9-7's `payCheckStale`): the door sentence promises a choice that leads to where W
  // can change, so it rides only a tab that can save (`canChange: !readOnly`) — the whole-file review
  // found no arm reaching IntakeApp's own argument (a planted `canChange: true` stayed green).
  const staleW = scenarioFromDraft(DEV_SEEDS.datecoststale)
  if (!staleW.ready) throw new Error('IntakeApp.test: datecoststale must build a persistable scenario')
  const payCheckLine = (): string | undefined =>
    Array.from(document.querySelectorAll('.reentry-notes p'))
      .map((p) => p.textContent ?? '')
      .find((t) => t.startsWith(copy.stalenessPayCheckGateLead))

  it('a READ-ONLY return over a stale W says the stale line and draws no door; a writable one draws the door under its buttons', async () => {
    const fresh = h.model
    try {
      h.model = staleW.scenario
      render(<IntakeApp hydrateFromVault readOnly />)
      await screen.findByRole('button', { name: copy.reentryContinueCta })
      const door = [slots.workingCostStaleGateScopeConfirm('84,000'), slots.workingCostStaleGateRoute(copy.stalenessPayCheckCta)].join(' ')
      expect(payCheckLine(), 'the stale-W line renders read-only').toBeDefined()
      expect(document.querySelector('.reentry-door'), 'no door read-only').toBeNull()
      expect(document.querySelector('main')?.textContent).not.toContain(slots.workingCostStaleGateScopeConfirm('84,000'))
      cleanup()
      render(<IntakeApp hydrateFromVault />)
      await screen.findByRole('button', { name: copy.reentryAffirmCta })
      expect(payCheckLine(), 'the same line, writable').toBeDefined()
      expect(document.querySelector('.save-actions + section.reentry-door p')?.textContent, 'the writable tab names the door').toBe(door)
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

describe('IntakeApp — the completed-intake dead end (2026-08-20 walk finding 1, build half)', () => {
  // The recompute is mocked (nothing ever resolves), so the answer stays `idle` after completion. Until Act 6 · RC4 the
  // answer page withheld its actions row while "computing" and the dead end (idle WITH a missing required fact) had to
  // keep the escape hatch; since RC4 the completion lands on the shell, whose way back to the walk (the gear's panel and
  // its re-walk) is never withheld, so both frames land with the re-walk door (the figured pages name what they wait
  // for: `probabilityView.test.ts`, `snapshotView.test.ts`).
  it('a completed intake with ONE gated fact blank (the retiree’s stop-age) lands on the shell with its re-walk door', async () => {
    const [you, spouse] = DEV_SEEDS.retired.people
    appModel.update(() => ({
      ...DEV_SEEDS.retired,
      people: [you, { ...spouse, workStatus: 'retired' as const, retirementAge: undefined }],
    }))
    render(<IntakeApp />)
    fireEvent.click(screen.getByRole('button', { name: 'complete-stub' }))
    await screen.findByText('result stub')
    fireEvent.click(screen.getByRole('button', { name: 'review-stub' }))
    expect(screen.getByText('flow stub'), 'the re-walk door reaches the walk').toBeInTheDocument()
  })

  it('a completed intake with NOTHING missing and nothing yet resolved lands on the shell too (the crunch withholds no door)', async () => {
    appModel.update(() => DEV_SEEDS.retired)
    render(<IntakeApp />)
    fireEvent.click(screen.getByRole('button', { name: 'complete-stub' }))
    await screen.findByText('result stub')
    expect(screen.getByRole('button', { name: 'review-stub' })).toBeInTheDocument()
  })
})

describe('IntakeApp — the unsaved-work guard (beforeunload warns, never persists)', () => {
  // The probe: dispatch the browser's own event and read whether a handler claimed it. jsdom fires
  // no dialog, so `defaultPrevented` IS the observable (Playwright auto-accepts beforeunload when no
  // dialog listener is registered, so an e2e can never see it either).
  const wouldWarn = () => {
    const ev = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(ev)
    return ev.defaultPrevented
  }
  const bump = (d: ScenarioDraft): ScenarioDraft => ({
    ...d,
    annualSpendingReal: (d.annualSpendingReal ?? 0) + 1_000,
  })

  it('a hydrated vault → Review with NO edit does not warn (the filed persist.kind arm would have been permanently disarmed here — the guard is disk-derived instead)', async () => {
    render(<IntakeApp hydrateFromVault />)
    await affirmGate()
    await screen.findByText('result stub')
    expect(wouldWarn()).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'review-stub' }))
    await screen.findByText('flow stub')
    expect(wouldWarn()).toBe(false) // re-entered intake over a saved plan, nothing typed yet
  })

  it('an edit that moves the answer off the disk WARNS; editing it back does not (the badge’s own compare)', async () => {
    render(<IntakeApp hydrateFromVault />)
    await affirmGate()
    await screen.findByText('result stub')
    const before = appModel.getSnapshot().draft
    await act(async () => appModel.update(bump))
    expect(wouldWarn()).toBe(true)
    await act(async () => appModel.update(() => before))
    expect(wouldWarn()).toBe(false)
  })

  it('a FRESH intake: untouched → no warning; typed → warns through completion; the ceremony’s COMMIT disarms it (not the Done tap)', async () => {
    appModel.update(() => DEV_SEEDS.retired) // a complete draft, so the result screen offers the first-save CTA
    render(<IntakeApp />)
    await screen.findByText('flow stub')
    expect(wouldWarn()).toBe(false) // the mount draft IS the baseline
    await act(async () => appModel.update(bump))
    expect(wouldWarn()).toBe(true) // typed work with no vault behind it
    fireEvent.click(screen.getByRole('button', { name: 'complete-stub' }))
    await screen.findByText('result stub')
    expect(wouldWarn()).toBe(true) // the complete-but-never-saved result screen is the biggest loss window
    fireEvent.click(screen.getByRole('button', { name: 'keep-stub' }))
    await screen.findByText('save stub')
    expect(wouldWarn()).toBe(true) // the pre-commit ceremony steps are still un-saved typing
    fireEvent.click(screen.getByRole('button', { name: 'save-commit-stub' }))
    expect(wouldWarn()).toBe(false) // the disk holds the plan — "Your plan is saved" must never warn
    fireEvent.click(screen.getByRole('button', { name: 'save-done-stub' }))
    await screen.findByText('result stub')
    expect(wouldWarn()).toBe(false)
  })

  it('a DEV `?seed=` install re-points the baseline: the seed route lands with nothing to lose, and only a later edit arms it', async () => {
    // The mount draft is deliberately NOT the seed, so the install MOVES the draft — without the
    // re-point the guard would read that move as typed work and every seed route (the Caddie walk,
    // `pnpm verify:fit`) would arm on landing.
    appModel.update(() => bump(DEV_SEEDS.retired))
    render(<IntakeApp seed="retired" />)
    await screen.findByText('result stub') // the seed applied and revealed
    expect(screen.getByText('result stub')).toHaveAttribute('data-save-kind', 'first')
    expect(wouldWarn()).toBe(false)
    await act(async () => appModel.update(bump))
    expect(wouldWarn()).toBe(true)
  })

  it('a BOGUS `?seed=` key applies nothing and leaves the baseline at the mount draft — a later edit still arms', async () => {
    appModel.update(() => DEV_SEEDS.retired)
    render(<IntakeApp seed="not-a-real-seed-key" />)
    await act(async () => {}) // flush the dynamic devSeeds import + its null early-return
    await act(async () => {})
    expect(wouldWarn()).toBe(false) // nothing applied, nothing moved
    await act(async () => appModel.update(bump))
    expect(wouldWarn()).toBe(true)
  })

  // The workbench plan's U9: the open-time id mint lands BEFORE the unsaved-changes baseline (the persist seed and the
  // live draft both come from `draftFromScenario`'s output), so a plan saved before version 6 — no id anywhere —
  // opens SAVED. The version-5 plan is made up: the budget seed's save with its ids stripped, read through the codec
  // at label 5, exactly what `currentModel()` hands back for one.
  it('a VERSION-5 plan (no ids) opened through the real hydrate chain reads saved — no unsaved mark, the leave guard down, two encodes equal — and its draft carries an id on every account and line', async () => {
    const seeded = scenarioFromDraft(DEV_SEEDS.budget)
    if (!seeded.ready) throw new Error('[test setup] the budget seed must save')
    const disk = JSON.parse(new TextDecoder().decode(encodeScenario({
      ...seeded.scenario,
      enteredAccounts: seeded.scenario.enteredAccounts.map(({ id: _id, ...a }) => a),
      budget: seeded.scenario.budget!.map(({ id: _id, ...l }) => l),
    }))) as Record<string, unknown>
    disk.schemaVersion = 5
    const decoded = decodeScenario(new TextEncoder().encode(JSON.stringify(disk)))
    if (!decoded.ok || decoded.scenario.schemaVersion !== CURRENT_SCHEMA_VERSION) throw new Error('[test setup] the version-5 plan must open')
    expect(decoded.scenario.enteredAccounts.every((a) => a.id === undefined), '[non-vacuity] the opened model has no ids').toBe(true)
    const current = h.model
    h.model = decoded.scenario
    try {
      render(<IntakeApp hydrateFromVault />)
      await affirmGate()
      const stub = await screen.findByText('result stub')
      expect(stub).toHaveAttribute('data-save-kind', 'clean')
      expect(wouldWarn()).toBe(false)
      const draft = appModel.getSnapshot().draft
      expect(draft.enteredAccounts.map((a) => a.id)).toEqual(draft.enteredAccounts.map((_, i) => `account-${i}`))
      expect(draft.budget!.map((l) => l.id)).toEqual(draft.budget!.map((_, i) => `line-${i}`))
      const [one, two] = [scenarioFromDraft(draft), scenarioFromDraft(draft)]
      if (!one.ready || !two.ready) throw new Error('the opened draft must save')
      expect(scenarioIdentityKey(one.scenario)).toBe(scenarioIdentityKey(two.scenario))
      expect(Array.from(encodeScenario(one.scenario))).toEqual(Array.from(encodeScenario(two.scenario)))
    } finally {
      h.model = current
    }
  })

  it('an OPEN ENTRY BUFFER arms the guard over a saved-and-clean vault — the draft compare alone cannot see it (the unit review’s hole)', async () => {
    render(<IntakeApp hydrateFromVault />)
    await affirmGate()
    await screen.findByText('result stub')
    expect(wouldWarn()).toBe(false) // disk matches the answer — the draft operand is quiet
    let release: () => void = () => {}
    await act(async () => {
      release = holdUnsavedBuffer() // what AccountEntry / OtherIncomeEntry / BudgetBuilder / RothLever raise while their local state has moved
    })
    expect(wouldWarn()).toBe(true)
    await act(async () => release())
    expect(wouldWarn()).toBe(false)
  })

  it('an armed guard HOLDS the update-apply gate — "Refresh now" must refuse, never race the dialog after skipWaiting', async () => {
    const idleGate = { isWriteInFlight: () => false, whenNoWriteInFlight: async () => {} }
    appModel.update(() => DEV_SEEDS.retired)
    render(<IntakeApp />)
    await screen.findByText('flow stub')
    expect(await readyToApplyUpdate(idleGate)).toBe(true)
    await act(async () => appModel.update(bump))
    expect(wouldWarn()).toBe(true)
    expect(await readyToApplyUpdate(idleGate)).toBe(false) // one fact: armed ⇒ held
    const before = appModel.getSnapshot().draft
    await act(async () => appModel.update(() => ({ ...before, annualSpendingReal: DEV_SEEDS.retired.annualSpendingReal })))
    expect(wouldWarn()).toBe(false)
    expect(await readyToApplyUpdate(idleGate)).toBe(true)
  })

  it('a READ-ONLY tab still warns on an edit — the typing is lost either way, so the dialog tells the truth (the deliberate no-special-case)', async () => {
    render(<IntakeApp hydrateFromVault readOnly />)
    await affirmGate(true)
    await screen.findByText('result stub')
    expect(wouldWarn()).toBe(false)
    await act(async () => appModel.update(bump))
    expect(wouldWarn()).toBe(true)
  })

  it('unmounting an ARMED IntakeApp removes the listener — a route change or crash screen never inherits a stale dialog', async () => {
    appModel.update(() => DEV_SEEDS.retired)
    const { unmount } = render(<IntakeApp />)
    await screen.findByText('flow stub')
    await act(async () => appModel.update(bump))
    expect(wouldWarn()).toBe(true)
    unmount()
    expect(wouldWarn()).toBe(false)
  })
})
