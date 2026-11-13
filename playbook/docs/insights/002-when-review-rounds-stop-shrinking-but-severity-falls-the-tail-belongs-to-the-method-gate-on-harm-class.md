---
title: When review rounds stop shrinking but severity keeps falling, the tail belongs to the method; gate the landing on a harm class
date: 2026-10-21
phase: our-setup U29 (peer-safe squeaky-clean)
modules: [projects/skills/squeaky-clean/SKILL.md]
tags: [code-review, ultramode, review-rounds, convergence, seams, landing-criteria, mutation-testing, workflow-audit, read-only-lenses, prose-bar, skeptic-rounds, fix-opens-seam, plan-check, fold-text, harm-class-gate-cost, ultramode-plan]
---

*The squeaky scripts this lesson came from were flushed on 2026-10-29 (their last version is in git history before that day); the lesson stands on its own.*

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

## Extended (2026-10-31): a round's fix to a written bar opens the next round's P1 too

The brief recall fix's bar for `applies_when` lines (a page of rules for line writers, `distill/applies-when.md`, since deleted with the candidates the re-score did not land) went through four skeptic rounds before it was frozen. Round 2 added a fallback for a lesson that applies only one way in; that fallback contradicted the bar's own no-repeat rule and its check 3. Round 3 caught it, and round 4, looking only for P1s, found nothing. The seam is the same as in code: a round's fix is new text, unreviewed until the next round reads it. A prose rule set gets the same treatment as code: a fresh round after each fix, and the exit by harm class, not by count.

## Extended (2026-11-12): five more reviews show the same shape, and a harm-class third round costs about a third of a full one

The plan step's own skill (`projects/archive/skills/ultramode-plan`) and its first real plan went through five reviews, and each one repeated the signature:
- **The hybrid plan's check.** Round 2 found five seams that round 1's fixes opened, among them an `update` mode that skipped the contract brief every prompt needs, and a window gate whose cost table no runtime file carried.
- **U1's fix (2026-11-04).** Round 2 found a copy spelled through the repo's short (8.3) name passing the inside-the-repo check that round 1's long-form fix had left comparing raw text.
- **U2.** Round 3 ran as a harm-class gate: five lenses, each told to report only a gate's confidently wrong answer. It found 3 confirmed against round 2's 22, on about 3.0M helper tokens against 7.6M, every one P2 or P3 after the vote.
- **U3.** Round 2 confirmed 33 against round 1's 32, every one P2 or P3 after the vote and most in round 1's fix code. Round 3, a harm-class gate of five lenses each told to report one of four harms, found six (five defects) on about 2.6M helper tokens against round 2's 9.7M, every one P2 or P3 and none rejected.
- **U4.** Round 2 confirmed 27 against round 1's 33, all P2 or P3 after the vote but one; 23 of the 27 trace to a round-1 fix.
- **The Back Nine workbench plan's check (`f32f8ea2`).** Round 2 confirmed 34 against round 1's 33, most on round 1's fold text; round 3 confirmed 13, mostly on round 2's own fix to KTD22.

What it adds: a plan's fold text is fix text, and it opens seams the same way code does. The shape is now steady enough to plan for from the start: a second full round aimed at the fix text, then a harm-class third round, which cost about a third of a full round each time it was measured.
