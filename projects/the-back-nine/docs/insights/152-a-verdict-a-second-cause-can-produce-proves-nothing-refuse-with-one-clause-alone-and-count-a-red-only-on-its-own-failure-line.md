---
title: "A test verdict that a second cause can produce proves nothing about the first — the hydrate gate's refusal arms stayed green with its version clause deleted (the two-person check refused the one-person fixture anyway), and the schema-v4 mutant pass's first run held reds caused by an earlier failed test's still-unlocked session"
date: 2026-10-31
phase: schema v4 — the mutant pass (predictions b9-3; the whole-file review wf_edc27bef-48a and the runtime pass, b9-4)
modules: [src/ui/IntakeApp.tsx, src/ui/draftFromScenario.ts, src/shared/scenarioCodec.ts, src/store/session.ts, src/ui/__tests__/IntakeApp.test.tsx, src/store/__tests__/session.test.ts, src/store/__tests__/backup.test.ts]
tags: [mutant-proof, mutation-testing, attribution, failure-line, cascade, test-isolation, afterEach, teardown, broadcastchannel, single-writer, overdetermined-refusal, redundant-clause, guard-clause, hydrate-gate, schema-v4, kill-set, vacuous-arm]
---

## Problem

The schema-v4 change was proven with mutants: small planted bugs, each with the list of tests it should red written
down before the run (`PREDICTIONS.md` in the proof folder; insight 126). Three results could have been produced by
something other than what they were meant to prove.

1. **A refusal test that could not see its gate.** `IntakeApp.tsx:592` refuses a returning plan when
   `model === null || model.schemaVersion !== CURRENT_SCHEMA_VERSION`. Its test fed three plans it should refuse: a
   version-1 model, the same model relabeled 2, and null. The whole-file review (wf_edc27bef-48a, confirmed #6) traced
   that deleting the version clause leaves all three green. The plan's As built had listed these arms as the gate's
   proof.
2. **Reds that were not kills.** The first runtime pass (383 green at baseline) red M1 (the version-3 relabel removed)
   on 10 tests where 9 were predicted, M13 (unlock rewrites the stored plan) on 3 where 1 was predicted, and M5
   (versions 1 and 2 relabeled too) on 35. Many of these reds did not fail on their own assertions. They failed in
   setup, when the test tried to create its vault: `firstSave failed: {"ok":false,"reason":"open-in-another-tab"}`.
   That was ten of M5's reds, plus M13's recovery arm (the plant never touches recovery) and its next-save arm. M1's
   "two concurrent restores" failed the same way in the backup suite, whose helper prints only `firstSave failed`. Two
   of M1's PREDICTED reds (the recovery and next-save arms) also failed on that line: the right test went red for the
   wrong reason.
3. **The right list for the wrong reason.** The plan said lowering the constant to 3 would red every mint and open
   test because "the codec's top arm then calls [the relabeled 4] newer". When the change was built, before any mutant
   ran, the prediction was re-derived from the code: corrupt, not newer, with the same list of tests (the plan's As
   built, `c2864eb9`). `PREDICTIONS.md` predicted corrupt. The run agreed: 148 tests red, no failure line says
   newer-version, and the lines that print a reason say corrupt (47 quote `scenario.schemaVersion: 3 is not a valid
   version`). Had only the list of red tests been checked, the plan's wrong sentence would have passed.

## Root Cause

The same flaw three times: each result had a second way to happen.

1. The version-1 fixture has ONE person. `draftFromScenario.ts:49` refuses any plan without exactly two people, and
   that refusal shows the same restore-failed screen. With the version clause gone, the people-count check still
   refused both version-1 arms, and null still met its own `model === null` clause. No arm was refused by the version
   clause alone. Null cannot pin its own clause either: delete `model === null ||` and `model.schemaVersion` throws on
   null, and the effect's catch (`IntakeApp.tsx:677`) shows the same screen.
2. The store tests lock their session near the end, after the assertions. The version-3 unlock arm checks the label at
   `session.test.ts:737` and locks at `:740` (line numbers as of `1fb8b25e`). Under M1 that check failed, so the lock
   never ran. The session had already claimed the writer role. Its BroadcastChannel (opened inside `createSession`,
   `session.ts:261`; a claimed session's channel is closed only by `lock()`) kept answering the "is another tab using
   this plan?" check (the single-writer probe). Each suite's `beforeEach` gives every test a fresh IndexedDB, so the
   tests looked isolated, but the channel does not live in the database. The next test's `firstSave` heard the stranded
   session and refused with "open-in-another-tab" (`session.ts:342`). The baseline ran 383 green: the leak shows only
   once a test fails before its lock, which is exactly when the reds need reading.
3. The codec judges "newer" on the label stored on disk, before any version step runs (`scenarioCodec.ts:1051`; the
   plan's own U2 step 2 puts it there). With the constant at 3, a fresh save's 3 is not newer (3 > 3 is false). The
   version-3 step relabels it to 4, no step takes 4, and it falls through to corrupt (`:1036`). The plan's mutant
   sentence assumed the relabel ran before the newer check, which its own design step says it does not.

## Fix

1. `bb26cbca`: the version-2 arm and a new version-3 arm feed the CURRENT two-person plan relabeled
   (`{ ...ready.scenario, schemaVersion: 2 }`, and `3`). Only the version clause refuses it: without that clause,
   `draftFromScenario` drops the label and `scenarioFromDraft` stamps the current version back on, so the plan would
   load and show. The version-1 and null arms stay, commented as checks of the whole refusal path, not of the clause.
   Mutant M14 (the clause deleted, `if (model === null)`) reds exactly the two relabeled arms.
2. `1fb8b25e`: `session.test.ts` and `backup.test.ts` wrap `createSession` so every session a test opens is recorded,
   and an `afterEach` locks them all, pass or fail. Re-run (`mutants-unit-rerun.log`): M1 red exactly its 9 arms, each
   on its own assertion (seven read `expected 3 to be 4`); M13 red exactly 1; M5 red 28, with no
   "open-in-another-tab" line left.
3. M10's prediction came from the code, not the plan's sentence, and the run's failure lines confirmed the corrupt
   path. The plan's As built records the difference.

## Key Insight

A test result is evidence for a mechanism only if nothing else could have produced it.

- **A refusal test's input must break exactly the one rule it pins**, and be valid in every other way, so that
  deleting the rule lets it through. If another check also refuses it, the test proves the refusal happens, not that
  this rule does it. For every guard clause, ask "what input does this clause, and nothing else, refuse?" Then plant
  the clause's deletion and watch that test go red.
- **A red is a kill only when the test fails on its own assertion, for the predicted reason.** Read each red's failure
  line, not just the count or the list of red tests (so the runner must record that line, as `mutants.cjs` does). The
  right list can come from a different code path (M10), and a red can be left over from the test before it (the
  cascade). A cascade also HIDES real kills: once the leak was fixed, three of M5's ten cascade arms still red on their
  own lines and seven went green, so 35 became 28, not 25. You cannot subtract cascades from a count. Fix the leak and
  re-run.

The cleanup rule follows from the cascade. Cleanup at the end of a test body runs only when the test passes, so the
leak stays invisible on a green suite and shows up during a mutant pass or a real regression. Release stateful
resources in `afterEach`, never at the end of the test body. Reset every shared resource, not just the obvious one:
here the database was reset per test and the channel was not.

Insight 126 predicts which tests a mutant will red. This lesson goes one level down and asks why each of them went red.

## Also Applies To

- Any guard with several clauses (`a || b`): one test per clause, each with an input that fails only that clause. A
  garbage input usually trips several checks at once and pins none of them. When no such input exists (here, the
  effect's catch also refuses null), the clause is redundant at run time. Say so beside it, as the `bb26cbca` comment
  does, instead of counting a test as its proof.
- Any suite whose tests hold live resources outside the per-test reset: timers, BroadcastChannels, workers, open
  database connections, module-level singletons, and mocked globals restored at the end of a test body.
- A red whose failure line names another test's leftovers is a leak, not a flake. 106 reads the same evidence: the
  failure message names which limit fired.
- Siblings: 120 (a declared expected failure must fail on its own assertion, never on a timeout; this extends that rule
  from timeouts to cascades), 029 (an equality check where both sides are the default proves nothing; the review cited
  it for the gate arms), 081 (never trust a witness you have not seen go red), 025 and 126's witness-label extension (a
  plan's predicted mechanism is a guess until it is derived from the code).
