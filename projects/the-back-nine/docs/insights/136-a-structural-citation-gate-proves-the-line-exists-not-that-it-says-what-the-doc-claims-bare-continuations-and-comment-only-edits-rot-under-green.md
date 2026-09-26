---
title: A structural citation gate proves the cited LINE exists, not that it says what the doc claims — bare continuations and comment-only source edits rot the meaning while the gate stays green
date: 2026-09-25
phase: post-Act-4 hardening (the 2026-09-24/25 doc audit)
modules: [scripts/verify-doc-stats.ts, scripts/reanchor-citations.mjs, docs/**]
tags: [doc-stats, citations, re-anchor, semantic-vs-structural, gates-that-dont-bite, doc-audit]
---

## Problem

`pnpm verify:doc-stats` arm 4 was GREEN — "816 line-numbered citations across 33 docs resolve (file exists, line in range, not blank)" — on the morning of the 2026-09-24 doc audit. The audit's stale-content lane, briefed to open every cited line and confirm it CONTAINED the construct the doc named, confirmed roughly forty citations that pointed at the wrong code. `docs/plans/4-recommendation.md:18` cited `taxOverlay.ts:1801/1853` for the federal+state tax total; `:1858` was `totalNetPremiumReal`. The U17 spec (`:418`) and the S5 plan (`:64`) cited `memoryModel.ts` bare `:NNN` continuations for `currentDraftFingerprint` that had drifted six lines since 99637c5f. `TODO.md` cited `devSeeds.ts:1079` for `DEV_SEEDS` (it was inside a docblock; the export was at `:1121`). The register and TODO both cited `e2e/vertical-fit.spec.ts:396-406` as the exclusion that keeps the recommendation surface out of `verify:fit`; those lines were the ORDER + REACH helper, and the exclusion sat at `:704-714`. Two Medicare specs cited `copy.ts:1178` as the held-flat residual; it was `verdictMedicarePriced`, the affirmation. Every one of these resolved to a real, non-blank line.

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
