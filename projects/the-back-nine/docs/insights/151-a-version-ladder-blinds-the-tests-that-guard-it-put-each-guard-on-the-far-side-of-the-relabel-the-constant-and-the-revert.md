---
title: "A schema version ladder blinds the tests that guard it: once the codec relabels version 3 to 4, every read of the disk version through it says \"current\"; every pin derived from the constant moves with the constant; a `git revert` takes a same-commit guard along; a fixture relabeled from today's plan moves with today's checks; and a step that jumps straight to \"current\" is the same code as the right one until the next bump"
date: 2026-10-31
phase: the schema-v4 bump — b9-2 plan (KTD1–KTD8), b9-3 build (`c2864eb9`, `9b0ef9db`), b9-4 whole-file review `wf_edc27bef-48a` and mutant pass (`bb26cbca`, `1fb8b25e`)
modules: [src/shared/scenarioCodec.ts, src/shared/model.ts, src/ui/scenarioFromDraft.ts, src/shared/__tests__/scenarioCodec.test.ts, src/shared/__tests__/schemaVersionFloor.test.ts, src/shared/__tests__/fixtures/scenario-v3-date-prew.json, src/shared/__tests__/fixtures/scenario-v3-date-postw.json, src/ui/__tests__/scenarioFromDraft.test.ts, src/store/__tests__/session.test.ts, src/store/__tests__/backup.test.ts, src/ui/__tests__/IntakeApp.test.tsx, docs/architecture.md]
tags: [schema-version, version-ladder, relabel, migration, one-way-door, git-revert, revert-guard, version-floor, module-namespace, frozen-fixture, DND-012, old-build-oracle, raw-bytes, vacuous-test, equivalent-mutant, typecheck-guard, derived-pin, older-reader, newer-reader, tolerant-reader, persisted-schema, codec]
---

## Problem

The schema-v4 bump (`c2864eb9`, 2026-10-31) made every save write `CURRENT_SCHEMA_VERSION` (4, in `src/shared/model.ts`). Since then, a copy built before the pay check refuses a current save instead of running it without W (the household's answer to what a working year costs). Versions 3 and 4 carry the same fields, so `decodeScenario` relabels a version-3 plan to 4 in place and runs the one set of checks. It reads version 3 forever, because a backup keeps the version of the save it was cut from and a copy older than the bump can still make a real first save. Guarding that ladder kept producing tests that could not go red, or went red for the wrong reason:

- **A mint stamping a stale 3 passed.** The dev-seed arm in `scenarioFromDraft.test.ts` encoded the plan the mint returns and read its label raw. Its title said the raw read was there because "through the codec a stale label would read current". But the returned plan has already been round-tripped through the codec, so it is already 4. Mutant M7 (the mint stamps 3) turned 0 of the mutant pass's 383 arms red; only `pnpm typecheck` caught it (TS2352, "Type '3' is not comparable to type '4'"). The plan (KTD3) also found nine `if (…schemaVersion === 3)` guards in `scenarioCodec.test.ts` that would have skipped their assertions in silence once 3 decoded as 4.
- **A revert stayed almost green.** Every "too new" pin reads `CURRENT_SCHEMA_VERSION + 1` (KTD5), so a reverted bump moves them back with it. Mutant M11 (the bump undone in place: the constant 3, the version-3 step gone) turned 3 of 383 arms red: the absolute pin (the one test that types a literal 4), the version-floor test, and a hydrate-gate arm the review added later. The absolute pin lives in the bump's own commit, so a real `git revert c2864eb9` deletes it too.
- **The first revert guard would have gone red for the wrong reason.** The version-floor test (`9b0ef9db`) imported the constant by name and asserted `toBeGreaterThanOrEqual(FLOOR)`. A revert deletes the constant. Typecheck then fails on the import (TS2305), the test reads `undefined`, and vitest's matcher throws `TypeError: actual value must be number or bigint, received "undefined"` before the one-way-door message can print. A failure that reads like a stale test citing a removed symbol invites deleting the test. A peer session's re-run of the review found this by reading vitest 4.1.8's source (`assertTypes`). Nobody ran the named-import form against a deleted constant.
- **A relabeled fixture is today's plan.** A version-3 fixture made by relabeling the current one passes whatever today's checks accept, and it moves with them (the plan's KTD6). The two real version-3 plans the build froze from old builds are one seed (`date`: no income streams, budget, Roth plan or saved record). A check later tightened on a field they lack would strand real saves as "damaged" while every frozen arm stays green (review advisories 2 and 17). §7.3 had ruled only on the older reader's side.
- **A step that jumps to "current" passed.** Mutant M8 (the version-3 step relabels to `CURRENT_SCHEMA_VERSION` instead of the literal 4) turned 0 of 383 red.

## Root Cause

Each guard read through the thing that moves.

- The relabel erases the disk's label before anything reading the codec's output sees it.
- A pin derived from the constant moves with the constant.
- A guard committed beside the bump is reverted with it, and a guard that names a symbol the revert deletes breaks before its message can print.
- A fixture made by relabeling today's plan is judged by today's checks, so it can never catch a check tightening past what an old build wrote.
- While 4 is both the successor and the current version, the two spellings of the step are the same code.

Each of these tests is correct about what it reads. It reads from the wrong side of the move.

## Fix

Each guard moved to the far side of what it guards:

- **Raw bytes, where they were written before any relabel.** The frozen-fixture arm `JSON.parse`s the file and expects 3. The store suites decrypt with the vault's own key and parse plainly (`diskLabel`, `session.test.ts`) to prove unlock writes nothing and the next save writes 4. Where the bytes are written AFTER a relabel (the mint's own round trip), a raw read sees nothing, and the type is the guard. The candidate is cast `as CurrentScenario`, whose label is `typeof CURRENT_SCHEMA_VERSION`, so a literal 3 fails typecheck. Taking 3 out of the type also turned the nine `=== 3` guards into type errors that forced a decision at each one (KTD3). The mint test's comment now says what it cannot see (`bb26cbca`).
- **One typed literal, plus a guard in a later commit that never names the deleted symbol.** The absolute pin types 4 on purpose. `schemaVersionFloor.test.ts` landed in its own commit after the bump (KTD1). `1fb8b25e` made it read the constant through the module namespace (`(model as Record<string, unknown>).CURRENT_SCHEMA_VERSION`) and assert a boolean. With the constant gone, the floor test itself still compiles and runs, and it fails on its own message. Mutant M16 (the constant deleted, a revert's shape) did exactly that. Each later bump raises `FLOOR` in its own follow-up commit.
- **The old build is the oracle (DND 012).** `git archive` copies of `59417d29` (before the pay check) and `c4831850` (the last build before the bump) minted the `date` seed through their own `scenarioFromDraft`. The bytes are committed under `src/shared/__tests__/fixtures/`, and every later build must decode them as the current plan, field-equal but for the label. Relabeling stays the right tool when the question is about today's code: the version-3 twins prove the relabel runs exactly the current checks. A relabel must still start from a plan that only the clause under test refuses. The hydrate gate's version-2 arm had relabeled the one-person version-1 fixture, which `draftFromScenario` refuses anyway. Its arms now feed the two-person current plan labeled 2 and 3, and mutant M14 (the gate's version clause deleted) turns exactly those two red.
- **Where no test can stand, the rule is the guard.** The version-3 step names its literal successor (`parsed.schemaVersion = 4`), with a comment saying why: a jump to "current" would skip a later 4→5 step. M8 is recorded as equivalent, not covered. §7.3 gained the newer reader's half: once a real save exists, a read check on a saved field never tightens past what a shipped build could write, and a vocabulary never loses a value. U11 had tightened account dollars to non-negative within version 3 (`0326a0cc`), which was legal only because no real save existed yet. The one-seed fixtures are filed (Tier 4) with the NEGATIVE that a fixture samples and never replaces the rule.

## Key Insight

**A version ladder rewrites the evidence its own tests would read. For every guard, ask: what does this read, and does it move when the thing I guard moves?**

- The relabel moves the label.
- The bump moves the constant and every pin derived from it.
- A revert removes its own commit, and every symbol that commit added.
- A tightened check moves every fixture made from today's plan.

A guard on the same side of the move is green both ways. Put each one on the far side: bytes written before the relabel, one literal typed once, a test in a later commit that never names the symbol a revert deletes, the old build's own output, and the type checker where runtime is blind. The same question applies anywhere a normalizer, a migration or a derived constant sits between a test and the fact it checks.

Sometimes nothing can stand on the far side: a step naming "current" while the successor IS current, or a check tightened past what a shipped build wrote. Then say so. Record the mutant as equivalent, and write the rule once where the next bump's author will meet it. Never let a green arm stand in for the rule.

## Also Applies To

- The next bump: a 4→5 step that names 5, and `FLOOR` raised in its own follow-up commit. If the bump adds or changes a required field, write a real up-convert step: a relabeled plan missing that field would carry a type that says it has it (§7.3).
- `BACKUP_FORMAT_VERSION` (`model.ts`, today 1; `backup.ts` refuses a higher one as `newer-format`) and the vault database's `openDB(VAULT_DB_NAME, 1, …)` (`src/store/db.ts`) become the same one-way door at their first bump. A browser also refuses to open an IndexedDB database at a lower version than it already holds.
- [[079]] — a normalizer at a state seed is truthful only for the fields its consumers read. The relabel is a normalizer of the label, which is why §7.3 bars keying provenance on the in-memory `schemaVersion`.
- [[137]] — a fixture is independent only along its source's axis. The frozen plans are independent of today's checks, but only for the one seed they hold.
- [[076]] — a check strengthened downstream narrows a promise upstream. Here the promise is "reads version 3 forever".
- [[126]] — write each mutant's kill set before the run. M7 and M8 were predicted equivalent, so their 0 reds read as known limits, not as passes.
- [[148]] — the frozen `git archive` copy, here pointed at old builds instead of HEAD.
