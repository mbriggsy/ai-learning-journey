---
title: An invited door routed into a shared mandatory-gate component inherits the gate's no-escape
date: 2026-07-03
phase: Act 3 (the U8-tail Phase-2 UX pass)
modules: [ui]
tags: [ux-honesty, mandatory-gate, cancel-affordance, component-reuse, ultramode-review]
---

## Problem

The new re-offer backup door (an OPTIONAL, quiet invitation on the result screen) routed into the
existing `ExportConfirm` — a component built as the first-save ceremony's MANDATORY export gate:
channels + an `aria-disabled` Finish, deliberately no cancel, because that mount must be
un-skippable. A user who tapped the quiet door "just to look" had no way back: the only exits were
completing an export (committing to something they declined) or a full reload + re-unlock. The
sibling ColdStart restore door built the SAME session got an `onBack` precisely for the
"tapped in, changed my mind" case — the identical case here went unhandled.

## Root Cause

Reusing a gate component imports its ESCAPE POLICY along with its markup. `ExportConfirm`'s
no-cancel shape is a deliberate property of the MANDATORY mount, but nothing marked it as
mount-specific — so the new invited mount silently inherited un-skippability as if it were part of
the export UI rather than part of the ceremony's contract. The component test suite couldn't see it
(the host test stubbed `BackupStep`, and the live pass drove only the happy offer→export→dissolve
path — nobody drove "decline").

## Fix

An OPTIONAL `onCancel` on `ExportConfirm`, rendered as a quiet "Not now" only when provided. The
mandatory ceremony passes nothing (pinned: no Not-now without the prop), the invited mount passes
an escape back to the answer that records nothing and keeps the door offered (pinned both at the
component and through the host's phase machine, plus live-verified).

## Key Insight

When a surface is reused across mounts with different OBLIGATION levels (mandatory ceremony vs
invited offer), its escape affordances are part of each mount's contract, not the component's — 
make them props with the strict default. The review question that catches this class: for every
NEW route into an existing flow, walk the exits — "how does a user who changes their mind get back,
and what does that path commit them to?" An invited door must never cost more to decline than to
ignore.

## Also Applies To

- Any future mount of `RestoreFlow`/`SaveFlow` sub-steps from a new context (the file step's
  `onBack` is already optional for exactly this reason).
- The control sheets if they ever gain an entry from a non-Result surface (their Close semantics
  assume the Result mount).
- Test discipline: when a host test stubs the flow component, the stub hides the flow's escape
  topology — drive the decline path somewhere real (component test + live) before shipping an
  invited entry.
