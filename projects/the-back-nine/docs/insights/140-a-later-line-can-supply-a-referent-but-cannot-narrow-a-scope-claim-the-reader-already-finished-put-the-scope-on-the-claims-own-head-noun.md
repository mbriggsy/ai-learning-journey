---
title: A later line can supply a missing referent, but it cannot narrow a scope claim the reader already finished — "X is counted" must carry its scope on its own head noun
date: 2026-10-19
phase: post-Act-4 hardening (his 2026-10-16 walk rulings, built b9-2)
modules: [src/ui/copy.ts, .claude/skills/caddie]
tags: [copy, scope, head-noun, garden-path, refuter, context-rescue, cold-read, caddie, calm-but-wrong, medicare, insight-069]
---

## Problem

His b9-1 reorder moved the Medicare line's list beside its subject: "Medicare’s costs for the two of you — the Part B premium, its income surcharge, and extra coverage like a drug, supplement, or Medicare Advantage plan — are already counted in this answer, on top of your spending."

- **The pre-build trace graded the risk low.** It flagged that a $0-premium Medicare Advantage couple might read its copays as counted. Its refuter graded that LOW: the very next paragraph says "The extra-coverage premiums are held flat…", so context rescues it. The chair recommended keeping the words.
- **The walk raised it everywhere.** Nearly every seat on the `budget`, `pa` and `datenc` landings raised the same reading, about ten independent raises.
- **The refuters split.** Most killed it on that same context-rescue ground. The first-pass spouse persona's twin SURVIVED at medium on `pa` and `datenc`. The tool counts premiums only; copays belong inside the spending figure.

## Root Cause

The old line scoped each item ("a drug plan, a supplement plan, or a Medicare Advantage **premium**"). The reorder dropped the one scoping noun and left a list a first-pass reader parses as things, not prices: "like a drug, supplement," reads as pills and vitamins until "plan" arrives. The subject "costs" covers copays as readily as premiums.

The rescue word "premiums" arrives two sentences later, after the state-tax clause. By then the reader has finished "…are already counted in this answer". A later line can **supply** a referent that is missing; insight 069's refuter rule (an adjacent line supplying a referent is not a violation) is right about that. A later line cannot **narrow** a claim the reader has already closed. The refuters judged the whole rendered block, while the harm happens at the first full stop.

## Fix

He re-ruled in-session, taking the pilot's rec: "**Medicare’s premiums** for the two of you — Part B, its income surcharge, and extra coverage like a **drug plan, a supplement plan**, or Medicare Advantage — are already counted…"

- The scope now rides the claim's own head noun, and "drug plan" / "supplement plan" can no longer parse as products.
- The line is two characters shorter, so `verify:fit` stayed at 142 / 142.
- A second panel (`wf_23461352-808`) attacked it from the MA, "pieces", Part A and "real costs" angles. Every rosier reading died.
- The pa hunter's verdict: "copays read as added on top … dies on 'premiums'".

## Key Insight

A sentence that says **what is counted** ("are already counted", "is included", "covers") is a scope claim, and the reader acts on it at its full stop. Three rules follow:

- **Keep the scope on the claim's own head noun.** Never rely on a qualifier in a later sentence.
- **Guard rewords that shorten or reorder a list.** Check that each item's scoping noun ("premium", "fee", "tax") moved to the head instead of disappearing.
- **Trust the volume of raises over a context-rescue kill.** When many independent seats raise the same reading and the refuters kill it on "the next paragraph fixes it", the rescue is arriving too late. Treat the volume as the verdict on the first parse, and the kills as proof that the block as a whole is true. Both can hold at once; the fix belongs in the claiming sentence.

## Also Applies To

- Any "on top of" / "inside your spending" / "already counted" line (the NC / PA clauses, the Healthcare sheet's "the tool adds each person’s premium").
- Insight 069's refuter rule: the refuter should ask whether the adjacent line arrives BEFORE the reader acts on the claim, not only whether it exists.
- The same session's two test lessons, each a "neighbour satisfies the check" shape:
  - A split-string drift pin that checks only `startsWith(Lead)` / `endsWith(Tail)` passed a planted mid-string "Everything else is covered." It now pins the whole composition (`src/ui/__tests__/stateTaxDisclosure.test.ts`).
  - A seat arm whose every fixture carried a step card let a step-keyed seat mutant survive. Vary the incidental property, or the mutant keyed on it survives.
