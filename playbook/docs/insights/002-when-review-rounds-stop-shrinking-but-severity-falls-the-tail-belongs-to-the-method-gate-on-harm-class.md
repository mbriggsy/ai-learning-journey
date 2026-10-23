---
title: When review rounds stop shrinking but severity keeps falling, the tail belongs to the method; gate the landing on a harm class
date: 2026-10-21
phase: our-setup U29 (peer-safe squeaky-clean)
modules: [projects/skills/squeaky-clean]
tags: [code-review, ultramode, review-rounds, convergence, seams, landing-criteria, mutation-testing, workflow-audit, read-only-lenses]
---

## Problem
U29, the peer-safe squeaky-clean, went through six whole-file review rounds before it landed.
- Each round ran 11 opus lenses, and every finding was adversarially verified.
- Distinct issues per round: 15, 22, 16, 14, 14, 8.
- The planned exit rule was "repeat until nothing material", and five rounds in, the count wasn't falling.

## Root Cause
- **Each round's fixes opened the next round's seams.**
  - Round 2: the `twin: null` contradiction, stranded adds, and a recomputed commit list all came from round-1 fixes.
  - Round 6: six of its eight issues trace to a named round-5 fix; one unstage step added for excluded paths produced three of them.
- **The unit infers ownership after the fact, from transcripts.** Every new git shape is another inference gap, so the tail has no end: a chained `git mv`, a peer's discard followed by a commit, a recycled pid.
- **Per-finding patches grew the code.** The scripts went from 1,119 lines to 2,880, and `mine-paths.mjs` alone from 608 to 1,670.
- **What did converge** was severity and likelihood. One design change did more than any patch round: round 3 restated "mine" as a single exact-replay invariant, with consent bound to a content sha.

## Fix
- **The exit rule became a harm-class gate** (Briggsy's ruling, 2026-10-21): after round 6, land if no P0/P1 survives that can commit, delete or kill another session's work. The P2/P3 tail goes to U7, the write-time ledger that removes the inference.
- **Each round's hygiene:**
  - **Audit every lens transcript for barred tool calls.** Read-only is enforced by the prompt alone, and rounds 4 and 6 each had one no-op Bash call (`true`, `echo skip`). Quarantine that single vote as an abstention and check that another lens carries the finding independently.
  - **Hash the build against its snapshot** after the round.
  - **Run mutation testing on a COPY only.** The harness plants mutants in SKILL.md too, so a review reading the live build would read mutants.

## Key Insight
When the finding count holds flat while severity falls, what's left is a property of the method, not of the code. Two moves follow:
- Switch the exit rule from "until nothing material" to a harm-class gate.
- Spend the next effort on the structural change that deletes the inference, not on one more patch round.

Count each round's seams that trace to the previous round's fixes. Once those dominate, another round mostly reviews its own patches.

## Also Applies To
- Any review-and-fix loop on a safety-critical unit.
- Any heuristic attributor: blame from logs, ownership from history, "who changed this" from timestamps.
- Mutation runs against files a reviewer or a live junction is reading.
