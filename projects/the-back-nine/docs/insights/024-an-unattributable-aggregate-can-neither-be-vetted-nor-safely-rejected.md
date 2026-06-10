---
title: An unattributable aggregate can neither be vetted nor safely rejected — carry per-entity attribution through the wire
date: 2026-06-10
phase: P1 accumulation Track C2 (boundary review, wave 2)
modules: [engine/taxOverlay, engine/simulate]
tags: [attribution, fail-loud, dead-slot, aggregates, guard-design, insight-020, verify-panel-dissent]
---

## Problem

The C2 review's caller adversary found the dead-slot contribution guard covered only the
`pretaxByPerson` channel: `YearContribution.taxable/roth/hsa` were pre-collapsed household
scalars, so a direct caller's dead-spouse taxable credit landed silently (the optimistic
phantom). The finding's suggested fix — reject any nonzero aggregate when someone is dead
that year — was a regression in disguise: `simulate` itself emits exactly that shape for
the LEGITIMATE surviving worker who keeps contributing after their spouse dies. The 3-vote
verify panel split 2-1, with the dissent calling the asymmetry "principled" (an aggregate
cannot be attributed, so the caller owns truncation) and the confirmers calling the hole
real. Both were right — about different halves.

## Root Cause

A fail-loud guard needs to ATTRIBUTE a value to an entity before it can vet it. Once a
per-person quantity is collapsed to a household scalar, the information the guard needs is
destroyed: every option from there is bad — a silent hole (can't vet), a blunt reject
(false-positives on legal input), or a documented limitation (a hole with a comment). The
"design choice" between them is a false trilemma created upstream, at the moment of
collapse. This was also insight 020's SECOND recurrence inside the unit that cited it:
round 1 found the guard gated on its first consumer (the ledger path); round 2 found it
gated on the one attributable channel.

## Fix

Dissolved the collapse instead of choosing among its consequences: every
`YearContribution` channel is now per-person (`taxableByPerson`/`pretaxByPerson`/
`rothByPerson`/`hsaByPerson`), summed inside the overlay. The dead-slot guard now vets all
four channels precisely — no false positives, no silent channel — and the alignment guard
covers them uniformly. Sibling fold from the same wave: per-entry finiteness does not
bound a SUM (two finite 1.5e308 slots ⇒ +Infinity ⇒ a non-finite terminal counted as
survived), so both layers now also validate the assembled per-year totals.

## Key Insight

When a fail-loud guard would need per-entity attribution, the fix is almost never at the
guard — it is at the interface that threw the attribution away. Keep the per-entity shape
through the wire and sum at the last consumer; collapsing early to "keep the interface
small" silently converts a checkable invariant into a trilemma of bad guards. Secondary:
a verify-panel DISSENT is design input, not noise — here the 2-1 split was the precise map
of why both the hole and the suggested fix were wrong, and the resolution satisfied both
votes' constraints simultaneously.

## Also Applies To

- Any future per-person stream entering the overlay (C3's onset signals, P3 per-person
  conversions): keep attribution to the consumer, sum late.
- Sum-overflow: every place entries are validated and then aggregated (`Σ ledger`,
  bucket sums, accumulated parallel-accounting surfaces) — per-entry finiteness is not
  sum-finiteness.
- Multi-agent verify panels generally: read the dissent for the constraint it protects
  before folding the majority's prescription (siblings: 005, 017, 019).
