---
title: A refusal channel renders ONE frame, so an answered-but-unrepresentable fact inherits the "still needed" lead and invites a retry that cannot succeed
date: 2026-08-14
phase: Tier 0 — the mixed-household $0-healthcare defect (employer-coverage ask + refuse)
modules: [src/intake/intakeMap.ts, src/intake/AnswerStrip.tsx, src/ui/copy.ts]
tags: [refusal-arm, copy-contract, missing-facts, calm-but-wrong, dead-end-retry, predicate-extension, frame-vs-string]
---

## Problem

`missingRequiredFacts` is the app's ONE "we cannot answer" authority, and its
renderer has exactly one frame: *"Still needed: &lt;names&gt;"* closed by *"The tool
never guesses these — it prices only what you enter."* That frame is correct for
an input the household has not supplied.

It had already shipped over a fact of the opposite kind. The two-HSA model
limitation pushes `kindHsa`, whose copy is the string `'HSA'` — so a household
that entered **two** spouses' HSAs read *"Still needed: HSA"* under a line
promising the tool prices what you enter. Nothing was still needed, and nothing
they could type would ever clear it.

The filed prescription for the new employer-coverage refusal said to fire its arm
"when the fact is absent **OR false**" — which would have shipped the same defect
a second time, on the flagship route.

## Root Cause

A refusal authority accumulates facts of **two different kinds** while its
renderer knows only one:

- **absent** — not entered yet; the block is the reader's to clear.
- **unrepresentable** — answered, and the model cannot carry the answer; the
  block is the *tool's*, and no entry will ever clear it.

Nothing in the type distinguished them, so every new refusal silently inherited
the actionable frame. The failure is invisible per-string — every sentence is
individually true — and invisible to tests, which assert that a fact is *named*,
never that the sentence wrapping it is true of that fact's kind.

## Fix

`MissingFact` gained `kind?: 'absent' | 'unrepresentable'` (absent-by-default, so
no existing call site changed meaning). `MissingList` splits into two blocks with
their own lead and closing line; both render when a household is mid-entry AND
unpriceable, each over its own facts. `kindHsa` was re-tagged in the same commit —
fixing the live defect rather than cloning it.

A second defect surfaced only on the rendered frame, with the whole suite green:
the strip's **lead** (*"Your answer takes shape as you go."*) still sat above a
permanent refusal — a keep-going promise over an answer that is never coming.
`answerWithheldLead` now leads when *every* blocker is unrepresentable.

## Key Insight

**A refusal's honesty lives in the frame, not the fact name.** When a
cannot-answer authority accepts a new reason, ask which kind it is — *the reader
has not answered* or *we cannot carry their answer* — because the renderer will
otherwise wrap it in whichever frame already exists. Adding the reason without
adding the kind converts a correct block into a dead-end retry invitation, which
is strictly worse than silence: the household keeps entering data at a wall.

Two corollaries. **The wrapper is copy too** — a lead and a closing line inherited
from a sibling arm are load-bearing claims, and no per-string assertion can catch
their mismatch; only reading the assembled frame does. And insight 101's rule
applies to the wrapper as well as the fact: `answerWithheldLead` had to stay
route-neutral because its extension covers a SPINE household (two HSAs) as well as
a date-route one, so it could never say *"your date"*.

## Also Applies To

Any shared "we can't proceed" surface fed by multiple guards — validation
summaries, feature-gate walls, permission denials, upload rejections — where
*not-yet-supplied* and *supplied-but-unsupported* land in one list. Also any
i18n/copy catalog where a key is reused as both a form label and a status-line
noun (`kindHsa` was an account-kind label doing duty as a refusal reason), since
the two registers read differently in a sentence.
