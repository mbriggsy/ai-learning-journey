import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { offsetHasPassed, agedLadderMarks, curveMarks } from '@viz/curveMarks'
import { deriveDateBandAnnotations, deriveSpineBandAnnotations, planClockAnchor, rothPlanStartFor } from '../bandAnnotations'
import { agedBalancesYearFor, type PersistState, type ResultSaveView } from '../resultSave'
import { scenarioFromDraft } from '../scenarioFromDraft'
import { DEV_SEEDS } from '../devSeeds'
import { copy, slots } from '../copy'
import type { DateTrackOutcome } from '@shared/model'

/**
 * THE PLAN-CLOCK SEAM (Act-4 · U17 §S0, council wf_f4ced3c8-2f6) — the seam that chooses WHICH
 * clock the entire aged surface speaks, and the ONE predicate that decides whether a plan
 * stop-year has already gone by.
 *
 * WHY THIS FILE EXISTS. Two structural gaps, both verified before it was written:
 *
 *  1. The "has this offset passed?" test was RE-TYPED in three places (`curveMarks.ts`'s ladder
 *     filter, `FuckOffDate.tsx`'s crown-arrived withdraw, `dateTradeoff.ts`'s offer filter).
 *     Insight 099 is literal here — the ladder got the guard and the band was the unguarded
 *     sibling. One exported predicate now governs all of them, and the source-bind battery below
 *     reds if either spec-named consumer re-types an inline compare.
 *
 *  2. The clock itself was named `elapsedPlanYears` and read as "years since your save" — but it
 *     is derived from `startCalendarYear`, the BUILD year, written once and untouched by every
 *     re-save. Nothing asserted the seam: `Result.test.tsx` carries ZERO references to
 *     `startCalendarYear`, `savedAt`, or the clock, and every aged fixture ages BOTH clocks
 *     together (`devSeeds.ts` doctorStaleVault moves `savedAt` −760d AND `startCalendarYear` −2y,
 *     deliberately, for save-moment coherence), so the divergence could never surface. That is
 *     insight 073's class exactly: a fixture that moves two clocks in lockstep cannot witness a
 *     bug that lives in their difference. The RE-SAVER arm below is the witness it lacked.
 */

// ── the seam's own re-saver fixture: fresh save, OLD plan ────────────────────────────────────
const day = (y: number, m: number, d: number): number => Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
const TODAY = day(2026, 7, 24)
const WALL_YEAR = 2026
const BUILT_YEAR = 2024

/** The household U17 §S0.3 names: they BUILT the plan in 2024 and re-saved it FIVE MINUTES AGO.
 *  Their plan clock is 2 (the band re-bases); their balances are today's (no aged-balances
 *  clause). Every shipped aged fixture makes these two agree — this one deliberately splits
 *  them, which is the whole point. */
function reSaver(): PersistState {
  const ready = scenarioFromDraft(DEV_SEEDS.retired)
  if (!ready.ready) throw new Error('DEV_SEEDS.retired should be a ready draft')
  return {
    kind: 'saved',
    scenario: { ...ready.scenario, startCalendarYear: BUILT_YEAR, savedAt: TODAY },
  }
}

const CLEAN: ResultSaveView = { kind: 'clean' }
/**
 * THE SHIPPED MINT — not a copy of it.
 *
 * This helper used to re-type `Math.max(0, WALL_YEAR - startCalendarYear)` under a comment
 * claiming it matched `Result.tsx`. The U17 §S0 verifier planted `+ 3` in the component and
 * 1096 tests stayed green: the seam the whole stage exists to guard was still unasserted,
 * because a comment is not a bind (insight 032) and a re-derived producer forks (insight 081).
 * It now calls the ONE exported mint the component calls.
 */
const anchorFor = (scenario: { readonly startCalendarYear: number }) =>
  planClockAnchor(scenario.startCalendarYear, WALL_YEAR)

describe('U17 §S0.3 — the RE-SAVER: a fresh save over an old plan', () => {
  it('the band year-0 marker names the BUILD YEAR and claims nothing about the save, while the aged-balances clause is simultaneously ABSENT', () => {
    const persist = reSaver()
    if (persist.kind !== 'saved') throw new Error('fixture should be a saved persist state')
    const anchor = anchorFor(persist.scenario)
    expect(anchor.yearsSincePlanBuilt).toBe(2) // the PLAN is two years old…

    const yearZero = deriveSpineBandAnnotations(66, 64, 30, anchor)[0]!
    expect(yearZero.id).toBe('built')
    expect(yearZero.label).toBe(copy.bandClockBuiltLabel)
    // The BUILD year is NAMED, in-sentence (never left for the reader to derive from the ages).
    expect(yearZero.description).toBe(slots.bandClockBuiltDesc(BUILT_YEAR, 66, 64))
    expect(yearZero.description).toContain(String(BUILT_YEAR))
    // …and NOTHING on that column claims to be the save. This household saved minutes ago; the
    // old 'Your save' / "When you saved this" wording was flatly false for them AND contradicted
    // the fresh "Saved to this device" badge sitting on the same screen.
    expect(yearZero.label).not.toMatch(/save/i)
    expect(yearZero.description).not.toMatch(/save/i)

    // The OTHER half of the same breath: the save is FRESH, so the balances-vintage clause makes
    // no claim at all. The two rails now disagree correctly — that disagreement is the fixture.
    expect(agedBalancesYearFor(persist, CLEAN, TODAY)).toBeUndefined()
  })

  it('the DATE route tells the same household the same story (both derivers, one label law)', () => {
    const persist = reSaver()
    if (persist.kind !== 'saved') throw new Error('fixture should be a saved persist state')
    const yearZero = deriveDateBandAnnotations(58, 59, 4, 40, anchorFor(persist.scenario))[0]!
    expect(yearZero.id).toBe('built')
    expect(yearZero.label).toBe(copy.bandClockBuiltLabel)
    expect(yearZero.description).toBe(slots.bandClockBuiltDesc(BUILT_YEAR, 58, 59))
    expect(yearZero.description).not.toMatch(/save/i)
  })

  it('the MIRROR household (built AND saved two years ago) still gets its aged-balances clause — the rename never silenced a true claim', () => {
    // Non-vacuity (burned/070): the arm above passes trivially if agedBalancesYearFor were
    // broken to always suppress. Same plan clock, an OLD save — the clause fires.
    const ready = scenarioFromDraft(DEV_SEEDS.retired)
    if (!ready.ready) throw new Error('DEV_SEEDS.retired should be a ready draft')
    const oldSaver: PersistState = {
      kind: 'saved',
      scenario: { ...ready.scenario, startCalendarYear: BUILT_YEAR, savedAt: day(2024, 6, 1) },
    }
    expect(agedBalancesYearFor(oldSaver, CLEAN, TODAY)).toBe(BUILT_YEAR)
    // …and this household's band year-0 marker is IDENTICAL to the re-saver's: the CHART reads
    // the plan clock, the CLAUSE reads the save clock, and neither borrows the other's. Two
    // households whose saves are two years apart get the same axis, because their PLANS are the
    // same age — which is exactly the fact that column states.
    const persist = reSaver()
    if (persist.kind !== 'saved') throw new Error('fixture should be a saved persist state')
    expect(deriveSpineBandAnnotations(66, 64, 30, anchorFor(oldSaver.scenario))[0]).toEqual(
      deriveSpineBandAnnotations(66, 64, 30, anchorFor(persist.scenario))[0],
    )
  })
})

describe('U17 §S0.1 — ONE exported arrived predicate, consumed (never re-typed)', () => {
  const read = (rel: string): string => readFileSync(resolve(__dirname, rel), 'utf8')

  it('is STRICT: a stop-year equal to the plan clock is TODAY, not history', () => {
    expect(offsetHasPassed(1, 2)).toBe(true) // last year — gone
    expect(offsetHasPassed(2, 2)).toBe(false) // today — still a choice ("stopping today")
    expect(offsetHasPassed(3, 2)).toBe(false) // next year
    expect(offsetHasPassed(0, 0)).toBe(false) // the fresh identity: nothing has ever passed
  })

  it('the LADDER consumes it — one export, no inline compare in the filter (a re-typed compare reds this)', () => {
    const src = read('../../viz/curveMarks.ts')
    expect((src.match(/export function offsetHasPassed/g) ?? []).length, 'exactly ONE export').toBe(1)
    expect(src, 'the ladder filter calls the predicate').toMatch(
      /\.filter\(\(m\) => !offsetHasPassed\(m\.planOffsetYears, yearsSincePlanBuilt\)\)/,
    )
    const filterLine = src.split('\n').find((l) => l.includes('.filter((m) =>')) ?? ''
    expect(filterLine, 'never a re-typed inline compare').not.toMatch(/planOffsetYears\s*[<>]=?/)
  })

  it('RESULT consumes the ONE mint — the component never re-types the plan-clock arithmetic', () => {
    // THE MUTANT THIS KILLS, verbatim from the U17 §S0 verifier: `... - startCalendarYear + 3`
    // planted in the component left 1096 tests green, because the seam test had copied the
    // arithmetic instead of binding to it. Calling `planClockAnchor` from this file is only half
    // the fix — it proves the FUNCTION is right, never that the COMPONENT still calls it. This
    // arm is the other half.
    const src = read('../Result.tsx')
    expect(src, 'the mint is imported, not re-declared').toMatch(
      /import \{ planClockAnchor \} from '\.\/bandAnnotations'/,
    )
    expect(src, 'the anchor is minted by the shared producer').toMatch(
      /planClockAnchor\(\s*snapshot\.draft\.startCalendarYear,\s*epochDayToCalendarYear\(currentEpochDay\(\)\),?\s*\)/,
    )
    expect(src, 'never a re-typed subtraction against the build year').not.toMatch(
      /-\s*startCalendarYear/,
    )
  })

  it('the BAND/HERO crown-arrived withdraw consumes the SAME export — never its own compare', () => {
    const src = read('../FuckOffDate.tsx')
    expect(src, 'the predicate is imported from the ladder module, not re-declared').toMatch(
      /import \{[^}]*offsetHasPassed[^}]*\} from '@viz\/curveMarks'/,
    )
    expect(src, 'the withdraw calls the predicate').toMatch(
      /offsetHasPassed\(heroTrack\.offsetYears, yearsSinceBuilt\)/,
    )
    // The exact shipped drift this kills: `heroTrack.offsetYears < elapsedYears`, re-typed
    // beside a ladder that had already been given the guard (insight 099).
    expect(src, 'never a re-typed inline compare').not.toMatch(/offsetYears\s*[<>]=?\s*(years|elapsed)/)
  })

  it('the TRADEOFF offer filter consumes it too — the third re-typing, found during the build', () => {
    // The spec's §S0.1 enumerated two call sites; the builder found a third carrying the same
    // arithmetic (`r.offsetYears - elapsedYears < 0`) and re-pointed it. Left unasserted it is
    // exactly the unguarded sibling this unit exists to kill (insight 099) — the guard on two of
    // three consumers protects neither of the others.
    const src = read('../dateTradeoff.ts')
    expect(src, 'the predicate is imported, not re-declared').toMatch(
      /import \{[^}]*offsetHasPassed[^}]*\} from '@viz\/curveMarks'/,
    )
    expect(src, 'the offer filter calls the predicate').toMatch(
      /offsetHasPassed\(r\.offsetYears, yearsSincePlanBuilt\)/,
    )
    expect(src, 'never a re-typed inline compare against the plan clock').not.toMatch(
      /offsetYears\s*-\s*(years|elapsed)\w*\s*[<>]=?/,
    )
  })

  it('the Roth echo start rides the SAME predicate + the anchor arithmetic, in ONE producer (U17 §S1)', () => {
    // Behavior: the calendar year is the anchor's build year + the sim-year-0 offset —
    // wall-time-stable (the sentence never changes as time passes) — and `passed` is the strict
    // §S0.1 arrived test, so a start in the current wall year is upcoming, never history.
    const fresh = planClockAnchor(2026, 2026)
    expect(rothPlanStartFor(fresh, 2)).toEqual({ year: 2028, passed: false })
    expect(rothPlanStartFor(fresh, 0)).toEqual({ year: 2026, passed: false })
    const aged = planClockAnchor(2024, 2026) // the ?vault=stale shape: plan clock 2
    expect(rothPlanStartFor(aged, 1)).toEqual({ year: 2025, passed: true }) // behind the wall — history
    expect(rothPlanStartFor(aged, 2)).toEqual({ year: 2026, passed: false }) // THIS year — strict boundary
    expect(rothPlanStartFor(aged, 4)).toEqual({ year: 2028, passed: false })
    // A negative offset (a year before the build year) is passed too — the write side leans on
    // this to refuse pre-build starts through the ONE predicate, no second compare.
    expect(rothPlanStartFor(fresh, -6)).toEqual({ year: 2020, passed: true })
  })

  it('BOTH echo render sites consume the ONE start producer — never re-typed year arithmetic (U17 §S1)', () => {
    // The §S0 lesson applied forward: the slot speaking (year, passed) proves nothing about the
    // CALLERS — a render site could re-type `startCalendarYear + offset` and drift. Bind both.
    const producer = read('../bandAnnotations.ts')
    expect((producer.match(/export function rothPlanStartFor/g) ?? []).length, 'exactly ONE producer').toBe(1)
    expect(producer, 'the producer rides the §S0.1 predicate, not its own compare').toMatch(
      /passed: offsetHasPassed\(startYearOffset, anchor\.yearsSincePlanBuilt\)/,
    )

    const panel = read('../../intake/AssumptionPanel.tsx')
    expect(panel, 'the panel row derives through the producer').toMatch(
      /rothPlanStartFor\(savedAnchor, draft\.rothConversion\.startYearOffset\)/,
    )
    expect(panel, 'the panel never hands the echo a raw offset or its own year sum').not.toMatch(
      /rothPlanEcho\([^)]*startYearOffset/,
    )

    const lever = read('../../intake/RothLever.tsx')
    expect(lever, 'the sheet echo derives through the producer').toMatch(
      /rothPlanStartFor\(savedAnchor, candidate\.startYearOffset\)/,
    )
    expect(lever, 'the applied re-seed maps offset → year through the SAME producer').toMatch(
      /rothPlanStartFor\(savedAnchor, applied\.startYearOffset\)\.year/,
    )
    expect(lever, 'the write-side past refusal rides the §S0.1 predicate').toMatch(
      /offsetHasPassed\(p\.startYear - anchor\.startCalendarYear, anchor\.yearsSincePlanBuilt\)/,
    )
  })

  it('the two consumers AGREE at the boundary by construction (the behavioral half of the bind)', () => {
    // Same track, same clock: at crown == plan clock the ladder keeps a mark at display 0 AND
    // the withdraw predicate reads false — the pair that `FuckOffDate.test.tsx:208-212` pins on
    // the rendered surface, asserted here at the seam so a future split is caught upstream.
    const track: DateTrackOutcome = {
      kind: 'confirmed-date',
      offsetYears: 4,
      grade: { quantizedLowerBound: 0.9, survivalFraction: 0.93, marginAboveBar: 0.05 },
      nonMonotoneOffsets: [],
      curve: [0, 2, 4, 6].map((offsetYears) => ({
        offsetYears,
        quantizedLowerBound: offsetYears >= 4 ? 0.9 : 0.8,
        survivalFraction: offsetYears >= 4 ? 0.93 : 0.83,
        clears: offsetYears >= 4,
      })),
    }
    expect(offsetHasPassed(track.offsetYears, 4)).toBe(false)
    expect(agedLadderMarks(curveMarks(track), 4).some((m) => m.offsetYears === 0 && m.isCrown)).toBe(true)
    // one year later the crown is history on BOTH rails at once
    expect(offsetHasPassed(track.offsetYears, 5)).toBe(true)
    expect(agedLadderMarks(curveMarks(track), 5).some((m) => m.isCrown)).toBe(false)
  })
})
