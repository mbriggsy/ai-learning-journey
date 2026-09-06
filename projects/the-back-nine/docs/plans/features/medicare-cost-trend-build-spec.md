---
title: "The Medicare-cost-trend sourcing unit — build spec"
doc-type: build-spec
status: shipped
---

# The Medicare-cost-trend sourcing unit — build spec

> **Provenance:** research packet [`docs/research/medicare-cost-trend.md`](../../research/medicare-cost-trend.md)
> (wf_933cef3b-16b, 2026-07-19, cross-checker-verified byte-for-byte against the 2026 Trustees
> Report PDF) → pre-build council **wf_c673339e-257** (2026-07-19, full weight, 23 agents, 8/10
> RATIFY — `docs/council-log.md` top row; ONE crash = the craftsman's opening, a named 019
> abstention; **HAWK VETO on base-only scope fired + HONORED**). This is the as-built record —
> the shape the council ratified and what shipped against it, all on 2026-07-19 (commits
> ca41256f · 45a69496 · 02e2796a · db63b20e). Where it conflicts with older filings, this spec +
> the council row win. Per-unit build status lives in the roadmap's You-Are-Here table, never here.
>
> **What this unit did:** lifted THE STANDING BLOCKER on every conversion-bearing ranking. It
> sourced `medicareCostTrend`, flipped `PART_B_PRICING_MODE` `'real-flat'→'trended'`
> (`taxOverlay.ts:916`) with genuine per-year consumption (074: a stamp nothing reads prices
> nothing; 081: the label flip and the pricing change are ONE commit or the mirror lies),
> re-wired the two solver seams the U15 tripwire named (`solve.test.ts:220`), re-calibrated the
> conversion-near-tie demotion margin on a Medicare-bearing post-flip world (U15 council Q4d),
> and reworded the real-flat residual copy. Conversions rank end-to-end.

## The ratified rulings (council wf_c673339e-257 — binding; outcomes folded in)

1. **DIRECTION (settled):** real-flat and standalone shape (a) flat-ultimate are OUT — the
   optimistic sin in the conversion-payoff channel (the packet falsifies real-flat in every window).
2. **SHAPE — (c) leads, RANK-FLIP-PROBE-GATED:** (c) = Table V.E2 nominal verbatim 2026–2035
   (the 2026 row being the anchor, which lives in `partB2026`), deflated in-engine
   horizon-matched, + the +1.4%/yr real ultimate tail beyond 2035.
   The probe (S3): smooth (b) vs jagged (c) through the SHIPPED search→select path (095) on
   conversion candidates parked at near-decade IRMAA steps, with the 091 mechanism trace:
   - a flip driven by the CUMULATIVE cliff-decade trend → **(c) confirmed**;
   - a flip riding 2027's +3.25% single-year policy artifact → **(b)** (never anchor one year);
   - no flip → **(c)** on constants discipline + the clean annual re-verify.
   **(b) was the MANDATORY fallback** if the year-keyed premium step broke the ACA/IRMAA
   root-finders (insight 013 — gross-up convergence + bracket-fill rails under year-varying
   premiums). The probe ruled **(c)** on its no-flip arm and the fallback never fired (S3 below);
   (c) is what ships.
3. **SCOPE — full + DISAGGREGATED (the hawk's veto honored):**
   - Part B **base** trended (the constant's table).
   - Part B **IRMAA surcharge** DERIVED from the trended base via the statutory cost-share
     identity (tier totals = {35/50/65/80/85}% of full cost vs the base's 25% — the identity the
     `irmaa` constant already documents). NEVER a second re-typed V.E3 vector; **V.E3 is the
     DND-009 cross-check only.** Mechanically: surcharge_k(t) = pinned-2026 surcharge_k ×
     (partBBaseReal(t) / partBBaseReal(2026)) — exact 2026 tie-out by construction, proportional
     cost-share thereafter.
   - Part D **IRMAA surcharge**: its OWN path **iff primary-sourceable this unit** (against the
     same 2026 Trustees Report + IRA §11201); else **held-and-DISCLOSED** — never silently
     frozen. The Part B ratio must NEVER scale Part D (different program, different trend —
     unsourced cross-application is forbidden). **The pin landed the same day** (the Part D
     sourcing pass below): Table V.E4 prints the per-year per-tier add-ons, so Part D is consumed
     VERBATIM per tier — and the council's assumed mechanism (an IRA-2022 6%-capped path tied to
     the Part D *base* premium) was falsified by that primary across the 2030 boundary, the one
     dated mechanism correction in this unit (insight 098).
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
   CLAMP to the 2026 anchor real premium — conservative (the realized 2024/2025 nominal premiums,
   $174.70/$185.00, sit BELOW the 2026 anchor in `partB2026` — the anchor's one home; that
   realized pair is documentation in the trend entry's own comment, never a stored table row) and
   total (no new validateParams refusal hole; the 076 gate-contract sweep still runs). The clamp
   arm is tested ON the aged plants (`?vault=stale` / `?vault=statestale` — the 085
   engine-acceptance pin: doctored output → build → validate → a REAL outcome). The ~2075 tail
   splice is C0-continuous by construction, PINNED by test (value at 2035 == table's last real value;
   2036 == 2035 × 1.014-class factor; no jump).
7. **STALENESS:** a trend vintage joins `healthcareVintageStamp()` (the extras-2026b idiom —
   aged vaults' clocks fire BY DESIGN); the Trustees re-verify hook fires annually (a new report
   every ~June). The council framed the hook on the verify:aca pattern; it shipped instead as a
   dated wall-clock TRIPWIRE TEST (S6 below) — a Trustees release is a known calendar event, not
   the per-build legislative volatility a `verify:*` script guards.
8. **COPY:** the real-flat residual strings reworded — an atomic SWAP never an ADD (no
   over-claim to fit, no content cut), with the 087 comment-channel sweep; copyGuard + fit
   pins updated; the Caddie walks the changed surfaces. The tone shipped PILOT-CLEARED under the
   batched-oracle law (the walk + its chair fix are in S7 below).
9. **DISSENT (preserved):** minimalist — ship (b) as default; real-terms (b) dissolves the
   deflation/splice/013/aged-vault machinery. FLIP = the probe shows no flip AND (c)'s
   machinery proves real standing cost. A cumulative-cliff-traced flip kills the dissent. The
   probe found no flip, so the first conjunct held; the dissent failed on the second (S3 below).

## The stages, as built (all 2026-07-19)

- **S0 — the constant + the resolver machinery.** `medicareCostTrend` is a sourced entry
  (`src/engine/constants/health.ts`) carrying: the V.E2 nominal vector **2027–2035 VERBATIM**
  (full-vector pin, 021 — the test literal transcribed from the research packet, not the module;
  the 2026 anchor stays in `partB2026`, one home per figure, the identity test-pinned), the CPI
  path {nearTermAvg 3.2% (Table II.D1), ultimate 2.4% CPI-W (Table III.B12)}, the ultimate
  nominal growth 3.8%/yr (§III.D — the real +1.4%/yr is derived in
  the consumer, never stored; the report's own "1.7% real" is GDP-deflated and would overstate
  CPI-real by ~0.35pp, the packet's named trap), `vintage`, `directionalUntilPinned: false`,
  `reportEdition`, and `pinTo` the 2026 Trustees Report Tables V.E2/V.E4/II.D1/III.B12/§III.D.
  The pure resolver is `buildPartBPricingSchedule` (`healthOverlay.ts:506`), returning one
  `PartBYearPricing {baseMonthlyReal, scales}` per sim year: table years deflate nominal→real
  horizon-matched, pre-anchor years clamp to the anchor, post-edge rides the ultimate escalator
  off the edge's own real value (C0 by construction). It walks iteratively (cumulative multiplies,
  no per-year `pow`) because it runs once per PATH inside the 16k-path loop, and it re-asserts the
  table contract fail-loud — ascending contiguous from anchor+1, the Part D rows on the SAME year
  lattice, every figure finite > 0 (burned/062). The (b)-content twin table existed only in the
  working tree for the S3 probe and died with the ruling — it never shipped as dead code.
- **S1 — consumption (taxOverlay).** The once-bound `partBBaseMonthly` (`taxOverlay.ts:1097-1112`)
  became the per-year resolved pair at `startCalendarYear + t`, gated on the healthcare-priced arm;
  `medicareAnnualCost` + the readout split's `irmaaTierSurchargeMonthly` BOTH read the same
  resolved pair (the base-vs-surcharge split stays single-producer by construction — the scales are
  a REQUIRED param on both). `PART_B_PRICING_MODE` is `'trended'` (`taxOverlay.ts:916`), flipped in
  the same commit as the pricing (081). Gross-up/bracket-fill rails: thresholds untouched;
  convergence re-verified under year-varying premiums (013 watch) — see S3 for the measurement.
- **S2 — the solver seams (the tripwire's named pair).** `solve.ts`'s rankable partition derives
  from the token's trend clause, not the old hardcoded `conversion === null` filter;
  `enumerateWithheldConversionLevers` (`solve.ts:250`) self-empties as the clause clears; the U15
  tripwire test flipped to its post-sourcing form (the clause CLEARS and conversions RANK); the
  token's NC-blocks/FL-mints and remaining clauses were re-verified live, and the mint now
  evaluates the TRUE roster amounts. Because the live clause is clear, the mint gained a
  `_trendOverride` seam (`oracleToken.ts:309` — the `_epsilonRequired` precedent) so the blocking
  arm stays exercised. Conversions rank end-to-end (solve/solveEntry green: rankedIds 5-wide,
  `grid:taxable-first:20000/40000` present, withheld levers `[]`).
- **S3 — the rank-flip probe: (c) CONFIRMED.** The probe ran the SHIPPED search→select path (095)
  twice per goal on one all-65+ Medicare-priced world (MFJ 66/65, $2.1M/60-40 pretax-heavy, spend
  $105k, SS $44k, seeds 120k/120k, 2048 paths × 35yr, seed 0xa11ce), differing ONLY in the trend
  table's content: the live (c) V.E2 table vs a smooth (b) twin (real +2.9%/yr through 2035,
  `nominal(k) = anchor × (1.029 × 1.032)^k` off the `partB2026` anchor, through the SAME
  machinery). Candidates: conventional + pre-tax-first + 4 conversions (80k/140k/170k/200k × 3yr)
  straddling the first MFJ IRMAA threshold in the billed 2028–2030 window. **NO FLIP on either
  goal** — the rankings are IDENTICAL (`pre-tax-first:0 > conv:80k > conventional > conv:140k >
  conv:170k > conv:200k` under both pay-less-tax and leave-more). The 091 texture: between-ARM
  score deltas ≈ $140 on a ~$230k lifetime-tax statistic ((c) reads slightly COSTLIER — the
  conservative direction) vs between-CANDIDATE margins ≈ $7.7k, so the shape choice is ~50× below
  reordering scale on a deliberately step-straddling field. The (b)-fallback trigger (013 —
  root-finder breakage under the year-keyed step) did NOT fire: every gross-up converged across
  6 candidates × 2 arms × 2048 paths. Per the council's decision rule (no flip → (c) on constants
  discipline + the clean annual re-verify), **(c) ships**; the minimalist's dissent fails its
  second conjunct (the (c) machinery landed as one resolver + a clamp + a C0 splice — no new
  refusal domain, no 013 cost). The probe file (`probe.rankflip.tmp.test.ts`) and its report were
  deleted after the ruling; the world's shape is reused by the S4 calibration.
- **S4 — Q4d re-calibrated (the measurement recorded).** The conversion-near-tie demotion is now
  the scale-free SE-MULTIPLE `solverConversionNearTieDemotionSeMultiple = 10`
  (`src/engine/constants/solver.ts:103`), replacing the pre-flip Medicare-blind absolute 0.02. It
  was measured on TWO Medicare-bearing post-flip worlds (all-65+ MFJ, $1.9M pretax, spend
  124k/112k, a 30k×3yr conversion winner over conversion-0, 16k × 5 members, CRN-resolved): member
  margins 0.0021–0.0041 at margin/SE ratios ≤ 8.1, every member beyondBand. 10 = the class max +
  ~23% headroom (the U14 idiom). `MemberMargin` gained `se`; the demotion fires per-member
  (`margin < k × se` on ANY member — the conservative translation); the axis guard's prose was
  re-derived (survival-axis-only calibration) and the proving case re-worlded to the measured
  Medicare-bearing world. The effect, recorded honestly: the pre-flip proving world's class
  (margins ~0.011, ratios ~12–14) now sits OUTSIDE the width — the Medicare-bearing class defines
  the regime, per the ruling.
- **S5 — DND-012 + the cross-checks.** The resolver battery is `partBTrend.test.ts`, nine named
  ARMs plus their sub-arms — anchor / mid-table / clamp / C0-splice / long-tail / fail-loud (its
  own sub-block) / disaggregated scales / the 2026 tie-out (planted RED first) / the cost-share
  identity, plus the independent real-CAGR band arm that EXCLUDES both real-flat and the
  ultimate-deflator trap, plus the Part D per-tier block the same-day sourcing pass added (the
  ≈6%/yr capped years, the 2030 cliff breaking the cap, the beyond-2035 hold). The four
  Medicare-bearing fixture files were re-derived under the DND-012 + 091 discipline: each carries
  ONE canonical hand-oracle home (`partBBaseRealMonthly` in `taxOverlay.test.ts`, `baseRealAt` in
  `healthReadout.test.ts`, `baseRealMonthly` in `medicarePricing.test.ts` and
  `medicareExtras.test.ts`) applying this spec's formula by hand over symbolically-read constants,
  never the engine's resolver, with the mechanism trace in the fixture comments, and ZERO refused
  reconciliations — no unexplained delta surfaced. **The oracle-case audit (S5(iii): every U14
  oracle fixture read for Medicare exposure, any exposed hand ledger to be re-derived under
  trended pricing) found NONE of the 7 committed solver-cases reaches a trended-affected Medicare
  year** (all born 1966, age ≤ 64 at every horizon end; the one healthcare-ON case is the pre-65
  ACA cliff), so S5(iii) was a PROVEN no-op — consistent with the whole oracle roster staying
  green through the flip. The V.E3 DND-009
  cross-check landed in that same battery with the research's verbatim transcription: the derived
  Part B surcharge path reproduces CMS's independent Table V.E3 within max($0.50, 0.2%) across
  2027–2035, largest gap 0.09%.
- **S6 — staleness + the annual hook + aged vaults.** `partBTrendVintage` is additive-optional on
  `HealthcareVintageV3` (model + codec + `healthcareVintageStamp`), with the `part-b-trend`
  staleness clock (unconditional on mismatch, quiet on absence — both arms tested). The annual
  Trustees re-verify shipped as a dated wall-clock tripwire TEST, not a `verify:*` script:
  `src/engine/constants/__tests__/medicareTrend.reverify.tripwire.test.ts` pins
  `reportEdition === 2026` and goes RED on 2027-09-01 (the ~June release plus a verification
  season) — the `irmaaTopTierReindex` idiom, and the reason it is not the `verify:aca` pattern the
  council named: a Trustees release is a known calendar event, not per-build legislative
  volatility. The aged plants were driven live (`?vault=stale` / `?vault=statestale` — the 085
  engine-acceptance pin: doctored output → build → validate → a REAL outcome; the clamp arm
  witnessed).
- **S7 — copy + seeds + docs + gates.** The seed re-tunes ran under record-before-retune. THE DRIFT
  RECORD: retired twin 0.8555→0.8185 (on-track→borderline), nc 0.838→0.7995, dip nm [0,1,2]→[].
  RE-TUNED: retired IRA 1.00M→1.055M (twin 0.8585 on-track / nc 0.8425 borderline; the probed
  window [+42k, +58k] is narrow and +40k lands ON the 0.85 edge), dip 658k→700k / 282k→299k (the
  two-tier intersection was EMPTY on the prior proportional ray — the working point is off-ray, and
  the seed comment carries the full hunt). Only seeds whose NAMED purpose broke were re-tuned. The
  copy swap hit three strings (`verdictMedicareResidual`'s final sentence ≡ `verdictResidualTail`,
  plus `rothMedicareResidualNote`) as an atomic SWAP, with the 087 comment sweep, the two test
  literal re-points (FuckOffDate / stateTaxDisclosure), and copyGuard + drift-pins green; it swapped
  TWICE the same day — the interim wording narrowed the still-flat referent to the extra-coverage
  premiums *plus* the drug-plan surcharge piece, and the Part D sourcing pass below narrowed it to
  the extra-coverage premiums ALONE (the shipped string in `src/ui/copy.ts:1060`), with the roth
  note pricing the drug-plan piece's climb and naming the >2035 hold as its modeling choice.
  Architecture §7.2 was re-written to the trended contract; roadmap, TODO and the council-log
  action cell synced.

## The Part D sourcing pass — same day (2026-07-19, post-ca41256f)

The supplemental research returned **SOURCEABLE**: the 2026 Trustees Report prints BOTH the
per-year Part D base beneficiary premium (Table V.E2: $38.99 → $77.81, with the §11201 2030
formula reset $46.44→$68.93) AND the per-year per-tier Part D IRMAA add-ons (Table V.E4,
p.211–212, 2026–2035), every 2026 anchor matching our pinned constants TO THE CENT. The council's
source-it arm therefore applied — **with one dated MECHANISM CORRECTION (primary-source-wins,
insight 098): the council assumed the add-ons ride the Part D base premium; the primary falsifies
that across the 2030 boundary** (the tiers jump by DIFFERENT ratios — tier 1 ≈ 3.57×, tier 5 ≈
2.46× — while the base jumps 1.77×; V.E4 footnote 3 names the new base-premium percentage). So the
engine consumes **V.E4 verbatim per tier**: `partDIrmaa` joins `medicareCostTrend` (2027–2035 rows;
the 2026 anchor stays in `irmaa.tiers`, one home, identity-pinned), `IrmaaSurchargeScales.partD`
became `partDByTier` (`healthOverlay.ts:439-444` — a scalar is FORBIDDEN, it cannot represent the
2030 divergence), the resolver deflates V.E4 by the same horizon-matched deflator and HOLDS the
2035 real level beyond the printed edge (an unsourced tail is never extrapolated as sourced; the
hold's optimistic direction is disclosed in the constant note and the residual copy), and the
vintage bumped `part-b-trend-2026a` → `medicare-trend-2026a` (same-day, zero installed base). **The
interim (Part-D-flat) Tail sentence had wrapped one extra Linux-metrics line on the budget
composite and pushed the R13 disclaimer 1px past the fold on CI ONLY (run 29696587230 — the
burned/055 class); the shorter post-Part-D truth restores the one-line class** (insight 097). The
2035-edge Part D hold and the annual re-verify tripwire share the same ~2027 Trustees re-pin event.
**Committed 45a69496; CI GREEN by explicit id: run 29697251176 (completed·success). The unit's
first commit ca41256f remains red on record (run 29696587230) as the interim-sentence artifact,
superseded the same day.**

## The mutant battery (planted red → reverted, named killers)

All six planted, each red on its named killer, each reverted:

1. **The lying-mirror** — the mode flipped with the pricing left flat → 3 red (the flip witness +
   the LIVE clause arm + the mint).
2. **The wrong scale base** — a derived 2026 surcharge ≠ the pinned constant → 3 red (the anchor /
   scales / tie-out arms).
3. **The splice jump** — the ultimate tail anchored off the anchor year instead of the table edge →
   1 red (the C0 pin).
4. **The clamp direction** — pre-anchor years extrapolated DOWNWARD (optimistic) → 1 red (the clamp
   arm).
5. **The partition revert** — rankable re-hardcoded to `conversion === null` → 2 red (conversions
   orphaned: the rank arm + its sibling).
6. **The surcharge-scale base** — Part D scaled by the Part B ratio → 1 red (the disaggregation pin).

## The close

Gates green by the pilot's own hand at the S7 commit: typecheck · lint · the full vitest suite
(the live test count lives in README + roadmap, gated by `verify:doc-stats`; the same pass swapped
two README narrative clauses the flip had made false) · `verify:bundle` inside the byte budget ·
`verify:aca` · `verify:fit` (the re-tuned seeds + the reworded residual hold the one-frame law) ·
`verify:csp` · `verify:state-tax`.

Two follow-ups landed after that commit and closed the unit:

- **The Caddie pre-walk (02e2796a)** — panel wf_afe262c4-ca2, 34 agents, 16 refuter arms, on the
  residual family across retired/nc/fl. All three cards PILOT-CLEARED; 15 of 16 refuter arms killed
  their own claims against the bundle. The surviving arm named the real texture: the roth note used
  TWO metaphors for one event and left the surcharge's decomposition unbound. The chair fix put the
  sentence-pair on one verb and bound the piece possessively ("its drug-plan piece"), also killing
  the cross-surface polysemy with the landing's "a drug plan" (the O14 one-lexeme-two-referents
  class). FILED to the O-lane: the assumptions door carries no Medicare cost-trend registry line —
  the trend, the 2035 table edge and the drug-plan hold have no home on "Everything the answer
  leans on".
- **The ultramode fold (db63b20e)** — review wf_05ad8c04-f86, 12 finders including a 5-angle
  adversary panel, 14 findings all real. The one unanimous-material survivor was folded:
  `healthcareVintageStamp` had NO source-bind (the round-trip tests compared the stamp to its own
  output — the insight-081 tautology), so it now carries the same source-bind block as its siblings
  plus a determinism arm; the codec `partBTrendVintage` present/absent/non-string parity arm rode
  along. Eleven real-immaterial advisories were deferred as TODO prescriptions (the run-level
  `partBPricingByT` hoist, the 112k demotion-edge arm, the resolver's duplicated year-walk, two
  comment refreshes); the >2035-hold residual placement and the anchor-scale readout were both
  refuted as designed/disclosed. Insights 097 and 098 were written and indexed.
