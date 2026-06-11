---
title: Verify a gate's TARGET when writing the gate, not when clearing it — phantom URLs and unattainable bit-exactness survived a week as load-bearing exit criteria
date: 2026-06-11
phase: P1-exit pin pass
modules: [docs/plans, engine/reference/mortality, engine/reference/damodaranSeries]
tags: [validation-gates, phantom-target, bit-exact, bengen, table4c7, recon-before-build]
---

## Problem

Two of the three named P1-exit dataset gates were unsatisfiable AS WRITTEN.
(1) "Confirm against the actual `table4c7.html`" — that file never existed on
ssa.gov (clean 404; "4.C7" is Trustees-Report table NUMBERING, not a filename),
and the phantom URL had propagated into five docs plus a code comment. (2) "Pin
Bengen's 4.15% to bit-exact" — Bengen's own 1994 paper used ESTIMATED 1994–95
tail data and SBBI revises across yearbook editions, so no canonical dataset
exists to be exact against, at any price. A third assumption ("SSA bot-blocks
curl → manual fetch") dissolved on contact: the block is a probabilistic WAF
that a full browser-header set + retry loop defeats.

## Root Cause

The gates were written from research-summary memory ("SSA cohort tables =
table4c7") and from a study's headline number, without ever touching the named
target. A gate's TARGET is itself a factual claim — and an unverified one
calcifies, because everyone downstream treats the gate text as ground truth
and builds toward it.

## Fix

Recon agents fetched every gate target live BEFORE execution: found the real
cohort source (HistEst CSVs), proved the fetch recipe, and established the
bit-exact impossibility with sources — which let the re-scope be RATIFIED
(named proxy + survive/fail + independently-derived pinned counts) instead of
discovered mid-build. All phantom references corrected in the clearing commits.

## Key Insight

When a gate names a concrete external target (a URL, a dataset, an exact
figure), verifying that the target EXISTS and is attainable is part of WRITING
the gate — not a discovery to defer to clearing time. Corollaries: a
"known blocker" recorded from one failed probe (bot-blocks curl) deserves one
real recon attempt before it shapes a plan; and "bit-exact against a published
study" requires the study's own dataset to exist canonically — partly-estimated
or edition-revised sources can only ever support proxy + survive/fail bars.

## Also Applies To

The remaining pin targets (methodology moments → "re-derive from the committed
series"; survivor ratio → "the Blanchett paper" — verify the named paper states
an exact multiplier before gating on it); the U14 oracle's "hand-computable
known-best cases" (confirm each is actually computable before the harness is
built); any CI gate keyed to an external URL (verify:aca's source links).
