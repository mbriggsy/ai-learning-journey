---
title: A structural citation gate proves the cited LINE exists, not that it says what the doc claims — bare continuations and comment-only source edits rot the meaning while the gate stays green
date: 2026-09-25
phase: post-Act-4 hardening (the 2026-09-24/25 doc audit)
modules: [scripts/verify-doc-stats.ts, scripts/reanchor-citations.mjs, docs/**]
tags: [doc-stats, citations, re-anchor, semantic-vs-structural, gates-that-dont-bite, doc-audit, pure-shift, wrong-before-the-edit, frozen-dated-number, then-marker, history-rewrite, range-diff-at-anchor-commit, bare-token-attribution, quoted-number, tier-reference, register-move, tierrefs]
---

## Problem

`pnpm verify:doc-stats` arm 4 was GREEN — "816 line-numbered citations across 33 docs resolve (file exists, line in range, not blank)" — on the morning of the 2026-09-24 doc audit. The audit's stale-content lane, briefed to open every cited line and confirm it CONTAINED the construct the doc named, confirmed roughly forty citations that pointed at the wrong code. `docs/plans/4-recommendation.md:18` cited `taxOverlay.ts:1906/1853` for the federal+state tax total; `:1984` was `totalNetPremiumReal`. The U17 spec (`:418`) and the S5 plan (`:64`) cited `memoryModel.ts` bare `:NNN` continuations for `currentDraftFingerprint` that had drifted six lines since 99637c5f. `TODO.md` cited `devSeeds.ts:1079` (then) for `DEV_SEEDS` (it was inside a docblock; the export was at `:1121`). The register and TODO both cited `e2e/vertical-fit.spec.ts:396-406` (then) as the exclusion that keeps the recommendation surface out of `verify:fit`; those lines were the ORDER + REACH helper, and the exclusion sat at `:704-714`. Two Medicare specs cited `copy.ts:1317` as the held-flat residual; it was `verdictMedicarePriced`, the affirmation. Every one of these resolved to a real, non-blank line.

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
