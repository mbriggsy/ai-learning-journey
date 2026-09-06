---
title: A warning written beside a stale copy guarantees the copy rots again — replace the copy with a pointer; and every hand-typed number with a declared single home and no gate WILL rot (four of five had)
date: 2026-09-06
phase: Post-Act-4 (the gap to a friend betting real money) — the 2026-09-06 doc audit
modules: [docs/roadmap.md, docs/backlog.md, TODO.md, docs/plans/2-first-answer.md, scripts/verify-doc-stats.ts]
tags: [doc-rot, single-home, pointer-not-copy, verify-doc-stats, gate, audit, precedence, todo-hygiene]
---

## Problem

The 2026-09-06 five-agent doc audit (links · stale · placement · duplication · consistency; 159 files)
found the rot concentrated in one shape, repeated. `docs/roadmap.md:28` said Act 4 was "UNDERWAY — U17
in-flight" a month after the act closed — in the paragraph that carried the warning *"every re-typed
copy is a copy that rots."* `README.md:74` showed Act 4 "Underway" directly above its own warning box
saying every hand-typed status there rots. `docs/plans/2-first-answer.md` kept its own copy of the
roadmap's You-Are-Here table, two months stale, reading U7 / U8 / D2 as "Planned. Not built." The
gross-up bound `k ≈ 0.74 / 128 passes` was corrected in `architecture.md` on 2026-07-18 with a dated
note; five other copies (glossary, 1-engine ×2, 2-first-answer, the research doc — which called
itself the "native canonical home") still carried the retired values seven weeks later. `TODO.md` was
2,069 lines with two superseded START HERE blocks stacked above the live one, in a file whose header
bans session history.

Of the five hand-typed numbers with a DECLARED single home (the test count, the register's open count,
the ranked-queue size, the insight count, the gross-up bound), four had drifted. The one that had not
was the test count — the only one with a gate (`verify:doc-stats`).

## Root Cause

Two mechanisms, both structural:

1. **A warning was added BESIDE the copy instead of REPLACING it.** Each time this class bit (README
   2026-08-01, roadmap 2026-08-01), the fix was a paragraph saying "do not re-type status here" — and
   the re-typed status stayed in the same sentence. The warning tells the next author what not to add;
   it does nothing about the copy that already exists, which rots on the next unit boundary exactly as
   before. The roadmap's own Act-3 paragraph had the right shape (a pointer at the table, with a note
   that the pointer replaced the copy on purpose) one paragraph above the wrong one.
2. **"Lives only in X" is a law with no enforcement.** `CLAUDE.md` said the open count lives only in
   the register header ("it rotted twice"); the roadmap re-typed it anyway, in a sentence that carried
   BOTH the stale 43 and the current 46. A declared single home stops the rot only when something reads
   the home and reds the copies — which is what `verify:doc-stats` does for the test count and nothing
   did for the rest.

## Fix

- Every re-typed status/number became a POINTER at its home (five commits: `02521579` the truth pass,
  `5a4d7017` counts + pointers, `777bf579` structure, `b3e6f00a` formatting, `d5b8e283` the gate).
  Where a doc is a ratified historical record (a plan, a build spec), the copy is annotated with a
  dated ⚑ SUPERSEDED / AS BUILT line rather than rewritten.
- `TODO.md` collapsed 2,069 → 787 lines: superseded hand-offs DELETED (git log + the kept digest are
  the record), the still-live re-verify clauses folded into the ranked entries they belong to, open
  walk findings moved to the register. The queue/register split is now ruled by KIND: the register
  carries every negative finding (refuted / do-not-build), the queue the ranking + live prescription.
- `verify:doc-stats` gained three arms: the register header must equal its own body (entries −
  closed-marked headings, the arithmetic checked); "N open items" / "N-item open register" may appear
  in no other doc; the insights index must match the directory both ways. Live pins in vitest on the
  real files — a register edit that forgets the header reds `pnpm test` immediately, because the bump
  belongs in the same edit (unlike the test count, where the live compare stays in the gate script).

## Key Insight

1. **A copy with a warning beside it is still a copy.** When a re-typed fact rots, the fix is to
   delete the copy and leave a pointer — never to add prose telling the next author not to add
   another. Prose cannot un-rot the sentence it sits next to.
2. **"Lives only in X" is a claim about enforcement, not location.** A single-home number without a
   reader that reds its copies has the same failure rate as a number with no home (measured: 4 of 5).
   Declare the home AND wire the gate in the same commit, or expect the drift.
3. **Audit dimensions find different rot.** Five agents on five lanes (links / stale-vs-code /
   placement / duplication / contradictions) converged on the same headline items — that convergence
   is the confirmation — but each lane also found things no other could: the link validator's 28
   never-shipped component names, the duplication lane's two-homes-claiming-canonical, the stale
   hunter's ~42% line-anchor drift in the decision records. A single-lane "doc pass" sees one of these.
4. **Verify the auditors' pipe counts and CRLF claims yourself.** Two "broken table" findings were
   escaped `\|` inside code spans (correct GFM); a `grep -c $'\r$'` check said every file was CRLF
   when node showed every file was LF (the landmine already in TODO). A finding that names a mechanical
   defect is checked mechanically before it is fixed.

## Also Applies To

Any doc set with a precedence rule ("X wins on conflict") — the losing surfaces must POINT at the
winner, not restate it; any stat re-typed across surfaces (bundle size, item counts, roster sizes);
any "archive" that lives inside the live file it was supposed to leave.
