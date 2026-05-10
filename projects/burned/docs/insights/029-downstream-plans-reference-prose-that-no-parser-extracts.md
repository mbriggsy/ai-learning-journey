---
title: Downstream plans reference structured data that upstream only captured as authorial prose
date: 2026-04-24
modules: [scripts/playtest/lib/scenario-detector.ts, scripts/playtest/lib/coverage-reporter.ts]
tags: [planning, multi-unit-plans, producer-consumer, parser-scope, signature-audit, data-flow]
---

## Problem

Phase 3 Unit 10 (`coverage-reporter`) was spec'd as a "pure consumer" of Unit 9's `FireRecord[]` — estimated ~200 lines impl + ~200 lines tests. At implementation time, one load-bearing sentence in the plan turned out to be hand-wavy:

> "Each cell tallies the scenarios whose **fire signature touched** that (vantage, column) pair AND fired this run."

The fire signature is the fenced YAML block (`events:`, `projection-assertions:`, `shape:`). It has role bindings (`$ACTOR`, `$TARGET`) but no vantage/column structure. The *actual* source of "which (vantage, column) cells does this scenario touch" is the **7×2 info-gap markdown table** that follows the fire signature in every `SCN-*` section. That table was authored as the source of truth per phase-1 D5 — but `parseCatalog` (Unit 9) only extracted the fenced fire signature, not the info-gap table. `ParsedScenario` had no `infoGap` field.

Net effect: Unit 10 couldn't compute its cell credits from the data it was spec'd to consume. The "pure consumer" unit had to absorb a parser extension.

## Root Cause

Two independent plan gaps pointing in the same direction:

1. **Producer unit (Unit 9) scoped its output to "what the matcher needs."** The matcher needs fire-signature fields. The info-gap table isn't used for tier-1/2/3 matching — it's used for coverage accounting. So Unit 9's `ParsedScenario` omitted it. Self-consistent for Unit 9.

2. **Consumer unit (Unit 10) referenced the info-gap data as if it were structured.** The plan sentence "fire signature touched (vantage, column)" mixed the fire-signature mechanism (matching) with the info-gap grid (coverage accounting) as if they were the same thing. A code-grounded review against `ParsedScenario`'s shape would have caught "wait, how does fire signature carry vantage data?" but surface coherence let the sentence sit (see insight 019).

The authorial prose in SCENARIOS.md was genuinely the source of truth — every scenario carried its 7×2 info-gap table, hand-written at lock time. The problem was assuming "catalog" as a plan-input meant "the *parsed* catalog, with all fields downstream needs" when it meant "the file path + whatever Unit 9's parser extracted."

## Fix

Extended `parseCatalog` to also read the `**Info gap at decision point:**` markdown table per scenario. New `InfoGap` / `InfoGapPresence` types on `ParsedScenario`, cell marked present iff content is non-empty and does not start with `N/A` (case-insensitive). Handles parenthetical qualifiers (`ACTOR (STEALER)` → ACTOR), numeric variants (`TARGET1` / `TARGET2` → TARGET), combined rows (`OTHER / SPECTATOR` → both). Real catalog passes at 83 of 86 scenarios carrying info-gap; SERVER row populated on 100% (D5 invariant).

Coverage-reporter then credits `gridCells[role].column{1,2}` iff the fired scenario's `infoGap[role].column{1,2}Present === true`.

## Key Insight

**When a multi-unit plan says "Unit N+1 credits X based on Y" where Y lives in a docs-as-source-of-truth file, audit whether Y is structurally extracted by Unit N's parser.** If Y exists only as authorial prose a downstream unit is meant to reason over, the parser scope is wrong — not the consumer's.

Specifically, the warning sign: plan language like *"scenarios whose [property] touched [vantage]"* when `[property]` is a parsed structure but the claim *actually* depends on a separate piece of data living elsewhere in the same source file. Two ways this goes wrong:

- **Producer-scoped types.** The producer extracts what it needs for its job. Everything else stays as unparsed prose. Downstream consumers hit the gap.
- **Plan conflation.** Plan language treats two adjacent pieces of structured data as one ("fire signature" used to mean the whole scenario block, not just the YAML fence), so the gap doesn't surface until implementation.

The cheap prevention: before locking Unit N's output type, walk every downstream unit's plan and list the fields it names. If a field isn't in Unit N's output, either (a) add it to Unit N's scope, or (b) flag that Unit N+1's scope includes parser extension.

## Also Applies To

- Any multi-unit plan where later units consume earlier units' parsed output — not just playtest harness. Compiler front-end / back-end splits, ETL pipeline stages, any layered data transform.
- Spec-driven development where a doc is the source of truth and code parses subsets of it. Each consumer demands its own subset — audit when adding new consumers.
- Protocol evolutions where the wire format carries some fields and "server knows the rest." New clients learn the "rest" is unextractable without protocol extension.
- Any case where "just pass the catalog" really means "pass the already-parsed structure" and the parsed structure is producer-scoped.
