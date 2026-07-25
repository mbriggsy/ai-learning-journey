/**
 * Act-4 · U17 §S4 — the staleness EXPOSURE seam.
 *
 * `staleness.test.ts` proves the BUCKETING law on injected exposures. This file proves the
 * other half: that the injected value is derived from the run's OWN BUILT PARAMS and from
 * nothing else, and that the SHIPPED consumer actually routes through it. Insight 095 — probe
 * the SHIPPED decision path, not a reference path: every arm below runs `exposureForDraft` over
 * a REAL dev seed (the same drafts the app builds), never a hand-shaped params object.
 *
 * THE ARM THAT MATTERS MOST is the AGE/OVERLAY DIVERGENCE: a household whose AGES say "all 65+,
 * Medicare priced" while its BUILT OVERLAY says "no healthcare at all". Insight 080's scar
 * (`healthSheetChrome.ts:307-321`) is that an age-keyed predicate equalled the pricing
 * complement right up until a second producer of `healthcareEnabled` shipped, then silently
 * lied. A fixture where the two answers COINCIDE cannot tell an age gate from an overlay gate —
 * so this one is built to make them disagree.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { exposureForDraft } from '../stalenessExposure'
import { DEV_SEEDS } from '../devSeeds'
import {
  blendTableReadForRun,
  contributionsPricedForRun,
  dateBaseAcaPriced,
  isDateRoute,
  medicareOnlyPriced,
  missingRequiredFacts,
  overlayBuiltForRun,
  pricedStateForRun,
  spineAcaPriced,
  spineMedicarePriced,
} from '@intake/intakeMap'
import type { ScenarioDraft } from '@store/memoryModel'

describe('exposureForDraft — the SPINE route (both healthcare reads exact: one builder, the headline run’s own)', () => {
  it('the all-65+ Medicare-only household prices Medicare and NO ACA — the shipped defect’s witness', () => {
    // `retired`: ages 66 + 65, no marketplace quote pair. `buildOverlay` takes the Medicare-only
    // branch (healthcareEnabled with NO enrolledPremium), so the engine's per-year ACA gate
    // (`acaTable && enrolledThisYear > 0 && pre65 > 0`) can never open. One manual-blend account
    // ⇒ the dated ticker table is never read; both retired ⇒ no contribution stream.
    const d = DEV_SEEDS.retired
    expect(isDateRoute(d), 'the witness is spine-route').toBe(false)
    expect(exposureForDraft(d)).toEqual({
      overlayBuilt: 'priced',
      medicare: 'priced',
      aca: 'unpriced',
      contributions: 'unpriced',
      blend: 'unpriced',
      pricedState: undefined,
    })
  })

  it('the pre-65 marketplace-quoted household prices BOTH families — the naming arm of the witness pair', () => {
    // `health`: both retired at 61 + 59 with an entered quote pair ⇒ `healthcareOn`, a positive
    // escalated `enrolledPremium` stream, and a genuinely moved answer on an ACA rule change.
    const d = DEV_SEEDS.health
    expect(isDateRoute(d)).toBe(false)
    const e = exposureForDraft(d)
    expect(e.medicare).toBe('priced')
    expect(e.aca).toBe('priced')
    expect(e.overlayBuilt).toBe('priced')
  })

  it('reads the PRODUCERS, not a re-derivation: every field agrees with its OWN exported predicate across every spine seed', () => {
    // Source-bind (insights 032/081): the seam's answer is the producer's answer. A copy of the
    // builders' logic under a comment claiming it matches is not a pin.
    const spineSeeds = (Object.keys(DEV_SEEDS) as (keyof typeof DEV_SEEDS)[]).filter(
      (k) => !isDateRoute(DEV_SEEDS[k]) && missingRequiredFacts(DEV_SEEDS[k]).length === 0,
    )
    expect(spineSeeds.length, 'there ARE spine seeds to sweep').toBeGreaterThan(3)
    for (const k of spineSeeds) {
      const d = DEV_SEEDS[k]
      const e = exposureForDraft(d)
      expect(e.medicare === 'priced', `${k}: medicare`).toBe(spineMedicarePriced(d))
      expect(e.aca === 'priced', `${k}: aca`).toBe(spineAcaPriced(d))
      expect(e.overlayBuilt === 'priced', `${k}: overlayBuilt`).toBe(overlayBuiltForRun(d))
      expect(e.contributions === 'priced', `${k}: contributions`).toBe(contributionsPricedForRun(d))
      expect(e.blend === 'priced', `${k}: blend`).toBe(blendTableReadForRun(d))
      expect(e.pricedState, `${k}: state`).toBe(pricedStateForRun(d))
      // The structural pair: ACA pricing implies healthcare is on, so 'priced' ACA with an
      // unpriced Medicare read is impossible.
      expect(e.aca === 'priced' && e.medicare !== 'priced', `${k}: impossible pair`).toBe(false)
    }
  })
})

describe('exposureForDraft — THE AGE/OVERLAY DIVERGENCE (insight 080’s scar, made falsifiable)', () => {
  // All-65+ ages, positive spend, IRMAA seed present, and NO accounts / NO income / NO premium —
  // so `missingRequiredFacts` is empty (the spine route needs no account) while `buildOverlay`
  // hits its degenerate early return and builds NO overlay at all. Medicare is priced $0, and —
  // the F2 correction — NO TAX CONSTANT IS CONSUMED EITHER.
  const degenerate: ScenarioDraft = { ...DEV_SEEDS.retired, enteredAccounts: [] }

  it('the fixture genuinely disagrees with itself — ages say Medicare-priced, the built overlay says nothing was priced', () => {
    // Non-vacuity (burned/070): if these two ever agreed, the arm below would prove nothing.
    expect(missingRequiredFacts(degenerate), 'the draft is buildable — the divergence is not a missing-facts artifact').toEqual([])
    expect(medicareOnlyPriced(degenerate), 'the AGE predicate says priced').toBe(true)
    expect(spineMedicarePriced(degenerate), 'the BUILT OVERLAY says unpriced').toBe(false)
  })

  it('the exposure follows the BUILT OVERLAY — a run that priced nothing reads `unpriced` on EVERY axis, tax included', () => {
    // This is the F2 witness: `overlayBuilt` is what silences the FEDERAL tax clock for a
    // household whose recompute is byte-identical under any tax vintage.
    expect(exposureForDraft(degenerate)).toEqual({
      overlayBuilt: 'unpriced',
      medicare: 'unpriced',
      aca: 'unpriced',
      contributions: 'unpriced',
      blend: 'unpriced',
      pricedState: undefined,
    })
  })

  it('and the state read follows it too — a draft that SAYS NC but builds no overlay prices no state tax (the closed quiet limitation)', () => {
    const ncDegenerate: ScenarioDraft = { ...degenerate, retirementState: 'NC' }
    expect(ncDegenerate.retirementState, 'the DRAFT field says NC').toBe('NC')
    expect(exposureForDraft(ncDegenerate).pricedState, 'the RUN prices no state').toBeUndefined()
    // …and a household whose run DOES build the overlay reads the code, so the arm is not
    // vacuously "always undefined".
    expect(exposureForDraft(DEV_SEEDS.nc).pricedState).toBe('NC')
  })
})

describe('exposureForDraft — the DATE route', () => {
  it('Medicare is PRICED by construction — `dateSearch` forces `healthcareEnabled` on every candidate, ages notwithstanding', () => {
    // `date65`: a still-working 66-year-old + a retired 65-year-old, NO quote pair. This is the
    // exact population insight 080 names — an age-keyed predicate would have to decide it from
    // ages that say "all 65+", while the sweep prices Medicare on every candidate.
    const d = DEV_SEEDS.date65
    expect(isDateRoute(d)).toBe(true)
    const e = exposureForDraft(d)
    expect(e.medicare).toBe('priced')
    expect(e.aca).toBe('unpriced')
  })

  it('ACA reads UNPRICED (proven) when the base overlay carries no quote stream — window-gating can only shrink, never synthesize', () => {
    // `buildHealthcareStreams` only WINDOW-GATES an entered stream (healthcareStreams.ts:167-170),
    // so with no base stream NO candidate offset can price ACA. FALSE here is exact.
    const d = DEV_SEEDS.date65
    expect(dateBaseAcaPriced(d), 'no candidate could price ACA').toBe(false)
    expect(exposureForDraft(d).aca).toBe('unpriced')
  })

  it('ACA NAMES ITSELF off the base overlay (pilot ruling 2026-07-25): the re-entry gate runs BEFORE any date search, so the base run IS the run this surface describes', () => {
    // `date`: a working 58-year-old with an entered quote pair. Insight 088's trap — a crowned
    // work-to-65+ candidate windowing ACA to zero years — belongs to a surface sitting beside a
    // CROWNED preview. There is no crown at unlock, so the base overlay is this surface's own
    // producer, and reading it as 'unknown' would have delivered the enhanced-subsidy flip (the
    // one event `verify:aca` gates every build on) to pre-65 marketplace planners as a nameless
    // "we can't tell" line where HEAD named it — a silent stale on the most consequential clock.
    const d = DEV_SEEDS.date
    expect(dateBaseAcaPriced(d), 'the base stream is positive').toBe(true)
    const e = exposureForDraft(d)
    expect(e.aca).toBe('priced')
    expect(e.medicare).toBe('priced')
    // The seam emits NO 'unknown' for a buildable draft on either route — that value is now
    // reserved for the unbuildable residual alone (the arm below).
    expect(Object.values(e)).not.toContain('unknown')
  })

  it('the date route’s state read comes from `buildDateInput`’s own overlay, not an `isDateRoute` shortcut', () => {
    expect(exposureForDraft(DEV_SEEDS.datenc).pricedState).toBe(pricedStateForRun(DEV_SEEDS.datenc))
    expect(exposureForDraft(DEV_SEEDS.datenc).pricedState).toBe('NC')
    // The 'elsewhere' arm proves the roster filter is live on this route too (insight 080's
    // exact recurrence: `isDateRoute || …` would falsely price every date-route household).
    expect(exposureForDraft(DEV_SEEDS.elsewhere).pricedState).toBeUndefined()
  })

  it('CONTRIBUTIONS read the BASE overlay, not the forced candidate construct (F3): a date-route household whose accounts all belong to the RETIRED spouse prices no limit', () => {
    // `dateSearch.ts:230` sets `accumulation` on EVERY candidate — so a candidate-level read is a
    // constant `true` and discriminates nothing. What it carries is the BASE overlay's streams,
    // and `buildOverlay` spreads `accumulation` only when some WORKING owner actually
    // contributes. Strip the working owner's contribution dollars and the construct disappears
    // while the route does not: `anyContributions` is the discriminator.
    const contributing = DEV_SEEDS.date
    expect(isDateRoute(contributing)).toBe(true)
    expect(exposureForDraft(contributing).contributions, 'the contributing household is exposed').toBe('priced')
    const idle: ScenarioDraft = {
      ...contributing,
      enteredAccounts: contributing.enteredAccounts.map((a) => {
        const { annualContribution: _c, employerMatchAnnual: _m, hsaEmployerAnnual: _h, ...rest } = a
        return rest
      }),
    }
    expect(isDateRoute(idle), 'still the date route — only the streams are gone').toBe(true)
    expect(missingRequiredFacts(idle), 'and still buildable').toEqual([])
    expect(contributionsPricedForRun(idle), 'no accumulation on the base overlay').toBe(false)
    expect(exposureForDraft(idle).contributions).toBe('unpriced')
  })
})

describe('exposureForDraft — the BLEND read (F5: we CAN tell, so we must)', () => {
  it('a household of MANUAL blends never touches the dated table; one holding a classified ticker does', () => {
    // `retired` holds one no-ticker account with an exact manual blend — `resolveBlend` never
    // reaches `findBlendRow`, so `BLEND_SNAPSHOT_AS_OF` cannot move their answer. `date` holds
    // VTI + VFIFX, which do resolve through the table.
    expect(DEV_SEEDS.retired.enteredAccounts.every((a) => a.ticker === undefined)).toBe(true)
    expect(exposureForDraft(DEV_SEEDS.retired).blend).toBe('unpriced')
    expect(DEV_SEEDS.date.enteredAccounts.some((a) => a.ticker !== undefined)).toBe(true)
    expect(exposureForDraft(DEV_SEEDS.date).blend).toBe('priced')
  })

  it('a $0 portfolio is inert whatever it holds — `householdStockWeight` returns null and the run takes the documented `?? 0`', () => {
    // Same tickers, no dollars: every row is weighted by zero, so no re-date can move the
    // answer. (Spine route — the date route requires a positive portfolio to build at all.)
    const broke: ScenarioDraft = {
      ...DEV_SEEDS.health,
      enteredAccounts: DEV_SEEDS.health.enteredAccounts.map((a) => ({ ...a, ticker: 'VTI', valueToday: 0 })),
    }
    expect(missingRequiredFacts(broke)).toEqual([])
    expect(blendTableReadForRun(broke)).toBe(false)
    expect(exposureForDraft(broke).blend).toBe('unpriced')
  })
})

describe('exposureForDraft — no run at all', () => {
  it('an UNBUILDABLE draft reads `unknown` on every axis, never `unpriced` — silence must be EARNED by a proof that the run priced nothing', () => {
    // Strip the spend figure: `missingRequiredFacts` non-empty ⇒ every builder returns null.
    // Reading that as 'unpriced' would silence real drift on the strength of no evidence.
    const broken = { ...DEV_SEEDS.retired, annualSpendingReal: undefined } as unknown as ScenarioDraft
    expect(missingRequiredFacts(broken).length).toBeGreaterThan(0)
    expect(exposureForDraft(broken)).toEqual({
      overlayBuilt: 'unknown',
      medicare: 'unknown',
      aca: 'unknown',
      contributions: 'unknown',
      blend: 'unknown',
      pricedState: undefined,
    })
  })
})

// ── THE SOURCE-BIND on the CONSUMER (insights 032/081; the idiom is draftFromScenario.test.ts:409)
//
// F6, verbatim: mutating `IntakeApp.tsx`'s third argument to `{ ...exposureForDraft(draft), aca:
// 'priced' }` left EVERY test green. No vitest arm renders the gate's notes through the
// component, and no dev vault moves the ACA stamps (`acaStatus`/`fplGuidelineYear` appear in
// neither `devSeeds.ts`'s doctors nor `vertical-fit.spec.ts`), so the whole ACA half of §S4 had
// no end-to-end proof — and the shipped defect would return silently the day the
// `reVerifyEveryBuild` ACA constant flips. Testing `exposureForDraft` proves the FUNCTION is
// right; it proves nothing about whether the component still routes through it unaltered.
describe('the SHIPPED consumer binds to this seam (source-bind, not replication)', () => {
  const src = readFileSync(resolve(__dirname, '../IntakeApp.tsx'), 'utf8')

  it('IntakeApp imports the producer and hands `deriveStaleness` its UNMODIFIED result', () => {
    expect(src, 'the producer is imported, not re-declared').toMatch(
      /import \{[^}]*exposureForDraft[^}]*\} from '\.\/stalenessExposure'/,
    )
    // The exact shipped call, third argument included. A spread-and-override
    // (`{ ...exposureForDraft(…), aca: 'priced' }`) does not match this pattern.
    expect(src, 'the report is derived with the seam’s own record').toMatch(
      /deriveStaleness\(model, currentEpochDay\(\), exposureForDraft\(hydrated\.draft\)\)/,
    )
  })

  it('and no literal exposure read is hand-written at the call site — the mutant F6 named', () => {
    // Any of these appearing in the component means someone re-typed a decision that belongs to
    // the seam (the class that made the S0 verifier's `+ 3` survive 1096 green tests).
    expect(src, 'never a hand-written exposure literal in the component').not.toMatch(
      /(aca|medicare|overlayBuilt|contributions|blend)\s*:\s*'(priced|unpriced|unknown)'/,
    )
  })
})
