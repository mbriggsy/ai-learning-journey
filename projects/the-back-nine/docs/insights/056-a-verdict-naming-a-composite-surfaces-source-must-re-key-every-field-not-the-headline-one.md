---
title: A verdict that names WHICH source feeds a composite surface must re-key EVERY field of the composite — a mixed pairing lies in one direction or the other
date: 2026-07-02
phase: P3·U9
modules: [src/engine, src/viz]
tags: [dateSearch, DateBand, bandFanTrack, floor-track, composite-surface, coherence, calm-but-wrong]
---

## Problem

The U9a council ratified "the single DateBand crowns off the FLOOR track" — a
headline-level decision. DateBand is a COMPOSITE of three derived fields: the fan (from
the crowned re-run's decumulation balance sink), the outcomeState (from `summarize`),
and the offsetYears. Implemented naively — floor offset + the existing plumbing — the
other two fields kept riding the FULL track: the sink attached to the full-spend pass
and the state came from `headline.outcomeState` (full-track survival). Either mixed
pairing is calm-but-wrong: an "on-track" floor tag over a full-spend fan that visibly
dips to $0, or a full-track state at a floor-only offset that breaks the
`DateBand.outcomeState ∈ {on-track, over-funded}` by-construction contract (the full
track never cleared the bar there).

## Root Cause

A ratifying body decides WHERE a surface anchors; the mechanics of WHAT ELSE the surface
is made of live below the verdict's altitude. Each composite field had its own
independent plumbing (the fan sink defaulted to the primary pass; the state defaulted to
the primary reading), so "crown off the floor" only re-keyed the one field the verdict
sentence literally named (the offset). The incoherence was invisible in the degenerate
case (tracks coincide) — it would only render once a real budget split them.

## Fix

Traced the composite BEFORE building: enumerated DateBand's three fields and re-keyed
each to the floor pass — `simulate` gained `options.bandFanTrack: 'full' | 'floor'` (the
balance sink attaches to exactly ONE pass; the crowned re-run passes 'floor' when a
budget rides), and the band's state reads `floorReading.outcomeState` (falling back to
the headline only in the degenerate, where they coincide). The on-track-or-better
contract now holds by the floor curve's OWN clearing. Pinned by the two-track date test
(band offset === floor's crown; state ∈ {on-track, over-funded}).

## Key Insight

When a decision names the SOURCE for a composite surface, enumerate every field of the
composite and ask "which track/source does THIS field's plumbing actually read?" — then
re-key all of them to the named source. The headline field follows the verdict
automatically because the sentence names it; the sibling fields follow their old
defaults silently. A composite whose fields disagree about their source doesn't average
out — it asserts a specific false conjunction (a tag from one world over evidence from
another).

## Also Applies To

- Insight 047's family (identity-keyed contracts under a new tiered consumer) — this is
  the SOURCE-keyed variant: the split didn't change WHEN fields update, it changed WHICH
  world each field describes.
- Any verdict+evidence pairing: a confidence statement over a band (U7's statement and
  U6's fan must read the same distribution — already contractually true, worth a test),
  the survivor readout's xOfTen vs its step-down dollar (both survivor-conditioned).
- U9b's two-tier headline: each tier's word + count + magnitude must all read that
  tier's own engine-tagged reading — never a word from one tier over the other's count.
