---
title: An amendment's blast radius is the CONSUMERS of the superseded premise, not the producers of the new content — grep for premise phrases, not requirement numbers
date: 2026-06-10
phase: P1 (Track A — the accumulation fold, doc reconciliation)
modules: [docs/plans, docs/brainstorms]
tags: [doc-reconciliation, amendment, supersession, deepening-drift, blast-radius, verbatim-transplant, additive-invariant, verification]
---

## Problem

Track A folded R26–R39 (the full-projection expansion) into the master requirements, roadmap, and the three phase docs named by the plan's A3 file list. All three units verified green against their own specs — yet the cross-doc coherence reviewer found **four docs still asserting the superseded on-ramp as current**: phase-4's U16 called the tax-blind single-figure on-ramp "a deliberate bet, not an oversight" (and named, as a hypothetical fallback, exactly the design the fold had adopted); phase-1's U2/U3 said the schemaVersion-2 fields are "first written to disk by Phase 3 … since the spine first answer runs with these overlays OFF"; phase-2's own U7 body said the overlays are "OFF for the Phase-2 spine answer" two sections below a banner claiming the unit "stands unchanged"; phase-3's contract #5/U10 still routed bucket collection through the lever-open mini-intake.

## Root Cause

The plan's A3 file list was derived from **"where does the new content land"** (producers: the units' new homes). But the 2026-06-08 fold *inverted a prior decision* (the deferred-bucket-split / tax-blind first beat), and a decision that was deliberately load-bearing had been **cited as a rationale by docs that received no new content**. Phase-4 wasn't in the file list because no C/D unit lands there — yet it had built a whole reframe story ON the superseded premise. The same session's master-doc work hit the identical shape at smaller scale: R5 carried the single-spend claim, and the amendment banner I wrote before striking R5 undercounted its own edits. This is the deepening-drift anti-pattern (header amended, body stale) generalized **across a document set**: amend-the-producers leaves every consumer asserting the dead premise.

## Fix

Swept for the **premise phrases** — "tax-blind", "single total-spend", "lever-open", "written to disk by Phase 3", "OFF for the … spine answer" — instead of R-numbers (the consumers never cite the new requirement; they cite the old *rationale*). Each hit got the dated strikethrough + supersession-pointer treatment; phase-4 got a banner + frontmatter `amended:` as a recorded scope addition (mirroring the approved north-star precedent), and the plan's `amends:`/Sources/A3 lists were re-aligned.

## Key Insight

When a fold **supersedes a decision** (not just adds content), the edit list must be derived twice: once from the new content's landing sites, and once from a **premise-phrase grep** for the old decision's signature wording across the *entire* doc set — including docs the plan never names. A decision good enough to be load-bearing was good enough to be cited as a rationale elsewhere; those citations are the blast radius. Two supporting disciplines proved out: (1) verbatim transplants of large doc bodies must be **programmatic line-range extraction** (cmp-verifiable — 89KB landed byte-identical; retyping would have drifted), and (2) an "additive" amendment commit has a falsifiable invariant — **zero removal hunks** outside named supersessions; counting removals is what caught two Goal lines my amendment notes had silently replaced instead of annotated.

## Also Applies To

- Any future re-plan that flips a Key Decision (e.g. promoting WASM, adopting Argon2id, un-deferring SS-claim-age): grep for the OLD decision's rationale phrases ("fast-follow", "PBKDF2 is acceptable", "held fixed") across docs/ + CLAUDE.md before declaring the cascade done.
- Code-side siblings: a renamed/superseded engine contract cited in comments ("never a contribution back" already needed the §7 update); constants whose *rationale* comments outlive a regime change.
- The copyGuard catalog: superseding a copy decision means sweeping for strings built on the old framing, not just editing the named entry.
