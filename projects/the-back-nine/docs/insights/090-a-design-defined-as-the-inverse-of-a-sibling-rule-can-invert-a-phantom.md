---
title: A design defined as the INVERSE of a sibling's rule can invert a phantom — the referent may never ship, while the derived design stays internally coherent
date: 2026-07-18
phase: Act 4 runway (pre-build reconciliation)
modules: [docs/plans, src/store/staleness.ts]
tags: [plan-reconciliation, cross-unit-claims, staleness, premise-rot, supersession, runway]
---

## Problem

The Act-4 plan's U17 unit defined its entire behavior as an INVERSION of an Act-3 rule:
"Act-3's spine rule: re-present a saved verdict under its SAVED fixture vintage (so the
number matches the screenshot)… a recommendation cannot do that, so the rule inverts: a
stale saved recommendation always re-solves under CURRENT fixtures." A month later, the
runway audit checked the referent: **the shipped spine never implemented
re-present-under-saved-vintage.** `staleness.ts:17-21` states the opposite law — the
surface always presents the CURRENT-vintage recompute with a calm note, "never a
re-presentation of a number the current constants can no longer reproduce"; the
screenshot promise is kept by seed-CRN byte-identity when no clock fires, not by saved
vintages. U17 was inverting a phantom. The plan read perfectly coherent throughout.

## Root Cause

The plan was written (2026-06-18) before its sibling act shipped (U13, 2026-07-09), so
its claim about the SIBLING's behavior was a hypothesis — and a design *derived from* a
hypothesis ("X does A, therefore we must do not-A") stays internally consistent no matter
what actually ships. Nothing inside the plan can flag the dead referent: the derivation,
the copy, and the test scenarios all follow validly from the false premise. Coherence
masked currency (042's split), and the cross-unit claim rotted faster than any own-unit
design because the sibling kept evolving after the ink dried.

## Fix

The runway's ground-truth audit (wf_1369c7e7-698, the staleness-reality auditor) read the
referent's shipped source and refuted the premise; the council-ratified supersession
(2026-07-18, item 6) re-grounded U17 on what actually survives: the action-warning copy
register + a trigger set re-derived from the LIVE `deriveStaleness` clocks + the net-new
solver-code stamp — no inversion, because there is nothing to invert.

## Key Insight

A plan's claims ABOUT SIBLING UNITS are its fastest-rotting parts, and a design phrased
as the inverse / complement / extension of a sibling's rule is the most dangerous shape:
the referent can vanish while the derived design still reads flawless. Before building
any "unlike unit X…" / "inverts X's rule" / "mirrors X's Y" design, grep the sibling's
SHIPPED source for the claimed behavior itself — not for whether the derivation is sound.
Distinct from 041 (a later decision obsoletes a plan step) and 049 (a rework moves a
precondition): here nothing changed the referent — it simply never shipped as
hypothesized, so there was no event to notice.

## Also Applies To

- Every cross-unit behavioral claim in the Act-4 plan's U15/U16 sections (the audit found
  more: "roth.ts is a per-year update function", "the spine is tax-blind") — same class.
- Any spec sentence of the form "the existing Z already handles…" written before Z shipped.
- BURNED's cross-phase specs (a phase describing another phase's protocol behavior).
- Review comments citing a sibling's guarantee ("compliant with X's gate") — 080's
  docstring cousin, one layer up in the doc stack.
