---
title: A copy string that promises an affordance is a UI contract — pair every promise verb with a rendered-control test in every state that shows the string
date: 2026-07-22
phase: U16 recommendation surface (ultramode fold)
modules: [src/ui/Result.tsx, src/ui/RecommendationSurface.tsx, src/ui/copy.ts]
tags: [copy-contract, affordance, stranded-state, stale, compute-error, blocked, dead-end, calm-but-wrong, hint-rewording, control-routing, door-render-condition, act-name, gate-message, read-only-host, both-or-neither, structural-conjunction]
---

## Problem

Three independent fold lenses (architecture, reliability, adversary-temporal — 7/7
refuter votes RM) converged on one family: after a committed recommendation, any
draft edit demoted the solve channel to `stale`, whose note read "re-open it
whenever you'd like" — but `solveInvitable` fired only for idle/goal-unset and the
re-pick door rendered only on the `recommended` view, so NO control existed anywhere
that could re-open anything. Same family: `compute-error`'s "try again" with no
button, and `blocked{buckets-defaulted}` rendering literally NOTHING (a no-headroom
household that picked a goal watched the invite vanish into a silent blank).

## Root Cause

The copy and the gating were authored as separate concerns. The note-writer wrote
the honest next step ("re-open it"); the gate-writer enumerated the states that
START a flow (idle, goal-unset) — and nobody owned the conjunction "every state that
SHOWS this string also renders the control it promises." The payload-shape law
("a shape without a render is a broken state") was enforced for the committed arms
but the blocked/demoted arms slipped through as null-renders.

## Fix

(30b5ae85) `solveInvitable` broadened to stale + compute-error (the invite door
returns beside the note, wired to the same GoalPicker → dispatch path);
`blocked{buckets-defaulted}` renders a calm named-reason steer
(`recommendBucketsNote`); the rec surface route-gated so the promise never renders
where the feature doesn't exist (the date route). Tests: re-dispatch proven from
stale; blank-render mutant red.

## Key Insight

Copy that names an action the user can take is a CONTRACT, not prose — "re-open,"
"try again," "you can adjust" each assert a control exists. The test obligation is
the conjunction, per state: for every state that renders the string, assert the
promised control renders AND drives the promised transition. The sweep is
mechanical: grep copy.ts for promise verbs, map each key to the states that show
it, demand a control test per state. A silent null-render arm is the same defect
one step earlier — the state promises nothing and delivers nothing, which reads as
breakage to the user who just acted.

## Also Applies To

Every future solve-channel state (U17's re-entry copy explicitly promises
re-validation); the vault unlock/staleness notes; any "adjust it in your
assumptions" disclosure — each names a door that must exist on every surface the
sentence reaches.

## Extended (2026-10-30, the U10 Caddie card) — trace where each control leads before rewording a hint a second time

Three rewordings of one pointer on the W step's stale face failed the same seat ("which button fixes it?") until the
chair read where each control leads: both reach W. A hint that names a fix is a promise about a control, so the
wording question was really a routing question. When one rewording fails, trace the controls before drafting the
next (b9-7).

## Extended (2026-11-23): make the conjunction structural — build the words that name a door from the door's own render condition

Build 2's working-year step turned this insight's per-state test into code structure, because a test per state kept
missing states. Words that name a door must come from the same condition that draws the door, or they promise a door
the face does not draw. Three cures, all in `src/intake/workingYearQuote.ts` and `workingYearLeftOver.ts`:

- **Derive the gate's message from the core that draws the door** (`workingYearCostGateMessage` /
  `workingYearCostKeepLabel`, b9-1's fix round). "Answer it above" over an already-answered face was insight 109's
  wrong-frame defect again; a message read off the door's own core can only name what is drawn.
- **Key the act's name to the door's predicate.** "Confirm or change" cured "checking = looking" but named a Keep door
  three households lack, and pointed at a retype that clears the warning (b9-7). `workingYearCostAct` now reads
  `heldYesBelowQuote`, the predicate the Keep door rides ("update" where the held figure is below today's quote,
  "confirm or change" otherwise). Inverting it redded the households with no "saved" answer too, because every stale
  W's door rides that predicate.
- **Compose the button-naming lead with the door, never inside the line** (`workingYearCostStaleDoor`, b9-6). The line
  also prints on a read-only tab, where no door is drawn. A lead carried inside the line would name buttons that tab
  cannot reach, so the host prints the lead and the door together, or neither.

Walk 5 still found "the gate names buttons it doesn't draw", so the structure does not retire this insight's test
sweep. What it changes is the default: a new host starts right by construction instead of by audit.
