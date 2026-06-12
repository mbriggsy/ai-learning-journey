---
title: A gate reading a render-closure snapshot validates one commit stale when blur and action share a task
date: 2026-06-11
phase: P2 (D1 — the account-level intake)
modules: [intake, store]
tags: [react, stale-closure, blur, validation, race, useSyncExternalStore, event-order]
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
