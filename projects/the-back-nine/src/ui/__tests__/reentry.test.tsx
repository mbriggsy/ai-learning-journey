// @vitest-environment jsdom
/**
 * P3·U13 — the re-entry gate's composition + surface battery.
 *
 * `composeReentry` (the pure seam, insight 048): per-bucket read-back grouped EXACTLY the
 * way the engine buckets (KIND_TO_BUCKET — a drifted grouping would front the answer with
 * figures the plan doesn't stand on), the SS fold-in in the monthly frame the intake asked
 * in, the per-clock note lines, and the suppressed-never-fabricated wall-time line.
 *
 * `ReEntry` (the surface): heading-as-focus-target on mount, the affirm/update pair, the
 * read-only Continue-only arm, and the prompt-not-attestation shape (no checkbox, no
 * "confirmed" language anywhere).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { composeReentry } from '../reentryChrome'
import { ReEntry } from '../ReEntry'
import { heroLead, floorLineText } from '../FuckOffDate'
import { dateOddsText } from '../dateOdds'
import type { DateSplitView } from '../dateSplit'
import { scenarioFromDraft, currentEpochDay } from '../scenarioFromDraft'
import { DEV_SEEDS } from '../devSeeds'
import { deriveStaleness } from '@store/staleness'
import { copy, slots } from '../copy'
import type { ScenarioV3 } from '@shared/model'
import type { DateTrackOutcome } from '@shared/model'

afterEach(cleanup)

const freshSave = (): ScenarioV3 => {
  const r = scenarioFromDraft(DEV_SEEDS.retired)
  if (!r.ready) throw new Error('retired seed must be save-ready')
  return r.scenario
}
const TODAY = currentEpochDay()
const reportFor = (s: ScenarioV3) => deriveStaleness(s, TODAY)

describe('composeReentry — the read-back', () => {
  it('sums balances per ENGINE bucket and omits empty buckets (retired: pretax only; date: pretax + roth — never a noise "$0 Roth" row)', () => {
    // The retired seed carries ONE traditional IRA — exactly one row, the pre-tax sum.
    const s = freshSave()
    const view = composeReentry(s, reportFor(s))
    expect(view.balanceRows.map((r) => r.label)).toEqual([copy.reentryBucketPretax])
    const pretaxTotal = s.enteredAccounts
      .filter((a) => ['401k', '403b', 'traditional-ira'].includes(a.kind))
      .reduce((t, a) => t + a.valueToday, 0)
    expect(view.balanceRows[0]!.value).toBe(`$${Math.round(pretaxTotal).toLocaleString('en-US')}`)
    // The date seed carries a 401k + a roth-ira — two rows, grouped by the engine's own map.
    const d = scenarioFromDraft(DEV_SEEDS.date)
    if (!d.ready) throw new Error('date seed must be save-ready')
    const dView = composeReentry(d.scenario, reportFor(d.scenario))
    expect(dView.balanceRows.map((r) => r.label)).toEqual([
      copy.reentryBucketPretax,
      copy.reentryBucketRoth,
    ])
  })

  it('reads the SS fold-in back MONTHLY (pia is persisted annual ×12 — the read-back must speak the frame the statement asked in)', () => {
    const s = freshSave()
    const view = composeReentry(s, reportFor(s))
    expect(view.benefitRows).toHaveLength(2)
    const [p0, p1] = s.people
    expect(view.benefitRows[0]).toEqual({
      label: p0!.name,
      value: slots.reentryBenefitMonthly(Math.round(p0!.pia / 12).toLocaleString('en-US')),
    })
    expect(view.benefitRows[1]!.label).toBe(p1!.name)
  })

  it('a fresh save composes NO note lines and NO elapsed line (nothing moved, saved today)', () => {
    const s = freshSave()
    const view = composeReentry(s, reportFor(s))
    expect(view.noteLines).toEqual([])
    expect(view.elapsedLine).toBeNull()
  })

  it('fired clocks are NAMED, one line each; an expired budget window quotes its calendar boundary', () => {
    const s = freshSave()
    const doctored: ScenarioV3 = {
      ...s,
      taxVintageDetail: { taxYear: 2019, legalBasis: 'TCJA (pre-OBBBA)' },
      healthcareVintage: { ...s.healthcareVintage!, coverageYear: 2019 },
      budget: [
        { category: 'travel', label: 'Travel', tier: 'discretionary', annualAmountReal: 8_000, startYear: 0, endYear: 0 },
      ] as ScenarioV3['budget'],
      // An AGED vault: the plan started 2 calendar years back (the budget window anchors on
      // startCalendarYear — a spine household's year 0 is the plan's own start) and the save
      // is ~2 years old (the elapsed line reads off savedAt).
      startCalendarYear: s.startCalendarYear - 2,
      savedAt: TODAY - 730,
    } as ScenarioV3
    const view = composeReentry(doctored, reportFor(doctored))
    expect(view.noteLines).toContain(copy.stalenessTax)
    expect(view.noteLines).toContain(copy.stalenessHealthcare)
    expect(
      view.noteLines.some((l) => l === slots.stalenessBudgetLine(doctored.startCalendarYear)),
    ).toBe(true)
    expect(view.elapsedLine).toBe(slots.reentryElapsedYears(2))
  })

  // S5.4 — the state-tax staleness clock's own named line: a PRICED household (NC) whose own
  // state profile drifted since save gets `stalenessStateTax` at the re-entry gate (never aliased
  // onto stalenessTax — the two clocks fire independently).
  it('S5: a priced household whose state rules moved gets the state-tax staleness line, named', () => {
    const s = freshSave()
    const drifted: ScenarioV3 = {
      ...s,
      retirementState: 'NC',
      stateTaxVintage: { ...s.stateTaxVintage!, ncProfile: '{"drifted":"nc"}' },
    }
    const report = reportFor(drifted)
    expect(report.controls.stateTaxMoved, 'the state clock fired').toBe(true)
    const view = composeReentry(drifted, report)
    expect(view.noteLines).toContain(copy.stalenessStateTax)
  })

  it("S5: an 'elsewhere' vault whose stamp drifted fires NO state-tax line (nothing state-priced to stale)", () => {
    const s = freshSave()
    const drifted: ScenarioV3 = {
      ...s,
      retirementState: 'elsewhere',
      stateTaxVintage: { ...s.stateTaxVintage!, ncProfile: '{"drifted":"nc"}' },
    }
    const view = composeReentry(drifted, reportFor(drifted))
    expect(view.noteLines).not.toContain(copy.stalenessStateTax)
  })

  it('two expired windows sharing an end year collapse to ONE line (the copy quotes only the year — twins would render byte-identical sentences and collide on the render key)', () => {
    const s = freshSave()
    const doctored: ScenarioV3 = {
      ...s,
      budget: [
        { category: 'travel', label: 'Travel', tier: 'discretionary', annualAmountReal: 8_000, startYear: 0, endYear: 0 },
        { category: 'gifts', label: 'Gifts', tier: 'discretionary', annualAmountReal: 2_000, startYear: 0, endYear: 0 },
        { category: 'other', label: 'Boat', tier: 'discretionary', annualAmountReal: 4_000, startYear: 0, endYear: 1 },
      ] as ScenarioV3['budget'],
      startCalendarYear: s.startCalendarYear - 3,
    } as ScenarioV3
    const view = composeReentry(doctored, reportFor(doctored))
    const budgetLines = view.noteLines.filter((l) => l.includes('budget'))
    expect(budgetLines).toEqual([
      slots.stalenessBudgetLine(doctored.startCalendarYear), // travel + gifts, ONE line
      slots.stalenessBudgetLine(doctored.startCalendarYear + 1), // the boat's own year
    ])
  })

  it('the fund-snapshot clock on an all-retired household speaks the ROUTE-TRUE line — never "your date" to a household with no date (ultramode 2026-07-09)', () => {
    const s = freshSave() // all-retired
    const blendMoved = { ...s, dateVintage: { ...s.dateVintage!, blendSnapshotAsOf: '2019-01-01' } }
    const view = composeReentry(blendMoved, reportFor(blendMoved))
    expect(view.noteLines).toContain(copy.stalenessBlendSpine)
    expect(view.noteLines).not.toContain(copy.stalenessDate)
    // The date-route household keeps the date wording.
    const d = scenarioFromDraft(DEV_SEEDS.date)
    if (!d.ready) throw new Error('date seed must be save-ready')
    const dMoved = { ...d.scenario, dateVintage: { ...d.scenario.dateVintage!, blendSnapshotAsOf: '2019-01-01' } }
    const dView = composeReentry(dMoved, reportFor(dMoved))
    expect(dView.noteLines).toContain(copy.stalenessDate)
    expect(dView.noteLines).not.toContain(copy.stalenessBlendSpine)
  })

  it('the wall-time line is SUPPRESSED without savedAt and under a year — never fabricated', () => {
    const s = freshSave()
    const anchorless = { ...s } as Record<string, unknown>
    delete anchorless.savedAt
    expect(composeReentry(anchorless as unknown as ScenarioV3, reportFor(anchorless as unknown as ScenarioV3)).elapsedLine).toBeNull()
    const recent = { ...s, savedAt: TODAY - 120 }
    expect(composeReentry(recent, reportFor(recent)).elapsedLine).toBeNull()
  })

  it('the intro speaks ROUTE-TRUE (Caddie card #1): "benefit checks" for an all-retired household, "paychecks" only where paychecks exist', () => {
    // The retired spine household: no paychecks — the spouse walker's primary stumble was
    // the route-blind intro ("does this thing even know we stopped working?").
    const s = freshSave()
    expect(composeReentry(s, reportFor(s)).introKey).toBe('reentryIntroRetired')
    // The still-working date household keeps the original register.
    const d = scenarioFromDraft(DEV_SEEDS.date)
    if (!d.ready) throw new Error('date seed must be save-ready')
    expect(composeReentry(d.scenario, reportFor(d.scenario)).introKey).toBe('reentryIntro')
  })

  it('the wall-time line rounds HALF, never floors (Caddie O6): a 700-day save reads "about 2 years", not the rosier "about a year"', () => {
    const s = freshSave()
    const at = (days: number) => {
      const aged = { ...s, savedAt: TODAY - days }
      return composeReentry(aged, reportFor(aged)).elapsedLine
    }
    // The filed witness: 700 days = 1.92y — the old floor read "about a year ago" (rosier
    // direction on the one line whose job is "your save is older than you think").
    expect(at(700)).toBe(slots.reentryElapsedYears(2))
    // The suppression gate is day-based and unchanged: 364d silent, 365d speaks.
    expect(at(364)).toBeNull()
    expect(at(365)).toBe(slots.reentryElapsedYears(1))
    // Round-half boundary, hand-derived: 547d = 1.499y → 1; 548d = 1.501y → 2. "About" is
    // honest within ±half a year in BOTH directions — the floor's error was one-sided.
    expect(at(547)).toBe(slots.reentryElapsedYears(1))
    expect(at(548)).toBe(slots.reentryElapsedYears(2))
    // The ?vault=stale plant's own witness (savedAt −760d): reads "about 2 years ago"
    // under BOTH roundings — the fit gate's pinned gate text does not move.
    expect(at(760)).toBe(slots.reentryElapsedYears(2))
  })
})

describe('ReEntry — the surface', () => {
  const baseView = () => {
    const s = freshSave()
    return composeReentry(s, reportFor(s))
  }

  it('moves focus to the heading on mount (the intake focus law — the heading IS the announcement)', () => {
    render(<ReEntry view={baseView()} readOnly={false} onAffirm={() => {}} onUpdate={() => {}} />)
    expect(screen.getByRole('heading', { name: copy.reentryHeading })).toHaveFocus()
  })

  it('writable: affirm-first pair, each wired to its own callback', () => {
    const onAffirm = vi.fn()
    const onUpdate = vi.fn()
    render(<ReEntry view={baseView()} readOnly={false} onAffirm={onAffirm} onUpdate={onUpdate} />)
    const buttons = screen.getAllByRole('button')
    // Affirm renders FIRST (the primary path leads; the change route is the quiet second).
    expect(buttons[0]).toHaveTextContent(copy.reentryAffirmCta)
    fireEvent.click(screen.getByRole('button', { name: copy.reentryAffirmCta }))
    expect(onAffirm).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: copy.reentryUpdateCta }))
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('read-only: Continue only — no update affordance, and the read-back still discloses', () => {
    render(<ReEntry view={baseView()} readOnly onAffirm={() => {}} onUpdate={() => {}} />)
    expect(screen.getByRole('button', { name: copy.reentryContinueCta })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.reentryUpdateCta })).toBeNull()
    expect(screen.getByText(copy.reentryBalancesLegend)).toBeInTheDocument()
  })

  it('a PROMPT, never an attestation: no checkbox, and no "confirm" wording anywhere on the surface (R19 — a reflexive tap must not read as a freshness claim)', () => {
    const { container } = render(
      <ReEntry view={baseView()} readOnly={false} onAffirm={() => {}} onUpdate={() => {}} />,
    )
    expect(container.querySelector('input[type="checkbox"]')).toBeNull()
    expect(container.textContent!.toLowerCase()).not.toContain('confirm')
  })
})

describe('heroLead — the U13 wall-time anchor (the date answer must not decay silently)', () => {
  const dated: DateTrackOutcome = {
    kind: 'date',
    offsetYears: 7,
    grade: { quantizedLowerBound: 0.9 },
    unconfirmed: false,
  } as unknown as DateTrackOutcome

  it('un-anchored (the preview harness): the legacy relative framing, unchanged', () => {
    expect(heroLead(dated, 30)).toBe(slots.dateInYears(7))
  })

  it('anchored at elapsed 0 (every fresh session): the relative count is UNCHANGED and the calendar label rides along', () => {
    expect(heroLead(dated, 30, { startCalendarYear: 2026, elapsedPlanYears: 0 })).toBe(
      slots.dateInYearsAnchored(7, 2033),
    )
  })

  it('anchored on an AGED vault: the count re-derives from TODAY while the calendar label holds (never a replayed save-day count)', () => {
    expect(heroLead(dated, 30, { startCalendarYear: 2026, elapsedPlanYears: 3 })).toBe(
      slots.dateInYearsAnchored(4, 2033),
    )
  })

  it('the arrived arm: wall time caught up — the plan states its own calendar, never a fresh "stop now" verdict', () => {
    expect(heroLead(dated, 30, { startCalendarYear: 2026, elapsedPlanYears: 7 })).toBe(
      slots.dateInYearsPast(2033),
    )
    expect(heroLead(dated, 30, { startCalendarYear: 2026, elapsedPlanYears: 9 })).toBe(
      slots.dateInYearsPast(2033),
    )
  })

  it('offset 0 stays the free-today claim regardless of anchor (the engine crowned NOW — no arithmetic to do)', () => {
    const now = { ...dated, offsetYears: 0 } as DateTrackOutcome
    expect(heroLead(now, 30, { startCalendarYear: 2026, elapsedPlanYears: 2 })).toBe(copy.dateFreeToday)
  })
})

describe('floorLineText — the SAME anchor as the hero (ultramode 2026-07-09: one screen, one time base)', () => {
  // The floor and hero share a screen; an anchored hero beside an un-anchored floor could
  // even invert the true floor<lifestyle ordering on an aged vault.
  const split = (floorOffset: number): Extract<DateSplitView, { kind: 'split' }> =>
    ({
      kind: 'split',
      lifestyle: { kind: 'confirmed-date', offsetYears: 7 } as unknown as DateSplitView & object,
      floor: { kind: 'covered', offsetYears: floorOffset, quantizedLowerBound: 0.8, unconfirmed: false },
      inverted: false,
    }) as unknown as Extract<DateSplitView, { kind: 'split' }>
  // The same conservative register the render composes — the render's own producer,
  // never a re-typed odds string.
  const odds = () => dateOddsText(0.8)

  it('un-anchored (the preview harness): the legacy relative framing, unchanged', () => {
    expect(floorLineText(split(5), 30)).toBe(slots.dateFloorCovered(5, odds(), false))
  })

  it('anchored at elapsed 0 (every fresh session): count unchanged, calendar label rides along', () => {
    expect(floorLineText(split(5), 30, { startCalendarYear: 2026, elapsedPlanYears: 0 })).toBe(
      slots.dateFloorCoveredAnchored(5, 2031, odds(), false),
    )
  })

  it('anchored on an AGED vault: the count re-derives from TODAY while the calendar label holds', () => {
    expect(floorLineText(split(5), 30, { startCalendarYear: 2026, elapsedPlanYears: 3 })).toBe(
      slots.dateFloorCoveredAnchored(2, 2031, odds(), false),
    )
  })

  it('the arrived arm: the essentials date has come around by the calendar — the plan states its own year', () => {
    expect(floorLineText(split(5), 30, { startCalendarYear: 2026, elapsedPlanYears: 5 })).toBe(
      slots.dateFloorCoveredPast(2031, odds(), false),
    )
    expect(floorLineText(split(5), 30, { startCalendarYear: 2026, elapsedPlanYears: 8 })).toBe(
      slots.dateFloorCoveredPast(2031, odds(), false),
    )
  })

  it('offset 0 keeps the covered-from-today claim under any anchor (covered from the plan start ⇒ still covered now)', () => {
    expect(floorLineText(split(0), 30, { startCalendarYear: 2026, elapsedPlanYears: 4 })).toBe(
      slots.dateFloorCovered(0, odds(), false),
    )
  })

  it('the no-date arms are anchor-independent (they name the window, not a count)', () => {
    const noFloor = {
      ...split(5),
      floor: { kind: 'not-within-window' },
    } as unknown as Extract<DateSplitView, { kind: 'split' }>
    expect(floorLineText(noFloor, 30, { startCalendarYear: 2026, elapsedPlanYears: 3 })).toBe(
      slots.dateFloorNotWithin(30),
    )
  })
})
