# The Medicare-cost-trend sourcing unit — build spec

> **Provenance:** research packet [`docs/research/medicare-cost-trend.md`](../../research/medicare-cost-trend.md)
> (wf_933cef3b-16b, 2026-07-19, cross-checker-verified byte-for-byte against the 2026 Trustees
> Report PDF) → pre-build council **wf_c673339e-257** (2026-07-19, full weight, 23 agents, 8/10
> RATIFY — `docs/council-log.md` top row; ONE crash = the craftsman's opening, a named 019
> abstention; **HAWK VETO on base-only scope fired + HONORED**). This spec is the executable
> shape; where it conflicts with older filings, this spec + the council row win. Supersessions
> land here as dated in-body stamps (the U13/U14/U15 idiom).
>
> **What this unit is:** THE STANDING BLOCKER for every conversion-bearing ranking. It sources
> `medicareCostTrend`, flips `PART_B_PRICING_MODE` `'real-flat'→'trended'` with genuine per-year
> consumption (074: a stamp nothing reads prices nothing; 081: the label flip and the pricing
> change are ONE commit or the mirror lies), re-wires the two solver seams the U15 tripwire names
> (`solve.test.ts:220`), re-calibrates the conversion-near-tie demotion margin on a
> Medicare-bearing post-flip world (U15 council Q4d), and rewords the real-flat residual copy.

## The ratified rulings (council wf_c673339e-257 — binding)

1. **DIRECTION (settled):** real-flat and standalone shape (a) flat-ultimate are OUT — the
   optimistic sin in the conversion-payoff channel (the packet falsifies real-flat in every window).
2. **SHAPE — (c) leads, RANK-FLIP-PROBE-GATED:** (c) = Table V.E2 nominal verbatim 2026–2035,
   deflated in-engine horizon-matched, + the +1.4%/yr real ultimate tail beyond 2035.
   The probe (S3): smooth (b) vs jagged (c) through the SHIPPED search→select path (095) on
   conversion candidates parked at near-decade IRMAA steps, with the 091 mechanism trace:
   - a flip driven by the CUMULATIVE cliff-decade trend → **(c) confirmed**;
   - a flip riding 2027's +3.25% single-year policy artifact → **(b)** (never anchor one year);
   - no flip → **(c)** on constants discipline + the clean annual re-verify.
   **(b) is the MANDATORY fallback** if the year-keyed premium step breaks the ACA/IRMAA
   root-finders (insight 013 — watch gross-up convergence + bracket-fill rails under year-varying
   premiums).
3. **SCOPE — full + DISAGGREGATED (the hawk's veto honored):**
   - Part B **base** trended (the constant's table).
   - Part B **IRMAA surcharge** DERIVED from the trended base via the statutory cost-share
     identity (tier totals = {35/50/65/80/85}% of full cost vs the base's 25% — the identity the
     `irmaa` constant already documents). NEVER a second re-typed V.E3 vector; **V.E3 is the
     DND-009 cross-check only.** Mechanically: surcharge_k(t) = pinned-2026 surcharge_k ×
     (partBBaseReal(t) / partBBaseReal(2026)) — exact 2026 tie-out by construction, proportional
     cost-share thereafter.
   - Part D **IRMAA surcharge**: its OWN IRA-2022 6%-capped path tied to the Part D base
     premium **iff primary-sourceable this unit** (S5 attempts the pin against the same 2026
     Trustees Report + IRA §11201); else **held-and-DISCLOSED** — never silently frozen. The
     Part B ratio must NEVER scale Part D (different program, different trend — unsourced
     cross-application is forbidden).
   - IRMAA **MAGI thresholds** stay real-flat under the standing 2028 top-tier tripwire, disclosed.
   - The COMBINED per-tier surcharge **ties out at 2026** against the pinned constants, the
     tie-out test planted RED first.
4. **DEFLATION (under (c)):** store the nominal V.E2 vector verbatim + the sourced CPI path
   (near-term 3.2%/yr avg 2026–2035, Table II.D1; ultimate 2.4% CPI-W, Table III.B12), deflate
   in-engine HORIZON-MATCHED — never the 2.4% ultimate on the near decade. Derivations carry
   "derived" citations (022). DND-012 fixture expectations derive from the packet's published
   CAGRs + the realized 2006–2026 real band — never from the engine's own deflation.
5. **CONSUMPTION — both halves ATOMIC in ONE commit:** the lying-mirror arm proven RED first
   (a fake-sourced entry with an unmoved pricing mode must still block — the token's existing
   planted-witness), then: the `'trended'` flip + the per-year pricing + BOTH solver seams +
   the Q4d re-cal land together.
6. **AGED-VAULT DOMAIN (under (c)):** pre-anchor sim years (an aged vault's 2024/2025 year-0)
   CLAMP to the 2026 anchor real premium — conservative (realized 2024/2025 real premiums sit
   BELOW the 2026 real level: $174.70/$185.00 nominal vs $202.90) and total (no new
   validateParams refusal hole; the 076 gate-contract sweep still runs). The clamp arm is
   tested ON the aged plants (`?vault=stale` / `?vault=statestale` — the 085 engine-acceptance
   pin: doctored output → build → validate → a REAL outcome). The ~2075 tail splice is
   C0-continuous by construction, PINNED by test (value at 2035 == table's last real value;
   2036 == 2035 × 1.014-class factor; no jump).
7. **STALENESS:** a trend vintage joins `healthcareVintageStamp()` (the extras-2026b idiom —
   aged vaults' clocks fire BY DESIGN); the annual Trustees re-verify hook lands on the
   verify:aca pattern (a new report every ~June; next due ~2027-06).
8. **COPY:** the real-flat residual strings reworded — an atomic SWAP never an ADD (no
   over-claim to fit, no content cut), with the 087 comment-channel sweep; copyGuard + fit
   pins updated; the Caddie walks the changed surfaces. ⚑ the exact replacement TONE is
   digest-flagged for Briggsy's eye (ships PILOT-CLEARED under the batched-oracle law).
9. **DISSENT (preserved):** minimalist — ship (b) as default; real-terms (b) dissolves the
   deflation/splice/013/aged-vault machinery. FLIP = the probe shows no flip AND (c)'s
   machinery proves real standing cost. A cumulative-cliff-traced flip kills the dissent.

## The phases

- **S0 — the constant + the resolver machinery (shape-agnostic).**
  `medicareCostTrend` becomes a sourced entry carrying: the V.E2 nominal vector 2026–2035
  VERBATIM (full-vector pin, 021 — the test literal transcribed from the research packet, not
  the module), anchors 2024/2025 (documentation), the CPI path {nearTermAvg 3.2%, ultimate
  2.4%}, the ultimate real growth (+1.4%/yr, citation "derived: 3.8% nominal − 2.4% CPI-W,
  multiplicative 1.0137"), `vintage: 'part-b-trend-2026a'`, `directionalUntilPinned: false`,
  `pinTo` the 2026 Trustees Report Table V.E2/II.D1/III.B12, `reVerifyEveryBuild`-class annual
  hook metadata. A pure resolver (healthOverlay.ts) maps calendarYear → {partBBaseMonthlyReal,
  surchargeScale}: table years deflate nominal→real horizon-matched; pre-anchor clamps to the
  anchor; post-2035 rides the ultimate escalator off the 2035 real value (C0). The (b)-content
  twin table is PREPARED for the probe (never committed as the shipped value unless S3 rules (b)).
- **S1 — consumption (taxOverlay).** The once-bound `partBBaseMonthly` (taxOverlay.ts:1161)
  becomes the per-year resolved pair at `startCalendarYear + t`; `medicareAnnualCost` + the
  readout split's `irmaaTierSurchargeMonthly` call BOTH read the same resolved pair (the
  base-vs-surcharge split stays single-producer by construction). `PART_B_PRICING_MODE` flips
  `'trended'` in this same change. Gross-up/bracket-fill rails: thresholds untouched;
  convergence re-verified under year-varying premiums (013 watch).
- **S2 — the solver seams (the tripwire's named pair).** solve.ts's rankable partition derives
  from the token's trend clause (never the hardcoded `conversion === null` filter);
  `enumerateWithheldConversionLevers` empties as the clause clears; the tripwire test flips to
  its post-sourcing form (pinning the clause CLEARS + conversions RANK); the token's
  NC-blocks/FL-mints and remaining clauses re-verified live.
- **S3 — THE RANK-FLIP PROBE (the shape gate).** Pre-commit, working tree: probe worlds =
  conversion candidates parked at near-decade IRMAA steps (a MAGI just under/over tier
  thresholds in 2027–2033), run the SHIPPED search→select path under (c) content, then (b)
  content. Record rankings, crowns, margins. Mechanism-trace any flip (091). RULE the shape;
  record the dated ruling + the probe numbers HERE in a build stamp. The un-ruled twin table
  dies (never ships as dead code).
- **S4 — Q4d re-cal.** The conversion-near-tie demotion margin re-calibrated as a scale-free
  SE-multiple, measured ONLY on a Medicare-bearing post-flip world (recorded pre-commit probe,
  the U14 S4 idiom: margins at 16k×5, CRN-resolved). `solverConversionNearTieDemotionMargin`
  updated with the measurement in its citation.
- **S5 — DND-012 + cross-checks.** (i) The 2026 tie-out planted RED then green. (ii) V.E3
  DND-009 cross-check: derived surcharge path ≈ the Trustees' projected add-ons (tolerance
  named, direction checked). (iii) Every U14 oracle fixture audited for Medicare exposure —
  any Medicare-bearing world's hand ledger RE-DERIVED under trended pricing (091: trace, never
  reconcile). (iv) The Part D disposition: attempt the primary pin (Trustees Part D projection
  + IRA §11201 6% cap); else held-and-disclosed with the residual naming it. (v) Fixture
  expectations for the resolver derive from the packet's numbers by hand.
- **S6 — staleness + the annual hook + aged vaults.** The trend vintage joins
  `healthcareVintageStamp()`; `verify:medicare-trend`-class annual re-verify (script + CI wire,
  the verify:aca pattern; due-date ~2027-06 keyed to the next Trustees release); the aged
  plants driven live (stale/statestale: gate → affirm → REAL outcome; the clamp arm witnessed).
- **S7 — copy + seeds + docs + gates.** The residual/affirmation strings swept (the real-flat
  disclosure reworded; 087 comment sweep; copyGuard; fit pins per-seed re-proven); dev-seed
  outcome drift RECORDED before any re-tune (the Medicare-pricing-unit precedent), purpose
  pins re-tuned only where a seed's NAMED purpose broke; docs synced (roadmap, TODO,
  architecture §7.2/§8, council-log action cell); the Caddie pre-walk on changed surfaces;
  planted-mutant battery red→reverted with named killers (lying-mirror, tie-out, splice-jump,
  clamp-direction, partition-revert, surcharge-scale-sign); full gates + CI by explicit id.

## Mutant battery (planted red → reverted, named killers)

1. The lying-mirror: mode flipped with the pricing left flat → the token's planted-witness reds.
2. The tie-out: a derived 2026 surcharge ≠ the pinned constant → S5(i) reds.
3. The splice jump: an ultimate tail anchored off the anchor year instead of 2035 → the C0 pin reds.
4. The clamp direction: pre-anchor years extrapolated DOWNWARD (optimistic) → the clamp arm reds.
5. The partition revert: rankable re-hardcoded to `conversion === null` → conversions orphan, the S2 pin reds.
6. The surcharge-scale sign/base: Part D scaled by the Part B ratio → the disaggregation pin reds.

## Build stamps (dated, in-body — appended as phases land)

**S3 — THE RANK-FLIP PROBE RULED: (c) CONFIRMED (2026-07-19).** The probe ran the SHIPPED
search→select path (095) twice per goal on one all-65+ Medicare-priced world (MFJ 66/65,
$2.1M/60-40 pretax-heavy, spend $105k, SS $44k, seeds 120k/120k, 2048 paths × 35yr, seed
0xa11ce), differing ONLY in the trend table's content: the live (c) V.E2 table vs a smooth (b)
twin (real +2.9%/yr through 2035, `nominal(k) = 202.90 × (1.029 × 1.032)^k` through the SAME
machinery). Candidates: conventional + pre-tax-first + 4 conversions (80k/140k/170k/200k × 3yr)
straddling the first MFJ IRMAA threshold in the billed 2028–2030 window. **RESULT: NO FLIP on
either goal** — the full rankings are IDENTICAL (`pre-tax-first:0 > conv:80k > conventional >
conv:140k > conv:170k > conv:200k` under both pay-less-tax and leave-more). The 091 texture:
between-ARM score deltas ≈ $140 on a ~$230k lifetime-tax statistic ((c) reads slightly
COSTLIER — the conservative direction) vs between-CANDIDATE margins ≈ $7.7k — the shape choice
is ~50× below reordering scale on a deliberately step-straddling field. The (b)-fallback
trigger (insight 013 — root-finder breakage under the year-keyed step) did NOT fire: every
gross-up converged across 6 candidates × 2 arms × 2048 paths. Per the council's decision rule
(no flip → (c) on constants discipline + the clean annual re-verify), **(c) ships**; the
minimalist's dissent flip-condition fails on its second conjunct (the (c) machinery landed as
one resolver + a clamp + a C0 splice — no new refusal domain, no 013 cost). The probe file
(`probe.rankflip.tmp.test.ts`) + its report were deleted after this stamp; the world's shape is
reused by the S4 Q4d calibration.

**S0–S2 — SHIPPED (2026-07-19):** the sourced `medicareCostTrend` (V.E2 verbatim 2027–2035;
anchor stays in `partB2026`, identity test-pinned; macro figures II.D1/III.B12/§III.D;
vintage `part-b-trend-2026a`) + `buildPartBPricingSchedule` (healthOverlay — iterative walk,
clamp, C0 tail) + the disaggregated `IrmaaSurchargeScales` threading (REQUIRED param on
`irmaaTierSurchargeMonthly`/`medicareAnnualCost`; `nextIrmaaStep` documented anchor-scale) +
the per-year taxOverlay binding gated on the healthcare-priced arm + `PART_B_PRICING_MODE:
'trended'` + BOTH solver seams (the partition derives from the trend clause; the withheld
enumeration self-empties; the tripwire flipped to its post-sourcing witness form; the mint
evaluates the TRUE roster amounts; `_trendOverride` mint seam added — the `_epsilonRequired`
precedent, since the live clause is now clear). Conversions RANK end-to-end (solve/solveEntry
green: rankedIds 5-wide, `grid:taxable-first:20000/40000` present, withheld levers []).

**S4 — Q4d RE-CALIBRATED (2026-07-19, the measurement recorded):** the demotion re-shaped to
the scale-free SE-MULTIPLE (`solverConversionNearTieDemotionSeMultiple = 10`, replacing the
pre-flip Medicare-blind absolute 0.02): measured on TWO Medicare-bearing post-flip worlds
(all-65+ MFJ, $1.9M pretax, spend 124k/112k, 30k×3yr conversion winner over conversion-0,
16k × 5 members) — member margins 0.0021–0.0041 at margin/SE ratios ≤ 8.1, every member
beyondBand (CRN resolves the margin; the demotion is the shape-residual caution). 10 = the
class max + ~23% headroom (the U14 idiom). `MemberMargin` gains `se`; the demotion fires
per-member (`margin < k × se` on ANY member — the conservative translation); the axis guard's
prose re-derived (survival-axis-only calibration); the proving case re-worlded to the measured
Medicare-bearing world. NOTE the effect recorded honestly: the pre-flip proving world's class
(margins ~0.011, ratios ~12–14) now sits OUTSIDE the width — the Medicare-bearing class
defines the regime, per the ruling.

**S6 (core) — SHIPPED (2026-07-19):** `partBTrendVintage` additive-optional on
`HealthcareVintageV3` (model + codec + `healthcareVintageStamp`), the `part-b-trend`
staleness clock (unconditional on mismatch, quiet on absence — both arms tested), and the
annual Trustees re-verify tripwire (`medicareTrend.reverify.tripwire.test.ts`, reds
~Sep 1 of reportEdition+1 — the irmaaTopTierReindex idiom).

**S7 (partial) — SHIPPED (2026-07-19):** the seed re-tunes under record-before-retune — the
DRIFT RECORD: retired twin 0.8555→0.8185 (on-track→borderline), nc 0.838→0.7995, dip nm
[0,1,2]→[] — re-tuned: retired IRA 1.00M→1.055M (twin 0.8585 on-track / nc 0.8425 borderline,
the probed window [+42k, +58k] is narrow, +40k lands ON the 0.85 edge), dip 658k→700k /
282k→299k (the two-tier intersection was EMPTY on the prior proportional ray; the working
point is off-ray — the seed comment carries the full hunt). The three-string copy swap
(`verdictMedicareResidual` final sentence ≡ `verdictResidualTail` + `rothMedicareResidualNote`)
— the still-flat referent narrowed to the extra-coverage premiums + the drug-plan surcharge
piece; the roth note's "shade easier" cause re-attributed to the genuinely-still-flat piece
with the climb affirmed; 087 comment sweep + the two test-literal re-points
(FuckOffDate/stateTaxDisclosure); copyGuard + drift-pins green. Architecture §7.2 re-written
to the trended contract.

**S5 — CLOSED (2026-07-19):** the resolver battery authored (`partBTrend.test.ts`, 13 arms —
anchor/mid-table/clamp/C0-splice/long-tail/fail-loud/scales/2026-tie-out/cost-share-identity +
the independent real-CAGR band arm that EXCLUDES both real-flat and the ultimate-deflator trap);
the four Medicare-bearing fixture files re-derived under the DND-012 + 091 discipline (each file
carries ONE canonical hand-oracle home — `partBBaseRealMonthly`/`baseRealAt` applying the spec's
formula by hand over symbolically-read constants, never the engine's resolver — with the
mechanism trace in the fixture comments; ZERO refused reconciliations = no unexplained delta
surfaced). **The oracle-case audit: NONE of the 7 committed solver-cases reaches a
trended-affected Medicare year** (all born 1966, age ≤ 64 at every horizon end; the one
healthcare-ON case is the pre-65 ACA cliff) — S5(iii) is a PROVEN no-op, consistent with the
whole oracle roster staying green through the flip. **The Part D disposition:** the supplemental
primary-sourcing attempt (the Trustees' Part D tables + IRA §11201) had not returned a verdict
at close — the unit ships the council's ratified FALLBACK (held-and-DISCLOSED: scale 1 +
the residual naming the drug-plan piece); if the research lands 'sourceable', building the
Part D path is its own small follow-up increment, never a rider.

**THE PART D SOURCING PASS — SAME DAY (2026-07-19, post-ca41256f):** the supplemental research
returned **SOURCEABLE** — the 2026 Trustees Report prints BOTH the per-year Part D base
beneficiary premium (Table V.E2: $38.99 → $77.81, with the §11201 2030 formula reset
$46.44→$68.93) AND the per-year per-tier Part D IRMAA add-ons (Table V.E4, p.211–212,
2026–2035), every 2026 anchor matching our pinned constants TO THE CENT. The council's
source-it arm therefore applies — **with one dated MECHANISM CORRECTION (primary-source-wins):
the council guessed the add-ons ride the Part D base premium; the primary falsifies that
across the 2030 boundary** (the tiers jump by DIFFERENT ratios — tier 1 ≈ 3.57×, tier 5 ≈
2.46× — while the base jumps 1.77×; V.E4 footnote 3 names the new base-premium percentage),
so the engine consumes **V.E4 verbatim per tier**: `partDIrmaa` joins `medicareCostTrend`
(2027–2035 rows; the 2026 anchor stays in `irmaa.tiers` — one home, identity-pinned),
`IrmaaSurchargeScales.partD` became `partDByTier` (scalar FORBIDDEN — it cannot represent the
2030 divergence), the resolver deflates V.E4 by the same horizon-matched deflator and HOLDS
the 2035 real level beyond the printed edge (an unsourced tail is never extrapolated as
sourced; the hold's optimistic direction is the constant note's + detail-door era's residual),
and the vintage bumped `part-b-trend-2026a` → `medicare-trend-2026a` (same-day, zero installed
base). The V.E3 DND-009 cross-check LANDED with the research's verbatim transcription: the
derived Part B surcharge path reproduces CMS's independent Table V.E3 within max($0.50, 0.2%)
across 2027–2035 (largest gap 0.09%). The residual copy swapped a SECOND time — the still-flat
referent is now the extra-coverage premiums ALONE, and the roth note prices the drug-plan
piece's climb with the >2035 hold as its named modeling choice. **The interim (Part-D-flat)
Tail sentence had also wrapped one extra Linux-metrics line on the budget composite and pushed
the R13 disclaimer 1px past the fold on CI ONLY (run 29696587230 — the burned/055 class); the
shorter post-Part-D truth restores the one-line class.** The 2035-edge Part D hold + the
annual re-verify tripwire share the same ~2027 Trustees re-pin event.

**S7 — CLOSED (2026-07-19):** the mutant battery — 6 planted red → reverted with named
killers: (1) the lying-mirror mode revert → 3 red (the flip witness + the LIVE clause arm +
the mint); (2) the wrong scale base → 3 red (anchor/scales/tie-out arms); (3) the splice
anchored off the anchor year → 1 red (the C0 pin); (4) pre-anchor extrapolated DOWNWARD →
1 red (the clamp arm); (5) the partition re-hardcoded to `conversion === null` → 2 red
(conversions orphaned — the rank arm + its sibling); (6) Part D ridden on Part B's ratio →
1 red (the disaggregation pin). GATES, all green by the pilot's own hand: typecheck · lint ·
**2716 tests / 145 files** · bundle 249.8 KiB · verify:aca · verify:doc-stats (README +
roadmap counts + the two now-false README narrative clauses swapped) · **verify:fit 28/28**
(the re-tuned seeds + the reworded residual hold the one-frame law) · verify:csp 13 ·
verify:state-tax. The Caddie walk on the reworded residual family + the ultramode review
follow this stamp's commit.
