---
title: "A ratified MECHANISM is still a premise: the primary's own table outranks the council's guessed scaling (and only per-figure verbatim consumption survives a formula reset)"
date: 2026-07-19
phase: Act 4 (solver & recommendation)
modules: []
tags: [council, ratified-mechanism, premise, primary-source, part-d, irmaa, formula-reset, verbatim-table, probe-at-quoted-figure, clerk, proxy]
---

# 098 — A ratified MECHANISM is still a premise: the primary's own table outranks the council's guessed scaling (and only per-figure verbatim consumption survives a formula reset)

## Problem

**Context (the Part D sourcing pass, 2026-07-19).** The trend council (wf_c673339e-257) ratified
the Part D surcharge arm as "its OWN IRA-2022 6%-capped path **tied to the Part D base
premium**" — a plausible mechanism mirroring the Part B design (surcharge ∝ base via the
cost-share identity, which the primary CONFIRMS for Part B to ≤0.2% across V.E3). The primary
falsified it for Part D: across the 2030 §11201 formula reset the per-tier add-ons jump by
DIFFERENT ratios (tier 1 ≈ 3.57×, tier 5 ≈ 2.46×) while the base premium jumps 1.77× — no
scalar scale, and no derivation off the base, can reproduce Table V.E4's own rows.

## Root Cause

**The insight-074 tail, extended one level:** 074 said a council-ratified premise about ENGINE
BEHAVIOR is still a premise. This is the same law one level up — a ratified premise about the
SOURCE's OWN STRUCTURE (how a table's rows relate) is still a premise, verifiable only by the
table itself. A council can settle the decision arms; it cannot settle what a primary prints.

## Fix

The implementation shipped V.E4 VERBATIM per tier (the scales interface went per-tier so the
scalar shape is structurally unrepresentable), with the mechanism correction recorded as a
dated note in the build spec and the council log's action cell — the ARM (source-it) stood;
only the guessed mechanics moved.

## Key Insight

**Rules:**
1. **When a council ratifies "derive Y from X via mechanism M," the build's first act is to
   check M against the primary's own printed values for Y** — the identity either reproduces
   the table (Part B: derived vs V.E3 ≤ 0.2% → derivation sanctioned, table = cross-check) or
   it doesn't (Part D: divergent per-tier ratios → consume the table verbatim, mechanism
   corrected on the record). Never ship the ratified mechanism unchecked because ratification
   felt like verification.
2. **A statutory formula RESET (a cap lapsing, a base-percentage redefinition) breaks every
   proportionality assumption across its boundary.** Fit no single rate, ratio, or scaling
   across such a boundary; the reset year's values are DATA. (The sibling of insight 022's
   frozen-base trap — there the formula's base diverged from the sibling figure; here the
   formula itself is replaced mid-table.)
3. **Record mechanism corrections as dated notes at BOTH decision homes** (the build spec's
   stamp + the council log's action cell) so the next reader sees the ruling's arm honored and
   the mechanics superseded — never a silent divergence from a ratified text.

## Also Applies To

**Also applies to:** any constants family where a council/plan names a derivation shape before
the primary is fully transcribed; tax provisions with scheduled formula changes (the IRMAA
top-tier 2028 re-index; bracket-methodology changes); any "scale the old table forward" refresh.

## Extended (2026-11-23): a council's own figure is a premise too, so probe the engine at the quoted figure

The same law reaches past a source's structure to a council's working numbers. In the 2026-09-26 trim clause's
council, a proxy figure read as honest to all eight machine seats; the clerk's first engine run at the quoted figure
showed it off by about 2×. Every seat had argued the clause's words from a number nobody had run. A council can settle
the words; only the engine can settle the figure they describe. Run the engine at the figure a draft quotes before the
words are debated ([[163]] makes the same point for a walk seat's or an adversary's figure).
