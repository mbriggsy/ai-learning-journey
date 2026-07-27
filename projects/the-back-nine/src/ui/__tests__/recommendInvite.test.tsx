// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react'
import { Result, type RecommendationRecordProp } from '../Result'
import { appModel } from '../appModel'
import { resolvedFocusKey } from '../answerView'
import { copy } from '@ui/copy'
import { resolveDevSeed } from '../devSeeds'
import { exposureForDraft } from '../stalenessExposure'
import { currentEpochDay, scenarioFromDraft } from '../scenarioFromDraft'
import { SOLVER_CODE_VERSION } from '@engine/solver/solverCodeVersion'
import type { SolverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import { deriveSavedRecommendationStatus } from '@store/savedRecommendation'
import type { SavedRecommendationV3 } from '@shared/model'
import type { SolveAnswer } from '@store/memoryModel'

// U16 §S1 — the solve builder is now WIRED live into appModel. A goal pick therefore reaches the REAL
// dispatchSolve, so these picks run over a COMPLETE retired draft (a resolvable devSeed) rather than
// the pristine/empty one: the request builds, but no spine beat has committed (recommend-second
// ordering — everResolved false), so the solve stays `idle` (invitable, the affordance persists across
// re-picks) instead of the `blocked{no-pretax / spine-unready}` an unbuildable empty draft would yield.
const completeRetired = () => ({ ...resolveDevSeed('fl')!, chosenGoal: undefined })

/**
 * Act-4 · U16 §S2 — the recommend-second INVITED AFFORDANCE + its wiring (Result.tsx).
 *
 * The battery pins:
 *  - the affordance is a calm quiet-row DOOR (in the sanctioned below-fold region), offered on a
 *    resolved reading, rendered STATICALLY — present immediately, no scroll-entrance / pulse (R11;
 *    the planted entrance/pulse mutant dies here);
 *  - activating it opens the GoalPicker FIRST (the goal precedes the solve);
 *  - a confirmed pick writes `chosenGoal` (in-session — no auto-save) and dispatches the solve;
 *  - a RE-pick writes the new goal and re-dispatches (the visible re-solve — request-epoch).
 *
 * resolvedFocusKey is module-mocked (the resultControlDoors precedent) so a resolved reading can be
 * planted without standing up the engine worker.
 */

vi.mock('../answerView', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../answerView')>()
  return { ...actual, resolvedFocusKey: vi.fn(actual.resolvedFocusKey) }
})

vi.stubGlobal(
  'matchMedia',
  (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
)

const mockFocusKey = vi.mocked(resolvedFocusKey)
const pristineDraft = appModel.getSnapshot().draft

afterEach(() => {
  cleanup()
  appModel.update(() => pristineDraft) // the module singleton must not leak between tests
  mockFocusKey.mockReset()
  vi.restoreAllMocks()
})

const renderResult = (recordCard?: RecommendationRecordProp) =>
  render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} recordCard={recordCard} />)
const plantResolved = () => mockFocusKey.mockReturnValue('planted-focus-key')
const invite = () => screen.queryByRole('button', { name: copy.recommendInviteCta })
/** F-B — the STALE card's IN-CARD re-open control (its own control home; the door-row invite is retired
 *  for `stale`). Queried by its own copy, so a stale channel never depends on the door-row invite. */
const staleReopen = () => screen.queryByRole('button', { name: copy.recommendStaleReopenCta })
/** U17 §S5 — the RECORD card's own re-open control (its third home). Its own copy again, so no arm
 *  below can pass by finding one of the other two. */
const recordReopen = () => screen.queryByRole('button', { name: copy.recommendRecordReopenCta })
/**
 * EVERY control on this screen that opens the GoalPicker, enumerated STRUCTURALLY rather than by name.
 * The three homes are the door-row invite (`.result-recommend-invite`) and the two in-card re-opens
 * (`.rec-note__reopen` — the stale card's and the record card's), and each one's onClick is a
 * `setGoalOpen(true)`. Counting the union is what makes "exactly ONE control opens one picker" a real
 * claim: a by-name assertion that the record's re-open exists would stay green with a second door
 * standing beside it, which is precisely the duplication the F-B chair fix retired.
 */
const pickerDoors = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('.result-recommend-invite, .rec-note__reopen'))

describe('the recommend-second invited affordance', () => {
  it('is offered as a quiet-row door on a resolved reading, STATIC (present immediately, no entrance)', () => {
    plantResolved()
    const { container } = renderResult()
    const btn = invite()
    expect(btn).toBeInTheDocument()
    // It lives in the sanctioned below-fold doors region (so spine content stays frame-protected).
    expect(container.querySelector('.result-quiet-row')?.contains(btn!)).toBe(true)
    // STATIC: exactly the calm door classes — no pulse / entrance modifier, no scroll-reveal gate
    // (R11 — invited, never engagement bait). The planted entrance/pulse mutant changes this string.
    expect(btn!.className).toBe('btn-quiet result-recommend-invite')
  })

  it('is ABSENT with no resolved reading (an affordance we don’t want used on a non-answer)', () => {
    renderResult() // focusKey undefined (the real gate over the empty model)
    expect(invite()).toBeNull()
  })

  it('activating it opens the GoalPicker FIRST (the goal precedes the solve)', () => {
    plantResolved()
    renderResult()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(invite()!)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: copy.goalPickerTitle })).toBeInTheDocument()
  })

  it('a confirmed pick writes chosenGoal in-session AND dispatches the solve (no auto-save)', () => {
    plantResolved()
    appModel.update(completeRetired) // a buildable draft ⇒ the pick's dispatch stays idle (no spine beat)
    const dispatch = vi.spyOn(appModel, 'dispatchSolve')
    renderResult()
    expect(appModel.getSnapshot().draft.chosenGoal).toBeUndefined()
    fireEvent.click(invite()!)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('radio', { name: /Pay less tax/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: copy.goalPickerConfirmCta }))
    expect(appModel.getSnapshot().draft.chosenGoal).toBe('pay-less-tax')
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('a RE-pick writes the new goal and re-dispatches (the visible re-solve)', () => {
    plantResolved()
    appModel.update(completeRetired) // buildable ⇒ the solve stays idle-invitable, so the affordance persists across re-picks
    const dispatch = vi.spyOn(appModel, 'dispatchSolve')
    renderResult()
    // First pick: leave-more.
    fireEvent.click(invite()!)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: /Leave more behind/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: copy.goalPickerConfirmCta }))
    expect(appModel.getSnapshot().draft.chosenGoal).toBe('leave-more')
    // Re-pick: the picker re-opens with the standing choice, a different goal re-dispatches.
    fireEvent.click(invite()!)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: /Pay less tax/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: copy.goalPickerConfirmCta }))
    expect(appModel.getSnapshot().draft.chosenGoal).toBe('pay-less-tax')
    expect(dispatch).toHaveBeenCalledTimes(2)
  })
})

/**
 * F2 — the re-open control is REAL from a stale / compute-error channel (the notes promise "re-open", so
 * the control that fulfils that promise must exist). F-B (U16 chair fix) splits the two homes: the STALE
 * channel carries its re-open control INSIDE the stale card (`.rec-note--stale`, NOT the door-row invite);
 * the compute-error channel still uses the door-row invite. F4 — the whole recommend-second surface is
 * ROUTE-GATED to the all-retired route (a route flip must not strand an orphaned rec note in the date
 * hero). The solve channel is planted by spying getSnapshot (the store's stale/error/committed arms need
 * the worker to reach organically); the draft rides the same snapshot so the route predicate reads it.
 */
const staleSolve: SolveAnswer = { kind: 'stale', label: 'inputs-changed' }
const errorSolve: SolveAnswer = { kind: 'compute-error', reason: 'worker died' }
/** Freeze a snapshot with a chosen solve + route. Reads the REAL base first (before the spy), then
 *  overrides draft + solve; a working person on person 0 makes it the date route. */
const plantSnapshot = (solve: SolveAnswer, dateRoute = false) => {
  const retired = completeRetired()
  // A working person 0 makes it the date route (isDateRoute reads workStatus). Rebuilding the people
  // tuple widens it to an array, so the assembled draft is cast back to the retired draft type (test-only).
  const draft = dateRoute
    ? ({
        ...retired,
        people: [{ ...retired.people[0], workStatus: 'working' as const }, retired.people[1]],
      } as unknown as typeof retired)
    : retired
  const wasMocked = vi.isMockFunction(appModel.getSnapshot)
  const base = appModel.getSnapshot() // real pristine on the first plant; the frozen one on a re-plant
  const snap = { ...base, draft, solve }
  if (wasMocked) vi.mocked(appModel.getSnapshot).mockReturnValue(snap)
  else vi.spyOn(appModel, 'getSnapshot').mockReturnValue(snap)
  return snap
}

describe('the recommend-second RE-invite (F2 stale/compute-error) + the date-route gate (F4)', () => {
  it('F-B: from STALE, the re-open control is INSIDE the stale card — NOT the door-row invite (ONE control home)', () => {
    plantResolved()
    plantSnapshot(staleSolve)
    const { container } = renderResult()
    const card = container.querySelector('.rec-note--stale')
    expect(card?.textContent, 'the stale card renders its heading + body').toContain(copy.recommendStaleBody)
    // The promise and its action share ONE home: the control lives INSIDE the stale card…
    const reopen = staleReopen()
    expect(reopen, 'the in-card re-open control the card promises is REAL').toBeInTheDocument()
    expect(card?.contains(reopen!), 'and it lives INSIDE the stale card, not the doors region').toBe(true)
    // …and the door-row invite is RETIRED for the stale channel (no second control for the same promise).
    expect(invite(), 'no prepended door-row invite in the stale state').toBeNull()
  })

  it('F2: from COMPUTE-ERROR, the re-invite returns alongside the unavailable note (door-row invite kept)', () => {
    plantResolved()
    plantSnapshot(errorSolve)
    const { container } = renderResult()
    expect(container.querySelector('.rec-note--unavailable')?.textContent).toContain(copy.recommendUnavailable)
    expect(invite(), 'compute-error keeps the door-row invite (untouched by F-B)').toBeInTheDocument()
  })

  it('F-B: a pick from the STALE card RE-DISPATCHES (the in-card control opens the picker → the visible re-solve)', () => {
    plantResolved()
    appModel.update(completeRetired) // a buildable real draft so the dispatch runs cleanly
    plantSnapshot(staleSolve)
    const dispatch = vi.spyOn(appModel, 'dispatchSolve')
    renderResult()
    fireEvent.click(staleReopen()!)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: /Pay less tax/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: copy.goalPickerConfirmCta }))
    expect(dispatch, 'a fresh solve is dispatched from the stale card').toHaveBeenCalledTimes(1)
  })

  it('F4: the recommend-second surface is ABSENT on the date route (no orphaned stale card); a flip back re-mounts it', () => {
    plantResolved()
    const spy = vi.spyOn(appModel, 'getSnapshot')
    // Committed-then-route-flipped: the store still holds the stale beat, but the household is now a
    // date route — the surface must not render it inside the date hero.
    plantSnapshot(staleSolve, /* dateRoute */ true)
    const { container, rerender } = renderResult()
    expect(container.querySelector('.recommendation-surface'), 'the whole surface is gated out on the date route').toBeNull()
    expect(container.querySelector('.rec-note--stale'), 'no orphaned stale card in the date hero').toBeNull()
    expect(staleReopen(), 'and no in-card re-open control on the date route').toBeNull()
    // Flip back to the all-retired (spine) route: the stale card + its in-card re-open control return.
    plantSnapshot(staleSolve, /* dateRoute */ false)
    rerender(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(container.querySelector('.rec-note--stale'), 'the stale card renders on the spine route').not.toBeNull()
    expect(staleReopen(), 'the in-card re-open control returns').toBeInTheDocument()
    void spy
  })
})

/**
 * U17 §S5 — THE RETURNING HOUSEHOLD'S ONE DOOR (the F-B chair fix, applied to the record card).
 *
 * A vault return lands `idle` WITH a record on disk, and the record card carries its OWN re-open
 * control (label + cost line + onClick minted as one, Result.tsx). So `solveInvitable`'s idle disjunct
 * is narrowed by `recordCard === undefined`: without it that one frame would carry TWO controls opening
 * the same GoalPicker — exactly the duplication the stale chair fix retired.
 *
 * THE MUTANT THESE ARMS KILL: revert the idle conjunct to a bare `solve.kind === 'idle'`. The
 * suppression arm reds on the second door. The paired record-FREE and the OTHER-invitable-channel arms
 * pin the direction, so the fix can never be over-applied into a blanket "a record silences the invite"
 * (hoisting `recordCard === undefined` out to conjoin the whole disjunction reds there instead).
 */
const RECORD_FINGERPRINT = 'solver-run-fp/v2:{"goal"=s"leave-more"}' as SolverRunFingerprint

/** The remembered record + the store's verdict on it, both through the REAL producers: the record is a
 *  real save's era (`scenarioFromDraft`'s own four stamps — it THROWS rather than `!`-asserting, since a
 *  stampless era is the fail-open shape the codec refuses outright), and the status is
 *  `deriveSavedRecommendationStatus`'s output, never a hand-typed `{current}` literal. The fingerprint is
 *  handed to BOTH sides, so the trichotomy holds and the card reads its calm still-holds standing. */
function savedRecord(): RecommendationRecordProp {
  const draft = completeRetired()
  const ready = scenarioFromDraft(draft)
  if (!ready.ready) throw new Error('recommendInvite: the fl dev seed must build a persistable scenario')
  const { appDefaultVersion, taxVintageDetail, stateTaxVintage, healthcareVintage, dateVintage } = ready.scenario
  if (
    taxVintageDetail === undefined ||
    stateTaxVintage === undefined ||
    healthcareVintage === undefined ||
    dateVintage === undefined
  ) {
    throw new Error('scenarioFromDraft stamps all four vintages at every save — this fixture is not a real save')
  }
  const today = currentEpochDay()
  const record: SavedRecommendationV3 = {
    mintedAt: today - 10,
    fingerprint: RECORD_FINGERPRINT,
    solverCodeVersion: SOLVER_CODE_VERSION,
    goal: 'leave-more',
    action: { candidateId: 'baseline:taxable-first:0', policy: 'taxable-first' },
    verdict: { noChange: false, surplusRegime: false, noDollarRegister: false },
    era: { appDefaultVersion, taxVintageDetail, stateTaxVintage, healthcareVintage, dateVintage },
  }
  return {
    record,
    status: deriveSavedRecommendationStatus({
      record,
      scenario: ready.scenario,
      freshFingerprint: RECORD_FINGERPRINT,
      todayEpochDay: today,
      exposure: exposureForDraft(draft),
    }),
  }
}

const goalPicker = () => within(screen.getByRole('dialog')).queryByRole('heading', { name: copy.goalPickerTitle })

describe('U17 §S5 — the record card’s re-open is the returning household’s ONE door', () => {
  it('IDLE + a record: the door-row invite is SUPPRESSED and the CARD’s re-open is the single picker door', () => {
    plantResolved()
    appModel.update(completeRetired) // a buildable all-retired draft; the real solve channel is idle
    const { container } = renderResult(savedRecord())
    // The card is really on screen (an absent card would make the suppression below vacuous).
    expect(container.querySelector('.rec-record'), 'the remembered record card renders').not.toBeNull()
    expect(invite(), 'the door-row invite is retired once the card carries its own re-open').toBeNull()
    const doors = pickerDoors(container)
    expect(doors, 'exactly ONE control opens the GoalPicker on the returning frame').toHaveLength(1)
    expect(doors[0], 'and it is the card’s own re-open').toBe(recordReopen())
    expect(container.textContent, 'the cost line rides with the control it prices').toContain(
      copy.recommendRecordReopenCost,
    )
    // It is a REAL door: it opens the picker (a suppressed invite beside a dead card would be worse
    // than the duplication — the returning household would have no way back to a fresh solve at all).
    fireEvent.click(doors[0]!)
    expect(goalPicker()).toBeInTheDocument()

    // THE PAIRED DIRECTION (non-vacuity). The very same frame with NO record on disk is byte-identical
    // to today: the door-row invite returns, and there is still exactly one picker door.
    cleanup()
    const bare = renderResult()
    expect(invite(), 'record-FREE idle still offers the door-row invite').toBeInTheDocument()
    expect(bare.container.querySelector('.rec-record'), 'and there is no card to carry a second one').toBeNull()
    expect(pickerDoors(bare.container)).toHaveLength(1)
  })

  it('STALE + a record: the STALE card owns the re-open; the record card carries NO control and NO cost line', () => {
    plantResolved()
    appModel.update(completeRetired)
    plantSnapshot(staleSolve)
    const { container } = renderResult(savedRecord())
    expect(container.querySelector('.rec-record'), 'the memory is still shown').not.toBeNull()
    expect(pickerDoors(container), 'one picker door across BOTH cards').toHaveLength(1)
    expect(staleReopen(), 'and it is the stale card’s — the channel that went stale owns the remedy').toBeInTheDocument()
    expect(recordReopen(), 'the record card adds no second door beside it').toBeNull()
    expect(container.textContent, 'and no orphaned cost line pricing a control that isn’t there').not.toContain(
      copy.recommendRecordReopenCost,
    )
    expect(invite()).toBeNull()
  })

  it('PENDING / BLOCKED{no-pretax} + a record: NO re-open at all — `pickGoal` would deterministically re-refuse', () => {
    // Result wires the card's re-open on the POSITIVE `idle` predicate, not on `!solveInvitable`: these
    // are frames where the dispatch cannot deliver a fresh solve, so a door here would be a promise the
    // re-dispatch breaks. A cost line with no control beside it is the same dead promise, spelled out.
    for (const solve of [
      { kind: 'pending', label: 'solving' },
      { kind: 'blocked', gap: 'no-pretax', label: 'no-pretax' },
    ] as const satisfies readonly SolveAnswer[]) {
      plantResolved()
      appModel.update(completeRetired)
      plantSnapshot(solve)
      const { container } = renderResult(savedRecord())
      expect(container.querySelector('.rec-record'), `${solve.kind}: the memory still renders`).not.toBeNull()
      expect(pickerDoors(container), `${solve.kind}: no control opens the picker`).toHaveLength(0)
      expect(container.textContent, `${solve.kind}: no cost line without a control`).not.toContain(
        copy.recommendRecordReopenCost,
      )
      cleanup()
      appModel.update(() => pristineDraft)
      vi.restoreAllMocks()
      mockFocusKey.mockReset()
    }
  })

  it('the narrowing is IDLE-ONLY: compute-error and goal-unset keep the DOOR-ROW invite, and the card adds none', () => {
    // Kills the over-broad twin of the fix (hoisting `recordCard === undefined` out to conjoin the whole
    // disjunction): those two channels' own promises — the unavailable note's "you can re-open", the
    // picker steer — must survive a record sitting on disk, and the card must not double them.
    for (const solve of [
      { kind: 'compute-error', reason: 'worker died' },
      { kind: 'blocked', gap: 'goal-unset', label: 'goal-unset' },
    ] as const satisfies readonly SolveAnswer[]) {
      plantResolved()
      appModel.update(completeRetired)
      plantSnapshot(solve)
      const { container } = renderResult(savedRecord())
      expect(invite(), `${solve.kind}: the door-row invite survives the record`).toBeInTheDocument()
      expect(recordReopen(), `${solve.kind}: the card adds no second door`).toBeNull()
      expect(pickerDoors(container), `${solve.kind}: still exactly one picker door`).toHaveLength(1)
      cleanup()
      appModel.update(() => pristineDraft)
      vi.restoreAllMocks()
      mockFocusKey.mockReset()
    }
  })
})

/**
 * U17 §S5 — WHERE THE REMEMBERED-RECORD CARD RENDERS (Briggsy's placement ruling, 2026-07-26).
 *
 * The first three arms were born in `RecommendationSurface.test.tsx`, pinning the v1 P0: the card is
 * gated on ITS OWN disk-derived data and NEVER on `solve.kind`, so it paints on exactly the frames it
 * exists for — the vault-return `idle` (memoryModel seeds it; the hydrate effect only replaces the
 * draft, and no beat renders at all) and the draft-edit `stale` demotion — and it never nests inside
 * the beat. THAT FACT DID NOT CHANGE WHEN THE CARD MOVED; ITS OWNER DID. `Result` mounts it now, so
 * only a `Result` render can witness it: mounting `SavedRecordCard` in isolation proves the COMPONENT
 * and says nothing about where the screen puts it (insights 032/081). The content half of that old
 * battery — what the card SAYS — stayed behind and renders the card directly.
 *
 * THE FOURTH ARM IS THE RULING ITSELF, and it is the one with teeth. MEASURED at Briggsy's real
 * 1536×791, the card in its old seat inside `.rec-aside` pushed the PROTECTED in-frame R13 disclaimer
 * from 702px to 858px (holds, a 156px card) and to 952px (superseded with two causes, 251px) — a
 * 67–161px breach of the one-frame fit law, against an idle frame carrying only 89px of headroom. The
 * remedy was PLACEMENT, never a trim: the card joins the backup door and the quiet row BELOW the
 * disclaimer, in the one sanctioned below-fold region, so the unprotected affordance degrades past the
 * fold first and the honesty caveat wins the frame (the Hawk's veto, council 2026-07-08). Nothing else
 * in this repo notices a re-hoist above `<Disclaimer inFrame/>` — jsdom cannot measure a fold and the
 * real-Chromium fit gate seeds no record-bearing vault — so the DOM ORDER is the standing guard.
 */

/** A COMMITTED solve that needs no 250-line recommendation fixture: the token-withheld payload is a
 *  real committed arm (`SolvePayload`) and renders the `.rec-held` beat. What the arm below needs is
 *  a frame where `solve.kind === 'committed'` — the one kind the old surface-level card COULD have
 *  been gated behind — not a particular verdict. */
const heldSolve: SolveAnswer = {
  kind: 'committed',
  payload: {
    kind: 'token-withheld',
    reasons: [{ kind: 'state-certification-pending', state: 'NC' }],
    disclosedDirectional: [],
    solverCodeVersion: 1,
  },
  fingerprint: 'solver-run-fp/v2:{held}' as SolverRunFingerprint,
}

const recordCardNode = (container: HTMLElement) => container.querySelector('main.result .rec-record')
/** The PROTECTED node, queried exactly as `resultDisclaimer.test.tsx` queries it (the Hawk order
 *  contract's own selector — so this arm and that file can never diverge on what they are protecting). */
const inFrameDisclaimer = (container: HTMLElement) =>
  container.querySelector('main.result .disclaimer--in-frame')

describe('U17 §S5 — WHERE the remembered-record card renders (the placement ruling)', () => {
  it('it paints on the returning household’s FIRST screen — an IDLE solve, with no beat at all', () => {
    plantResolved()
    appModel.update(completeRetired) // a buildable all-retired draft; the real solve channel is idle
    const { container } = renderResult(savedRecord())
    // Non-vacuity in the other direction (burned/070): prove there is genuinely NO beat on this frame,
    // so "the card renders anyway" is a claim about the card's own gate and not about a beat carrying it.
    expect(container.querySelector('.rec-committed'), 'no committed beat exists on this frame').toBeNull()
    expect(container.querySelector('.rec-held'), 'nor a held one').toBeNull()
    expect(container.querySelector('.rec-note--stale'), 'nor a stale one').toBeNull()
    expect(recordCardNode(container), 'the memory is gated on ITS OWN data, never on solve.kind').not.toBeNull()
    expect(container.textContent).toContain(copy.recommendRecordHeading)
    expect(container.textContent).toContain(copy.recommendRecordHolds)
  })

  it('it also paints on the STALE frame — a draft edit demotes the beat, never the memory', () => {
    plantResolved()
    appModel.update(completeRetired)
    plantSnapshot(staleSolve)
    const { container } = renderResult(savedRecord())
    expect(container.querySelector('.rec-note--stale'), 'the beat went stale').not.toBeNull()
    expect(recordCardNode(container), 'and the memory outlived the demotion').not.toBeNull()
  })

  it('it paints on a COMMITTED frame too, BELOW the beat and OUTSIDE the surface that used to own it', () => {
    plantResolved()
    appModel.update(completeRetired)
    plantSnapshot(heldSolve)
    const { container } = renderResult(savedRecord())
    const beat = container.querySelector('.rec-held')
    const record = recordCardNode(container)
    expect(beat, 'the committed payload really did render a beat (non-vacuity)').not.toBeNull()
    expect(record, 'and the memory renders on the same frame').not.toBeNull()
    const surface = container.querySelector('.recommendation-surface')
    expect(surface, 'the surface is mounted on this all-retired route').not.toBeNull()
    // OUTSIDE: the card is `Result`'s own child now. Re-parenting it back under the surface is the
    // move the fold measurement forbade, and it would take the card back above the disclaimer.
    expect(surface!.contains(record!), 'the card no longer lives inside the surface').toBe(false)
    // BELOW: a memory reads after the answer, never over it.
    expect(
      Boolean(beat!.compareDocumentPosition(record!) & Node.DOCUMENT_POSITION_FOLLOWING),
      'the memory follows the answer in DOM order',
    ).toBe(true)
  })

  it('THE RULING: the card renders AFTER the protected in-frame R13 disclaimer (the Hawk’s fold priority)', () => {
    plantResolved()
    appModel.update(completeRetired)
    const { container } = renderResult(savedRecord())
    const disclaimer = inFrameDisclaimer(container)
    const record = recordCardNode(container)
    // Non-vacuity (burned/070): an order assertion over a missing node is green by accident.
    expect(disclaimer, 'the protected caveat is on this frame').not.toBeNull()
    expect(record, 'and so is the card whose seat the ruling decided').not.toBeNull()
    // FOLLOWING = the argument comes AFTER the receiver (resultDisclaimer.test.tsx's idiom).
    expect(
      Boolean(disclaimer!.compareDocumentPosition(record!) & Node.DOCUMENT_POSITION_FOLLOWING),
      'a re-hoist above the disclaimer silently re-breaches a Hawk-vetoed protection',
    ).toBe(true)
    // The SAME claim as an index over ONE ordered sweep of both selectors — document order, both
    // nodes, exactly once each, so neither a second mount nor a vanished one can leave this green.
    const seats = [
      ...container.querySelectorAll('main.result .disclaimer--in-frame, main.result .rec-record'),
    ]
    expect(seats, 'exactly the two nodes under judgment, each mounted once').toHaveLength(2)
    expect(seats[0], 'the protected caveat wins the frame').toBe(disclaimer)
    expect(seats[1], 'the card degrades past the fold before the caveat does').toBe(record)
  })
})
