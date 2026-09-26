---
title: "An 'externally derived' fixture is independent only along the axis its SOURCE is — independent arithmetic over the same misread rule is one witness, not two; for a tax rule the government's own filing form is the oracle, never our research paraphrase"
date: 2026-09-25
phase: Act 4 hardening (the frozen-nominal Tier 0 — the senior bonus's per-person phase-out, found by that build's statute check)
modules: [src/engine/taxCore.ts, src/engine/constants/tax.ts, src/engine/__tests__/taxOverlay.test.ts, src/engine/__tests__/magiLandscape.test.ts, src/engine/constants/__tests__/constants.shape.test.ts, docs/research/engine-validation-and-tax.md]
tags: [dnd-012, externally-derived, fixtures, oracle-independence, primary-source, irs-forms, senior-bonus, obbba, phase-out, calm-but-wrong, rosy-direction, landmine-comments]
---

## Problem

The OBBBA senior bonus ($6,000 per 65+ filer, phased out at 6 % of MAGI over $150k MFJ) was priced from the M3
build until 2026-09-25 as ONE pooled amount: `max(0, 6,000 × count − 0.06 × (MAGI − 150,000))`, so a both-65+
couple kept a bonus until $350k of MAGI. The rule was wrong. IRS Schedule 1-A Part V computes line 35 =
$6,000 − 6 % × (MAGI − $150,000) ONCE and enters it for EACH qualifying spouse (36a, 36b), so the couple's
slope is 0.12 and the bonus is gone at $250k. The engine over-granted up to $6,000 of deduction across the
$150k–$350k band ($1,382 of tax a year at $250k), which is exactly where a conversion solver makes its decision.
Nothing caught it for months. The constant carried a loud LANDMINE comment asserting the $350k reading. A shape
test pinned `mfjBothSpouses65: 350_000`. A council constraint told a future note to quote $350k. Every fixture
in the band was a DND-012 "externally derived" hand worksheet, and every one of them agreed with the engine.

## Root Cause

DND 012 asks for an independent PATH to each expected number, so that the engine's formula cannot certify
itself. The fixtures honoured that. Their arithmetic was typed by hand, never computed by `seniorBonusFor`. But
they drew the RULE from the same place the engine did: the research strand's paraphrase ("MFJ > $350k when BOTH
are 65+"). Independence along the arithmetic axis says nothing about the rule axis. Two derivations that share a
misreading are one witness counted twice, and agreement between them is guaranteed, not evidence. The LANDMINE
comment made it worse. It read like hard-won knowledge ("a flat $250k is the one-spouse case only"), so the
wrong reading looked like the careful one, and nobody re-opened a claim that sounded as if it had already been
fought over. The statute's own words ("the $6,000 amount … shall be reduced", where the $6,000 is
per-individual) and the form that operationalizes them were never consulted after the strand was written.

## Fix

A background agent read the enrolled statute to check a different question (is the bonus inflation-indexed?)
and reported the form's per-spouse arithmetic as a side note. The chair then read Schedule 1-A Part V itself
before acting. `seniorBonusFor` now phases per person, then counts. `fullyGoneAbove` is `{ single: 175_000,
mfj: 250_000 }`, a DERIVED identity (start + $6,000 ÷ 6 %) that a shape test pins, never a count-keyed
figure. Every band fixture was re-derived from the form, not from the engine's new output (two gross-up arms only after the review caught them outside the new, narrower band): $250k → 36,676,
the gain-inclusive MAGI fixture → 21,512, the landscape's 1.12·AGI band algebra, and the IRMAA-rail arm whose
2028 fill now leaves the band entirely. The gross-up contraction was re-derived for the steeper slope. The
research strand, the council constraint and the constant's comment carry dated corrections.

## Key Insight

A fixture is independent only along the axis its SOURCE is independent. Ask two questions of every
"externally derived" expectation. Who computed the number? (DND 012 answers that one.) And where did the RULE
come from? If the answer is the same document the implementation was written from, the fixture proves
typing, not correctness. For a tax rule, the oracle for the rule is the government's own worksheet or form,
because that is the statute operationalized line by line. A research summary is a paraphrase, and a
paraphrase can flip "per person" into "per household" without changing a single number it quotes. When a
statute says "the $X amount" and a household can have several qualifying members, find the form line that
computes it and count how many times it is entered. A confident LANDMINE comment is still a claim. Verify it
against the primary before it becomes a pin.

## Also Applies To

- Every constant whose citation is our own research strand (`findings §Strand N`) rather than a primary text
  or form. The strand is a lead, never an oracle. Audit those citations for a form or statute behind them.
- The IRMAA joint thresholds (150 % of single for the top row, 2× for the others). The same "which amount is
  per what" question, already primary-verified 2026-09-25.
- Any derived ceiling or fully-gone figure stored beside the rule it derives from. Pin it as an identity of
  the rule's inputs, so it can never drift into an independent (and wrong) second statement of the rule.
- The same build's IRMAA sibling: the pilot's statute check confirmed the top tier IS frozen nominal, and
  stopped there. It never asked what the line is COMPARED with (MAGI two years older), so it deflated in the
  wrong price frame and pinned a witness the law contradicts. Checking the rule's inputs is part of checking
  the rule. The review's statute lens caught it before commit.
- Insight 135's lesson ("frozen" means nominal, so deflate) came from the same kind of read. Both defects
  lived in documents that described the law, while the code or the fixtures encoded a paraphrase of it.
