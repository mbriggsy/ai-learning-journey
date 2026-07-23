// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { RecommendationSurface } from '../RecommendationSurface'
import { copy, staticDisclosures } from '../copy'
import type { SolveAnswer } from '@store/memoryModel'
import { NEVER_DEPLETED, type Distribution } from '@shared/model'
import { headlineStatisticFromDistribution } from '@engine/solver/objectiveHeadline'
import type { SolveArm, SolveRecommendation } from '@engine/solver/solve'
import type { SolveTokenWithheld } from '@engine/solver/solveEntry'
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
  return { kind: 'committed', payload, fingerprint: 'fp' as SolverRunFingerprint }
}

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

  it('THE RESERVED SAVE SLOT is layout space ONLY — no live/interactive save control ships in U16 (mutant b)', () => {
    const { container } = render(<RecommendationSurface solve={committedRec()} onRepick={vi.fn()} />)
    const slot = container.querySelector('.rec-save-slot')
    expect(slot, "the slot reserves U17's Save footprint (kills the CLS relayout)").not.toBeNull()
    expect(slot!.getAttribute('aria-hidden'), 'nothing to announce in an empty reservation').toBe('true')
    // NOTHING interactive lives in the slot — a gesture whose commit does not persist is a lie (the
    // security seat's writable()-refuses finding). A planted live save control (a <button> in the slot)
    // makes BOTH of these RED.
    expect(slot!.querySelector('button, a, input, select, textarea, [role]'), 'no interactive element').toBeNull()
    expect(slot!.children.length, 'reserved layout space only — no rendered content').toBe(0)
    // and NO save-looking control anywhere in the committed beat — U16 ships NO save; U17 lands it.
    expect(screen.queryByRole('button', { name: /save/i }), 'U16 ships no Save control at all').toBeNull()
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
