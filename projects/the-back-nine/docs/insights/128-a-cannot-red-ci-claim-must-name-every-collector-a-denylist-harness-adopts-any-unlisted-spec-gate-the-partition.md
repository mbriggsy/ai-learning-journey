---
title: A "can never red CI" claim must name EVERY collector — a denylist harness adopts any spec nobody else lists, so the held 24 px instrument ran in the CSP gate and CI was red for three commits while every local gate was green; gate the harness partition with the collector itself
date: 2026-09-11
phase: Post-Act-4 (the gap to a friend betting real money) — the morning after the 24 px council build
modules: [playwright.config.ts, e2e/held/council-24px-shots.spec.ts, e2e/held/shots.config.ts, scripts/__tests__/playwright-harness-partition.test.ts]
tags: [ci-red, playwright, testIgnore, denylist, harness-partition, held-instrument, claim-vs-tree, local-gate-set, exit-code]
---

## Problem

`c61dea7e` (2026-09-10) landed the tracked 24 px screenshot instrument at
`e2e/held/council-24px-shots.spec.ts` with a docblock stating it "can never red CI": it was outside
`pnpm verify:fit`'s `testMatch`, and vitest was held off it by `vite.config.ts`'s
`exclude: [...configDefaults.exclude, 'e2e/**']` — a DENYLIST entry (vitest's default include matches
it), the same shape as the hole below. The session's closing gates — typecheck,
lint, 3508 tests, doc-stats, `verify:fit` 138 — were all green by exit code, and the hand-off recorded
the commit as "in flight". CI ran RED on that commit and the two docs commits after it
(runs 34548167354 / 34548391962 / 34548619915). Nobody looked until the next morning's queue read.

## Root Cause

The claim named two collectors and there were three. `playwright.config.ts` — the `verify:csp`
harness — sets `testDir: './e2e'` and scopes itself by a `testIgnore` DENYLIST: every spec under
`e2e/**` that no entry names is collected. Its own comment says so ("a new dev-server spec must be
added to it") and nobody added `held/`. So `pnpm verify:csp` collected the six instrument arms and ran
them against `dist/`, where the dev-only `?seed=` routes are DCE'd out; every arm waited for
`main.result[data-answer-tier="final"]` (a 150 s expect inside the CSP config's default 30 s test budget)
and the test timeout fired at 30 s. The collected count in the CI log went
from 16 to 22 between the last green run and the first red — the diff was visible, in a log nobody
opened. Three compounding facts kept it invisible locally: `verify:csp` was not in the session's
gate list (it needs a fresh `pnpm build` and takes a minute, so it is skipped by habit when the
change "is only a fit spec"); `e2e/` is outside tsconfig's include, so `tsc` sees nothing there;
and a docblock is a CLAIM about which harnesses collect a file, checked by nobody — the partition
of `e2e/` across four configs was a set of comments and hand-maintained lists, never a gate.

## Fix

Two moves, the second the one that matters. (1) `'**/held/**'` joins the CSP harness's denylist,
and the three docblocks that claimed the instrument could not red CI now say what actually holds it
out and how that is proven. (2) `scripts/__tests__/playwright-harness-partition.test.ts` runs
Playwright's OWN collector (`playwright test --list --reporter=json`, no browser, no webServer) on
every config — the root `playwright*.config.ts` files plus any `*.config.ts` under `e2e/` — and
asserts the partition: every `e2e/**/*.spec.ts` is claimed by exactly ONE config (zero is a gate
wired into nothing, two is a dev-server spec on the dist harness), every config claims at least one
spec, and nothing under `e2e/held/` is claimed by a CI gate — where "CI gate" is derived by reading
`.github/workflows/verify-the-back-nine.yml`'s `run: pnpm …` steps through package.json's
`playwright test` scripts, never typed in the test; the resolver THROWS on a config-flag spelling or a
workflow step shape it cannot read, and the derived gates are cross-checked against the configs the
test actually collects, so the gate set can never shrink in silence (the adversarial review's one
confirmed hardening). Honest scope: a spec wired to NO harness still lands in the denylist
collector and fails loudly in CI — the partition catches the double claim and the held-in-a-gate
case, not the bare omission. The test's failure message prints the whole
owner table. Mutants proven, each predicted before it ran: the held entry removed → the textual arm
and the collector arm both red (the instrument shows two owners); a second harness allowlisting
`vault.spec.ts` → the "shared" arm reds naming both owners; a stray spec that every harness denies →
the "no harness" arm reds with `(nobody)` beside it. And a lesson the build itself taught: the glob
`**/held/**` cannot be written inside a `/** … */` block comment — its `*/` closes the comment and
the rest parses as code ("held is not defined"); both held docblocks now describe the entry in words.

## Key Insight

"This file cannot red CI" is a claim about a SET — every collector that globs its directory — and
the claim is only as good as the enumeration. A denylist collector inverts the usual safety: it
adopts by default, so the mistake is silent on the side that made it and loud only in CI. Two rules
follow. First, when a harness set partitions a directory, gate the partition with the collectors
themselves (the same lesson as the WebKit project's non-vacuity pin: a textual pin proves the
strings agree, only the collector proves what is selected). Second, the local gate list before a
commit is not "the gates that seem relevant" — it is the CI workflow's list, and any change under a
directory a harness globs must run that harness. A green hand-off written from a subset of the gates
is a claim, not a proof; the CI run id is the proof, and "in flight" means unproven.

## Also Applies To

- Any `testIgnore` / `exclude` / `ignore` scoping (vitest, ESLint, tsconfig `exclude`, Vite's
  `optimizeDeps.exclude`): a new file lands INSIDE the tool's reach unless named — enumerate what
  the denylist misses, do not trust the comment beside it.
- A new directory under a globbed tree (`e2e/held/`, `scripts/icons/`, a `__fixtures__/`): ask
  which collectors' globs now reach it before the docblock says "excluded".
- Hand-off gate lists: write the list FROM the CI workflow file, and mark a commit green only by its
  run id — the same rule as insight 126's "read the exit code, never a grep" one level up.
