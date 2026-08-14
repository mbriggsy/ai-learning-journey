// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { AssumptionPanel, type AssumptionPanelProps } from '../AssumptionPanel'
import { createMemoryModel, type MemoryModel, type MemoryModelSnapshot, type ScenarioDraft, type StickyDisplay } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import { requiredSeats, METHODOLOGY_DISCLOSURES } from '@ui/assumptionRegistry'
import { copy, slots } from '@ui/copy'
import { planClockAnchor } from '@ui/bandAnnotations'
import { formatMoney } from '../fields'
import { missingRequiredFacts } from '../intakeMap'
import type { BudgetLineItem, SimulationResult } from '@shared/model'
import { ordinaryBracketsMFJ, ordinaryBracketsSingle } from '@engine/constants/tax'
import { solverAssumedHeirBracket } from '@engine/constants'
import { formatBracketPercent } from '@ui/money'

/*
 * The U12 AssumptionPanel battery (P3·U12 · C1). Presentational over props — a fake snapshot
 * + spy callbacks; the Result wiring (door gating, recompute cadence) lives in
 * src/ui/__tests__/resultAssumptionsDoor.test.tsx. The pins here:
 *
 *  - the R7 COMPLETENESS WALK: every registry-promised seat has a rendered home
 *    (data-assumption-seat) — the runtime half of the compile-enforced registry;
 *  - survivorSpendingRatio commits a FRACTION; >1 / blank REFUSE the commit (validate-
 *    before-mutate — the draft never holds the impossibility) with the calm inline error;
 *  - the governed spend row routes to the budget sheet and grows NO inline editor
 *    (insight 058 — never reconciliation writer #9); ungoverned commits the canonical annual;
 *  - the OOP edit re-reconciles the scalar ATOMICALLY under a governing budget (one mutate);
 *  - the echo reads `displayed` (the sticky triple), NEVER the raw result (divergent-fake pin);
 *  - the truer-picture line renders on a baseline-WORSE transition only (both arms + equal);
 *  - the market block reads productionMarket live + the standing market-floor line is static;
 *  - the period toggle RE-LABELS, never re-bases (the silent-12× guard);
 *  - Escape/Close call out (the scaffold owns focus-restore choreography).
 *
 * jsdom limits (insight 064): the panel's first REAL full-inventory render — vertical extent,
 * scroll-shadow cue, portal focus-restore on exit, live-region announcement timing — is the
 * integrator's Playwright pass, flagged in the build report.
 */

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

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('control-sheet-open')
})

const nullClient: EngineClient = {
  runningInWorker: true,
  engine: {
    ping: async () => 'pong' as const,
    run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestEpoch: async () => {},
    runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'cancelled' } }) as const,
    runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    runSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
  },
}

function freshModel(): MemoryModel {
  return createMemoryModel({
    client: nullClient,
    builders: { buildSpineParams: () => null, buildDateInput: () => null },
    mintSeed: () => 1,
    startCalendarYear: 2026,
  })
}

function draftWith(mutate?: (d: ScenarioDraft) => ScenarioDraft): ScenarioDraft {
  const m = freshModel()
  if (mutate) m.update(mutate)
  return m.getSnapshot().draft
}

/** A mixed pre-65 household — one working, one retired — so EVERY conditional row renders:
 *  the stop-age row (retired member), the work-investment row (date route + working member),
 *  the ACA quote pair (pre-65), and the full per-person fact set. */
const mixedDraft = draftWith((d) => ({
  ...d,
  people: [
    {
      name: 'Ari', birthYear: 1971, currentAge: 55, sex: 'male',
      workStatus: 'working', earnedIncomeReal: 120_000,
    },
    {
      name: 'Bea', birthYear: 1963, currentAge: 63, sex: 'female',
      workStatus: 'retired', retirementAge: 62, pia: 24_000, socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [{ ownerIndex: 0, kind: 'traditional-ira', valueToday: 500_000 }],
  annualSpendingReal: 96_000,
  health: {
    ...d.health,
    oopMedicalAnnual: 4_000,
    slcspMonthlyToday: 1_000,
    enrolledPremiumMonthlyToday: 1_100,
    workingYearInvestmentByPerson: [1_000, 0],
  },
}))

/** ONE essentials line at $40k + the $4k OOP floor ⇒ the reconciled year-0 total is $44k
 *  (hand-computed, external to budgetYearZeroFullTotal — DND 012). */
const LINES: readonly BudgetLineItem[] = [
  { category: 'other', label: 'All of it', annualAmountReal: 40_000, tier: 'essentials', startYear: 0 },
]
const governedDraft = draftWith(() => ({ ...mixedDraft, budget: LINES, annualSpendingReal: 44_000 }))

/** The LEAVE-MORE household — `mixedDraft` with the Tier-2 goal picked. Its own fixture because the
 *  heir-bracket seat is goal-gated: the bequest objective is the only thing that reads the bracket,
 *  so a row under pay-less-tax would be a hollow door. The completeness walk below renders THIS too,
 *  or the seat has no fixture that can produce it and the walk reds — which is exactly what happened
 *  when the seat first landed. `heirBracket` is deliberately left ABSENT so the row must fall back to
 *  the constant default (absence = "took our default", a different fact from choosing 0.24). */
const leaveMoreDraft = draftWith(() => ({ ...mixedDraft, chosenGoal: 'leave-more' as const }))

/** The UNKNOWN-AGE household: mixedDraft with both birth years (and their derived ages) cleared
 *  and the quote pair cleared. LIVE-REACHABLE, not a synthetic state — resolve once, open
 *  Assumptions, take "edit in the walk-through", and blank a birth year in the names step: the
 *  walk's field writes `undefined` through and no sanity rule fires on an ABSENT value (both
 *  age rules guard on `!== undefined`). The recompute then commits `inputs-incomplete`, which is
 *  the arm that renders the missing-fact line. */
const unknownAgeDraft = draftWith(() => ({
  ...mixedDraft,
  people: [
    { ...mixedDraft.people[0], birthYear: undefined, currentAge: undefined },
    { ...mixedDraft.people[1], birthYear: undefined, currentAge: undefined },
  ] as ScenarioDraft['people'],
  health: {
    ...mixedDraft.health,
    enrolledPremiumMonthlyToday: undefined,
    slcspMonthlyToday: undefined,
  },
}))

const shown = (xOfTen: number, over: Partial<StickyDisplay> = {}): StickyDisplay => ({
  xOfTen,
  outcomeState: 'on-track',
  perMonthDollar: 430,
  direction: 'room',
  ...over,
})

const snap = (draft: ScenarioDraft, over: Partial<MemoryModelSnapshot> = {}): MemoryModelSnapshot => ({
  draft,
  answer: { kind: 'idle' },
  displayed: null,
  solve: { kind: 'idle' },
  runningInWorker: true,
  ...over,
})

function renderPanel(
  over: {
    snapshot?: MemoryModelSnapshot
    missing?: AssumptionPanelProps['missing']
    savedAnchor?: AssumptionPanelProps['savedAnchor']
  } = {},
) {
  const props = {
    open: true,
    snapshot: over.snapshot ?? snap(mixedDraft),
    missing: over.missing ?? ([] as AssumptionPanelProps['missing']),
    // U17 §S1 — the fresh anchor mirrors the fixtures' 2026 mint through the ONE producer.
    savedAnchor: over.savedAnchor ?? planClockAnchor(2026, 2026),
    onCommitEdit: vi.fn<(mutate: (d: ScenarioDraft) => ScenarioDraft) => void>(),
    onOpenBudget: vi.fn(),
    onOpenSequencing: vi.fn(),
    onOpenRoth: vi.fn(),
    onOpenHealth: vi.fn(),
    onReview: vi.fn(),
    onClose: vi.fn(),
  }
  const utils = render(<AssumptionPanel {...props} />)
  return { props, ...utils }
}

const commitAndApply = (
  onCommitEdit: { readonly mock: { readonly calls: readonly (readonly unknown[])[] } },
  base: ScenarioDraft,
): ScenarioDraft => {
  const mutate = onCommitEdit.mock.calls.at(-1)![0] as (d: ScenarioDraft) => ScenarioDraft
  return mutate(base)
}

// ─── the R7 completeness pin ──────────────────────────────────────────────────────────────

describe('the R7 registry completeness walk (the compile gate’s runtime half)', () => {
  it('every registry-promised seat renders under the full-inventory fixtures', () => {
    const rendered = new Set<string>()
    const collect = () =>
      document
        .querySelectorAll('[data-assumption-seat]')
        .forEach((el) => rendered.add(el.getAttribute('data-assumption-seat')!))
    const first = renderPanel({ snapshot: snap(mixedDraft) })
    collect()
    first.unmount()
    const second = renderPanel({ snapshot: snap(governedDraft) })
    collect()
    second.unmount()
    // The goal-gated arm: `heir-bracket` renders ONLY under leave-more, so without this render the
    // walk cannot see it and the R7 claim would be unprovable for that seat.
    renderPanel({ snapshot: snap(leaveMoreDraft) })
    collect()
    // ⚠️ NON-VACUITY CENSUS — the only assertion in this arm lives INSIDE the loop, so an empty
    // (or silently-shrunken) roster passes GREEN while proving nothing, and the R7 completeness
    // claim evaporates with the gate still reporting OK. `requiredSeats()` derives from TWO
    // sources (`assumptionRegistry.ts:238-245`: the non-`internal` DRAFT_DISPOSITIONS, plus
    // METHODOLOGY_DISCLOSURES), so census BOTH — either half dropping out would otherwise be
    // invisible here.
    const seats = requiredSeats()
    expect(seats.length, 'the seat roster is non-empty — an empty loop proves no completeness').toBeGreaterThanOrEqual(20)
    expect(seats, 'the DRAFT_DISPOSITIONS half is represented').toContain('spend')
    expect(seats, 'the METHODOLOGY_DISCLOSURES half is represented').toContain(METHODOLOGY_DISCLOSURES[0]!.seat)
    for (const seat of seats) {
      expect([...rendered], `seat "${seat}" must have a rendering home in the panel`).toContain(seat)
    }
  })
})

// ─── the unknown-age homing pin (every NAMED fact has a rendered editor) ──────────────────

describe('an unknown-age household — the panel HOMES every fact it names', () => {
  it('names the ACA quote pair AND renders its row (never a required fact with no editor)', () => {
    // Asserted against missingRequiredFacts DIRECTLY, not against the rendered missing-fact
    // sentence: that line truncates to the first three names, and this fixture is missing more
    // than three facts, so a string assertion could pass or fail for reasons unrelated to homing.
    const named = missingRequiredFacts(unknownAgeDraft).map((m) => m.labelKey)
    expect(named).toContain('enrolledPremiumLabel')
    expect(named).toContain('slcspLabel')
    // The `missing` prop is INJECTED (it defaults to [] in this harness), so it is fed from the
    // same producer Result.tsx feeds it from — otherwise the arm is vacuous.
    renderPanel({
      snapshot: snap(unknownAgeDraft, { answer: { kind: 'inputs-incomplete' } }),
      missing: missingRequiredFacts(unknownAgeDraft),
    })
    expect(document.querySelector('[data-assumption-seat="health-quote"]')).not.toBeNull()
  })
})

// ─── the heir-bracket seat (leave-more only; the R7 obligation the disclosure now points at) ──

describe('the heir-bracket seat — goal-gated, closed vocabulary, derived ladder', () => {
  /** SCOPED to the seat, never `screen.getAllByRole('radio')`: the open panel renders several other
   *  radio groups (the spend-period toggle, the state picker, the Medicare-extras fork), so a global
   *  query silently mixes them in — it reported two "checked" radios and could not find the rung to
   *  click. A seat-scoped query is also what keeps this battery honest if a new group lands later. */
  const heirRadios = (): HTMLElement[] => {
    const seat = document.querySelector('[data-assumption-seat="heir-bracket"]')
    if (seat === null) throw new Error('the heir-bracket seat did not render — the gate or the row is wrong')
    return within(seat as HTMLElement).getAllByRole('radio')
  }

  it('renders ONLY under leave-more — no hollow door where the objective never reads it', () => {
    // pay-less-tax and an unset goal both leave the bracket inert: nothing in those objectives
    // multiplies by it, so a knob there would change a number the household can never observe.
    const a = renderPanel({ snapshot: snap(mixedDraft) }) // chosenGoal absent
    expect(document.querySelector('[data-assumption-seat="heir-bracket"]')).toBeNull()
    a.unmount()

    const b = renderPanel({ snapshot: snap(draftWith(() => ({ ...mixedDraft, chosenGoal: 'pay-less-tax' as const }))) })
    expect(document.querySelector('[data-assumption-seat="heir-bracket"]')).toBeNull()
    b.unmount()

    renderPanel({ snapshot: snap(leaveMoreDraft) })
    expect(document.querySelector('[data-assumption-seat="heir-bracket"]')).not.toBeNull()
  })

  it('offers the STATUTORY ladder derived from the shipped table — never a re-typed list', () => {
    renderPanel({ snapshot: snap(leaveMoreDraft) })
    const shown = heirRadios().map((r) => (r.closest('label')?.textContent ?? '').trim())
    for (const b of ordinaryBracketsMFJ.value) {
      expect(shown, `the ${b.rate} rung must be offered`).toContain(
        slots.assumptionHeirBracketOption(formatBracketPercent(b.rate)),
      )
    }
  })

  /** The rung whose FACE reads `rate` — identified by label text, because SegmentedControl renders
   *  native radios without a `value` attribute (every one reports the DOM default `'on'`). */
  const rungFor = (rate: number): HTMLElement =>
    heirRadios().find(
      (r) =>
        (r.closest('label')?.textContent ?? '').trim() ===
        slots.assumptionHeirBracketOption(formatBracketPercent(rate)),
    )!

  it('pre-selects the CONSTANT default when the household has not chosen (absence ≠ 0.24 stored)', () => {
    renderPanel({ snapshot: snap(leaveMoreDraft) }) // heirBracket deliberately absent
    const checked = heirRadios().filter((r) => (r as HTMLInputElement).checked)
    expect(checked, 'exactly one rung is active — never zero (a fabricated blank) or two').toHaveLength(1)
    expect((checked[0]!.closest('label')?.textContent ?? '').trim()).toBe(
      slots.assumptionHeirBracketOption(formatBracketPercent(solverAssumedHeirBracket.value)),
    )
  })

  it('a household that HAS chosen sees their own rung, not ours', () => {
    renderPanel({ snapshot: snap(draftWith(() => ({ ...leaveMoreDraft, heirBracket: 0.12 }))) })
    const checked = heirRadios().filter((r) => (r as HTMLInputElement).checked)
    expect(checked).toHaveLength(1)
    expect((checked[0]!.closest('label')?.textContent ?? '').trim()).toBe(
      slots.assumptionHeirBracketOption(formatBracketPercent(0.12)),
    )
  })

  it('commits the chosen rung as a FRACTION through the one seam', () => {
    const { props } = renderPanel({ snapshot: snap(leaveMoreDraft) })
    fireEvent.click(rungFor(0.32))
    // NOT a call-count assertion: `SegmentedControl` nests its input INSIDE the label, so a click on
    // the input bubbles to the label, which forwards a second click to its control — one user
    // gesture, two handler calls. The shipped period-toggle test hits the same artifact and simply
    // does not count. What actually matters is that the write is IDEMPOTENT, so a doubled gesture
    // cannot land a different value than a single one — asserted directly below.
    expect(props.onCommitEdit).toHaveBeenCalled()
    const results = props.onCommitEdit.mock.calls.map(
      (c) => (c[0] as (d: ScenarioDraft) => ScenarioDraft)(leaveMoreDraft).heirBracket,
    )
    // A FRACTION, not the percent shown on the face — the engine throws outside [0, 1).
    expect(new Set(results), 'every call of one gesture writes the same fraction').toEqual(new Set([0.32]))
  })

  it('every offered rung is inside the range the engine accepts — the closed vocabulary IS the guard', () => {
    // Why no sanity rule was added: `afterTaxBequestPerPath` throws outside [0, 1), and a radio
    // cannot express 24 or 1. If a future table ever carried a rate ≥ 1 this fails HERE rather
    // than inside the engine mid-solve.
    for (const b of ordinaryBracketsMFJ.value) {
      expect(b.rate, `rung ${b.rate} must satisfy the engine's [0, 1)`).toBeGreaterThanOrEqual(0)
      expect(b.rate).toBeLessThan(1)
    }
  })

  it('the MFJ and Single schedules carry the SAME rate ladder — the vocabulary is filing-agnostic', () => {
    // The panel builds its rungs from the MFJ table. That is only honest while the two schedules
    // share a rate ladder (they differ in thresholds, which this question does not ask about). If a
    // future schedule splits them, this reds instead of silently imposing one filing status's
    // ladder on every household's heirs.
    expect(ordinaryBracketsSingle.value.map((b) => b.rate)).toEqual(
      ordinaryBracketsMFJ.value.map((b) => b.rate),
    )
  })
})

// ─── the survivor-ratio editor (the ONE editable methodology knob) ────────────────────────

describe('survivorSpendingRatio — fraction commit, refused impossibilities', () => {
  it('commits a FRACTION ("50" → 0.5) through the one seam', () => {
    const { props } = renderPanel()
    const input = screen.getByLabelText(copy.assumptionSurvivorRatioLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '50' } })
    fireEvent.blur(input)
    expect(props.onCommitEdit).toHaveBeenCalledTimes(1)
    expect(commitAndApply(props.onCommitEdit, mixedDraft).survivorSpendingRatio).toBe(0.5)
  })

  it('>100% is REFUSED — no commit, errSurvivorRatio inline (validateParams alone allows 1e12)', () => {
    const { props } = renderPanel()
    const input = screen.getByLabelText(copy.assumptionSurvivorRatioLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '120' } })
    fireEvent.blur(input)
    expect(props.onCommitEdit).not.toHaveBeenCalled()
    expect(screen.getByText(copy.errSurvivorRatio)).toBeInTheDocument()
  })

  it('a cleared field is REFUSED with its own calm line (the knob is required methodology)', () => {
    const { props } = renderPanel()
    const input = screen.getByLabelText(copy.assumptionSurvivorRatioLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(props.onCommitEdit).not.toHaveBeenCalled()
    expect(screen.getByText(copy.errSurvivorRatioBlank)).toBeInTheDocument()
  })

  it('an explicit 0% is REFUSED — the floor mirror (U12 ultramode: a zeroed survivor share inflates survival)', () => {
    const { props } = renderPanel()
    const input = screen.getByLabelText(copy.assumptionSurvivorRatioLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.blur(input)
    expect(props.onCommitEdit).not.toHaveBeenCalled()
    expect(screen.getByText(copy.errSurvivorRatioFloor)).toBeInTheDocument()
  })
})

// ─── the spend row (insight 058 + the F9 honest demotion) ────────────────────────────────

describe('the spend row', () => {
  it('GOVERNED: shows the reconciled total, routes to the budget sheet, grows NO inline editor', () => {
    const { props } = renderPanel({ snapshot: snap(governedDraft) })
    expect(screen.queryByLabelText(copy.spendLabel)).toBeNull() // no inline field
    expect(screen.getByText(slots.spendBudgetTotal(formatMoney(44_000)))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.budgetEditCta }))
    expect(props.onOpenBudget).toHaveBeenCalledTimes(1)
    expect(props.onCommitEdit).not.toHaveBeenCalled() // routing is never a write
  })

  it('UNGOVERNED: commits the canonical ANNUAL from the period-displayed figure', () => {
    const { props } = renderPanel() // mixedDraft: period 'month', annual 96k → displays 8,000
    const input = screen.getByLabelText(copy.spendLabel)
    expect((input as HTMLInputElement).value).toBe('8,000')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '9000' } })
    fireEvent.blur(input)
    expect(commitAndApply(props.onCommitEdit, mixedDraft).annualSpendingReal).toBe(108_000)
  })

  it('editing the AMOUNT never re-fires the period force-confirm (completion IS the period receipt — U12 ultramode)', () => {
    // mixedDraft is month-view at $8k/mo entered — exactly the ambiguous band the intake rule
    // guards. This household already answered the period to complete intake; the panel threads
    // periodConfirmed provenance, so the '$/month or $/year?' nag must NOT render here. (The
    // panel's own toggle also RE-LABELS-never-re-bases, so the 12× misentry is structurally
    // impossible on this surface — the nag would be pure gratuitous friction.)
    renderPanel()
    const input = screen.getByLabelText(copy.spendLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '8000' } })
    fireEvent.blur(input)
    expect(screen.queryByText(copy.periodConfirmPrompt)).toBeNull()
  })

  it('clear-to-ZERO commits (the F9 machinery answers — never a silent block) and the spend-zero rule fires on the committed draft', () => {
    const { props, rerender } = renderPanel()
    const input = screen.getByLabelText(copy.spendLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.blur(input)
    const committed = commitAndApply(props.onCommitEdit, mixedDraft)
    expect(committed.annualSpendingReal).toBe(0)
    // The store would demote to inputs-incomplete; the panel re-renders with the committed
    // draft and the calm inline error + the incomplete echo both stand.
    rerender(
      <AssumptionPanel
        {...props}
        snapshot={snap(committed, { answer: { kind: 'inputs-incomplete' } })}
        missing={[{ labelKey: 'spendLabel' }]}
      />,
    )
    expect(screen.getByText(copy.errSpendZero)).toBeInTheDocument()
    expect(screen.getByText(copy.answerIncomplete)).toBeInTheDocument()
    expect(screen.getByText(`${copy.answerStillNeeded} ${copy.spendLabel}`)).toBeInTheDocument()
  })
})

// ─── OOP medical — the oopStep's atomic re-reconcile ─────────────────────────────────────

describe('OOP medical', () => {
  it('re-reconciles the spending scalar ATOMICALLY under a governing budget (ONE mutate)', () => {
    const { props } = renderPanel({ snapshot: snap(governedDraft) })
    const input = screen.getByLabelText(copy.oopLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '5000' } })
    fireEvent.blur(input)
    expect(props.onCommitEdit).toHaveBeenCalledTimes(1) // one atomic commit, never two writes
    const next = commitAndApply(props.onCommitEdit, governedDraft)
    expect(next.health.oopMedicalAnnual).toBe(5_000)
    expect(next.annualSpendingReal).toBe(45_000) // 40k lines + 5k injected floor (hand-computed)
  })

  it('with NO budget, the scalar is left alone (a plain health write)', () => {
    const { props } = renderPanel()
    const input = screen.getByLabelText(copy.oopLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '5000' } })
    fireEvent.blur(input)
    const next = commitAndApply(props.onCommitEdit, mixedDraft)
    expect(next.health.oopMedicalAnnual).toBe(5_000)
    expect(next.annualSpendingReal).toBe(96_000)
  })
})

// ─── the echo (displayed-not-raw + the two-class transition line) ────────────────────────

describe('the live answer echo', () => {
  it('reads the STICKY triple, never the raw result (divergent-fake pin: raw 8, displayed 7)', () => {
    const rawResult = { headline: { xOfTen: { value: 8 } } } as unknown as SimulationResult
    renderPanel({
      snapshot: snap(mixedDraft, {
        answer: { kind: 'headline', result: rawResult, tier: 'final' },
        displayed: shown(7),
      }),
    })
    expect(screen.getByText(`${copy.outcomeOnTrack} — ${slots.xOfTen(7)}`)).toBeInTheDocument()
    expect(screen.queryByText(new RegExp(`8 of 10`))).toBeNull()
  })

  it('the over-funded ceiling reads through the SHARED composer — "better than 9 in 10", never "9 of 10" (U12 ultramode: the echo had diverged from the hero)', () => {
    renderPanel({
      snapshot: snap(mixedDraft, {
        displayed: shown(9, { outcomeState: 'over-funded' }),
      }),
    })
    expect(
      screen.getByText(`${copy.outcomeOverFunded} — ${slots.xOfTenAtCeiling()}`),
    ).toBeInTheDocument()
    expect(screen.queryByText(new RegExp(slots.xOfTen(9)))).toBeNull()
  })

  it('the truer-picture line renders on a baseline-WORSE landing only (both arms + unchanged)', () => {
    const base = renderPanel({ snapshot: snap(mixedDraft, { displayed: shown(7) }) })
    expect(screen.queryByText(copy.assumptionTruerPicture)).toBeNull() // at open: nothing
    base.rerender(<AssumptionPanel {...base.props} snapshot={snap(mixedDraft, { displayed: shown(6) })} />)
    expect(screen.getByText(copy.assumptionTruerPicture)).toBeInTheDocument() // worse than open
    base.rerender(<AssumptionPanel {...base.props} snapshot={snap(mixedDraft, { displayed: shown(8) })} />)
    expect(screen.queryByText(copy.assumptionTruerPicture)).toBeNull() // improved — calm
    base.rerender(<AssumptionPanel {...base.props} snapshot={snap(mixedDraft, { displayed: shown(7) })} />)
    expect(screen.queryByText(copy.assumptionTruerPicture)).toBeNull() // back to baseline — calm
  })

  it('the inputs-incomplete arm names what’s missing; the quiet arm covers the no-verdict states', () => {
    const incomplete = renderPanel({
      snapshot: snap(mixedDraft, { answer: { kind: 'inputs-incomplete' } }),
      missing: [{ labelKey: 'spendLabel' }],
    })
    expect(screen.getByText(copy.answerIncomplete)).toBeInTheDocument()
    expect(screen.getByText(`${copy.answerStillNeeded} ${copy.spendLabel}`)).toBeInTheDocument()
    incomplete.unmount()
    renderPanel({ snapshot: snap(mixedDraft) }) // idle, displayed null → the quiet arm
    expect(screen.getByText(copy.assumptionEchoQuiet)).toBeInTheDocument()
  })
})

// ─── the market block + the standing floor line (F8) ─────────────────────────────────────

describe('the market disclosure block', () => {
  it('renders the LIVE productionMarket figures (5%/18% stocks · 1%/6% bonds · 3% inflation) with provenance', () => {
    renderPanel()
    expect(screen.getByText(slots.assumptionMarketStocks('5%', '18%'))).toBeInTheDocument()
    expect(screen.getByText(slots.assumptionMarketBonds('1%', '6%'))).toBeInTheDocument()
    expect(screen.getByText(slots.assumptionMarketInflation('3%'))).toBeInTheDocument()
    expect(screen.getByText(copy.assumptionMarketProvenance)).toBeInTheDocument()
  })

  it('the market-floor line is STATIC — present with and without a standing verdict', () => {
    const first = renderPanel({ snapshot: snap(mixedDraft, { displayed: shown(7) }) })
    expect(screen.getByText(copy.assumptionMarketFloorNote)).toBeInTheDocument()
    first.unmount()
    renderPanel({ snapshot: snap(mixedDraft, { answer: { kind: 'inputs-incomplete' } }) })
    expect(screen.getByText(copy.assumptionMarketFloorNote)).toBeInTheDocument()
  })
})

// ─── the period toggle (re-label, never re-base) ─────────────────────────────────────────

describe('the entry-period row', () => {
  it('HIDDEN while a budget governs (the period is inert there)', () => {
    renderPanel({ snapshot: snap(governedDraft) })
    expect(screen.queryByText(copy.assumptionPeriodLegend)).toBeNull()
  })

  it('re-LABELS the committed figure — the canonical annual NEVER re-bases (the silent-12× guard)', () => {
    const { props } = renderPanel()
    fireEvent.click(screen.getByLabelText(copy.periodYear))
    const next = commitAndApply(props.onCommitEdit, mixedDraft)
    expect(next.spendEntryPeriod).toBe('year')
    expect(next.annualSpendingReal).toBe(96_000) // unchanged — the amount is the truth
  })
})

// ─── via-sheet + via-intake routing (one editor home per fact) ───────────────────────────

describe('via-sheet and via-intake rows', () => {
  it('drawdown / roth / regime rows show the CURRENT value and route to their sheets', () => {
    const { props } = renderPanel()
    expect(screen.getByText(copy.leverPolicyProportional)).toBeInTheDocument()
    expect(screen.getByText(copy.assumptionNoneApplied)).toBeInTheDocument() // no conversion applied
    expect(screen.getByText(copy.leverHealthRegimeReverted)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.leverSequencingCta }))
    fireEvent.click(screen.getByRole('button', { name: copy.leverRothDoorCta }))
    fireEvent.click(screen.getByRole('button', { name: copy.leverHealthDoorCta }))
    expect(props.onOpenSequencing).toHaveBeenCalledTimes(1)
    expect(props.onOpenRoth).toHaveBeenCalledTimes(1)
    expect(props.onOpenHealth).toHaveBeenCalledTimes(1)
    expect(props.onCommitEdit).not.toHaveBeenCalled() // routing writes nothing
  })

  it('an applied conversion echoes through the ONE plan-echo slot, naming the CALENDAR year (U17 §S1)', () => {
    const withPlan = draftWith(() => ({
      ...mixedDraft,
      rothConversion: { annualAmountReal: 40_000, startYearOffset: 2, years: 5 },
    }))
    renderPanel({ snapshot: snap(withPlan) })
    // Fresh anchor (built 2026, wall 2026): offset 2 = 2028, upcoming.
    expect(screen.getByText(slots.rothPlanEcho(formatMoney(40_000), 2028, false, 5))).toBeInTheDocument()
    expect(screen.getByText(/starting in 2028/)).toBeInTheDocument()
  })

  it('AGED: a mid-flight conversion reads "started in <year>" — never a future-tense claim about a passed date', () => {
    // Built 2024, wall 2026 (the ?vault=stale shape): offset 1 = 2025, already behind the wall.
    // The old "starting in about a year" misstated this start by exactly the plan clock — the
    // U17 §S1 defect this arm witnesses. Mutation-proven: flipping the slot's tense arms or
    // handing the echo the raw offset reds it.
    const withPlan = draftWith(() => ({
      ...mixedDraft,
      rothConversion: { annualAmountReal: 40_000, startYearOffset: 1, years: 10 },
    }))
    renderPanel({ snapshot: snap(withPlan), savedAnchor: planClockAnchor(2024, 2026) })
    expect(screen.getByText(slots.rothPlanEcho(formatMoney(40_000), 2025, true, 10))).toBeInTheDocument()
    expect(screen.getByText(/started in 2025/)).toBeInTheDocument()
    expect(screen.queryByText(/starting in/)).toBeNull()
    expect(screen.queryByText(/in about/)).toBeNull()
  })

  it('AGED boundary: a start in the CURRENT wall year is upcoming, not history (the strict predicate)', () => {
    const withPlan = draftWith(() => ({
      ...mixedDraft,
      rothConversion: { annualAmountReal: 40_000, startYearOffset: 2, years: 5 },
    }))
    // Built 2024, wall 2026: offset 2 IS this year — "starting in 2026", present tense.
    renderPanel({ snapshot: snap(withPlan), savedAnchor: planClockAnchor(2024, 2026) })
    expect(screen.getByText(slots.rothPlanEcho(formatMoney(40_000), 2026, false, 5))).toBeInTheDocument()
  })

  it('the regime row stays VISIBLE but drops its edit affordance outside the priced domain (no hollow door)', () => {
    const post65 = draftWith(() => ({
      ...mixedDraft,
      people: [
        { ...mixedDraft.people[0], workStatus: 'retired' as const, retirementAge: 65, birthYear: 1958, currentAge: 68 },
        { ...mixedDraft.people[1], birthYear: 1956, currentAge: 70 },
      ],
    }))
    renderPanel({ snapshot: snap(post65) })
    expect(screen.getByText(copy.assumptionRegimeName)).toBeInTheDocument() // visible (R7)
    expect(screen.queryByRole('button', { name: copy.leverHealthDoorCta })).toBeNull() // not hollow
  })

  it('the collections row and the re-walk footer both route to onReview (the R6 jump + F4)', () => {
    const { props } = renderPanel()
    fireEvent.click(screen.getByRole('button', { name: copy.assumptionViaIntakeCta }))
    fireEvent.click(screen.getByRole('button', { name: copy.assumptionRewalkCta }))
    expect(props.onReview).toHaveBeenCalledTimes(2)
  })
})

// ─── person facts ────────────────────────────────────────────────────────────────────────

describe('per-person facts', () => {
  it('a BLANK birth year is refused with the calm inline error — undefined is never committed (R19)', () => {
    const { props } = renderPanel()
    const input = screen.getAllByLabelText(copy.birthYearLabel)[0]!
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(props.onCommitEdit).not.toHaveBeenCalled()
    expect(screen.getByText(copy.errBirthYearBlank)).toBeInTheDocument()
  })

  it('a birth-year edit re-derives currentAge in the SAME mutate (the intake derivation, mirrored)', () => {
    const { props } = renderPanel()
    const input = screen.getAllByLabelText(copy.birthYearLabel)[0]!
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '1969' } })
    fireEvent.blur(input)
    const next = commitAndApply(props.onCommitEdit, mixedDraft)
    expect(next.people[0].birthYear).toBe(1969)
    expect(next.people[0].currentAge).toBe(2026 - 1969)
  })

  it('an out-of-window SS start age is refused (62–70) with the calm inline error', () => {
    const { props } = renderPanel()
    const input = screen.getAllByLabelText(copy.assumptionSsClaimAgeLabel)[0]!
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '75' } })
    fireEvent.blur(input)
    expect(props.onCommitEdit).not.toHaveBeenCalled()
    expect(screen.getByText(copy.errSsClaimWindow)).toBeInTheDocument()
  })

  it('the SS amount edits as the MONTHLY statement figure and commits ×12 (the intake convention)', () => {
    const { props } = renderPanel()
    const inputs = screen.getAllByLabelText(copy.ssAmountLabel)
    const bea = inputs[1]! // person 1 — pia 24,000/yr displays 2,000/mo
    expect((bea as HTMLInputElement).value).toBe('2,000')
    fireEvent.focus(bea)
    fireEvent.change(bea, { target: { value: '2500' } })
    fireEvent.blur(bea)
    expect(commitAndApply(props.onCommitEdit, mixedDraft).people[1].pia).toBe(30_000)
  })

  it('the stop-age row exists ONLY for a retired member (a working member’s date IS the answer)', () => {
    renderPanel()
    expect(screen.getAllByLabelText(copy.stopAgeLabel)).toHaveLength(1)
  })

  it('working-year investment commits through the ONE hole-free write shape (retired slot stays zeroed)', () => {
    const { props } = renderPanel()
    const input = screen.getByLabelText(copy.workInvestmentLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '2000' } })
    fireEvent.blur(input)
    const next = commitAndApply(props.onCommitEdit, mixedDraft)
    expect(next.health.workingYearInvestmentByPerson).toEqual([2_000, 0])
  })
})

// ─── the escape contract (insight 067 — scaffold-owned choreography, called out here) ─────

describe('Escape / Close', () => {
  it('Escape closes; the quiet Close closes — and neither is a cancel (edits were per-field commits)', () => {
    const { props } = renderPanel()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(props.onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: copy.leverCancel }))
    expect(props.onClose).toHaveBeenCalledTimes(2)
    expect(props.onCommitEdit).not.toHaveBeenCalled() // leaving neither commits nor un-commits
  })
})

// ─── the retirement-state row (the state-tax unit S3 — the changeable best guess) ─────────────
describe('the retirement-state row', () => {
  it('renders the 4 honest picker arms and commits a re-pick through commitOpen (edit → re-run)', () => {
    const { props } = renderPanel() // mixedDraft: retirementState undefined
    for (const label of [copy.stateOptionNC, copy.stateOptionPA, copy.stateOptionFL, copy.stateOptionElsewhere]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    // The shared SegmentedControl fires onChange + onClick (the idempotent double-write the
    // period-toggle relies on), so assert the COMMITTED value from the last call, not a count.
    fireEvent.click(screen.getByLabelText(copy.stateOptionPA))
    expect(props.onCommitEdit).toHaveBeenCalled()
    expect(commitAndApply(props.onCommitEdit, mixedDraft).retirementState).toBe('PA')
  })

  it('an UNANSWERED household shows the honest not-set note and no active arm (never a fabricated default)', () => {
    renderPanel() // mixedDraft: retirementState undefined
    expect(screen.getByText(copy.assumptionStateUnsetNote)).toBeInTheDocument()
    expect((screen.getByLabelText(copy.stateOptionNC) as HTMLInputElement).checked).toBe(false)
  })

  // O16 pre-walk chair fix (2026-07-17): the GOVERNED face reads the BUDGET twin — the base
  // note's kept-inside conditional sat under the spend row's "all in — set by your budget"
  // completeness claim, priming a rosier self-grade for a household whose budget flow offers
  // no tax category; the twin names the budget-line mechanism instead. Both directions pinned
  // (the swapped-ternary mutant goes red on either arm).
  it('a GOVERNED unanswered household reads the budget twin, never the kept-inside base note', () => {
    renderPanel({ snapshot: snap(governedDraft) }) // budget governs; retirementState undefined
    expect(screen.getByText(copy.assumptionStateUnsetNoteBudget)).toBeInTheDocument()
    expect(screen.queryByText(copy.assumptionStateUnsetNote)).toBeNull()
  })

  it('an UNGOVERNED unanswered household never reads the budget twin', () => {
    renderPanel() // mixedDraft: no budget
    expect(screen.queryByText(copy.assumptionStateUnsetNoteBudget)).toBeNull()
  })

  it('an ANSWERED household shows the picked state as the active arm and drops the not-set note', () => {
    const withState = draftWith(() => ({ ...mixedDraft, retirementState: 'NC' as const }))
    renderPanel({ snapshot: snap(withState) })
    expect((screen.getByLabelText(copy.stateOptionNC) as HTMLInputElement).checked).toBe(true)
    expect(screen.queryByText(copy.assumptionStateUnsetNote)).toBeNull()
    expect(screen.queryByText(copy.assumptionStateUnsetNoteBudget)).toBeNull()
  })
})

// ─── the spend-row help mirrors the intake (input surfaces AGREE on the draft-keyed state) ────
// The panel edits the SAME draft the intake wrote, so its ungoverned spend field must select its
// helpKey by the SAME draft-keyed predicate SpendRawFace uses (questions.tsx): a PRICED state gets
// the leave-it-OUT copy; an unpriced/absent state keeps the keep-it-INSIDE copy. The bug this pins:
// the panel hardcoded `spendHelp`, so a priced NC/PA/FL household re-editing spend here was told to
// "keep your state bill inside" — a false "isn't priced yet" claim contradicting the intake, the
// federal double-count class (insight-080: two INPUT surfaces over one draft must never disagree).
describe('the spend-row help — draft-keyed, mirroring the intake', () => {
  it.each(['NC', 'PA', 'FL'] as const)(
    'a PRICED state (%s) shows the leave-it-OUT help — never the false "isn\'t priced yet" claim',
    (state) => {
      const priced = draftWith(() => ({ ...mixedDraft, retirementState: state }))
      renderPanel({ snapshot: snap(priced) })
      expect(screen.getByText(copy.spendHelpStatePriced)).toBeInTheDocument()
      expect(screen.queryByText(copy.spendHelp)).toBeNull()
    },
  )

  it("an 'elsewhere' (unpriced) state keeps the keep-it-INSIDE help verbatim (the containment boundary holds)", () => {
    const elsewhere = draftWith(() => ({ ...mixedDraft, retirementState: 'elsewhere' as const }))
    renderPanel({ snapshot: snap(elsewhere) })
    expect(screen.getByText(copy.spendHelp)).toBeInTheDocument()
    expect(screen.queryByText(copy.spendHelpStatePriced)).toBeNull()
  })

  it('an ABSENT retirementState (a pre-state / unanswered household) keeps the keep-it-INSIDE help', () => {
    renderPanel() // mixedDraft: retirementState undefined
    expect(screen.getByText(copy.spendHelp)).toBeInTheDocument()
    expect(screen.queryByText(copy.spendHelpStatePriced)).toBeNull()
  })
})
