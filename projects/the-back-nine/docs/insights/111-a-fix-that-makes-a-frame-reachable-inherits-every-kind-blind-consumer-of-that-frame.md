---
title: A fix that makes a frame reachable inherits every kind-blind consumer of that frame — audit the consumers of the newly reachable state, not just the gate you opened
date: 2026-09-03
phase: Post-Act-4 — the 2026-08-20 intake-walk findings (the completed-intake dead end)
modules: [src/ui/IntakeApp.tsx, src/ui/Result.tsx, src/intake/AssumptionPanel.tsx, src/intake/AnswerStrip.tsx]
tags: [reachability, kind-blind, unrepresentable, aria-modal, insight-109, dead-end, ultramode-review, one-producer]
---

## Problem

The completed-intake dead end (finish intake with one required fact blank → "Still needed: …" over a
main with zero controls) was a conflation: `computing = idle || pending` treated the terminal
idle-with-missing-facts frame as the crunch. The fix read `idle` as the crunch only when nothing is
missing, and the plan-ratified escape hatch came back. Every gate test passed, the walk's exact
household was witnessed live, focus was verified. The unit-boundary review then found a P1: on a
household whose ONLY blocker is UNREPRESENTABLE (`?seed=datesolo` — the retiree buys their own pre-65
coverage while the other works; the two-HSA household), the newly reachable door opened an aria-modal
whose echo said "Still needed: Coverage bought on your own…" — a fact nothing typed can clear — while
the strip four inches above it said, honestly, "there is nothing here for you to add".

## Root Cause

The panel's echo was KIND-BLIND. `missingRequiredFacts` emits two kinds (insight 109): `absent`, the
reader's to enter, and `unrepresentable`, answered and un-carryable. The strip had split them since
109 landed (`blockedLeadFor` + one block per kind). The panel hand-rolled a one-kind line under
`answerStillNeeded` — the exact frame copy.ts legislates against by name. Nobody noticed because the
frame was unreachable there: the door never rendered on an idle non-answer, so the echo's incomplete arm
only ever ran post-first-resolve, where the walk had never taken it. The fix did not create the
defect; it made the frame reachable, and the defect came with the frame. A second consumer of the same
state (the `pending` beat the repair newly reaches) had no arm at all and fell to the quiet line.

## Fix

`53486a39`: the echo reads the kind through the strip's own producers — `blockedLeadFor` for the
lead, a new shared `missingFactNames` for the 3-names-plus-overflow list — with one line per kind only
when that bucket is non-empty, plus the `pending` arm. Pinned on `datesolo` (withhold lead, cannot-price
block, NOT "Still needed"), a two-HSA draft, a MIXED draft (both blocks stay — dropping "Still needed"
wholesale would put an unentered fact under "nothing here for you to add"), and pending. Two mutants
killed. Witnessed live: the echo now reads word for word what the strip reads.

## Key Insight

**When a fix makes a frame reachable, the review target is every consumer of that frame, not the gate
you opened.** List the surfaces that render on the newly reachable state — here the strip, the panel's
echo, the save slot, the focus fallback — and ask of each: does it know every KIND of the state it now
sees, or was it written when only one kind could reach it? A consumer that was correct-by-unreachability
is a latent defect the gate change promotes to live. And the "one producer, every consumer" discipline
is the structural fix: two hand-rolled renderings of one fact list WILL diverge; the second surface
should read the first surface's producer, never re-derive the grammar.

## Also Applies To

- The hatch's other newly reachable states: the save slot on an unrepresentable-only dead end (the draft
  is READY there, so `deriveResultSave` offers "Keep this answer" over an answerless frame — filed) and
  the date route's landing behind an open sheet (no echo `date` arm — filed).
- Any future `MissingFactKind` — a third kind lands in `missingRequiredFacts` and every consumer that
  switches on `kind` must gain an arm; the two that read the shared producers get it for free.
- Insight 109's rule, one level up: 109 said the WRAPPER is copy; this says the wrapper has consumers,
  and reachability is what decides which of them are live.
