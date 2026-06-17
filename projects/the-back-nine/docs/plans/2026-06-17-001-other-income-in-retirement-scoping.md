# R40 — Other income in retirement (pension · rental · alimony · annuity) — SCOPING

> **Status: DECISION-READY.** Scoped from a 55-agent research pass (2026-06-17): 4 per-type
> tax-rule research lanes (gemini-grounding, IRS-primary) + 2 engine-integration lanes (repo),
> then 49 load-bearing claims adversarially verified refute-by-default (45 confirmed against IRS
> primaries, 4 provenance-corrected — see §8). No code written. Three open ATC calls in §7.
>
> **This is new scope** — there is zero mention of pension/rental/other-income anywhere in the
> locked requirements (R1–R39) or the charter. Building it amends the contract: it needs an **R40
> requirements entry** (ATC call #3). It fits the north-star (an honest answer for a real couple;
> *not* a FIRE calculator — these are real income streams, not early-retirement engineering).

## 1. What & why

The engine models exactly **two** income streams today: `earnedIncomeReal` (which *stops at
retirement*) and Social Security. It has **no concept of ongoing non-earned income** — a pension, a
rental, an annuity, or alimony that keeps paying after you stop working. For households that have
one, that's the difference between a true answer and a confidently-wrong one.

Concrete drivers (Briggsy's test-drivers): one friend with **rental property income**; one friend
whose wife will draw a **teacher's pension**. The teacher's pension is the single most dangerous
number in the app to get wrong — whether it **survives** the teacher's death (and at what %) and
whether it **keeps up with inflation** is the whole ballgame for the widow's picture, and getting it
wrong is exactly the *calm-but-wrong* sin.

## 2. The model — one generic stream, compiled to real-$ vectors in `intakeMap`

ONE leaf type (`src/shared/model.ts`), not bespoke per-type code:

```ts
export interface PersonIncomeStream {
  readonly label: 'pension' | 'rental' | 'alimony' | 'annuity' | 'other' // picks defaults only
  readonly annualRealToday: number        // gross, in today's dollars
  readonly startAge: number               // owner age the stream begins (>= currentAge)
  readonly endAge?: number                // absent = lifetime
  readonly colaMode: 'real-flat' | 'nominal-flat' | 'fixed-pct'
  readonly colaPct?: number               // for fixed-pct (nominal escalator), e.g. 0.02
  readonly taxableFraction: number        // [0,1]; default 1 (fully taxable, the conservative default)
  readonly survivorPct: number            // [0,1]; fraction continuing to the surviving spouse
}
```

**The compilation trick (load-bearing, keeps the pure engine tiny).** `intakeMap` compiles each
stream into **two per-year vectors per person** — a *gross* real-$ vector and a *taxable* real-$
vector — exactly mirroring the existing `PersonContributionStreams` (`model.ts:238–262`), which are
already per-year `number[]` arrays the engine consumes. All the COLA/deflation, start/end gating, and
taxable-fraction math happens **in `intakeMap`** (which is allowed to read the inflation assumption —
it is not the pure engine). The pure engine just adds `grossVector[t]` to the cash term and
`taxableVector[t]` to ordinary income. Consequences:

- **No new deflation mechanism inside the pure engine** (the engine stays real-dollar-flat; the
  vector is *pre-deflated*). This is the difference between a small, safe change and a big one.
- **Reduce-to-spine holds by construction** — absent streams ⇒ no vector ⇒ byte-identical to the
  Trinity/Bengen spine (presence-keyed, same pattern as accumulation/HSA/healthcare).
- The vectors are **per-person** (owner-attributed), so the death-vet + survivor logic that already
  guards every contribution channel applies unchanged.

## 3. Per-type defaults (the type label seeds these; intake surfaces them for confirm)

| Type | COLA default | Taxable default | Survivor default | The MUST-ASK field | Provenance of the default |
|---|---|---|---|---|---|
| **Pension** | nominal-flat | fully taxable | **prompt (no safe default)** | survivor % (QJSA election) | tax: IRS Pub 575 (✓). Survivor: IRC 401(a)(11)/417, QJSA floor 50%, J&S 50/75/100 (✓). COLA norm: public/teacher COLAs commonly none/2–3%/capped, *below* inflation — **plan-design fact, not IRS** |
| **Rental** | real-flat | fully taxable | ~100% | (none forced) | tax: net rental ordinary, Schedule E → AGI/MAGI, passive, continues past retirement (✓ Pub 527/925). Survivor ~100% is **STATE property law** (JTWROS/community property), *not* IRS. COLA real-flat is practitioner/BLS-attested, *not* IRS |
| **Alimony** | nominal-flat | **derived from agreement date** | **0%** (terminates at death) | **agreement executed before/after 12/31/2018** | TCJA fork (✓ IRS Pub 504 / Topic 452). 0%-survivor (✓ §71(b)(1)(D)). Flat-nominal COLA practitioner-attested |
| **Annuity** | nominal-flat | fully taxable (qualified) / exclusion-ratio (non-qual) | prompt | qualified vs non-qualified | qualified fully taxable; non-qual exclusion ratio = basis/expected-return (✓ Pub 575/939); fixed annuity flat-nominal, COLA = optional rider (✓ FINRA/SEC) |
| **Other** | nominal-flat | fully taxable | prompt | — | catch-all; same machinery |

**The alimony date is the highest-leverage field in the whole feature** (✓ verified): an instrument
executed *after* 2018-12-31 (or a pre-2019 one expressly modified to adopt TCJA) is **not taxable to
the recipient and invisible to MAGI**; an instrument *on/before* 2018-12-31 **is** taxable and **does**
lift MAGI. Never default it — ask it, with the date threshold in plain language. (A pre-2019
agreement merely *modified* after 2018 stays taxable **unless** the modification expressly adopts the
new rules — so we ask "did the modification expressly adopt the post-2018 tax rules?", default = no.)

## 4. Engine integration — FIVE seams, ONE atomic change (the muni-interest discipline)

The taxable portion of a stream must enter **every** income/MAGI site in a single change, or we get
the *calm-but-wrong-optimistic* sign-inversion (understated SS-taxation + understated ACA/IRMAA
costs). Map (file:line from the engine research lane):

| # | Seam | File:line | Change |
|---|---|---|---|
| 1 | Cash-flow netting | `simulate.ts:167–262` (`cashTermsForYear`) | add `grossVector[t]` to income — **death-aware, NOT retire-truncated** (unlike earned income); `net = max(0, spending − earned − ongoing − ss)` |
| 2 | Ordinary income | `taxOverlay.ts:939` (`nonSSordinary`) | `+ taxableVector[t]` |
| 3 | SS §86 provisional | `taxOverlay.ts:943` (`taxableSocialSecurity` call) | include the same `taxableVector[t]` in the provisional base (the "SS torpedo") |
| 4 | ACA-MAGI | `healthOverlay.ts:94` (`acaMagi`) | **no change** — reads `nonSSordinary` via the shared `MagiComponents` (rides seam 2) |
| 5 | IRMAA-MAGI | `healthOverlay.ts:104` (`irmaaMagi`) | **no change** — same shared `MagiComponents` (rides seams 2–3) |

Because ACA-MAGI and IRMAA-MAGI both read the shared `MagiComponents.nonSSordinary`, the *only*
explicit edits are seams 1–3; 4–5 flow through. **Non-taxable portions** (post-2018 alimony, pension
basis, annuity basis) net the draw (seam 1) but touch **none** of seams 2–5 — they are MAGI-invisible.

- **Survivor** applies at the owner's death offset in the path loop (mirror §202 survivor logic,
  `simulate.ts:226–240`): the stream continues at `survivorPct` or stops. (Already baked into the
  per-person vector if we apply survivor% at compile time keyed to a death offset — **decision: apply
  it in the engine path loop**, because death is sampled per-path, not at intake.)
- **Reduce-to-spine test**: streams absent/zero ⇒ byte-identical spine (same seed) — the golden gate.

## 5. The COLA-in-real-dollars landmine (headline correctness item)

The engine is **real-dollar-only** — spending, earned income, and SS are all held *flat in real
terms* (`returnsAreReal` is hard-required; `market.inflation` is informational). Therefore:

- **real-flat** (COLA keeps pace with inflation): the vector is a **flat** real-$ line. Easy, matches
  the existing pattern.
- **nominal-flat** (fixed pension/annuity, no COLA — *the common case*): in real terms it **declines**.
  The vector must **decay geometrically** at the inflation rate. **A nominal pension entered as a flat
  real number silently overstates it in later years — the optimistic sin.** (A $45k flat pension is
  worth ~half its purchasing power 25 years on.)
- **fixed-pct** (a 2% nominal escalator while inflation runs higher): the vector decays at the *net*
  real rate `(1+colaPct)/(1+inflation) − 1`. Non-compounding ("simple") COLAs erode faster than
  compounding ones of the same rate (✓ verified) — a v1 simplification can model compounding-only and
  disclose it.

All of this is computed **in `intakeMap`** at stream-compile time using the methodology inflation
assumption — so the pure engine never deflates, and the deflation math gets its own unit test +
externally-derived golden (DND/012), not a perturbation of the engine spine.

## 6. Intake UX

- **Opt-in expander** ("other income — pension, rental, and the like"), off the 5-minute path
  (same protect-the-guided-path decision as portfolio-holdings). Add rows.
- **Per row, the guided fields**: type (seeds defaults) → amount + period → owner → start age.
- **Advanced (collapsed, seeded by type)**: COLA mode + rate, survivor %, taxable portion, end age.
- **The un-hideable fields** (no safe default, so they surface even on the guided path):
  - **alimony** → the post-2018 agreement-date question (flips taxability);
  - **pension/annuity** → the survivor-% prompt (never default 100%).
- All copy plain-language, through `copy.ts`, no jargon on the face ("does it keep up with
  inflation?" not "COLA"; "what happens to it if {spouse} passes first?" not "survivor annuity").

## 7. Open decisions for Briggsy (ATC)

1. **Intake depth.** Keep the advanced tier (COLA mode / survivor % / taxable % / end age) collapsed
   behind the row, or go even thinner for v1? *Rec: keep it — but two fields (alimony date, survivor
   %) cannot be safely defaulted, so they can't be hidden regardless.*
2. **Ship "other" (catch-all stream) in v1, or only the four named types?** *Rec: include "other" —
   it's free (same model).*
3. **R40 requirements entry.** This amends the locked R1–R39 contract. Confirm I add an R40 entry to
   the requirements doc as part of the build (fits the north-star; not FIRE).

## 8. OUT-but-disclosed residuals (each bounded + direction named)

- **Rental sale events** — depreciation recapture (§1250 25%), cap-gains-on-sale, step-up-at-death:
  OUT (we model rental as an ongoing income stream only). ✓ verified as the recommended boundary.
  Direction: slightly **optimistic** (ignores the depreciation shield eroding → real taxable rent
  rises; and ignores recapture tax on a future sale).
- **Pension/annuity basis-recovery dynamics** — the true Simplified-Method / exclusion-ratio tax-free
  portion is a *fixed nominal $ that shrinks in real terms then stops when basis is recovered*. v1
  replaces it with a flat `taxableFraction` the user opts into; **default stays fully taxable** (the
  conservative, MAGI-raising direction), so only an opt-in user accepts the simplification.
- **NIIT** (3.8%, only > $250k MFJ MAGI), **state-level alimony decoupling**, **annuity LIFO for
  non-annuitized partial withdrawals** (we model annuitized streams): OUT, disclosed.

## 9. Provenance corrections from the verify pass (do NOT mis-cite at build)

- **Rental ~100% survivor** rests on **state property law** (JTWROS / community property), *not* IRS
  Pub 559/551. Cite it to state law; only true if jointly owned / willed to the spouse.
- **Net rental ≠ real-flat**: gross rent tracks inflation, but the fixed-nominal depreciation shield
  erodes, so *taxable net* rent rises in real terms. We model net as real-flat as a **disclosed
  simplification**; verify the rent-CAGR figure against the BLS series before it goes load-bearing.
- **Pension QJSA consent** can be witnessed by a **plan representative OR a notary** — not strictly
  notarized (IRC 417(a)(2)). Copy must say so.
- **Alimony/pension/annuity COLA norms** are **practitioner/economic** facts, not IRS — label them as
  such (no IRS section governs whether a decree or annuity has a COLA).

## 10. Test plan (the correctness gates)

- **Reduce-to-spine byte-identity**: streams absent/zero ⇒ identical terminal + depletion to the spine
  (same seed).
- **Deflation vector unit test** (intakeMap): nominal-flat compiles to a geometrically-decaying real
  vector; real-flat to a flat vector; fixed-pct to the net-real-rate decay. Externally-derived
  goldens (DND/012), not engine-derived.
- **MAGI atomicity per type**: a taxable stream lifts SS-taxable portion AND ACA-MAGI AND IRMAA-MAGI
  consistently; a non-taxable stream (post-2018 alimony) nets the draw but moves **none** of them.
- **ACA subsidy-cliff**: a rental stream that pushes ACA-MAGI over the cliff drops the PTC (the real,
  important interaction).
- **Survivor-continuation path test**: at the owner's sampled death, the stream continues at
  `survivorPct` (pension) or stops (alimony 0%); the surviving-spouse year is correct.
- **Validate-params R19**: finiteness-first on every stream figure; alignment; age bounds; survivorPct
  ∈ [0,1]; taxableFraction ∈ [0,1].

---

### Appendix — verified tax facts (condensed; full evidence in the research run)

**Alimony** — post-2018 agreements: not taxable to recipient / not deductible by payer (TCJA; Pub
504, Topic 452). Pre-2019: taxable/deductible unless expressly modified. Reported Sch 1 line 2a → AGI.
Terminates at recipient death (§71(b)(1)(D)) → 0% survivor.
**Pension** — fully ordinary taxable (1040 5b); Simplified Method gives a fixed-nominal tax-free
basis portion that shrinks then stops (Pub 575). QJSA 50% federal floor; election single-life/50/75/
100 (IRC 401(a)(11)/417). Into AGI/MAGI → affects ACA/SS-taxation/IRMAA/Roth headroom.
**Rental** — net (gross − expenses − **depreciation**, 27.5yr SL) ordinary on Sch E → AGI/MAGI;
passive, no SE tax, continues past retirement until sold (Pub 527/925). Recapture/cap-gains/step-up
fire only on sale (OUT v1).
**Annuity** — qualified = fully taxable; non-qualified = exclusion ratio (basis/expected-return, Pub
939; 26 CFR 1.72-4), tax-free until basis recovered then 100% taxable; fixed = flat nominal, COLA =
optional rider that lowers initial payout; J&S survivor %; taxable portion → MAGI.
