---
title: "What an older copy of the app does with a newer save is a fact about code no longer in the tree: a new-build test of `CURRENT + 1` proves only the new build's own refusal, and a version-3 fixture relabeled from today's plan passes today's checks by construction"
date: 2026-10-31
phase: the schema-v4 bump (b9-3) — U4's old-copy proof and U6's frozen version-3 plans; its whole-file review (b9-4)
modules: [src/shared/scenarioCodec.ts, src/shared/__tests__/scenarioCodec.test.ts, src/shared/__tests__/fixtures/scenario-v3-date-prew.json, src/shared/__tests__/fixtures/scenario-v3-date-postw.json, src/store/session.ts, src/store/__tests__/session.test.ts, src/store/backup.ts, src/ui/scenarioFromDraft.ts]
tags: [old-build-oracle, git-archive, schema-version, version-bump, version-skew, forward-compatibility, backward-compatibility, frozen-fixtures, dnd-012, oracle-independence, self-referential-oracle, population, residual, junction, current-plus-one, clean-clone]
---

## Problem

The schema-v4 bump rested on two claims about builds that already exist. One: the build just before the pay check
(`c07e5758^`) and the build just before the bump (`c4831850`) both meet a version-4 plan with their calm "saved by a
newer version" face, before they load the plan, take over as the tab that saves, or write anything. Two: the new
build reads the real version-3 plans those builds saved. The tests the new build can write answer other questions.
Feeding the new codec `CURRENT + 1` proves the new build's own refusal, not what the `c07e5758^` codec does with a 4.
A version-3 fixture made by relabeling today's plan (`asVersion(CURRENT, 3)`) carries today's fields and passes
today's checks by construction; if a check later tightened, the fixture would move with it, and a real version-3
backup could strand while the arm stays green. And the plan named the main checkout, "before any edit", as the post-W
old build — a tree other sessions edit.

## Root Cause

An old build's behavior lives in its code at its commit. A test or a fixture the new build makes is made by the new
build's code, so it agrees with the new build by construction: one witness counted twice (DND 012; insight 137's
trap, with the shared source being the code that made the fixture instead of the rule). And the live checkout is
shared and changing (insights 083, 148): the "old build" it holds is old only until someone edits it.

## Fix

Two `git archive` copies of `projects/the-back-nine` in the memory folder `b9-schema-v4-proof\`: `prew\` at
`59417d29` (= `c07e5758^`) and `postw\` at `c4831850`, each with `node_modules` a junction to the main checkout's
(`package.json`, `pnpm-lock.yaml`, `vite.config.ts` and `tsconfig.json` are unchanged across the range — `git diff
--stat` printed nothing).

- **Old reader, new save (U4).** Each copy ran its own three suites that hold its "a 4 is newer" pins
  (`scenarioCodec.test.ts`, `backup.test.ts`, `UnlockScreen.test.tsx`): 134 of 134 and 173 of 173 tests, exit 0 —
  whole-suite counts; four of those tests are the pins. No old test pinned that unlock refuses BEFORE it loads the
  plan (the UnlockScreen pin mocks the unlock), so that order came from a read of each build's own source, the same
  lines at both commits: `session.ts` returns `newer-version` at `:439`, before it loads the plan (`:464`) and takes
  the writer's seat (`:467`); recovery at `:518`, before `:533` / `:539`; `backup.ts` restore at `:186`, before its one
  write (`:209`).
- **New reader, old save (U6).** One script kept outside both copies, `mint-v3.mts`, runs from inside each copy
  (under the shared `tsx`) and imports from the folder it runs in, so each run uses that build's own code: it mints
  the `date` dev seed through that build's own `scenarioFromDraft` and writes the encoded bytes unchanged — 2,611
  bytes from before the pay check (no W, no working-years stamp), 2,742 from after (both). Committed as
  `src/shared/__tests__/fixtures/scenario-v3-date-prew.json` and `-postw.json`; the arm reads each RAW (through the
  codec it would read 4) and requires it to decode as the current plan, equal but for the label, nothing dropped.
- Archives, not the plan's detached worktree plus the live checkout: nothing is registered in the checkout other
  sessions share, and the post-W build (which the plan had as the live checkout) cannot pick up another session's
  uncommitted edit.

One of the decodes was misread. `decode-check.mts` ran three codecs (prew, postw, and the main checkout before the
bump's edits) over both files: six decodes, all clean. The pre-W codec opening the post-W file clean was logged as
"the defect the bump closes". The bump closes it only for version-4 saves: a version-3 plan carrying W, saved by a
copy built between `c07e5758` and the bump (`c2864eb9`), still opens in a pre-W copy and runs there without W. The
whole-file review's data-migration lens (`wf_edc27bef-48a`) named it, and `bb26cbca` put it on the CLOSED entry (no
real save sits in it).

## Key Insight

**What an older build does with a newer save, and what it saved that a newer build must read, are facts about code
that is no longer in your tree — only that build's own code can witness them.** Archive the old commit, run its own
committed tests, and read its own source for any order its tests don't pin. For the other direction, mint the
old-version fixture through the old build's own save path and freeze the bytes; a fixture the new build relabels is
the new build agreeing with itself.

Then lay out every reader build against every writer build. Each pairing where the two disagree about what the plan
carries — the reader ignores a field the writer saved, or the writer never asked a question the reader needs — is a
population the change closes, leaves open, or must show is empty. Name each one. Here both were real: a copy with the
pay check opening a pre-W plan (filed as *A date-route plan saved before the pay check opens with W unanswered…*), and
a pre-W copy opening a version-3 plan that carries W — the one misread as closed.

Every build becomes a later build's old copy, so leave it the pins that proof will run. The newer-version arms now use
`CURRENT_SCHEMA_VERSION + 1` (KTD5): in every build, the exact version its successor writes, with no literal to retype
at a bump. And `session.test.ts` now pins that unlock and recovery unlock of a newer plan load nothing and take no
writer's seat, so the next proof can run that order instead of reading it.

Landmines: the shared `node_modules` junction holds only while the dependency and build-config files match across the
range — diff them first. A one-seed fixture samples only the fields that seed carries (the `date` seed has no income
streams, budget, Roth plan or saved recommendation). And the mint script lives only in the machine-local proof
folder, so a clean clone cannot re-derive the bytes. Both are the Tier 4 *The frozen version-3 fixtures are one
seed…*, whose prescription mints a maximal plan the same way and commits the script beside the fixtures.

## Also Applies To

- The next `schemaVersion` bump (`docs/architecture.md` §7.3, the decode ladder and the bump rule): re-run U4 and U6
  against the last build before it.
- Any stored shape an older copy can meet — a waiting update, a tab left open, a backup restored on a device that has
  not updated — including `BACKUP_FORMAT_VERSION` if the backup envelope itself ever changes (never for a model bump:
  the CLOSED entry's NEGATIVE).
- [[148]] — the archive and junction mechanics and their landmines; [[137]] — the same one-witness trap on the rule;
  [[083]] — why the live tree is never the old build.
