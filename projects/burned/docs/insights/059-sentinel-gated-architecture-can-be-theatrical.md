---
title: Sentinel-gated phase architecture can be vacuously satisfied — parent-repo .gitignore eats the sentinel AND the assertion script may never have been written
date: 2026-05-22
phase: 2
modules: [docs/plans/origin-trailer/phase-2-voice-pipeline.md, videos/trailer/sample-eval/voice-pipeline/, videos/trailer/.gitignore]
tags: [gitignore, sentinels, phase-gates, contracts, parent-repo, theatrical-gates]
---

## Problem

Phase 2 plan ships a sentinel-gated handoff: Unit 2.3 writes `cadence-consistency-signoff.txt`, Unit 2.4 asserts it exists. Unit 2.7 writes `phase-1-reconciliation-signoff.txt`, Unit 2.8 asserts it. The architecture reads as a real contract between phases.

While writing the Unit 2.7 sentinel during closeout, I noticed Unit 2.3's `cadence-consistency-signoff.txt` does **not** exist in `videos/trailer/sample-eval/voice-pipeline/`. Yet Unit 2.4 ran and landed weeks earlier — the assertion never blocked. Then `git check-ignore` on my fresh Unit 2.7 sentinel revealed it was being gitignored by `*.txt` at line 2 of a `.gitignore` I had never touched.

## Root Cause

Two independent failure modes combined into a vacuous gate:

1. **BURNED lives inside a parent monorepo.** `git rev-parse --show-toplevel` returns `C:/Users/brigg/ai-learning-journey`, not the project dir. The parent's `.gitignore` line 2 is `*.txt` — a blanket exclusion at repo root that silently eats every signoff sentinel produced anywhere under the BURNED tree. Local `videos/trailer/.gitignore` had `!sample-eval/**/*.md`, `!**/*.json`, `!**/*.yaml` allowlists but none for `*.txt` because the original author never tested the parent-repo case.

2. **The Unit N+1 assertion script was never written.** The Phase 2 plan describes `scripts/canary-signoff.ts` and `scripts/reconciliation-signoff.ts` as the units that check sentinels. Neither exists at execution time. The plan made the gate look real, but at runtime there was no `assertSentinelExists()` call anywhere; downstream units proceeded regardless.

Either failure alone produces a vacuous gate. Both together produced silent vacuous gates across multiple phase boundaries with nobody noticing.

## Fix

- Narrow allowlist in `videos/trailer/.gitignore`: `!sample-eval/**/*-signoff.txt` and `!sample-eval/**/*-reconciliation*.txt`. Scoped to sentinel patterns — does not re-expose `mallory-design/*.txt` audition metadata that's supposed to stay local.
- Phase 2 plan's `phase-1-reconciliation-signoff.txt` now committed and tracked.
- Unit 2.3 sentinel gap noted for separate cleanup (not blocking Unit 2.7 closure).

## Key Insight

**A "sentinel-gated" architecture only works if you can prove both (a) the sentinel writes are visible to a fresh clone, and (b) the assertion script actually executes downstream.** Either gap silently turns the contract into theater.

The Windows + parent-monorepo + `.txt` combination is the load-bearing version of this for BURNED, but the general pattern: any phase plan that introduces gate sentinels needs a one-time verification that a fresh clone sees the previous phase's sentinel AND that the consumer code path actually fails when the sentinel is absent. A test that deletes the sentinel and watches the next unit's preflight hard-error is the proof. If you can't write that test, the gate is decorative.

## Also Applies To

- Any project living inside a parent monorepo with stricter ignores than the project author expected. Always run `git rev-parse --show-toplevel` early to know which `.gitignore` is authoritative.
- Sentinel patterns at filetypes that are commonly globally ignored (`.txt`, `.log`, `.tmp`, `.bak`, `.lock`).
- Cross-phase plans where the "asserts existence of X" sentence in the plan body never gets implemented because plan deepening focused on the producer unit, not the consumer's assertion logic.
- Cross-phase trace memories: insight 029 (downstream plans reference upstream prose that no parser extracts) is the consumer-side analog. This insight is the producer-side analog where the producer write silently disappears.
