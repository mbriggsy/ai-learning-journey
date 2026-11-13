---
title: A tool that rewrites a plan must place every edit before it writes anything, record which finding each edit folds, and still have something to commit when nothing changed
date: 2026-11-12
phase: the plan step's own skill (the first real run, the Back Nine workbench plan; U3 and U4's reviews)
modules: [projects/archive/skills/ultramode-plan/lib/fold.mjs, projects/archive/skills/ultramode-plan/SKILL.md]
tags: [fold, edits, before-copy, round-trip, drift-grep, ledger, receipt, git-log, empty-commit, terminal-path, plans, json, escaping, plain-text-blocks, converter, hand-written-edits]
---

*The `ultramode-plan` code this lesson came from is archived at `projects/archive/skills/ultramode-plan/` (2026-11-12); the lesson stands on its own.*

## Problem

- **A before-copy overwritten.** playbook-4's hand fold copied the plan to `before.md`, then checked its edit pairs. A second run, after the plan was already folded, copied the folded plan over it, and the pre-fold plan was lost (found 2026-11-12 while replaying the fold).
- **No link from edit to finding.** The run's check-1 hand fold wrote `fold.json` with 47 ids and empty `old_values`. The drift grep searched for nothing, and round 2's list of changes (one entry per finding, with its old and new text) could not be rebuilt by hand.
- **Nothing to commit.** The receipt lives in git history, and `git log -- <path>` never lists a commit that leaves the path unchanged; a commit with nothing staged fails. A session whose fold changed nothing could never land its receipt, so the next session reran the same half. The run record had the same hole earlier: an update run that changed nothing reached landing and could never commit ("nothing to commit"), wedging the plan path, and no test walked an update run to its landing (4 lenses).

## Root Cause

- The hand fold wrote before it validated, so a rerun on the wrong input destroyed the only copy of the state it was meant to keep.
- Which finding an edit folds was known only at the moment of the fold and was never written down, so every later check that needed it had nothing to read.
- Each tool assumed a fold always changes the file. The empty path was never walked to its end.

## Fix

- `fold.mjs apply` places every edit against the current plan before it writes anything, and keeps no before-copy: git and the edits file are the record (`2da3ab65`).
- Each edit carries the ledger ids it folds (`ids`), and `apply` appends the round's changes from the same pass that writes the plan.
- Step 8 of `SKILL.md` stamps a `receipt:` line in the plan's front matter, so the commit always changes the plan and the next session's `git log -- "<plan>"` lists it.
- The tool was proved by a round trip on the real data, since the pre-fold plan was gone: 80 of the run's 84 hand-fold pairs were undone through `apply` (each new text appears once in the committed plan) and then redone. The second apply gave back the committed 731-line plan byte for byte, and the ID check passed both ways.

## Key Insight

A tool that edits a document should:
1. Validate every edit against the current text before writing any, so a rerun cannot destroy the state it was meant to keep.
2. Write which finding each edit answers in the same pass that applies it.
3. Walk every way a run can end, the empty one included, and make the landing step change the file so "nothing changed" still lands.

When the before state is lost, prove the tool by a round trip on the real data.

## Also Applies To

- Migration scripts and codemods that snapshot "before" and then apply.
- Any receipt or audit line kept in git history for a path.
- Release scripts whose "nothing to release" run fails at the commit or tag step.

## Extended (2026-11-12): hand-written JSON is the fragile step; plain-text blocks and a converter removed it

In the plan-step trial's deepen round 2 (playbook-5), the lead wrote the round's 41 edits as plain-text blocks (`=== ids:`, `=== old`, `=== new`, `=== olds`, `=== end`), and a 57-line script in the scratchpad turned them into `fold.mjs`'s JSON. The one apply went through with no refusal and no drift. Written straight as JSON, every quote, backslash and line break in the plan's text has to be escaped by hand, and that is where two escape traps bite (the playbook's `docs/landmines.md`, Write, Bash and Grep tools): a Unicode escape typed into a Write call lands as the character itself, and the Bash tool halves a doubled backslash.

What it adds: when a person or a model writes many text edits by hand, give them a format with nothing to escape and let a script make the JSON. `fold.mjs` retired with `ultramode-plan`; the rule holds for any batch of hand-written edits.
