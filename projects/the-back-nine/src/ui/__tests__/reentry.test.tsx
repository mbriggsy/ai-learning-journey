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
import { heroLead } from '../FuckOffDate'
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

  it('the wall-time line is SUPPRESSED without savedAt and under a year — never fabricated', () => {
    const s = freshSave()
    const anchorless = { ...s } as Record<string, unknown>
    delete anchorless.savedAt
    expect(composeReentry(anchorless as unknown as ScenarioV3, reportFor(anchorless as unknown as ScenarioV3)).elapsedLine).toBeNull()
    const recent = { ...s, savedAt: TODAY - 120 }
    expect(composeReentry(recent, reportFor(recent)).elapsedLine).toBeNull()
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
