---
title: The fuzzy-match threshold did not exist, and one measurement proved it before any code was written
date: 2026-08-07
phase: machinery-rebuild
modules: [draft-kit/draft_engine.py]
tags: [name-matching, fuzzy-matching, heuristics, measurement, false-positives, sleeper, thresholds]
---

## Problem

The engine needed to answer: *this drafted player did not match any board row — is he the same man
as one of our rows under a different spelling?* Getting it wrong in one direction recommends an
already-drafted player; in the other it cries wolf on a 120-second clock.

The obvious tool is name similarity. Two independent designs reached for it — mine (shared surname
+ position + 3-char first-name prefix) and the one an adversarial review proposed after finding
mine too narrow. Both were wrong, and not by a little.

## Root Cause

Similarity cannot separate the two populations here, because **the floors are inverted.** Measured
with `difflib.SequenceMatcher` over normalized names on the real 174-row board:

| | ratio | pair |
|---|---|---|
| Most similar **different** players | **0.800** | Javonte Williams vs Jameson Williams |
| | 0.783 | Tyler Warren vs Jaylen Warren |
| | 0.750 | Los Angeles Rams vs Los Angeles Chargers |
| Least similar **same-man** renderings | **0.370** | Hollywood Brown vs Marquise Brown |
| | 0.522 | Deebo / Tyshun Samuel |
| | 0.636 | CeeDee / Cedarian Lamb |

Any threshold low enough to catch Hollywood/Marquise (0.370) flags dozens of genuinely different
players sitting above it. There is no gap to put a number in.

The deeper reason: **the rendered name is the one field that drifts.** Nicknames, legal names,
suffixes, compound surnames, and every possible spelling of a team defense all move it.

## Fix

Stop matching on the drifting field. Candidates now come from the pick's **`(team, position)`** —
Sleeper supplies both on every pick object and neither drifts that way — intersected with board
rows that are still **unclaimed**, and sharing **at least one name token**.

That last clause is what makes it tight without being brittle: nicknames replace the *first* name
and keep the surname; re-renderings change the *surname* and keep the first. Requiring either to
survive keeps both, while excluding two different men who merely share a team and position (Michael
Wilson and Marvin Harrison Jr. are both ARI/WR).

Measured: the real 120-pick feed replayed at **all 120 prefix lengths** → **0 false escalations**.

## Key Insight

**When a heuristic's job is separating two populations, measure both floors before designing around
it.** The worst same-class score and the best different-class score take minutes to compute and can
prove the entire approach impossible — before a line of production code exists.

The corollary: when a fuzzy match is failing, ask which field is actually *drifting* and look for
one that cannot. A weaker-looking signal on a stable field beats a strong signal on an unstable one.

## Also Applies To

- The live board's JS name matcher — same problem, same answer; do not port a similarity threshold.
- The Nightly Feud's trending-player join and RSS wire matching, which face the identical drift.
- Any join between our board and an external source. The durable fix is a stable id
  (`sleeperId`, KTD-4 in the rebuild plan) — every name rule here is a stopgap until that lands.
