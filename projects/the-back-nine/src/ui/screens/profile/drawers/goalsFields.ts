/**
 * src/ui/screens/profile/drawers/goalsFields.ts: Goals' Health care before Medicare and Medicare drawers, their pure half
 * (Act 6 · RC13b). Each writes the draft the way the walk's own steps write it (the quote step, the employer-coverage
 * step, the Medicare-extras fork and the look-back income step: `steps.ts`' writers, one write shape per fact) and only
 * what the form changed from its seed. The Retirement card opens the Family person drawer (the work status and the stop
 * age have one home, `familyFields.ts`).
 */
import type { FieldPath } from '@intake/sanity'
import { writeEmployerCoverage, writeHealthQuote, writeIrmaaSeed, writeMedicareExtrasAmount, writeMedicareExtrasPick } from '@intake/steps'
import type { ScenarioDraft } from '@store/memoryModel'
import type { FieldErrors } from './drawerSave'

type Built<K extends string> = { readonly ok: true; readonly draft: ScenarioDraft } | { readonly ok: false; readonly fields: FieldErrors<K> }

// ── Health care before Medicare: the marketplace quote pair, and who covers a retired member while the other works ──

export interface HealthForm {
  readonly enrolled: number | undefined
  readonly slcsp: number | undefined
  readonly covered: boolean | undefined
}
export type HealthField = 'enrolled' | 'slcsp' | 'covered'

export const healthFormFrom = (d: ScenarioDraft): HealthForm => ({
  enrolled: d.health.enrolledPremiumMonthlyToday,
  slcsp: d.health.slcspMonthlyToday,
  covered: d.health.employerPlanCoversRetiredMember,
})

export function buildHealth(d: ScenarioDraft, seed: HealthForm, form: HealthForm): Built<HealthField> {
  let next = d
  if (form.enrolled !== seed.enrolled) next = writeHealthQuote(next, 'enrolled', form.enrolled)
  if (form.slcsp !== seed.slcsp) next = writeHealthQuote(next, 'slcsp', form.slcsp)
  // A coverage answer is a pick, never cleared (the step offers no "not sure" arm).
  if (form.covered !== undefined && form.covered !== seed.covered) next = writeEmployerCoverage(next, form.covered)
  return { ok: true, draft: next }
}

export const ownHealthField = (field: FieldPath): HealthField | null =>
  field === 'health.enrolledPremiumMonthlyToday'
    ? 'enrolled'
    : field === 'health.slcspMonthlyToday'
      ? 'slcsp'
      : field === 'health.employerPlanCoversRetiredMember'
        ? 'covered'
        : null

// ── Medicare: each person's extras beyond Part B (the fork: nothing, a figure of their own, or the tool's typical), and the
//    surcharge's look-back income two years back and last year ─────────────────────────────────────────────────────────

export type ExtrasPick = 'none' | 'entered' | 'typical'

export interface MedicareForm {
  readonly picks: readonly [ExtrasPick | undefined, ExtrasPick | undefined]
  /** Each person's own monthly figure (an entered pick's). */
  readonly amounts: readonly [number | undefined, number | undefined]
  /** The look-back income: two years back, then last year. */
  readonly seed: readonly [number | undefined, number | undefined]
}
export type MedicareField = 'extras0' | 'extras1' | 'seed0' | 'seed1'

export function medicareFormFrom(d: ScenarioDraft): MedicareForm {
  const pick = (i: 0 | 1): ExtrasPick | undefined => {
    const e = d.medicareExtrasByPerson?.[i]
    return e === undefined || e.kind === 'unanswered' ? undefined : e.kind
  }
  const amount = (i: 0 | 1): number | undefined => {
    const e = d.medicareExtrasByPerson?.[i]
    return e?.kind === 'entered' ? e.monthly : undefined
  }
  return { picks: [pick(0), pick(1)], amounts: [amount(0), amount(1)], seed: [d.health.irmaaMagiSeed?.[0], d.health.irmaaMagiSeed?.[1]] }
}

export function buildMedicare(d: ScenarioDraft, seed: MedicareForm, form: MedicareForm): Built<MedicareField> {
  let next = d
  for (const i of [0, 1] as const) {
    const pick = form.picks[i]
    // The fork first (a fresh "entered" starts blank, a re-tap keeps the figure), then the figure typed under it.
    if (pick !== undefined && pick !== seed.picks[i]) next = writeMedicareExtrasPick(next, i, pick)
    if (pick === 'entered' && form.amounts[i] !== seed.amounts[i]) next = writeMedicareExtrasAmount(next, i, form.amounts[i])
  }
  for (const i of [0, 1] as const) if (form.seed[i] !== seed.seed[i]) next = writeIrmaaSeed(next, i, form.seed[i])
  return { ok: true, draft: next }
}

export const ownMedicareField = (field: FieldPath): MedicareField | null =>
  field === 'medicareExtrasByPerson.0.monthly'
    ? 'extras0'
    : field === 'medicareExtrasByPerson.1.monthly'
      ? 'extras1'
      : field === 'health.irmaaMagiSeed.0'
        ? 'seed0'
        : field === 'health.irmaaMagiSeed.1'
          ? 'seed1'
          : null
