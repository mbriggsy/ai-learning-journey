---
title: A structural citation gate proves the cited LINE exists, not that it says what the doc claims — bare continuations and comment-only source edits rot the meaning while the gate stays green
date: 2026-09-25
phase: post-Act-4 hardening (the 2026-09-24/25 doc audit)
modules: [scripts/verify-doc-stats.ts, scripts/reanchor-citations.mjs, docs/**]
tags: [doc-stats, citations, re-anchor, semantic-vs-structural, gates-that-dont-bite, doc-audit, pure-shift, wrong-before-the-edit, frozen-dated-number, then-marker, history-rewrite, range-diff-at-anchor-commit, bare-token-attribution, quoted-number, tier-reference, register-move, tierrefs, first-file-not-nearest, 60-character-reach, extraction, cross-file, edit-after-run, throwaway-base, temporary-index, skipped-reanchor, re-anchor-every-commit, check-reanchor-moves, attribution-unchecked, dry-run-before-apply, digits-only-diff, stale-lines-after-reanchor, en-dash-range, check-citation-pairs, diff-line-map, git-diff-U0, unmoved-continuations]
---

## Problem

`pnpm verify:doc-stats` arm 4 was GREEN — "816 line-numbered citations across 33 docs resolve (file exists, line in range, not blank)" — on the morning of the 2026-09-24 doc audit. The audit's stale-content lane, briefed to open every cited line and confirm it CONTAINED the construct the doc named, confirmed roughly forty citations that pointed at the wrong code. `docs/plans/4-recommendation.md:18` cited `taxOverlay.ts:2031/1853` for the federal+state tax total; `:2113` was `totalNetPremiumReal`. The U17 spec (`:420`) and the S5 plan (`:64`) cited `memoryModel.ts` bare `:NNN` continuations for `currentDraftFingerprint` that had drifted six lines since 99637c5f. `TODO.md` cited `devSeeds.ts:1079` (then) for `DEV_SEEDS` (it was inside a docblock; the export was at `:1121`). The register and TODO both cited `e2e/vertical-fit.spec.ts:396-406` (then) as the exclusion that keeps the recommendation surface out of `verify:fit`; those lines were the ORDER + REACH helper, and the exclusion sat at `:704-714`. Two Medicare specs cited `copy.ts:1369` as the held-flat residual; it was `verdictMedicarePriced`, the affirmation. Every one of these resolved to a real, non-blank line.

**Restored, 2026-10-16:** the five line numbers the re-anchor tool moved in the paragraph above are back to what they read on 2026-09-24 (what that morning's docs cited, and where the code then sat), as written at `f74f6ee6`. `pnpm doc:reanchor` scans every tracked `.md`, this insight included, and moved them as live pointers (`e04823a4`, `1c97f55d`, `4c6b3e4f`, `2a0f6d80`, `252b88da`, `c1ada867`, `1a737499`); the `copy.ts` one was twice restored by hand to `c1ada867`'s moved 1186 instead. They are a record: after any re-anchor run, restore them to this text, never re-point them.

## Root Cause

A citation is a claim with two halves — "line N of file X" and "is construct Y" — and arm 4 checks only the first. Three channels move Y while N stays valid: (1) any edit ABOVE the cited line that adds or removes lines, including comment-only edits, shifts every citation below it by the delta; (2) a bare continuation token (`:N`, `:N-M`, `:N–:M`) after a named file on the same line was invisible to the v1 re-anchor tool, which moved only NAMED tokens (`x.ts:12`), so a 2026-09-10 re-anchor pass left the bare tokens on their old numbers while the named ones moved — the doc then read as freshly anchored; (3) a citation minted against a comment or a neighbour line inside the same construct is structurally identical to a correct one. The register's 106 bare `:NN` tokens with no file name anywhere in their paragraph cannot be checked by the gate OR a reader. A naive semantic gate was tried on 2026-09-06 (identifier proximity to the cited line) and measured 21–42 % false positives — REJECTED, correctly. So the project ran with a gate that could only ever catch gross rot, and read its green as currency.

## Fix

Every confirmed citation was re-pointed by hand, each cited line re-read by an owner AND a skeptic with the code open (the cited line must CONTAIN the named identifier, not sit near it). The v2 re-anchor tool — per-token freeze, bare continuations attributed to the nearest file name on the line — left its session scratchpad and is committed as `scripts/reanchor-citations.mjs` (`pnpm doc:reanchor <BASE> [--apply] [--only-missed]`; runs ONCE, LAST, from the base). The 106 unattributable bare tokens are filed under the register's *The gates that don't bite* with the rule: name the file in prose before a bare token can be checked. The roadmap's Validation-gates row has called arm 4 "the structural half of anchor truth" since 2026-09-06; this audit was the first time the semantic half was READ at full scope, and forty rots is what it found.

## Key Insight

A structural gate's green means "no gross rot", never "current". When the semantic check is infeasible as a gate (the false-positive rate says so), the READER is the semantic gate, and that has three consequences: schedule the read (an audit lane that opens every cited line, not a grep), run the re-anchor tool after EVERY source edit that changes a line count — comment-only edits included — and treat a citation whose file name is not on the same line as unverifiable by anyone. The tell that you are trusting the wrong half: a doc that was "re-anchored last week" and a construct whose name no longer appears on the line the doc points at.

## Also Applies To

- Any `path:line` reference in a source comment, a test title, or a commit message — none of them is under the gate at all (`src/**`, `README.md`, `CLAUDE.md`, `.md:NN` doc-to-doc cites; register: *The gates that don't bite*).
- A `~NNN` approximate anchor: it drifts past its own tilde and reads as precise (`docs/backlog.md`'s `Result.tsx` anchors did).
- [[042]] — a cleanup "from the ledger" proves coherence, not currency; this is the same blind spot one level down, at the line.
- [[122]] — gate every single-home number; a citation IS a single-home number pair, and the gate half that exists covers only one of the pair.
- **The verification method that caught 59 + 9 misses (2026-10-21, b9-6: one `pnpm doc:reanchor` run, 625 edits).** The
  tool skips both files of an ambiguous basename outright (`stateTax.ts`, engine and constants), cannot see a bare token
  on a line that names no file, and re-shifts quoted tokens inside its own bug entry. A naive HEAD-side pair-check goes
  blind to every line the tool itself rewrote. What worked: (1) pair same-size hunks POSITIONALLY; (2) sweep cross-line
  bare tokens; (3) send every disagreement to a two-reader content pass; (4) apply each verdict by a UNIQUE windowed
  match. The scripts (`pair-check.mjs`, `crossline-sweep.mjs`, `citation-content-verdicts.workflow.js`,
  `apply-verdicts.cjs`) sit outside the repo in the session memory folder `b9-reanchor-verification-tools/`; they belong
  beside the register's Tier 4 re-anchor entry.

## Extended (2026-11-22, the frames-outside plan's U1): a pure-shift re-anchor carries an already-wrong citation forward

A re-anchor checker that passes every move as a "pure shift" (the old line and the new line hold the same text)
proves the move, never the citation: U1's run passed all 52 moves, and the pair-check's base/tree pairs showed four of
them wrong BEFORE the edit (TODO's three `Result.tsx:344-346`, meaning the date-route correction then at 465-467; a
plan's `:640-643`, meaning `answerTier`). A shift keeps a wrong number wrong at its new address. Judge each pair by
whether the old line is the thing the sentence names, and fix a wrong one by content, not by the shift.

## Extended (2026-11-20, the composites build): a line-map re-anchor rewrites history unless every dated number is frozen

This insight's own named citations were walked by re-anchor runs across sessions (`devSeeds.ts` 1079 → 1115,
`vertical-fit.spec.ts` 396-406 → 424-434) while its bare ones stayed put, so its "drifted six lines" story stopped
adding up; the held measurement record `e2e/held/fit-24px-measurements.md` moved the same way. Both were restored to
the text each was written with and frozen with the tool's "(then)" marker (`8e204deb`). A dated record's numbers are
history: freeze them when written, and never let a move tool touch them.

## Extended (2026-11-23): the reader and the tool each guess in a known way, and a prose reference has no gate at all

The Key Insight above makes the reader the semantic gate. Four later cases show how that reader, the re-anchor tool and
the gate each go wrong, and one kind of reference nothing checks.

- **A content-only read passes drift when today's lines still sound right.** In the anchor re-verification (`61c57ff5`),
  six "correct" verdicts in one batch were wrong. The cited range still read plausibly, but it was no longer the thing
  the sentence meant. The skeptic who caught them diffed each cited range against the tree at the last re-anchor
  commit. If a range was a clean unit of code then (a whole function, a whole block) and starts or ends mid-construct
  now, it has drifted, however well it reads.
- **Attributing a bare token to the nearest file name is a guess.** In the 2026-09-10 fleet, the nearest earlier named
  citation on the same line was the WRONG file for 70 of 287 bare tokens, because the sentence named another file in
  prose between them. `scripts/reanchor-citations.mjs` (its `LAST_FILE`) and doc-stats arm 4 both attribute this way,
  so a verifier has to check each bare token's file, not take it from the tool.
- **The tool reads a quoted historical number as a live citation.** b9-10's `pnpm doc:reanchor d5c549d7` proposed moving
  a TODO line number that `docs/landmines.md` quotes as a past example, by +5, because TODO.md had changed between the
  base and the tree. The dry run caught it, classified by the cited content, and the file was restored from HEAD. It
  happened again at b9-4's U2 (`5d3c7d81`): a two-line TODO deletion shifted the same quoted number on apply, and it was
  reverted by hand. In the same run, `scripts/check-citation-pairs.mjs` skipped TODO.md entirely because its line count
  had changed ("pair by hand"). That hid five bare tokens the tool had missed on one TODO line, and arm 4 flagged only
  the one that landed on a blank line. Take the re-anchor base AFTER any doc-only commit, freeze quoted numbers with
  "(then)", and pair a skipped file by hand.
- **A prose reference to a register entry ("Tier N *Title*") goes stale on every move, and no gate sees it.** The
  2026-10-31 tier sweep moved entries between tiers and left 11 live references naming the old tier, across the
  register, `docs/architecture.md` and `docs/roadmap.md`. Arm 4 checks line numbers only. A scan written in the sweep's
  session folder (`tierrefs.mjs`) found them, and `docs/landmines.md` (Citations and the doc gates) now says to run it
  after any register move. That tool never moved into the repo, which insight 156 says it must before a step can rely
  on it. A reference is a claim with two halves wherever it points, a line or a register title, and each half needs its
  own check.

## Extended (2026-11-24, Act 6's RC0 to milestone 1): the tool takes the FIRST file in reach, cannot cross files, and a re-anchor skipped or run early carries its error forward under green

Act 6 moved more cited lines than any act before it, and four new ways the re-anchor went wrong while doc-stats stayed
green showed up in one day.

- **The tool binds a bare `:N` to the FIRST file named within 60 characters before it, not the nearest** (b9-3, RC0).
  `LAST_FILE` in `scripts/reanchor-citations.mjs` ends in `[^\n]{0,60}$` and is not anchored at its start, so the
  regex engine takes the leftmost file name whose end lies within reach; the code comment says "nearest", the regex
  does not. A token farther than 60 characters from any file name gets no file at all.
- **The tool cannot follow a citation into another file** (RC0). Its line maps are per file, so after an extraction
  moves code across files, every citation of the moved code stays on the old file. RC0 rebuilt the review list from
  each file's HEAD text in a scratch copy of the tool and resolved each citation by hand.
- **An edit after the one run shifts every citation past it, and doc-stats sees only the few that land on a blank
  line** (b9-6, RC5 and RC7). RC7's fix round moved 220 citations while doc-stats flagged 3. The exact repair: rebuild
  each edited file's text as it stood at the run, commit it as a throwaway base through a temporary index (the real
  index and HEAD never touched), dry-run the tool against that base, then apply (`docs/landmines.md`, *Citations and
  the doc gates*).
- **A commit that skips its own re-anchor leaves its shifts wrong, and every later re-anchor from HEAD carries them
  forward** (b9-7). Part 3 of milestone 1's fix round (`84b2611f`) shifted lines in `copy.ts`, `IntakeApp.tsx` and
  `Shell.tsx` with no re-anchor. Part 4's pass from HEAD then left 34 citations off by part 3's shift, until the docs
  were restored to HEAD and re-anchored once from part 3's parent (`7961d013`). The same commit skipped doc-stats and
  redded CI on a stale test count. Three bare tokens past the tool's 60-character reach (one in `docs/backlog.md`, one
  in the pay-less spec) were hand-fixed three times before anyone named the file beside them.

The rule these add: re-anchor and run doc-stats on every commit that moves a cited line, never once per batch; run the
tool last, after the final edit; take a citation of moved code as one to resolve by hand; and put the file's name next
to any bare token that sits far from it.

## Extended (2026-11-26, Act 6 RC19's review): the tool's REVIEW list is exactly the half doc-stats cannot see, and a rule the builder's brief leaves out is a rule the builder breaks

- **The REVIEW lines are the ones only a person fixes.** `scripts/reanchor-citations.mjs` moves a citation only when
  its line sits outside every changed hunk. A citation inside a changed hunk goes on the `REVIEW` list and keeps its
  old number. That old line still exists and is usually not blank, so doc-stats passes it. RC19's builder applied the
  moves and left all 13 REVIEW citations at their old numbers. Citations in `App.tsx`, insight 106, `reentryChrome.ts`
  and the register then pointed at a blank line or at the wrong code, with the gate green (b9-6's review caught them).
  The tool flags exactly these because it cannot place them, and doc-stats cannot see them, so a pass that skips the
  list leaves every one wrong.
- **The frozen log moved three times.** `docs/landmines.md` says the re-anchor also rewrites the dated
  `docs/council-log.md`, whose citations are frozen as they were written, and that the file must be restored after the
  run. RC16, RC17 and RC19 each committed it moved. The rule lives in the landmines file. Each builder's brief carried
  the re-anchor step and left out the restore.

**What it adds.** A re-anchor is not done until its REVIEW list is empty: resolve each line by content against the
base, or say in the commit why it stays. And when a step is handed to a builder, the step's landmines go into the
brief with it. A builder never reads a rule kept in a file it was not pointed at.

## Extended (2026-11-27, b9-1's U11 and b9-2's U10 re-anchors): the move checker proves the move, never the attribution, and it reads only a dry run made before the apply

- **A content check proves the move, never who owns the token** (b9-1, U11). On a register line, two bare tokens
  `:113` and `:137` followed `solveAnchor.ts:112`, but `rmd.ts` was the first file named within the tool's
  60-character reach, so `doc:reanchor` bound both to `rmd.ts` and moved them by `rmd.ts`'s shift (the first-file rule
  above, seen again). `scripts/check-reanchor-moves.mjs` passed both as pure shifts: it checks that the cited content
  moved with the citation in the file the tool attributed, so a wrong attribution checks clean. Hand-restored.
- **The checker's input is a dry run made before `--apply`** (b9-2, U10). After an apply there is no dry run to check,
  and running the tool again would shift every citation a second time (`docs/landmines.md`, *Citations and the doc
  gates*). U10 rebuilt the dry run from the diff instead: a changed doc line whose only difference is its digits is a
  citation move, 312 pure shifts that way.
- **The two tools attribute a bare token differently** (b9-2). The re-anchor gives a bare token a file only within 60
  characters; `verify:doc-stats`' citation arm attributes it at any distance. A bare token past the reach therefore stays
  unmoved while doc-stats reads it against the shifted file, and it goes blank, as
  `pay-less-tax-all-in-build-spec.md:103`'s `:662` did. doc-stats' STALE lines after a re-anchor are exactly those
  tokens.

**What it adds.** Dry-run, check, then apply, once. Read each bare token's owner by eye, because no tool checks the
attribution. Read doc-stats' STALE lines after every re-anchor.

## Extended (2026-11-28, b9-3, gap 5's U2 re-anchor at `b66b3f4a`): the tools' blind spots line up, so move what they leave through the diff's own line map

U2 moved `src/engine/simulate.ts` by a large block, and two blind spots overlapped. The re-anchor links a bare `:N` to
its file only within 60 characters (above), so 27 bare continuations past that reach stayed unmoved. And
`scripts/check-citation-pairs.mjs`, the pair check that backs it, matches a range only with a hyphen (its `TOKEN`
pattern reads `:N` and `:N-M`), so a range written with an en dash (`:2917–2926`) was checked as `:2917` alone. The
pair check flags a missed start, but the end of an en-dash range is never checked, so that end stayed unmoved and only a
hand read found it. (The re-anchor and `verify:doc-stats` both read en-dash ranges; the pair check alone does not.)

The method that moved them: put each unmoved token through `git diff -U0 HEAD -- <code file>`'s line map, which keeps
the citation on the code it cited at HEAD (an old line inside a changed hunk is a judgment, an old line outside every
hunk is a pure shift), then grep the docs for en-dash ranges and move their ends by hand.

**What it adds.** A gap no tool covers is the place two tools' blind spots overlap. After a large move, list what the
re-anchor left unmoved and move it through the diff's line map; and grep for any range written with an en dash, whose
end the pair check never reads.
