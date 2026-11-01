---
title: A gate reading a render-closure snapshot validates one commit stale when blur and action share a task
date: 2026-06-11
phase: P2 (D1 — the account-level intake)
modules: [intake, store]
tags: [react, stale-closure, blur, validation, race, useSyncExternalStore, event-order, gesture-hold, held-display, gate-inputs, keep-door, ruling-34, calm-but-wrong, payload-vs-permission]
---

## Problem

The spend step's period force-confirm — built to guarantee the engine never
runs on an unconfirmed monthly/annual figure — let an ambiguous value sail
straight past Continue in the live browser walk, while the identical scenario
passed in component tests.

## Root Cause

The field commits on blur; the flow's `advance()` validated
`snapshot.draft` captured by the RENDER closure. When the blur-commit and the
Continue activation land in the SAME task (programmatic dispatch; plausibly
fast real input), React has not re-rendered between them — `advance()` ran
against a draft one commit old, in which the spend figure didn't exist yet, so
no rule fired and the step advanced. Separate event tasks (normal clicks)
re-render in between, which is why tests and most real usage hid it.

## Fix

The gate now reads the store's CURRENT truth, not the render's:
`validateDraft(model.getSnapshot().draft, …)` inside `advance()`. Rendering
still uses the snapshot (that's what snapshots are for); *decisions* made in
event handlers immediately downstream of a state-committing event read live
state.

## Key Insight

A commit-on-blur field followed by an action button is a two-event sequence
with no guaranteed re-render between them. Any GATE that runs in the second
event and reads render-captured state validates the world as of one commit
ago. Snapshots are for rendering; gates, guards, and dispatch decisions in
event handlers must read the store directly. If a blocking check "worked in
tests but not live," ask what committed between the closure's birth and the
check.

## Also Applies To

- The U8 Save ceremony (Save reads the draft after the last field's blur —
  same shape, higher stakes).
- Any `onComplete`/final-tier dispatch fired from the same tap that commits a
  field.
- memoryModel consumers generally: `getSnapshot()` for decisions, the React
  snapshot for paint.

## Extended (2026-10-31, the h2 gesture hold) — a deliberate display hold is a render snapshot too: hold only the value the face's own field commits, never another input to a held control's gate

The h2 cure (`src/intake/gestureHold.ts`, b9-1) freezes what the W face DRAWS from a press until that press's click, so a blur-commit cannot move or delete the control under the finger. The cure's first draft held the WHOLE draft for the stale note: its words AND its "Keep $84,000 a year" door. The consumers review lens traced the hole by hand (its P1, confidence 75).

In the panel on `datecoststale`, the household said yes to $84,000, and spending has since dropped to $78,000, so the door shows. They type 95,000 into the spending row and tap Keep. The press takes the hold while spending still reads $78,000. Its mousedown then blurs the spending field, and $95,000 lands. Live, ruling 34 withholds the door: a yes now below today's quote is almost always the rosy side (`heldYesBelowQuote`). Held, the door stayed, and its click wrote $84,000 as the household's own figure, $11,000 below spending. An entered figure never goes stale on the quote, so there was no note, no warning that the answer can look better than it is, and a calm value line. Without the hold, the door unmounted at the blur and the tap was simply lost, which was safe. The whole-draft hold turned a lost tap into a calm-but-wrong keep.

The press that blurred spending is the same press the hold exists for. So "hold what the press's blur writes" would have held spending, the very input the gate needed live. The rule is narrower:

- **The note holds W alone** (`useGestureHold(rootRef, draft.workingYearCost)`, then `withWorkingYearCost(draft, heldW)`). W is the value this face's own field commits when a press blurs it. The quote and the reading stay live, so another field's commit under the same press re-gates the door at once. `keepable` reads `heldYesBelowQuote(noteDraft)`: the held W against the live quote.
- **The door keeps the figure it NAMES, written onto the LIVE draft** (`const named = noteW`, then `writeKeptWorkingYearCost({ ...d, workingYearCost: named })`). Keeping the live W instead would have turned "Keep $84,000 a year" into the blur's $7,000. Mutant M4 turns the four Keep tests red.
- **The panel row's value line and money picture hold the whole draft.** That is safe only because nothing in them can be pressed.
- **What concerns the screen keys on what is drawn.** The focus restore and the fork's `aria-describedby` key on the note ON SCREEN, not the live staleness, because a held note outlives the stale answer. Mutant M7 turns W3 and P3 red.

Pinned by unit test P5 ("a commit from ANOTHER row under the same press re-gates the door at once: spending raised past $84,000, the keep is withheld"). Mutant M8 (the note holds the whole draft again) turns exactly P5 red (`b9-h2-cure\PREDICTIONS.md`).

The law is this insight's, seen from the other side. A hold is a render snapshot on purpose. Hold what the screen draws, and inside a region that holds a control, hold only the value that region's own commit writes. The control acts on the value it NAMES. Whether it may act is judged on that value against the LIVE rest of the state. Hold everything only where nothing can be pressed. (Insight 072's law, that a display hold may never show the rosier side, is the sibling: a hold must never be the way a rosier answer gets through.)
