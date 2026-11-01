/**
 * The year's Social Security pieces, by who is alive: the both-alive gates and the §202 survivor year (build 2
 * KTD13). Moved verbatim out of `simulate.ts` so the earnings test (`earningsTest.ts`) can compose the same pieces
 * without importing `simulate.ts`, which imports it: this leaf reads only the Social Security sub-engine and the
 * shared model. `simulate.ts` re-exports every name here.
 */
import { adjustOwnBenefitAnnual, realizedClaimAgeAtDeath, survivorBenefitAnnual, type BenefitPerson } from '@engine/socialSecurityBenefit'
import type { PersonInputs } from '@shared/model'

/** Per-person, simulation-relative offsets (whole years from year 0). */
export interface PersonOffsets {
  readonly retire: number
  readonly claim: number
  readonly earnedIncomeReal: number
  /** The claim-age-adjusted OWN Social Security benefit (annual real), resolved pre-loop by the SS
   *  sub-engine (`householdBenefits().ownAnnual`). The slot name is retained from the pre-`pia`
   *  scalar; it now holds the DERIVED own benefit, not the entered figure. */
  readonly socialSecurityReal: number
  /** The Method-C spousal EXCESS (annual real), resolved pre-loop (`householdBenefits().spousalExcessAnnual`).
   *  0 for the higher earner and for an earner whose own PIA ≥ 50% of the higher PIA. The seam gates its
   *  START at max(this person's claim, the higher earner's claim) and its END at the first death (it lives
   *  only in the all-alive branch — once a spouse dies the §202 survivor benefit replaces it; plan §7). */
  readonly spousalExcessAnnual: number
}

/** The earnings test's crediting months IN EFFECT in one survivor year — see {@link survivorYearBenefit}. */
export interface SurvivorYearCredits {
  /** On the survivor's own retirement benefit: 0 until the year after the survivor's FRA year. */
  readonly survivorOwn: number
  /** On the widow(er) benefit itself: the at-62 recompute's months, then the at-FRA recompute's. */
  readonly widow: number
  /** The deceased's own months, for the RIB-LIM cap: 0 until the year after the deceased's (would-be) FRA year. */
  readonly deceasedOwn: number
}

/** One survivor year's Social Security — see {@link survivorYearBenefit}. */
export interface SurvivorYearBenefit {
  /** The living spouse — an index into `people` and the offsets. */
  readonly survivorIdx: number
  /** The spouse who died — an index into `people` and the offsets. */
  readonly deceasedIdx: number
  /** The deceased's record as the widow(er) benefit reads it: their PIA at the claim age they
   *  REALIZED (`realizedClaimAgeAtDeath` — the planned age, capped by the age at death). */
  readonly deceased: BenefitPerson
  /** The age the widow(er) benefit starts at, locked: max(60, the survivor's age at the death). */
  readonly survivorStartAge: number
  /** The widow(er) benefit at the locked start age, real $ a year, before the age-60 gate. */
  readonly survivorStream: number
  /** The widow(er) benefit is payable this year: the survivor is at least 60. */
  readonly survivorEligible: boolean
  /** The survivor's own benefit this year: once they have claimed it, else 0. */
  readonly ownStream: number
  /** The benefit paid: max(own, the widow(er) benefit when payable). */
  readonly paid: number
  /** Which benefit `paid` is: `'survivor'` when the payable widow(er) benefit is strictly the larger,
   *  `'own'` when the survivor's own benefit is paid (a tie is `'own'`: the widow(er) benefit adds
   *  nothing over it), `'none'` when nothing is payable this year. */
  readonly winner: 'own' | 'survivor' | 'none'
}

/**
 * One survivor year's Social Security (plan §6) — the ONE home of the §202 composition. It is read by
 * {@link cashTermsForYear} (the year's `ss` once a spouse has died) and, from the pay check's earnings
 * test on (`docs/plans/features/working-year-pay-check-build-spec.md`, KTD10), by the test's schedule,
 * which has to know which benefit a working widow(er) is paid before it can hold it back or credit it.
 *
 * It replaces the old `$0-until-own-claim` stub. Once one spouse has died, the survivor each year
 * collects max(their OWN benefit, the survivor benefit on the deceased's record). The survivor
 * benefit's age-reduction factor is LOCKED at the survivor's age when the stream starts (max(60, age
 * at the first death)) and held FLAT — it does NOT ramp toward 100% as the survivor ages (a ramp would
 * optimistically overstate the early-widowhood floor: the cardinal calm-but-wrong sin). The deceased's
 * DRCs flow through and RIB-LIM caps a deceased who claimed reduced — all inside
 * `survivorBenefitAnnual`, applied to the deceased's REALIZED claim age: a worker can't file after
 * death, so a deceased who died before their PLANNED claim age realized only the credits they lived to
 * earn — `realizedClaimAgeAtDeath` caps the planned age at age-at-death (an unfiled pre-FRA death lands
 * on the full PIA, never a phantom delayed credit; 20 CFR §404.313 / RS 00615.301). Passing the
 * planned age verbatim would overstate the survivor floor on early-death paths — the cardinal
 * optimistic sin, on exactly the early-widowhood scenario this branch exists to harden. The spousal
 * excess does NOT carry into widowhood (it ended at the death).
 *
 * `undefined` unless this is a survivor year — someone has died and someone is alive. The
 * `aliveCount >= 1` + index guards skip the people-of-one death and the all-dead year. Constant once
 * the death offset is fixed: PURE and draw-free (CRN-safe), a function of the death timeline + inputs.
 *
 * `credits` (optional) are the earnings test's crediting months IN EFFECT this year (KTD10; the
 * schedule in `earningsTest.ts` owns when each takes effect): the survivor's own benefit and the
 * widow(er) benefit are paid as recomputed, and the deceased's months raise the RIB-LIM cap. Every
 * credited survivor year is composed here and nowhere else. Absent, or all 0, takes exactly the
 * uncredited path.
 */
export function survivorYearBenefit(
  t: number,
  people: readonly PersonInputs[],
  offsets: readonly PersonOffsets[],
  deathOffsets: readonly number[],
  credits?: SurvivorYearCredits,
): SurvivorYearBenefit | undefined {
  let aliveCount = 0
  for (let i = 0; i < deathOffsets.length; i++) if (t < (deathOffsets[i] ?? 0)) aliveCount++
  if (aliveCount === offsets.length) return undefined // everyone alive: not a survivor year
  let survivorIdx = -1
  let deceasedIdx = -1
  for (let i = 0; i < offsets.length; i++) {
    if (offsets[i] === undefined) continue
    if (t < (deathOffsets[i] ?? 0)) survivorIdx = i
    else deceasedIdx = i
  }
  if (aliveCount < 1 || survivorIdx < 0 || deceasedIdx < 0) return undefined
  const s = people[survivorIdx]
  const d = people[deceasedIdx]
  const sOff = offsets[survivorIdx]
  if (s === undefined || d === undefined || sOff === undefined) return undefined
  const deceasedDeathOffset = deathOffsets[deceasedIdx] ?? 0
  const deceasedClaim = realizedClaimAgeAtDeath(d.socialSecurityClaimAge, d.birthYear, d.currentAge + deceasedDeathOffset)
  const deceased: BenefitPerson = { piaAnnual: d.pia, claimAge: deceasedClaim, birthYear: d.birthYear }
  const survivorStartAge = Math.max(60, s.currentAge + deceasedDeathOffset)
  const survivorStream =
    credits === undefined || (credits.widow === 0 && credits.deceasedOwn === 0)
      ? survivorBenefitAnnual(deceased, s.birthYear, survivorStartAge)
      : survivorBenefitAnnual(deceased, s.birthYear, survivorStartAge, { widow: credits.widow, deceased: credits.deceasedOwn })
  const survivorEligible = s.currentAge + t >= 60 // the AGED widow(er) benefit starts at 60 (§202(e)(1)(B)(i)); the disabled one from 50 is not modeled
  const ownStream =
    t >= sOff.claim
      ? credits === undefined || credits.survivorOwn === 0
        ? sOff.socialSecurityReal
        : adjustOwnBenefitAnnual(s.pia, s.socialSecurityClaimAge, s.birthYear, credits.survivorOwn)
      : 0
  const payableSurvivor = survivorEligible ? survivorStream : 0
  const paid = Math.max(ownStream, payableSurvivor)
  const winner = paid === 0 ? 'none' : payableSurvivor > ownStream ? 'survivor' : 'own'
  return { survivorIdx, deceasedIdx, deceased, survivorStartAge, survivorStream, survivorEligible, ownStream, paid, winner }
}

/** One living person's Social Security in a year both spouses are alive — see {@link bothAliveYearBenefit}. */
export interface BothAliveYearBenefit {
  /** The first sim year their own benefit is paid: their claim offset. */
  readonly ownStart: number
  /** The first sim year their spousal excess is paid: max(their claim, the higher earner's claim). */
  readonly spousalStart: number
  /** Their own benefit this year: the amount from `ownStart` on, else 0. */
  readonly own: number
  /** Their spousal excess this year: the amount from `spousalStart` on, else 0. */
  readonly spousal: number
}

/**
 * One living person's Social Security in a year BOTH spouses are alive — the one home of the both-alive
 * gates. {@link cashTermsForYear} sums these pieces into the year's `ss`, and the pay check's earnings
 * test (`earningsTest.ts`) composes the same pieces at its credited amounts, so the two can never
 * disagree on who is paid what (insight 081).
 *
 * The own benefit is paid once its owner has claimed it. The Method-C spousal EXCESS is paid once BOTH
 * the recipient and the higher earner have filed: start = max(this claim, the higher earner's claim),
 * RS 00202.001's worker-must-be-entitled gate. The excess is 0 for the higher earner and for a
 * non-recipient, so paying it gated is safe. Its END gate is the caller's: once a spouse dies, the §202
 * survivor year ({@link survivorYearBenefit}) owns Social Security, so the excess vanishes at the first
 * death and never double-counts with the survivor stream (plan §7).
 *
 * The amounts default to the run's own (`socialSecurityReal`, `spousalExcessAnnual`); the earnings test
 * passes the credited ones. PURE and draw-free (CRN-safe).
 */
export function bothAliveYearBenefit(
  t: number,
  offset: PersonOffsets,
  higherClaimOffset: number,
  ownAnnual: number = offset.socialSecurityReal,
  spousalAnnual: number = offset.spousalExcessAnnual,
): BothAliveYearBenefit {
  const ownStart = offset.claim
  const spousalStart = Math.max(offset.claim, higherClaimOffset)
  return {
    ownStart,
    spousalStart,
    own: t >= ownStart ? ownAnnual : 0,
    spousal: t >= spousalStart ? spousalAnnual : 0,
  }
}
