// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { RecommendationSurface, SavedRecordCard, type RecommendationSaveProp } from '../RecommendationSurface'
import { copy, slots, staticDisclosures } from '../copy'
import {
  savedRecordCardView,
  type RecommendationSaveRefusal,
  type RecommendationSaveView,
  type SavedRecordCardView,
  type SavedRecordCopy,
} from '../recommendationSaveView'
import { currentEpochDay, scenarioFromDraft } from '../scenarioFromDraft'
import { exposureForDraft } from '../stalenessExposure'
import { DEV_SEEDS } from '../devSeeds'
import type { SolveAnswer } from '@store/memoryModel'
import {
  deriveSavedRecommendationStatus,
  type SavedRecommendationStatus,
} from '@store/savedRecommendation'
import {
  NEVER_DEPLETED,
  type Distribution,
  type SavedRecommendationEraV3,
  type SavedRecommendationV3,
  type ScenarioV3,
} from '@shared/model'
import { headlineStatisticFromDistribution } from '@engine/solver/objectiveHeadline'
import type { SolveArm, SolveRecommendation } from '@engine/solver/solve'
import type { SolveTokenWithheld } from '@engine/solver/solveEntry'
import { SOLVER_CODE_VERSION } from '@engine/solver/solverCodeVersion'
import type { GradeResult } from '@engine/validation/gradeCalibration'
import type { SolverRunFingerprint } from '@engine/validation/solverRunFingerprint'

/**
 * Act-4 · U16 §S2 — the recommend-second surface's PENDING tell.
 *
 * The battery pins:
 *  - the thinking-breathe grammar: aria-busy region + the `.solve-pending` line carrying the label;
 *  - the a11y announce: a PERSISTENT polite live region, spoken into on the idle→pending transition
 *    and SELF-CLEARING (burned/045 clear-after-announce — the planted never-clears mutant dies here);
 *  - the idle frame is inert (nothing but the live region — no perturbation of the resolved frame);
 *  - the reduced-motion drop is the shared base.css family (the breath off, the label kept).
 */

afterEach(cleanup)

const IDLE: SolveAnswer = { kind: 'idle' }
const PENDING: SolveAnswer = { kind: 'pending', label: 'solving' }

const liveRegion = () => document.querySelector('.recommendation-surface [role="status"]')

describe('RecommendationSurface — the pending tell', () => {
  it('is INERT when idle — only the (empty) live region, no visible pending panel', () => {
    render(<RecommendationSurface solve={IDLE} />)
    expect(document.querySelector('.solve-pending-panel')).toBeNull()
    expect(liveRegion()).not.toBeNull()
    expect(liveRegion()?.textContent).toBe('')
  })

  it('renders the aria-busy pending grammar with the plain-language label when pending', () => {
    render(<RecommendationSurface solve={PENDING} />)
    const panel = document.querySelector('.solve-pending-panel')
    expect(panel).not.toBeNull()
    expect(panel).toHaveAttribute('aria-busy', 'true')
    const line = document.querySelector('.solve-pending')
    expect(line).not.toBeNull()
    expect(line?.textContent).toBe(copy.recommendPendingLabel)
    // F-C: the label sets an HONEST duration expectation ("a few minutes" — TRUE for the measured
    // 90s–6min wait) so the reader is never left wondering if it stalled. The planted mutant (reverting
    // to the no-duration label) reds here.
    expect(line?.textContent, 'the pending label carries an honest duration phrase').toMatch(/a few minutes/)
    // Never a fake clock: NO digit ⇒ no countdown / % / ETA — calm reassurance, not a fabricated progress bar.
    expect(copy.recommendPendingLabel, 'no fake ETA / countdown / % — no digit at all').not.toMatch(/\d/)
    // The persistent announce channel is polite (never assertive — a working tell is not an alarm).
    expect(liveRegion()).toHaveAttribute('aria-live', 'polite')
  })

  it('speaks the pending label on the idle→pending transition and SELF-CLEARS (burned/045)', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<RecommendationSurface solve={IDLE} />)
      // No announce on mount (idle→idle is not a transition).
      expect(liveRegion()?.textContent).toBe('')
      rerender(<RecommendationSurface solve={PENDING} />)
      // The transition announced.
      expect(liveRegion()?.textContent).toBe(copy.recommendPendingLabel)
      // F-C: the spoken tell carries the honest duration phrase too (announced once, calm — not an ETA).
      expect(liveRegion()?.textContent, 'the announce carries the honest duration phrase').toMatch(/a few minutes/)
      // Clear-after-announce: the a11y tree is clean well before the next interaction (no stale
      // "working…" lingering — the planted never-clears mutant leaves it populated here).
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(liveRegion()?.textContent).toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does NOT re-announce on an unrelated pending re-render (announce is transition-keyed)', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<RecommendationSurface solve={IDLE} />)
      rerender(<RecommendationSurface solve={PENDING} />)
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(liveRegion()?.textContent).toBe('')
      // A second render at the SAME pending kind must not re-speak (no stale re-announce loop).
      rerender(<RecommendationSurface solve={{ kind: 'pending', label: 'solving' }} />)
      expect(liveRegion()?.textContent).toBe('')
    } finally {
      vi.useRealTimers()
    }
  })
})

// ---- §S3 the COMMITTED beat — the render half (the view-model logic is pinned in recommendationView.test) ----

const HB = 0.24
function taxAwareDist(taxable: readonly number[], pretax: readonly number[]): Distribution {
  const n = taxable.length
  const z = Array<number>(n).fill(0)
  return {
    terminalValuesReal: z,
    depletionYears: Array(n).fill(NEVER_DEPLETED),
    survivalFraction: 1,
    taxAware: {
      lifetimeTaxPaidReal: z,
      terminalTaxableReal: [...taxable],
      terminalPretaxReal: [...pretax],
      terminalRothReal: z,
      terminalHsaReal: z,
      terminalTaxableBasisReal: z,
      lifetimeNetPremiumReal: z,
      lifetimeMedicareCostReal: z,
    },
  }
}
function leaveMoreArm(id: string, policy: SolveArm['policy'], taxable: number[], pretax: number[]): SolveArm {
  const dist = taxAwareDist(taxable, pretax)
  return { id, policy, conversion: null, distributionB: dist, headlineStatisticB: headlineStatisticFromDistribution(dist, 'leave-more', HB), survivalB: 0.99 }
}
/** The COMMITTED run's identity — an INPUT, shared by the solve fixture and (below) the ticket the
 *  gesture is expected to carry. Never a hand-typed expected value: the ticket arm asserts the tap
 *  forwards THIS run's fingerprint, so the two sides must read the same const or the bind is a
 *  coincidence. */
const COMMITTED_FP = 'solver-run-fp/v2:{surface-committed}' as SolverRunFingerprint
function committedRec(over: Partial<SolveRecommendation> = {}): SolveAnswer {
  const winner = leaveMoreArm('taxable-first', 'taxable-first', [500_000, 700_000], [100_000, 100_000])
  const baseline = leaveMoreArm('proportional', 'proportional', [400_000, 500_000], [100_000, 100_000])
  const runnerUp = leaveMoreArm('bracket-fill', 'bracket-fill', [480_000, 660_000], [100_000, 100_000])
  const grade: GradeResult = { grade: 'just-do-it', memberMargins: [{ margin: 0.02, se: 0.001, band: 0.002, beyondBand: true, paths: 16_000 }], demotionFired: false, subTenthCollapse: false }
  const payload: SolveRecommendation = {
    kind: 'recommended', goal: 'leave-more', heirBracket: HB, seedA: 1, seedB: 2,
    winner, runnerUp, noActionBaseline: baseline,
    rankedIds: ['taxable-first', 'bracket-fill', 'proportional'], prunedScores: [],
    noChange: false, surplusRegime: false,
    grade, gradeStatistic: 'leave-more', gradeUnavailable: undefined,
    namedDriver: 'sampling-noise-near-tie', skewDisclosure: undefined, deltaSkew: undefined,
    withheldConversionLevers: [], disclosedDirectional: [], solverCodeVersion: 1,
    ...over,
  }
  return { kind: 'committed', payload, fingerprint: COMMITTED_FP }
}

// ---- U17 §S5 fixtures — the save gesture's arms + the remembered-record card -------------------

/** The gesture prop with inert defaults; each arm overrides only what it exercises. */
function saveProp(
  view: RecommendationSaveView,
  over: Partial<RecommendationSaveProp> = {},
): RecommendationSaveProp {
  return { view, onSave: () => {}, landed: false, onAnnounced: () => {}, ...over }
}

const TODAY = currentEpochDay()
/** The RECORD's run identity — again an INPUT on both sides of the store's trichotomy: passing it
 *  as `freshFingerprint` makes conjunct 1 hold, passing anything else makes it fire. Deliberately
 *  NOT `COMMITTED_FP`: the card is driven by its OWN disk-derived data, never by the live solve. */
const RECORD_FP = 'solver-run-fp/v2:{surface-record}' as SolverRunFingerprint

/** A real save-ready scenario — the status operands below are the REAL producer's output
 *  (`deriveSavedRecommendationStatus`), never a hand-typed `{current}` literal (the sibling
 *  `recommendationSaveView.test.ts` header states the rule; the render side inherits it). */
const readySave = (() => {
  const r = scenarioFromDraft(DEV_SEEDS.retired)
  if (!r.ready) throw new Error('DEV_SEEDS.retired should be save-ready — this fixture is not a real save')
  return r
})()
const EXPOSURE = exposureForDraft(DEV_SEEDS.retired)

/** The five era-bearing fields of a REAL save. THROWS rather than `!`-asserting: a fixture that
 *  quietly built a stampless era would exercise the fail-open shape the codec refuses outright. */
function eraOf(s: ScenarioV3): SavedRecommendationEraV3 {
  const { taxVintageDetail, stateTaxVintage, healthcareVintage, dateVintage } = s
  if (
    taxVintageDetail === undefined ||
    stateTaxVintage === undefined ||
    healthcareVintage === undefined ||
    dateVintage === undefined
  ) {
    throw new Error('scenarioFromDraft stamps all four vintages at every save — this fixture is not a real save')
  }
  return { appDefaultVersion: s.appDefaultVersion, taxVintageDetail, stateTaxVintage, healthcareVintage, dateVintage }
}

function recordFor(over: Partial<SavedRecommendationV3> = {}): SavedRecommendationV3 {
  return {
    mintedAt: TODAY - 10,
    fingerprint: RECORD_FP,
    solverCodeVersion: SOLVER_CODE_VERSION,
    goal: 'leave-more',
    action: { candidateId: 'taxable-first', policy: 'taxable-first' },
    verdict: { noChange: false, surplusRegime: false, noDollarRegister: false },
    era: eraOf(readySave.scenario),
    ...over,
  }
}

const statusOf = (
  record: SavedRecommendationV3,
  freshFingerprint: string | null = RECORD_FP,
): SavedRecommendationStatus =>
  deriveSavedRecommendationStatus({
    record,
    scenario: readySave.scenario,
    freshFingerprint,
    todayEpochDay: TODAY,
    exposure: EXPOSURE,
  })

/** The card's copy, assembled from the SWEPT catalog exactly as `Result.tsx` assembles it — so every
 *  string the card renders is a `copy`/`slots` entry and NOTHING in this file is a hand-typed
 *  sentence that could drift from what ships. */
const RECORD_COPY: SavedRecordCopy = {
  heading: copy.recommendRecordHeading,
  stillHolds: copy.recommendRecordHolds,
  causes: {
    'inputs-changed': copy.recommendRecordSupersededInputs,
    'inputs-unavailable': copy.recommendRecordSupersededUnavailable,
    'solver-changed': copy.recommendRecordSupersededSolver,
    'rules-changed': copy.recommendRecordSupersededRules,
  },
  savedIn: slots.recommendRecordSavedIn,
  reopenLabel: copy.recommendRecordReopenCta,
  reopenCostLine: copy.recommendRecordReopenCost,
}

const cardOf = (
  status: SavedRecommendationStatus,
  record: SavedRecommendationV3 = recordFor(),
): SavedRecordCardView => savedRecordCardView(status, record, TODAY, RECORD_COPY)

/** The memory that STILL HOLDS — every conjunct of the store's trichotomy satisfied. */
const holdsCard = (): SavedRecordCardView => cardOf(statusOf(recordFor()))
/** TWO causes hold at once (conjunct 1 by a moved fingerprint, conjunct 2 by a foreign build) —
 *  insight 101's operand: a card naming one of them describes its poster child, not the truth. */
const twoCauseCard = (): SavedRecordCardView =>
  cardOf(
    statusOf(recordFor({ solverCodeVersion: SOLVER_CODE_VERSION + 1 }), 'solver-run-fp/v2:{moved}'),
    recordFor({ solverCodeVersion: SOLVER_CODE_VERSION + 1 }),
  )

describe('RecommendationSurface — the committed active beat', () => {
  it('renders the grade WORD + its non-color glyph, the delta-as-hero, the baseline nameplate, and the disclosures', () => {
    const { container } = render(<RecommendationSurface solve={committedRec()} />)
    // the grade lockup names the state as TEXT (word) AND carries the redundant silhouette glyph.
    expect(container.textContent).toContain(copy.recommendGradeConfident)
    expect(container.querySelector('.rec-grade__glyph'), 'the non-color grade glyph rides beside the word').not.toBeNull()
    // the grade group names itself for AT (one semantic group).
    expect(container.querySelector('.rec-grade[role="group"]')).toHaveAttribute('aria-label', copy.recommendGradeConfident)
    // Q7: the baseline nameplate (no number).
    expect(container.textContent).toContain(copy.recommendBaselineNameplate)
    // the disclosures render as read-only notes, stamped by id + disposition.
    const seats = [...container.querySelectorAll('.rec-disclosure')].map((li) => li.getAttribute('data-disclosure'))
    expect(seats).toContain('ss-claim-fixed')
    expect(seats).toContain('heir-bracket')
    expect(container.querySelector('.rec-disclosure[data-disclosure="heir-bracket"]')).toHaveAttribute('data-disposition', 'r7-editable')
  })

  it('mounts the lazy two-arm viz box (fixed-dimension, CLS-safe) in active mode', () => {
    const { container } = render(<RecommendationSurface solve={committedRec()} />)
    // the fixed-dimension box reserves space immediately (the lazy chunk resolves behind it).
    expect(container.querySelector('.rec-viz-box'), 'the viz box is reserved in active mode').not.toBeNull()
  })

  it('retains the runner-up one tap down as TEXT (R23), and shows no viz in NO-CHANGE mode', () => {
    const active = render(<RecommendationSurface solve={committedRec()} />)
    expect(active.container.querySelector('.rec-runnerup')).not.toBeNull()
    expect(active.container.textContent).toContain(copy.recSeeRunnerUp)
    cleanup()
    // no-change: the compose reassurance, NO dollar hero, NO viz box.
    const noChange = render(<RecommendationSurface solve={committedRec({ noChange: true })} />)
    expect(noChange.container.textContent).toContain(copy.recComposeAlready)
    expect(noChange.container.querySelector('.rec-viz-box'), 'no fabricated viz in no-change').toBeNull()
  })
})

describe('RecommendationSurface — §S4 comparative depth + honest-limits + re-pick + the reserved slot', () => {
  it('the runner-up <details> carries the §S4 two-arm viz (winner ahead in this fixture), fixed-dimension (CLS-safe)', () => {
    const { container } = render(<RecommendationSurface solve={committedRec()} />)
    const details = container.querySelector('.rec-runnerup')
    expect(details, 'the runner-up is retained one tap down').not.toBeNull()
    // the winner (676k) displays ahead of the runner-up (646k) in this fixture → the picture ships,
    // reserved behind the fixed-dimension box so it never reflows the panel on land.
    expect(details!.querySelector('.rec-runnerup__viz'), 'the winner-vs-runner-up comparison viz').not.toBeNull()
  })

  it('the honest-limits note (R13) renders the ONE staticDisclosures source — a calm caveat, never a CTA', () => {
    const { container } = render(<RecommendationSurface solve={committedRec()} />)
    const limits = container.querySelector('.rec-limits')
    expect(limits).not.toBeNull()
    expect(limits!.textContent, 'the ONE honest-limits source (no parallel string to drift)').toBe(
      staticDisclosures.honestLimitsValidate,
    )
    expect(limits!.querySelector('button, a'), 'a static caveat line, not a control').toBeNull()
  })

  it('the goal RE-PICK door calls onRepick (the un-saved hypothetical is freely re-aimable), ABSENT when unwired', () => {
    const onRepick = vi.fn()
    render(<RecommendationSurface solve={committedRec()} onRepick={onRepick} />)
    const btn = screen.getByRole('button', { name: copy.recommendRepickCta })
    fireEvent.click(btn)
    expect(onRepick, 'a re-pick reopens the goal choice (the caller re-dispatches — the visible re-solve)').toHaveBeenCalledTimes(1)
    cleanup()
    // Mounted WITHOUT a wired picker (the P2/P3 shells): NO dead re-pick door.
    render(<RecommendationSurface solve={committedRec()} />)
    expect(screen.queryByRole('button', { name: copy.recommendRepickCta })).toBeNull()
  })

  /**
   * THE U16 RESERVED-SLOT PIN, REPLACED — NOT DELETED.
   *
   * U16 pinned the slot as layout space "ONLY, forever": aria-hidden, zero children, nothing
   * interactive. U17 §S5 filled it, so that sentence could not survive as written — but deleting the
   * arm would drop the CLS guarantee it bought, which is the whole reason the reservation exists (a
   * tap must never slide the R13 disclaimer and the quiet doors below it up into the pointer). So
   * the three structural asserts survive VERBATIM under the arms that still draw nothing, and the
   * POPULATED counterpart — a real control, and the `aria-hidden` DROPPED — lives in the §S5
   * battery below. `onRepick === undefined ⇒ no dead door` (:207-209) is the precedent.
   */
  it('THE RESERVED SAVE SLOT is the verbatim empty reservation on every arm that draws no control (CLS)', () => {
    const unwired = render(<RecommendationSurface solve={committedRec()} onRepick={vi.fn()} />)
    const slot = unwired.container.querySelector('.rec-save-slot')
    expect(slot, "the slot reserves U17's Save footprint (kills the CLS relayout)").not.toBeNull()
    expect(slot!.getAttribute('aria-hidden'), 'nothing to announce in an empty reservation').toBe('true')
    expect(slot!.querySelector('button, a, input, select, textarea, [role]'), 'no interactive element').toBeNull()
    expect(slot!.children.length, 'reserved layout space only — no rendered content').toBe(0)
    // UNWIRED (the P2/P3 shells, the in-isolation mounts): no dead Save control anywhere.
    expect(screen.queryByRole('button', { name: copy.recommendSaveCta }), 'unwired ⇒ no save control').toBeNull()
    cleanup()
    // WIRED but with NOTHING TO CLAIM (`{kind:'none'}` — a read-only tab, an unencodable answer):
    // the box must be IDENTICAL to the unwired one. Keying the reservation on the PROP's presence
    // rather than on the VIEW would collapse it here.
    const none = render(
      <RecommendationSurface solve={committedRec()} onRepick={vi.fn()} recSave={saveProp({ kind: 'none' })} />,
    )
    const noneSlot = none.container.querySelector('.rec-save-slot')
    expect(noneSlot, 'a wired-but-silent gesture still reserves the box').not.toBeNull()
    expect(noneSlot!.getAttribute('aria-hidden')).toBe('true')
    expect(noneSlot!.querySelector('button, a, input, select, textarea, [role]')).toBeNull()
    expect(noneSlot!.children.length).toBe(0)
    expect(screen.queryByRole('button', { name: copy.recommendSaveCta }), 'no claim ⇒ no control').toBeNull()
  })
})

describe('RecommendationSurface — the withheld / stale / unavailable renders (every payload shape renders)', () => {
  it('a token-withheld HOLD names the true reason as TEXT (calm, never an alarm)', () => {
    const held: SolveTokenWithheld = { kind: 'token-withheld', reasons: [{ kind: 'state-certification-pending', state: 'NC' }], disclosedDirectional: [], solverCodeVersion: 1 }
    const { container } = render(<RecommendationSurface solve={{ kind: 'committed', payload: held, fingerprint: 'fp' as SolverRunFingerprint }} />)
    expect(container.querySelector('.rec-held')).not.toBeNull()
    expect(container.textContent).toContain(copy.recommendHeldHeading)
    expect(container.textContent, 'the state is named, direction honest').toMatch(/North Carolina/)
  })

  it('the §S1 stale demotion renders ONE coherent card — heading + body + the in-card re-open control (F-B)', () => {
    const onRepick = vi.fn()
    const { container } = render(
      <RecommendationSurface solve={{ kind: 'stale', label: 'inputs-changed' }} onRepick={onRepick} />,
    )
    const card = container.querySelector('.rec-note--stale')
    expect(card, 'the stale card renders, never a stale rec as current').not.toBeNull()
    // The heading names the state calmly; the body carries the honest truths (answer above is current).
    expect(card?.querySelector('.rec-note__head')?.textContent).toBe(copy.recommendStaleHeading)
    expect(card?.textContent).toContain(copy.recommendStaleBody)
    // ADJACENCY (mutant a): the re-open CONTROL lives INSIDE the stale card — the promise and its action
    // in ONE home, never a separate below-fold door. Removing it (the mutant) makes this arm red.
    const reopen = screen.getByRole('button', { name: copy.recommendStaleReopenCta })
    expect(card?.contains(reopen), 'the re-open control is inside the stale card region').toBe(true)
    fireEvent.click(reopen)
    expect(onRepick, 'the in-card control re-opens the goal choice (the caller re-dispatches)').toHaveBeenCalledTimes(1)
  })

  it('the stale card renders NO dead re-open control when the picker is unwired (the P2/P3 shells)', () => {
    const { container } = render(<RecommendationSurface solve={{ kind: 'stale', label: 'inputs-changed' }} />)
    expect(container.querySelector('.rec-note--stale'), 'the calm card still renders').not.toBeNull()
    expect(screen.queryByRole('button', { name: copy.recommendStaleReopenCta }), 'no dead button unwired').toBeNull()
  })

  it('a compute-error renders the ONE calm retry line, never the raw reason', () => {
    const { container } = render(<RecommendationSurface solve={{ kind: 'compute-error', reason: 'worker died' }} />)
    expect(container.querySelector('.rec-note--unavailable')?.textContent).toContain(copy.recommendUnavailable)
    expect(container.textContent).not.toContain('worker died')
  })

  it('idle and blocked carry NO committed body (the entry affordance owns the invite/steer)', () => {
    const idle = render(<RecommendationSurface solve={{ kind: 'idle' }} />)
    expect(idle.container.querySelector('.rec-committed')).toBeNull()
    expect(idle.container.querySelector('.rec-held')).toBeNull()
    cleanup()
    const blocked = render(<RecommendationSurface solve={{ kind: 'blocked', gap: 'goal-unset', label: 'goal-unset' }} />)
    expect(blocked.container.querySelector('.rec-committed')).toBeNull()
  })

  it('a blocked{no-pretax} renders ITS calm steer note, never a silent blank (F3 — the blank-render mutant reds)', () => {
    const { container } = render(
      <RecommendationSurface solve={{ kind: 'blocked', gap: 'no-pretax', label: 'no-pretax' }} />,
    )
    const note = container.querySelector('.rec-note--no-pretax')
    expect(note, 'a picked goal on a no-pretax household is NOT a silent dead-end').not.toBeNull()
    expect(note).toHaveAttribute('role', 'status')
    expect(note?.textContent).toBe(copy.recommendNoPretaxNote)
    // goal-unset stays bodyless here (its steer is the Result invite door, not a surface note).
    cleanup()
    const goalUnset = render(<RecommendationSurface solve={{ kind: 'blocked', gap: 'goal-unset', label: 'goal-unset' }} />)
    expect(goalUnset.container.querySelector('.rec-note--no-pretax')).toBeNull()
  })

  it('a blocked{spine-unready} renders ITS OWN note — the true dependency story, never the accounts one (the steer-seed increment)', () => {
    const { container } = render(
      <RecommendationSurface solve={{ kind: 'blocked', gap: 'spine-unready', label: 'spine-unready' }} />,
    )
    const note = container.querySelector('.rec-note--spine-unready')
    expect(note, 'a facts-broken re-dispatch is NOT a silent dead-end').not.toBeNull()
    expect(note).toHaveAttribute('role', 'status')
    expect(note?.textContent).toBe(copy.recommendSpineUnreadyNote)
    // and NEVER the accounts story (the wrong-reason swap mutant reds on BOTH these asserts).
    expect(container.querySelector('.rec-note--no-pretax')).toBeNull()
    expect(container.textContent).not.toContain(copy.recommendNoPretaxNote)
  })
})

describe('RecommendationSurface — the seed-B display inversion routes to the honest no-dollar register (F1)', () => {
  it('winner DISPLAYS BEHIND the baseline: the compose reassurance renders, NO dollar hero, NO viz box', () => {
    // The no-action baseline out-displays the crowned winner at seed-B (a near-tie inverted on the
    // display seed) — a "keeps ~$X more" hero + a winner-ahead bar would be calm-but-wrong.
    const higherBaseline = leaveMoreArm('proportional', 'proportional', [900_000, 1_100_000], [100_000, 100_000])
    const { container } = render(<RecommendationSurface solve={committedRec({ noActionBaseline: higherBaseline })} />)
    // the honest register renders: the "already on a strong path" reassurance IS the hero line.
    expect(container.querySelector('.rec-grade__hero')?.textContent).toBe(copy.recComposeAlready)
    // no fabricated positive dollar hero anywhere in the lockup.
    expect(container.textContent).toContain(copy.recComposeAlready)
    // no two-arm viz (primary or runner-up) — nothing paints the winner ahead against the ranking.
    expect(container.querySelector('.rec-viz-box'), 'no winner-ahead bars on a display inversion').toBeNull()
    // the runner-up TEXT is still retained one tap down (R23).
    expect(container.querySelector('.rec-runnerup__why')?.textContent).toBe(copy.recRunnerUpWhy)
  })
})

describe('RecommendationSurface — reduced motion (the breath is dropped, the label kept)', () => {
  it('the `.solve-pending` tell joins BOTH base.css thinking-breathe family lists (breathe + reduced-motion drop)', () => {
    const base = readFileSync(resolve(__dirname, '../styles/base.css'), 'utf8')
    // The ambient breathe family (the ONE working tell).
    const breatheBlock = base.slice(
      base.indexOf('.strip-thinking,'),
      base.indexOf('animation: thinking-breathe'),
    )
    expect(breatheBlock, 'the solve-pending tell breathes with the family').toContain('.solve-pending,')
    // The reduced-motion drop: movement off, the static label remains the comprehension signal.
    const reduceIdx = base.indexOf('prefers-reduced-motion')
    const reduceBlock = base.slice(reduceIdx, base.indexOf('animation: none', reduceIdx))
    expect(reduceBlock, 'the solve-pending tell drops its breath under reduced motion').toContain(
      '.solve-pending,',
    )
  })
})

describe('RecommendationSurface — the delta heros median qualification (the median-advantage increment)', () => {
  it('renders the qualifier INSIDE the .rec-grade lockup (it crossfades with the hero it qualifies)', () => {
    const deltaSkew = {
      meanReal: 260_000, medianReal: 40_000, p10Real: 0, p90Real: 500_000,
      skewDirection: 'upside' as const, meanMinusMedianReal: 220_000,
    }
    const { container } = render(<RecommendationSurface solve={committedRec({ deltaSkew })} />)
    const lockup = container.querySelector('.rec-grade')
    expect(lockup, 'the grade lockup renders').not.toBeNull()
    // the qualifier lives INSIDE the lockup group — the cs-swap crossfade key covers it, so a fresh
    // hero can never sit beside a stale qualifier (the U16 crossfade-unit law).
    expect(lockup!.textContent).toContain('an average across the futures we tested')
    // and it is the DELTA-dialect quote arm (the typical dollar quoted in grouped digits).
    expect(lockup!.textContent).toContain('$40,000')
  })

  it('a symmetric delta renders NO qualifier (the default fixture stays byte-identical)', () => {
    const { container } = render(<RecommendationSurface solve={committedRec()} />)
    expect(container.textContent).not.toContain('an average across the futures we tested')
  })
})

describe('RecommendationSurface — the blocked steers are SPOKEN (review wf_6f89fe6f-35a P2, burden/045)', () => {
  it('idle → blocked{no-pretax} announces the steer through the persistent region (synchronous, never through pending)', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<RecommendationSurface solve={IDLE} />)
      expect(liveRegion()?.textContent).toBe('')
      rerender(<RecommendationSurface solve={{ kind: 'blocked', gap: 'no-pretax', label: 'no-pretax' }} />)
      expect(liveRegion()?.textContent, 'the sighted note and the spoken steer are the SAME sentence').toBe(copy.recommendNoPretaxNote)
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(liveRegion()?.textContent, 'clear-after-announce (burden/045)').toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('idle → blocked{spine-unready} announces ITS steer; goal-unset stays silent (the GoalPicker owns that beat)', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<RecommendationSurface solve={IDLE} />)
      rerender(<RecommendationSurface solve={{ kind: 'blocked', gap: 'spine-unready', label: 'spine-unready' }} />)
      expect(liveRegion()?.textContent).toBe(copy.recommendSpineUnreadyNote)
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      cleanup()
      const second = render(<RecommendationSurface solve={IDLE} />)
      second.rerender(<RecommendationSurface solve={{ kind: 'blocked', gap: 'goal-unset', label: 'goal-unset' }} />)
      expect(liveRegion()?.textContent, 'goal-unset never speaks here — the picker owns focus + announcement').toBe('')
    } finally {
      vi.useRealTimers()
    }
  })
})

// ================================================================================================
// U17 §S5 — THE SAVE GESTURE AT THE SURFACE
//
// The pure machines are pinned next door (`recommendationSaveView.test.ts`). Insight 032/081 is why
// this file exists anyway: a test calling a shared function proves the FUNCTION, never that the
// component CALLS it — so every arm below mounts the real component and reads the real DOM. The
// P0 the header of `RecommendationSurface.tsx` names (the aside must NOT live inside the beats) is
// only detectable this way: a pure-function battery stays green with the whole JSX mount deleted.
// ================================================================================================

describe('RecommendationSurface — §S5 the save slot: the OFFER arms (R1 + R2)', () => {
  it('the CEREMONY route (R1, the no-vault path) ships a real ENABLED control, drops aria-hidden, and discloses the escalation BEFORE the tap', () => {
    const onSave = vi.fn()
    const { container } = render(
      <RecommendationSurface
        solve={committedRec()}
        recSave={saveProp({ kind: 'offer', route: 'ceremony' }, { onSave })}
      />,
    )
    const slot = container.querySelector('.rec-save-slot')
    expect(slot, 'the reservation is still the box — now populated').not.toBeNull()
    // R1 — the no-vault tap ROUTES INTO THE CEREMONY rather than going dead. This is the path every
    // dev seed, the Caddie walk and the fit gate actually take, so a control that renders nothing
    // here is the dead end the whole machine exists to make unrepresentable.
    const cta = screen.getByRole('button', { name: copy.recommendSaveCta })
    expect(slot!.contains(cta), 'the control lives INSIDE the reservation (no second box, no reflow)').toBe(true)
    expect(cta, 'a live offer is tappable, never an inert lookalike').toBeEnabled()
    expect(
      slot!.querySelectorAll('button, a, input, select, textarea, [role]').length,
      'exactly ONE interactive control in the slot',
    ).toBe(1)
    // An AT-invisible Save button would still pass "the reservation is hidden". It must not survive.
    expect(slot!.hasAttribute('aria-hidden'), 'a POPULATED slot drops aria-hidden').toBe(false)
    // R2 — compared by EQUALITY, never `toContain`: `recommendSaveHintCeremony` is a strict superset
    // of the update hint, so a containment assert would pass on the WRONG route.
    expect(container.querySelector('.rec-save__hint')?.textContent).toBe(copy.recommendSaveHintCeremony)
    fireEvent.click(cta)
    expect(onSave, 'one tap, one write').toHaveBeenCalledTimes(1)
    // The TICKET is composed HERE, from the two producers on screen — never re-derived downstream.
    expect(onSave, 'the ticket carries THIS committed run’s identity').toHaveBeenCalledWith({
      fingerprint: COMMITTED_FP,
      noDollarRegister: false,
    })
  })

  it('the UPDATE route renders ITS OWN R2 hint — the vault exists, so no ceremony is promised', () => {
    // The guard that makes the equality asserts meaningful: two DIFFERENT sentences ship, so a
    // hard-coded single hint is detectable at all.
    expect(copy.recommendSaveHintUpdate, 'the two routes disclose different truths').not.toBe(
      copy.recommendSaveHintCeremony,
    )
    const { container } = render(
      <RecommendationSurface solve={committedRec()} recSave={saveProp({ kind: 'offer', route: 'update' })} />,
    )
    expect(screen.getByRole('button', { name: copy.recommendSaveCta })).toBeEnabled()
    expect(container.querySelector('.rec-save__hint')?.textContent).toBe(copy.recommendSaveHintUpdate)
  })

  it('the ticket’s noDollarRegister is READ from the rendered register, never hard-coded', () => {
    const onSave = vi.fn()
    render(
      <RecommendationSurface
        solve={committedRec({ noChange: true })}
        recSave={saveProp({ kind: 'offer', route: 'update' }, { onSave })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: copy.recommendSaveCta }))
    // The no-dollar register is what the household SAW; a record stamped with the other one would
    // remember a verdict the screen never spoke. The paired `false` rides the ceremony arm above.
    expect(onSave).toHaveBeenCalledWith({ fingerprint: COMMITTED_FP, noDollarRegister: true })
  })

  it('a payload whose displayed statistic disagrees with what RANKED offers NO save control at all (Q6)', () => {
    // `assertObjectiveMatchesHeadline` throws on the render path → the view degrades to a calm
    // `unavailable`, so there is no crowned winner to mint a record from. An `offer` view arriving
    // beside it must NOT conjure a control: the slot lives inside `RecommendedBeat` by design.
    const liar = leaveMoreArm('taxable-first', 'taxable-first', [500_000, 700_000], [100_000, 100_000])
    const { container } = render(
      <RecommendationSurface
        solve={committedRec({ winner: { ...liar, headlineStatisticB: liar.headlineStatisticB + 1_000_000 } })}
        recSave={saveProp({ kind: 'offer', route: 'ceremony' })}
      />,
    )
    expect(container.querySelector('.rec-note--unavailable'), 'the calm degrade renders').not.toBeNull()
    expect(container.querySelector('.rec-save-slot'), 'no slot outside the crowned beat').toBeNull()
    expect(screen.queryByRole('button', { name: copy.recommendSaveCta }), 'nothing mintable ⇒ no offer').toBeNull()
  })
})

describe('RecommendationSurface — §S5 THE CARDINAL SIN: only the SAVED arm may claim a completed save', () => {
  it('the SAVING arm renders the pending line and NEVER the saved badge', () => {
    const { container } = render(
      <RecommendationSurface solve={committedRec()} recSave={saveProp({ kind: 'saving' })} />,
    )
    expect(container.querySelector('.rec-save__pending')?.textContent).toBe(copy.recommendSavePending)
    // THE ONE ASSERT THIS WHOLE FILE EXISTS FOR. A write in flight has reached nothing; a surface
    // reporting a save that did not happen is the worst defect this codebase can ship.
    expect(container.querySelector('.rec-save__badge'), 'an in-flight write is not a save').toBeNull()
    expect(container.textContent, 'the saved sentence appears nowhere while the write is in flight').not.toContain(
      copy.recommendSaveSavedBadge,
    )
  })

  it('the SAVED arm DOES render the badge, as TEXT in the a11y tree with a decorative mark', () => {
    // The paired positive (burned/070): without it, an arm that rendered the badge NOWHERE would
    // pass every negative above and the sweep below would be vacuous.
    const { container } = render(
      <RecommendationSurface solve={committedRec()} recSave={saveProp({ kind: 'saved' })} />,
    )
    const badge = container.querySelector('.rec-save__badge')
    expect(badge, 'the disk-derived claim renders').not.toBeNull()
    expect(badge!.textContent, 'the badge TEXT carries the state — colour is never the signal').toBe(
      copy.recommendSaveSavedBadge,
    )
    expect(badge!.querySelector('.rec-save__mark'), 'the mark is redundant reinforcement').toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(container.querySelector('.rec-save-slot')!.hasAttribute('aria-hidden'), 'a claim is never AT-hidden').toBe(
      false,
    )
  })

  it('NO other arm — wired or unwired — puts the saved sentence on screen (the swept negative)', () => {
    const arms: readonly (RecommendationSaveView | undefined)[] = [
      undefined,
      { kind: 'none' },
      { kind: 'offer', route: 'ceremony' },
      { kind: 'offer', route: 'update' },
      { kind: 'saving' },
      { kind: 'refused', reason: 'record-invalid' },
      { kind: 'refused', reason: 'write' },
      { kind: 'refused', reason: 'recovery-locked' },
    ]
    // Non-vacuity (burned/070): a sweep over an accidentally-empty list passes silently.
    expect(arms.length, 'every non-saved arm is swept').toBe(8)
    for (const view of arms) {
      const { container } = render(
        <RecommendationSurface
          solve={committedRec()}
          recSave={view === undefined ? undefined : saveProp(view)}
        />,
      )
      expect(container.textContent, `${view?.kind ?? 'unwired'} must not claim a completed save`).not.toContain(
        copy.recommendSaveSavedBadge,
      )
      cleanup()
    }
  })
})

describe('RecommendationSurface — §S5 the refusal card (a promised affordance owes a rendered outcome)', () => {
  const REFUSALS: readonly {
    readonly reason: RecommendationSaveRefusal
    readonly heading: string
    readonly body: string
  }[] = [
    {
      reason: 'record-invalid',
      heading: copy.recommendSaveRefusalRecordInvalidHeading,
      body: copy.recommendSaveRefusalRecordInvalidBody,
    },
    { reason: 'write', heading: copy.recommendSaveRefusalWriteHeading, body: copy.recommendSaveRefusalWriteBody },
    {
      reason: 'recovery-locked',
      heading: copy.recommendSaveRefusalRecoveryLockedHeading,
      body: copy.recommendSaveRefusalRecoveryLockedBody,
    },
  ]

  it('every refusal reason renders ITS OWN alert card in the aside, with the slot back to the empty reservation', () => {
    expect(REFUSALS.length, 'all three reasons are swept').toBe(3)
    for (const { reason, heading, body } of REFUSALS) {
      const { container } = render(
        <RecommendationSurface solve={committedRec()} recSave={saveProp({ kind: 'refused', reason })} />,
      )
      const aside = container.querySelector('.rec-aside')
      expect(aside, `${reason}: the aside mounts for a standing refusal`).not.toBeNull()
      const note = aside!.querySelector('.rec-note--refused')
      expect(note, `${reason}: the card renders`).not.toBeNull()
      // role='alert' announces on insertion by design (the `.result-save-error` precedent).
      expect(note).toHaveAttribute('role', 'alert')
      expect(note!.querySelector('.rec-note__head')?.textContent).toBe(heading)
      expect(note!.querySelector('.rec-note__line')?.textContent).toBe(body)
      // The card is composed from `reason` ALONE — no developer text can reach the screen.
      expect(note!.textContent).not.toMatch(/savedRecommendation\.|scenario\.|undefined|\[object/)
      // The slot itself has already spoken in the aside: back to the verbatim reservation, and NO
      // retry CTA (a deterministic mint that re-fails is the lying-remedy shape).
      const slot = container.querySelector('.rec-save-slot')
      expect(slot!.getAttribute('aria-hidden'), `${reason}: nothing to announce in the slot`).toBe('true')
      expect(slot!.children.length).toBe(0)
      expect(screen.queryByRole('button', { name: copy.recommendSaveCta })).toBeNull()
      cleanup()
    }
  })

  it('a refusal SURVIVES the commit-on-blur demotion — it renders beside the STALE card, not instead of it', () => {
    // The store demotes committed → stale on every draft mutation, and a commit-on-blur fires one
    // the instant focus leaves a field. If the aside were mounted inside the beats, the outcome of
    // a gesture the household actually performed would evaporate on an unrelated keystroke.
    const { container } = render(
      <RecommendationSurface
        solve={{ kind: 'stale', label: 'inputs-changed' }}
        recSave={saveProp({ kind: 'refused', reason: 'write' })}
      />,
    )
    const stale = container.querySelector('.rec-note--stale')
    const refused = container.querySelector('.rec-aside .rec-note--refused')
    expect(stale, 'the stale card still renders').not.toBeNull()
    expect(refused, 'and the refusal outlives the demotion').not.toBeNull()
    expect(stale!.contains(refused), 'two separate cards, never one nested in the other').toBe(false)
  })

  /**
   * THE PAIRED NEGATIVE, NARROWED — NOT DELETED. This arm was written when the aside held TWO
   * tenants (the remembered record and the refusal), so its title named both. Briggsy's 2026-07-26
   * placement ruling moved the record card out to `Result`, and the aside is now the refusal's
   * alone — so the arm now says exactly what it can still witness. It stays because without it a
   * mutant that mounted an EMPTY `.rec-aside` on every frame would pass the whole battery above
   * (burned/070: a sweep of positives needs its negative), and because that empty div is a real
   * layout node on the one frame the fold measurement is tightest.
   */
  it('no standing refusal ⇒ NO aside node at all (the refusal-free frame is byte-identical to before)', () => {
    const { container } = render(
      <RecommendationSurface solve={committedRec()} recSave={saveProp({ kind: 'offer', route: 'update' })} />,
    )
    expect(container.querySelector('.rec-aside'), 'nothing refused ⇒ no container').toBeNull()
    // And the aside never conjures the OTHER tenant it no longer hosts: the record card reaches the
    // screen through `Result` (below the disclaimer), never through this surface.
    expect(container.querySelector('.rec-record'), 'the surface never mounts the record card').toBeNull()
  })
})

/**
 * §S5 — THE REMEMBERED RECORD'S CARD: WHAT THE MEMORY SAYS.
 *
 * `SavedRecordCard` is rendered DIRECTLY here, not through the surface, because the surface no
 * longer owns it. Briggsy's placement ruling (2026-07-26) moved the card OUT of `.rec-aside` and
 * into `Result`, below the protected in-frame R13 disclaimer: MEASURED at his real 1536×791 the
 * card in its old seat pushed that caveat 67px (holds, 156px card) to 161px (superseded with two
 * causes, 251px) below the fold, against an idle frame carrying only 89px of headroom. No honest
 * version of the card fits that seat — so the PLACEMENT moved and not one word was trimmed, which
 * is why every content arm below survives verbatim on the other side of the seam.
 *
 * THE PLACEMENT ARMS MOVED WITH THE CARD, to `recommendInvite.test.tsx`'s Result battery — the v1
 * P0 ("gated on ITS OWN disk data, never on `solve.kind`": it paints on the vault-return `idle`
 * frame and on the draft-edit `stale` one) plus the RULING itself (the card follows the disclaimer
 * in DOM order). They cannot live here any more: mounting a component in isolation proves the
 * COMPONENT, never that its parent mounts it where the fold law requires (insights 032/081).
 */
describe('RecommendationSurface — §S5 the remembered-record card (the returning household)', () => {
  it('a SUPERSEDED card with ZERO causes still renders a standing marker carrying TEXT (the fail-closed split)', () => {
    // The broken-contract output: the store demoted the record without reporting a cause. A card
    // that were nothing but a heading over `clauses.map(...)` draws a blank exactly where the
    // disclosure belongs — and a decorative shape alone is not reachable in the a11y tree.
    const base = statusOf(recordFor())
    expect(base.current, 'the operand starts from a REAL producer verdict').toBe(true)
    const broken: SavedRecommendationStatus = { ...base, current: false, causes: [] }
    const view = cardOf(broken)
    expect(view.standing.kind, 'fail-closed: the quieter claim').toBe('superseded')
    const { container } = render(<SavedRecordCard card={{ view }} />)
    const standing = container.querySelector('.rec-record__standing')
    expect(standing, 'the standing line renders on BOTH arms').not.toBeNull()
    expect(standing).toHaveAttribute('data-standing', 'superseded')
    expect(standing!.textContent, 'the meaning is TEXT, not a glyph').toBe(copy.recommendRecordSuperseded)
    expect(standing!.querySelector('.rec-record__mark'), 'the shape is redundant reinforcement').toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(container.querySelector('.rec-record__causes'), 'no empty list where no cause was reported').toBeNull()
  })

  it('EVERY cause clause renders, in the producer’s DECLARATION ORDER (insight 101)', () => {
    const view = twoCauseCard()
    // Non-vacuity: the fixture really does hold two causes at once.
    expect(view.standing.clauses.length, 'two causes hold on this record').toBe(2)
    const { container } = render(<SavedRecordCard card={{ view }} />)
    const clauses = [...container.querySelectorAll('.rec-record__causes .rec-note__line')].map((li) => li.textContent)
    // A card naming ONE cause when two hold describes its poster child, not the truth.
    expect(clauses).toEqual([copy.recommendRecordSupersededInputs, copy.recommendRecordSupersededSolver])
    expect(clauses, 'the rendered order IS the producer’s order — never sorted, filtered or truncated').toEqual([
      ...view.standing.clauses,
    ])
    expect(container.textContent, 'the superseded lead still leads').toContain(copy.recommendRecordSuperseded)
  })

  it('the RE-OPEN control and its cost line appear and vanish TOGETHER (no dead door, no dead promise)', () => {
    const onReopen = vi.fn()
    const wired = render(<SavedRecordCard card={{ view: holdsCard(), onReopen }} />)
    const btn = screen.getByRole('button', { name: copy.recommendRecordReopenCta })
    fireEvent.click(btn)
    expect(onReopen, 'the way back is a real door').toHaveBeenCalledTimes(1)
    expect(wired.container.querySelector('.rec-record__cost')?.textContent, 'the door names its cost').toBe(
      copy.recommendRecordReopenCost,
    )
    cleanup()
    // Unwired (the date route, a frame this screen refuses to invite on): BOTH halves gone.
    const unwired = render(<SavedRecordCard card={{ view: holdsCard() }} />)
    expect(screen.queryByRole('button', { name: copy.recommendRecordReopenCta }), 'never a dead door').toBeNull()
    expect(unwired.container.querySelector('.rec-record__cost'), 'never a cost line beside no control').toBeNull()
    expect(unwired.container.textContent, 'the cost sentence leaves with its control').not.toContain(
      copy.recommendRecordReopenCost,
    )
  })

  it('the age clause renders when the record is genuinely old, and quotes NO remembered verdict (R3)', () => {
    const aged = recordFor({ mintedAt: TODAY - 800 })
    const view = cardOf(statusOf(aged), aged)
    expect(view.savedIn, 'the fixture is old enough to have an age').not.toBeUndefined()
    const { container } = render(<SavedRecordCard card={{ view }} />)
    expect(container.textContent).toContain(view.savedIn)
    // MINIMAL BY RULING: the remembered grade / verdict enums stay persisted and UNQUOTED — an enum
    // on screen is one refactor away from being read as a current figure.
    expect(container.querySelector('.rec-record')!.textContent).not.toMatch(
      /just-do-it|coin-flip|surplusRegime|noChange|noDollarRegister|taxable-first/,
    )
  })
})

describe('RecommendationSurface — §S5 the gesture’s announcements (burned/045)', () => {
  it('the tap→in-flight transition SPEAKS the pending line through the persistent region, then self-clears', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(
        <RecommendationSurface solve={committedRec()} recSave={saveProp({ kind: 'offer', route: 'update' })} />,
      )
      expect(liveRegion()?.textContent).toBe('')
      rerender(<RecommendationSurface solve={committedRec()} recSave={saveProp({ kind: 'saving' })} />)
      expect(liveRegion()?.textContent, 'the sighted pending line and the spoken one are the SAME sentence').toBe(
        copy.recommendSavePending,
      )
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(liveRegion()?.textContent, 'clear-after-announce').toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('THE LANDING is announced off the durability event and acknowledged exactly ONCE', () => {
    vi.useFakeTimers()
    try {
      const onAnnounced = vi.fn()
      const { rerender } = render(
        <RecommendationSurface
          solve={committedRec()}
          recSave={saveProp({ kind: 'saving' }, { landed: false, onAnnounced })}
        />,
      )
      expect(liveRegion()?.textContent, 'nothing has landed yet').toBe('')
      expect(onAnnounced).not.toHaveBeenCalled()
      rerender(
        <RecommendationSurface
          solve={committedRec()}
          recSave={saveProp({ kind: 'saved' }, { landed: true, onAnnounced })}
        />,
      )
      expect(liveRegion()?.textContent, 'an AT user hears the save land').toBe(copy.recommendSaveSavedBadge)
      expect(onAnnounced, 'clear-after-announce: the event is acknowledged').toHaveBeenCalledTimes(1)
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(liveRegion()?.textContent).toBe('')
      // A re-render at the same standing flag must not re-speak (the ref makes it once per episode).
      rerender(
        <RecommendationSurface
          solve={committedRec()}
          recSave={saveProp({ kind: 'saved' }, { landed: true, onAnnounced })}
        />,
      )
      expect(liveRegion()?.textContent, 'no re-announce loop').toBe('')
      expect(onAnnounced).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('landed:true on the FIRST render still announces — the CEREMONY route remounts this whole subtree', () => {
    vi.useFakeTimers()
    try {
      const onAnnounced = vi.fn()
      // IntakeApp's `phase === 'save'` branch returns before Result renders, so on the no-vault
      // route the surface is BRAND NEW when the write lands. A watcher seeded from the current view
      // kind sees `saved` on both sides of the remount and stays silent about the very save it
      // mounted to announce — which is why the flag, not the transition, is the trigger.
      render(
        <RecommendationSurface
          solve={committedRec()}
          recSave={saveProp({ kind: 'saved' }, { landed: true, onAnnounced })}
        />,
      )
      expect(liveRegion()?.textContent, 'the post-ceremony landing still speaks').toBe(copy.recommendSaveSavedBadge)
      expect(onAnnounced).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

// ---- the WINNING-PLAN card (2026-08-05) ------------------------------------------------------------
//
// The render half of "the recommendation never says what to DO". The view model owns every DECISION
// (register, dialect, diff) and is pinned in recommendationView.test.ts; these arms pin that the beat
// actually SEATS it, in the right column, with the right semantics.
describe('RecommendationSurface — the winning-plan card', () => {
  const CLOCK = { startCalendarYear: 2026, yearsSincePlanBuilt: 0 }
  const converting = (over: Partial<SolveRecommendation> = {}): SolveAnswer =>
    committedRec({
      winner: {
        ...leaveMoreArm('taxable-first', 'taxable-first', [500_000, 700_000], [100_000, 100_000]),
        conversion: { annualAmountReal: 43_617, startYearOffset: 0, years: 9 },
      },
      ...over,
    })

  it('names both coupled controls, inside the reading-measure column, as a definition list', () => {
    const { container } = render(<RecommendationSurface solve={converting()} planClock={CLOCK} />)
    const card = container.querySelector('.rec-action')
    expect(card, 'the card renders in the ACTIVE register').not.toBeNull()
    // SEATED INSIDE `.rec-committed__rest`, never as a direct child of `.rec-committed`: at the laptop
    // two-pane the beat's inner grid places exactly three children explicitly, so a fourth direct child
    // would auto-place into an implicit row the viz's `grid-row: 1 / -1` does not span.
    expect(container.querySelector('.rec-committed__rest .rec-action'), 'seated in the text column').not.toBeNull()

    expect(container.textContent).toContain(copy.recommendActionHeading)
    const terms = [...container.querySelectorAll('.rec-action__term')].map((t) => t.textContent)
    expect(terms).toEqual([copy.recommendActionOrderLabel, copy.recommendActionConversionLabel])

    const values = [...container.querySelectorAll('.rec-action__value')].map((d) => d.textContent ?? '')
    // The ORDER half is the sequencing sheet's own shipped label + gloss — never a re-typed name.
    expect(values[0]).toContain(copy.leverPolicyTaxableFirst)
    expect(values[0]).toContain(copy.leverPolicyTaxableFirstHelp)
    // The CONVERSION half quotes the crowned amount FLOORED, through the shipped duration vocabulary.
    expect(values[1]).toBe(slots.rothPlanRanked('43,000', 9, 2026, false))
  })

  it('SEATS the replacement clause in the DOM — deleting its JSX must not leave the suite green', () => {
    // The view model built `conversionNote` and nothing downstream ever read it: every assertion lived
    // on the composer, so removing the render branch was invisible to the whole suite (ultramode
    // 2026-08-05, the testing lens). Their figure is un-round so the two dialects genuinely differ and
    // the note is not suppressed by the display-collision guard.
    const { container } = render(
      <RecommendationSurface
        solve={converting({
          noActionBaseline: {
            ...leaveMoreArm('proportional', 'proportional', [400_000, 500_000], [100_000, 100_000]),
            conversion: { annualAmountReal: 20_450, startYearOffset: 0, years: 4 },
          },
        })}
        planClock={CLOCK}
      />,
    )
    const conversionValue = [...container.querySelectorAll('.rec-action__value')][1]?.textContent ?? ''
    expect(conversionValue).toContain(slots.rothPlanReplaces('20,450'))
    // The two clauses are separate readable text, not one run-on token (the gloss's `display:block`
    // breaks the LINE but leaves the nodes adjacent in the a11y tree and in copied text).
    expect(conversionValue).not.toMatch(/2026\.That/)
  })

  it('the list carries its heading as its accessible name (one named group, no double announcement)', () => {
    const { container } = render(<RecommendationSurface solve={converting()} planClock={CLOCK} />)
    const heading = container.querySelector('.rec-action__heading')
    const list = container.querySelector('.rec-action__list')
    expect(heading?.id, 'the heading owns a real id').toBeTruthy()
    expect(list).toHaveAttribute('aria-labelledby', heading?.id ?? '')
    // The name is the VISIBLE heading, not a duplicated aria-label — AT reads it once.
    expect(list).not.toHaveAttribute('aria-label')
  })

  it('does not render in the NO-CHANGE register — the hero already says the honest thing there', () => {
    const { container } = render(<RecommendationSurface solve={converting({ noChange: true })} planClock={CLOCK} />)
    expect(container.textContent).toContain(copy.recComposeAlready)
    expect(container.querySelector('.rec-action')).toBeNull()
  })

  it('does not render without the plan clock — absent beats a conversion start it cannot date', () => {
    const { container } = render(<RecommendationSurface solve={converting()} />)
    expect(container.querySelector('.rec-viz-box'), 'the rest of the ACTIVE beat is unchanged').not.toBeNull()
    expect(container.querySelector('.rec-action')).toBeNull()
  })

  it('WIRING — Result really passes the plan clock, so the degrade above can never become the shipped state', () => {
    // A source assertion, and its limits are the point: it proves the PROP IS WIRED at the one
    // production mount, not that the anchor's value is right (recommendationView.test.ts pins the
    // arithmetic, and `planClockAnchor` is the single shipped derivation). Without it, dropping the
    // prop would turn the card off everywhere while every render test above still passed.
    const src = readFileSync(resolve(__dirname, '../Result.tsx'), 'utf8')
    const mount = src.slice(src.indexOf('<RecommendationSurface'), src.indexOf('/>', src.indexOf('<RecommendationSurface')))
    expect(mount, 'the committed-beat mount passes the anchor Result already mints').toContain('planClock={dateAnchor}')
  })
})
