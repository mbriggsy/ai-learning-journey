---
title: The Medicare-cost-trend research packet (the `medicareCostTrend` sourcing unit's substrate)
doc-type: research
status: shipped
created: 2026-07-19
derives-from: [docs/product.md]
sources: [docs/research/pre65-healthcare.md]
---

# The Medicare-cost-trend research packet (the `medicareCostTrend` sourcing unit's substrate)

> **Provenance:** research fan-out **wf_933cef3b-16b** (2026-07-19 — 6 hunter angles + an
> adversarial cross-checker that pulled the primary PDF and re-derived every load-bearing
> figure; one hunter — the second-sources angle — crashed at the StructuredOutput cap and is a
> NAMED abstention per insight 092; its territory is partially covered by the cross-checker's
> independent KFF/CRFB corroborations, and the build should not lean on secondary color beyond
> what is cited here). **Consumer:** the `medicareCostTrend` Unsourced sentinel
> (`src/engine/constants/health.ts:192`) + the Part-B pricing flip (`PART_B_PRICING_MODE`,
> taxOverlay) + the U15 fold's trend-unblock tripwire (solve.ts's conversion partition) + the
> post-flip demotion-margin calibration (U15 council Q4d).

## The confirmed primary figures (2026 Medicare Trustees Report, released 2026-06-09 — ONE edition, no mixing)

All verified byte-for-byte against `https://www.cms.gov/files/document/2026-medicare-trustees-report.pdf`:

1. **Table V.E2 (p.207) — projected standard monthly Part B premium, NOMINAL, per year:**
   2026 **$202.90** (finalized — the runtime home is `partB2026` in `src/engine/constants/health.ts`; the CMS-sourced pin and its provenance live in [pre65-healthcare.md](pre65-healthcare.md), this row is the Trustees' own V.E2 transcription and must agree with it) · 2027 $209.50 · 2028 $224.50 · 2029 $238.50 · 2030 $255.50 ·
   2031 $272.10 · 2032 $290.20 · 2033 **$313.60** · 2034 $338.50 · 2035 $360.60.
   (Anchors: 2024 $174.70 · 2025 $185.00. Secondary press prints 2033 as $313.65 — the primary
   PDF prints **$313.60**; primary wins.) Table V.E3 (p.208) holds the IRMAA add-ons 2007–2035
   if bracket surcharges ever need projection.
2. **CPI deflator (intermediate): ultimate 2.4%/yr** (CPI-W — the COLA index; §III.B, Table
   III.B12); **near-term 2026–2035 average 3.2%** (Table II.D1), declining to the ultimate.
3. **Ultimate per-beneficiary Part B cost growth: 3.8%/yr NOMINAL** (excl. demographics —
   the correct escalator basis for an age-modeled household; the report's "1.7% real" is
   **GDP-price-index**-deflated (implied deflator ≈2.06%), NOT CPI — importing it overstates
   CPI-real by ~0.35pp).
4. **Near-term (the IRMAA-cliff / conversion decade): Part B aggregate 8.5%/yr 2026–2030**
   (§II.F1 prose; includes ~1.7%/yr enrollment growth — never apply to a fixed household);
   **SMI per-capita 6.3%/yr 2026–2035** (Table II.F2), differential over per-capita GDP
   decaying **3.9% → 1.4% → 0.6% → 0.2%** across the four quarter-century windows.
5. **2025-report fallback** (Table V.E2, p.204): the 2026 edition REVISED projections DOWN
   (2027: $209.50 vs the prior $218.60) — one fallback cell independently confirmed; the
   edition split is clean.

## The derivations (NEVER printed in the report — the citation must say "derived")

- Nominal premium CAGR off Table V.E2: 2026→2035 **6.60%/yr** · 2026→2031 **6.05%/yr**
  (cross-checker reproduced by python; KFF/CRFB quote the same 6.6% — it is a derivation they
  also made, not a Trustees statement).
- **Real premium growth over CPI:** near-term, deflated by the HORIZON-MATCHED 3.2% near-term
  CPI: **≈ +2.8%/yr (2026–2031)**, ≈ +3.3% (2026→2035). (Deflating the near-term path by the
  2.4% ULTIMATE CPI instead yields 3.56–4.10% — a horizon mismatch the cross-checker ruled
  against; the disagreement is preserved, not averaged.)
- **Long-run structural real trend over CPI:** 3.8% nominal − 2.4% CPI ⇒ **≈ +1.4%/yr**
  (multiplicative 1.038/1.024−1 = 1.37%).
- Realized historical anchor (CMS premium history 2006–2026 vs CPI-U): **≈ +1.6–1.9%/yr
  real** — the backward band; hold-harmless artifacts distort endpoint CAGRs (2016's BBA
  surcharge, 2010–2015 suppression, 2023's decline), prefer a log-linear fit.

## The verdict texture

Every load-bearing figure **CONFIRMED** against the primary PDF; the 2025-fallback path
UNVERIFIABLE beyond one confirmed cell (acceptable — it is the named fallback, not the pin).
Named traps the cross-checker killed: the "6%/yr cap" is a **Part D** IRA-2022 provision, not
a Part B premium bound; Gemini grounding itself committed the deflator error (added CPI to the
GDP-deflated 1.7% to "compute" 4.1% nominal — the packet's 3.8% primary read stands); the
report's "Part B PRICE growth below CPI" is the service input-price index, never the premium.

## THE SHAPE QUESTION (the build unit's one real decision — judgment, not lookup)

**Real-flat is falsified by every window.** The candidate shapes:

- **(a) flat ultimate +1.4%/yr real** — the sourced structural floor, but it UNDER-prices the
  2026–2035 cliff window (~+2.8–3%/yr real) — **the optimistic direction in exactly the
  conversion-payoff channel** (under-trending FLATTERS conversions: the direction-law reading
  is that (a) alone is the same sin real-flat commits, smaller).
- **(b) the two-regime escalator** — ≈ +2.8–3%/yr real through ~2035 tapering to +1.4%/yr
  (the Table II.F2 differential decay is the sourced taper shape).
- **(c) the year-keyed primary table** — Table V.E2's nominal premiums verbatim 2026–2035
  (zero derivation in the near decade), deflated in-engine, + the +1.4% ultimate escalator
  beyond 2035. Most primary-faithful; the table's edge (2035) and the annual re-verify hook
  (the verify:aca pattern — a new Trustees Report every ~June) fit the constants discipline.

Directional honesty ranks (c) ≥ (b) > (a). The consumption design (how taxOverlay's Part-B
pricing reads it under `PART_B_PRICING_MODE`), the DND-012 re-derived fixtures, the token
clause's both-halves check, and the U15-council-ruled post-flip demotion-margin calibration
(scale-free SE-multiple on a Medicare-bearing world) land with the build. Remaining named
gaps: the post-2035 tail rests on ultimate assumptions (sourced, coarser); 2027's low +3.25%
is a policy artifact (never anchor one year); the Part-B-only near-term per-capita rate
(~6.8% nominal) is derived, not printed.
