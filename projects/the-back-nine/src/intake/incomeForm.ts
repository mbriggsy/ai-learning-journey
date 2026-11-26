/**
 * One other-income stream's entry form, its pure half: the flat form the `IncomeStream` union is entered through, the
 * form a committed stream seeds, and the ONE decision tree that builds the stream or names the no-safe-default fact
 * that blocks it (R40 · KTD-3/4/6/7/8). Moved out of `OtherIncomeEntry.tsx` by Act 6's RC13a, unchanged, so the walk's
 * entry and the Profile pages' income drawer build a stream through the same rule (never a fork; insight 058). The
 * component's header holds the why of each field.
 */
import type { CopyKey } from '@ui/copy'
import type { ColaMode, IncomeStream, IncomeTaxTreatment, IncomeType } from '@shared/model'
import { colaRateInRange } from '@shared/incomeBounds'
import type { ScenarioDraft } from '@store/memoryModel'

/** A CONTINUING type surfaces the survivor-% (alimony terminates by law → 0). */
export const isContinuingType = (type: IncomeType | undefined): boolean =>
  type === 'pension' || type === 'rental' || type === 'annuity' || type === 'other'

/** The field each in-range/format error belongs to — so the ONE rendered error's id matches the invalid field's
 *  `aria-describedby`. The required/missing errors have no single invalid field → they fall through to the save slot. */
export const INCOME_ERROR_OWNER_FIELD: Partial<Record<CopyKey, string>> = {
  errIncomeColaPct: 'income.colaPct',
  errIncomeColaRange: 'income.colaPct',
  errIncomeSurvivorRange: 'income.survivorPct',
  errIncomeTaxableRange: 'income.taxableFraction',
  errIncomeExclusionRange: 'income.exclusionFraction',
}

export interface IncomeFormState {
  ownerIndex: 0 | 1
  type: IncomeType | undefined
  annualRealToday: number | undefined
  receivingNow: boolean | undefined
  startAge: number | undefined
  endAge: number | undefined
  colaMode: ColaMode | undefined
  colaPct: number | undefined
  survivorPct: number | undefined
  taxableFraction: number | undefined
  // alimony
  executedAfter2018: boolean | undefined
  modifiedAdoptsPost2018Rules: boolean
  // annuity
  annuityQualified: boolean | undefined
  exclusionFraction: number | undefined
}

/** Reconstruct the form state from a persisted entity (the union → flat form). */
export function incomeFormFrom(initial: IncomeStream | undefined, draft: ScenarioDraft): IncomeFormState {
  const ownerIndex = (initial?.ownerIndex as 0 | 1) ?? 0
  const currentAge = draft.people[ownerIndex]?.currentAge
  // Paying now = started AND not past its last paying age (milestone 3's review, round 2): an ENDED stream reads "later"
  // with its stored start, so an edit rebuilds it unchanged; read as "now" it re-anchored the start at today's age, past
  // its end, and every Save was refused (end before start).
  const receivingNow =
    initial === undefined || currentAge === undefined
      ? undefined
      : initial.startAge <= currentAge && (initial.endAge === undefined || initial.endAge >= currentAge)
  return {
    ownerIndex,
    type: initial?.type,
    annualRealToday: initial?.annualRealToday,
    receivingNow,
    startAge: initial?.startAge,
    endAge: initial?.endAge,
    colaMode: initial?.colaMode,
    colaPct: initial?.colaPct,
    survivorPct: initial?.survivorPct,
    taxableFraction:
      initial !== undefined &&
      (initial.type === 'pension' || initial.type === 'rental' || initial.type === 'other')
        ? initial.taxableFraction
        : undefined,
    executedAfter2018: initial?.type === 'alimony' ? initial.executedAfter2018 : undefined,
    modifiedAdoptsPost2018Rules:
      initial?.type === 'alimony' ? initial.modifiedAdoptsPost2018Rules === true : false,
    annuityQualified: initial?.type === 'annuity' ? initial.qualified : undefined,
    exclusionFraction:
      initial?.type === 'annuity' && initial.qualified === false ? initial.exclusionFraction : undefined,
  }
}

// A share fraction is in range iff present AND ∈ [0,1]. An out-of-range scalar
// (parsePercent has NO upper clamp — "150" → 1.5) is a TRUE impossibility (a
// survivor can't keep 120% of a benefit; an exclusion > 1 drives effective
// taxable NEGATIVE — the optimistic-MAGI sin). It must NEVER commit, and it is
// NEVER silently coerced (clamping 1.5→1 is the calm-but-wrong coercion the form
// exists to refuse; burned/062). The form is the in-flow gate — sanity's
// income-*-range rules + U8's codec are the restore backstops, not this path.
const shareInRange = (v: number): boolean => v >= 0 && v <= 1

/** Build the persisted entity, OR the specific reason a no-safe-default fact is
 *  missing / out of range. A discriminated result (not bare null) so the gate
 *  and the calm message share ONE decision tree — a blocked Save always names
 *  WHAT is missing (WCAG 3.3.1), never a silent dead button. */
export function buildIncomeStream(
  form: IncomeFormState,
  draft: ScenarioDraft,
): { ok: true; stream: IncomeStream } | { ok: false; error: CopyKey } {
  const currentAge = draft.people[form.ownerIndex]?.currentAge
  if (form.type === undefined) return { ok: false, error: 'errIncomeTypeRequired' }
  if (form.annualRealToday === undefined) return { ok: false, error: 'errIncomeAmountRequired' }
  if (form.receivingNow === undefined) return { ok: false, error: 'errIncomeTimingRequired' }
  if (form.colaMode === undefined) return { ok: false, error: 'errIncomeColaModeRequired' }
  // The start age: already-receiving anchors at the owner's CURRENT age (KTD-8b
  // clamps it to t=0); a future stream needs an explicit start age.
  let startAge: number
  if (form.receivingNow) {
    if (currentAge === undefined) return { ok: false, error: 'errIncomeStartAgeRequired' } // can't anchor
    startAge = currentAge
  } else {
    if (form.startAge === undefined) return { ok: false, error: 'errIncomeStartAgeRequired' }
    startAge = form.startAge
  }
  // A last paying age before the first is no stream at all (milestone 3's review, X8): refused under the end age.
  if (form.endAge !== undefined && form.endAge < startAge) return { ok: false, error: 'errIncomeEndBeforeStart' }
  // fixed-pct requires a finite COLA rate (KTD-2 — never coerced to 0)…
  if (form.colaMode === 'fixed-pct') {
    if (form.colaPct === undefined || !Number.isFinite(form.colaPct)) {
      return { ok: false, error: 'errIncomeColaPct' }
    }
    // …AND within the grounded band. A rate outside it (a fat-fingered 30%/yr) compounds to fantasy
    // real income the confidence fan is structurally blind to — the never-deplete sin. HARD refuse
    // at the SAME 0.05 the restore codec enforces (@shared/incomeBounds, council 2026-07-01), never
    // a soft override (nothing legitimate sits between the ceiling and the sin band).
    if (!colaRateInRange(form.colaPct)) {
      return { ok: false, error: 'errIncomeColaRange' }
    }
  }
  // The optional advanced taxableFraction (pension/rental/other) — when entered,
  // it MUST be in range (out-of-range understates/over-states MAGI; never commits).
  if (form.taxableFraction !== undefined && !shareInRange(form.taxableFraction)) {
    return { ok: false, error: 'errIncomeTaxableRange' }
  }
  // The tax-treatment union arm (KTD-6) — each type's MUST-ASK field gates here.
  // Typed as the real union so an arm's literal is checked against its member at
  // authoring time (a `{ type:'pension', exclusionFraction }` contradiction won't
  // compile — KTD-6's "unrepresentable" promise, locally enforced).
  let treatment: IncomeTaxTreatment
  let survivorPct: number
  switch (form.type) {
    case 'pension':
    case 'rental':
    case 'other': {
      if (form.survivorPct === undefined) return { ok: false, error: 'errIncomeSurvivorRequired' }
      if (!shareInRange(form.survivorPct)) return { ok: false, error: 'errIncomeSurvivorRange' }
      survivorPct = form.survivorPct
      treatment = {
        type: form.type,
        ...(form.taxableFraction !== undefined ? { taxableFraction: form.taxableFraction } : {}),
      }
      break
    }
    case 'alimony': {
      if (form.executedAfter2018 === undefined) return { ok: false, error: 'errIncomeAlimonyDateRequired' }
      survivorPct = 0 // terminates at death by law (§71(b)(1)(D))
      treatment =
        form.executedAfter2018 === false
          ? {
              type: 'alimony',
              executedAfter2018: false,
              modifiedAdoptsPost2018Rules: form.modifiedAdoptsPost2018Rules,
            }
          : { type: 'alimony', executedAfter2018: true }
      break
    }
    case 'annuity': {
      if (form.annuityQualified === undefined) return { ok: false, error: 'errIncomeAnnuityKindRequired' }
      if (form.survivorPct === undefined) return { ok: false, error: 'errIncomeSurvivorRequired' }
      if (!shareInRange(form.survivorPct)) return { ok: false, error: 'errIncomeSurvivorRange' }
      survivorPct = form.survivorPct
      if (form.annuityQualified) {
        treatment = { type: 'annuity', qualified: true }
      } else {
        if (form.exclusionFraction === undefined) return { ok: false, error: 'errIncomeExclusionRequired' }
        if (!shareInRange(form.exclusionFraction)) return { ok: false, error: 'errIncomeExclusionRange' }
        treatment = { type: 'annuity', qualified: false, exclusionFraction: form.exclusionFraction }
      }
      break
    }
  }
  const stream = {
    ownerIndex: form.ownerIndex,
    annualRealToday: form.annualRealToday,
    startAge,
    ...(form.endAge !== undefined ? { endAge: form.endAge } : {}),
    colaMode: form.colaMode,
    ...(form.colaMode === 'fixed-pct' && form.colaPct !== undefined ? { colaPct: form.colaPct } : {}),
    survivorPct,
    ...treatment,
    // TS collapses a union under object spread, so the final cast can't be fully
    // eliminated — but `treatment` is the real union, so each ARM is checked above.
  } as IncomeStream
  return { ok: true, stream }
}
