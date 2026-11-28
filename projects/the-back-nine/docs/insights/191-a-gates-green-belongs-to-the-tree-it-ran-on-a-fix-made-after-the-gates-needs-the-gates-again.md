---
title: A gate's green belongs to the tree it ran on — U9's eye fix (no-break spaces in "every 5 years") landed after lint had passed, the commit still said "lint 0", and the literal bytes the edit wrote turned CI's quick job red
date: 2026-11-27
phase: The RightCapital mandate, gap 4's line half (a spending line's repeat and rate): U9 (b9-15, `653aee4e`), and review round 2 (b9-18, `3598bae0f`)
modules: [src/ui/copy.ts, src/ui/screens/retirement/__tests__/trayView.test.ts, eslint.config.js, docs/landmines.md]
tags: [gate-order, last-edit, rerun-gates, commit-gate-line, stale-green, eye-fix, lint, no-irregular-whitespace, no-break-space, nbsp, U+00A0, escape-decoded, tool-parameter, byte-count, cat-A, look-alike-character, ci-quick-job, ci-red, trayLineEvery, unread-fix, pin-each-hand-off, memo-deps, no-react-hooks-lint, mutants]
---

## Problem

U9 (b9-15, `653aee4e`) ran its gates, then took the eye check on the Action Items tray. At 390 px wide the car's row
split "5" from "years" in "$40,000 every 5 years", so `trayLineEvery` (`src/ui/copy.ts`) and its test in
`src/ui/screens/retirement/__tests__/trayView.test.ts` got no-break spaces. The commit message described that fix and,
lower down, still read "Gates: pnpm typecheck 0; pnpm lint 0". The edit had written each typed `\u00a0` as the literal
no-break character, not the six-character escape, and ESLint's `no-irregular-whitespace` (from `js.configs.recommended`
in `eslint.config.js`) turned CI's quick job red (run 46084481583). `004df90f` fixed it, and its message names the
miss: "Lint ran before the eye fix that added them and not after".

## Root Cause

Two things lined up. The gates ran on the tree as it stood before the eye check, and the eye check's fix felt like a
touch-up after the work was done, so the gate line was written from the earlier run. And the change could not be
checked by eye at all: a no-break space draws exactly like a space, so the code looked right on screen while its bytes
were the ones lint bans.

## Fix

`004df90f` wrote the escape text in both files; lint 0 and typecheck 0 on that tree. The tool half is a landmine
(`docs/landmines.md`, *Windows and the shell*: write such an escape through a script file, then a byte count for
U+00A0 must read 0). The habit: run typecheck and lint after the LAST edit, the eye's fix included, and write the
commit's gate line from that run.

Round 2 of the same line half's review (b9-18, 2026-11-27, `3598bae0f`) nearly repeated it. Typecheck had already run
twice when a scripted replacement (a `node -e` run through the shell tool) meant to put the escape into the "every
5 years" assertions wrote the literal byte instead: three in `src/intake/__tests__/workingYearQuote.test.ts`, one in
`src/ui/__tests__/verdictSentence.test.ts`, one in `e2e/rc-screens.spec.ts`. A `cat -A` read of what the replacement
wrote showed the bytes, a byte count over every changed file confirmed them before the commit, a script file turned
them into the escape text, and typecheck and lint ran again after the conversion, before the commit named them.
Writing this insight did it once more: the Write tool turned the escape typed in the Problem section into the literal
byte, and a byte count after the write caught it.

## Key Insight

A gate result describes the tree it ran on, not the commit. Any edit after it, whether the eye's fix, a review nit
or a test tweak, turns the gate line into a claim about a tree that no longer exists. Re-run the gates after the last
edit and write the gate line from that run. And where the edit is a character that looks the same as another (a
no-break space, a curly quote, an escape a tool may have decoded), the eye cannot check it: count the bytes.

## Also Applies To

- [[057]]: a gate that reads a stale artifact. Same family: a green from an older state passed off as the current one.
- [[153]]: which tests a change reaches. This one is when the gates must run; that one is which tests they must run.
- `pnpm verify:doc-stats` after a late code edit: a code line moved after the run moves the docs' cited line numbers,
  so the run's OK no longer holds.

## Extended (2026-11-28, b9-7, the gift half's review, round 2, `3ef485d2`): a fix no test reads is green on any tree

Round 2 (`wf_1a6c80c2-3df`) confirmed 8 findings, and all of them were one gap. Round 1's fix for the balances' year
([[193]]) rested on a memo with the deps `[persist, enteredAccounts]` and on two hand-offs into the stepper, and none of
them had a pin. This repo runs no react-hooks lint, so a dropped dep is silent. The headline rosy fix could have been
reverted by one token with the whole suite green. Round 2 pinned each hand-off (the re-walk hands the stepper the frame;
the real Stepper's Income card and gift drawer read it), added a test that changes each memo dep (a balance edit and
back), then planted three mutants and saw each one killed.

What it adds: a green run belongs to its tree, and it says nothing at all about a fix that no test reads. A fix that
threads a value into a new host ships with a pin at each hand-off, and each memo dep gets a test that changes it.
