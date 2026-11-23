---
title: A sizable build goes to a fresh builder's window; the orchestrator's window is for the unanchored review, the gates and the commit
date: 2026-11-23
phase: Build 2's walk-9 spec (b9-2, 2026-11-20) and the workbench's U7 review fixes (b9-1, 2026-11-23)
modules: [docs/plans/, src/ui/workbench/]
tags: [context-window, builder-agent, orchestrator, delegation, review-fixes, verify-dont-trust, window-budget, handoff]
---

## Problem

The walk-9 spec's U2 (34 files, a 3,069-line test file of hand-typed pins) would have crossed b9-2's wrap line
mid-build had the orchestrating session built it itself. On 2026-11-23, U7's whole-file review returned 21 findings
coupled across the same few files with the orchestrator's window at 45%, and the gates, the docs and the close still
owed.

## Root Cause

An orchestrating session spends its window on everything around a build: briefs, reviews, gate runs, doc updates, the
close. A big build done inline consumes the room those steps need, and a build cut off at the wrap line hands the next
session half a unit.

## Fix

One builder agent at xhigh, its brief carrying every decision the orchestrator had already settled (the files, the
rules, a hard width budget, what NOT to touch: no commit, no browser gates, no docs but one register entry), built
each case in its own window. The orchestrator kept the parts that need an unanchored eye: a reviewer handed the code
and the spec but never the builder's conclusions (b9-2: no blocker, 7 fixes, every chair prediction matched), and its
own re-run of every gate (b9-1: typecheck, lint, the touched tests, the build, the fit and CSP arms, plus one planted
fault in the builder's new never-run phone assertion, which turned red as it should).

## Key Insight

Split by window, not by skill. A builder spends a fresh window on the code; the orchestrator spends its own on
judgment no builder can give itself: the unanchored review, the gates run with its own hands, the docs and the commit.
A builder's "all green" is a report, never a gate result, until the orchestrator has re-run it.

## Also Applies To

- Coupled fixes across the same files: one builder, sequential, never parallel builders on one tree (they leave
  cross-file fallout each flags and neither fixes).
- Any new assertion a builder wrote but never ran: plant one fault before trusting it.
