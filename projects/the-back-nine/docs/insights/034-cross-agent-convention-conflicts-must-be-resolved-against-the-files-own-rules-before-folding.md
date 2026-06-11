---
title: Independent verification agents apply conflicting conventions — the fold must resolve them against the file's OWN documented rules, and the harness's manifest is itself an error source
date: 2026-06-11
phase: P1-exit pin pass
modules: [engine/reference/tickerBlend, engine/constants]
tags: [multi-agent, adjudication, conventions, fold-discipline, insight-023, insight-026]
---

## Problem

Two multi-agent sweeps, two fold hazards. (1) The constants sweep's ONLY stop
item was the workflow's own inventory agent mis-transcribing 4 anchor cells
(off-by-one-column reads) — the committed data was correct; the verification
HARNESS produced the only errors in the run. (2) The tickerBlend adjudicators —
each individually rigorous, primary-sourced, arithmetic-reproducing — applied
OPPOSITE conventions to the same question across rows: one State Street agent
folded REIT+commodity into stock, the other excluded both as 'other' (a form
that would have violated the table's own ≥97 sum bound), while the T. Rowe
agents folded REIT-equity to stock. Folding the prescriptions verbatim would
have committed a table that disagrees with itself about what "stock" means.

## Root Cause

Each agent resolves under-specified conventions LOCALLY and confidently; with
N independent agents you get up to N local resolutions, and no agent's job is
cross-row consistency. Same shape as insight 023 (a panel validates arithmetic,
not rule selection) — but at the FOLD: the unchecked trust root is the
convention each prescription silently assumed. And the harness's own generated
artifacts (manifests, anchor lists) are transcriptions too — insight 009's
risk class applies to the reviewer's notes, not just the reviewed data.

## Fix

Before applying any prescription: (a) read the target file's OWN documented
conventions (header + structural test bounds) as the authority; (b) derive ONE
uniform rule (equity-holding funds → stock; commodity-futures → denominator
only); (c) recompute the prescriptions that assumed otherwise (33.3 → 30.13);
(d) document the convention in the file header so the next sweep inherits it.
For the manifest error: the adjudicator caught it by re-reading the SOURCE
file — and the fold independently spot-checked the contested cells again.

## Key Insight

A multi-agent fold has a job no agent owns: CROSS-PRESCRIPTION consistency.
Before applying N independently-verified fixes to one artifact, extract the
convention each one assumed, resolve conflicts against the artifact's own
documented rules (never by picking the more confident agent), and write the
resolved convention INTO the artifact. And treat every harness-generated
intermediate (inventories, anchor manifests) as untrusted transcription — a
"mismatch" verdict may be indicting the harness, not the data.

## Also Applies To

Any future sweep that prescribes edits across many rows of one table (the next
tickerBlend re-pin, a constants vintage bump); review workflows whose enumerate
stage transcribes committed values for adjudicators; D1 intake's manual
classifier (its 3-choice convention must match this table's documented rule).
