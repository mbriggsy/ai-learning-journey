---
title: "A mark that vouches for a fact must live in the component that sees the fact END — the W period's \"unit answered\" disarm lived in the host while the unit lived in the question's own state, and three exits left it vouching for a figure it never saw (84,000 ran as $1,008,000, unasked); a gated step's ungated Back is the same hole"
date: 2026-10-31
phase: the pay check's whole-file review (Phase C, b9-9) — ruling 38; Phase B's review (b9-3) — `discardOnBack`
modules: [src/intake/WorkingCostQuestion.tsx, src/intake/questions.tsx, src/intake/flow.tsx, src/intake/sanity.ts, src/intake/AssumptionPanel.tsx]
tags: [state-ownership, lifecycle, provenance, disarm, touched, period-rule, gated-step, back-exit, mount, single-home]
---

## Problem

The W question takes a yearly working cost typed per month or per year, and the period rule refuses a big figure
until its unit is tapped (a monthly figure read as yearly runs 12× low). The rule's disarm — "this unit was answered" —
was written by the HOSTS: the flow's `SanityProvenance` W flag, read once at mount, and the panel's Keep door. The
review found it outliving the unit it vouched for three ways: Keep marked the period but left the face at month, so
Keep → yes or clear → a new figure ran 84,000 as $1,008,000, unasked; the mount flag stayed true after the entered W
was cleared (clear → Back → Continue → the same); and a mount over a yearly entered W, replaced by a yes, opened the
next figure under an UNTAPPED year. Three lenses, three paths, one defect.

Phase B's review (b9-3) had found its sibling: four lenses saw that Back is the one ungated way out of a gated step,
so a value the step's Continue refuses ($0, an unconfirmed period) left through Back and met a route change or a
remount's provenance downstream.

## Root Cause

One fact had two homes. The unit lived in the face's own state; the mark that vouched for it lived in components that
could see the moments it became TRUE (a mount, a Keep tap) but not the moments it stopped being true (the figure
cleared, a yes replacing it, the unit falling back to month on remount). A mark written by a component that cannot
see the fact's death outlives it. Back is the same shape at the step level: the step's validity was owned by its
Continue gate, and the exit nobody gated carried the step's leavings past it.

## Fix

Ruling 38 (`b9-phaseb\DECISIONS.md`): `SanityProvenance` lost its W flag; the face sets AND drops the disarm through
`onPeriodTap` / `onPeriodReset` (`WorkingCostQuestion.tsx`'s "ONE HOME, THIS FACE" block) — marked at mount over an
entered W (that figure cleared the gate before it could commit), dropped at mount over none, dropped with the unit
back to month when the draft's W stops being `entered` and no period was tapped on this face; a tap stands until the
face unmounts. Eight new arms; 9 of 9 planted mutants killed. For Back: `discardOnBack` (`flow.tsx`) — if the step's
own field rules fire on the current draft, the step's discard clears the field before leaving.

## Key Insight

**Before adding a second channel for one fact, ask which component knows the moment it stops being true — and put
the whole lifecycle, set AND drop, there.** Other components may read the mark; only its owner writes it. The tells:
a flag "read once at mount", a handler that marks state another component holds, a mark with a setter and no
dropper. And a gated step owns what it leaves behind on EVERY exit: list them (Continue, Back, route change, remount,
the panel's doors) before trusting the one with the gate.

## Also Applies To

- Every "confirmed" / "touched" / "kept" mark beside a value it vouches for: the spend period, the quote's yes, a
  stale note's dismissal.
- [[112]] — a leave-page guard reading one store; the same enumerate-every-buffer move for exits.
- [[058]] — an invariant with many writers is not closed by fencing one; here the writers were hosts.
- [[022]] — provenance is per figure; a figure's provenance dies with the figure.
