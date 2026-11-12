---
title: A plan reviewed only for what could go wrong grows and never shrinks; size the proof to what the owner needs to know, and re-check a long plan against the code at its midpoint
date: 2026-11-12
phase: the plan step's own skill (the hybrid plan's remaining units; the lean plan, 2026-11-11)
modules: [projects/archive/skills/ultramode-plan/docs/plans/lean-plan-step-plan.md, projects/archive/skills/ultramode-plan/docs/plans/hybrid-plan-step-plan.md, playbook/TODO.md]
tags: [scope, plan-growth, proof, guards, head-to-head, right-size, drift, midpoint, start-here, duties, review, process, deepen, scope-guardian, ce-plan, reversal, plan-trial]
---

## Problem

- **Growth.** By 2026-11-11 the plan step's remaining work was an estimated 12 to 22 sessions, most of it a blind head-to-head nobody had asked for. That day's whole-plan check found 94 more things to harden, and all seven of its standing P1s sat in the head-to-head. Briggsy cut it in one message: "we're not building a nuclear reactor." The next day, mid-run: "balanced. I don't want 3 thousand tests for tic-tac-toe."
- **Drift.** The plan was checked before its first unit was built. By the time U1 to U5 were built, 123 verified findings stood between the plan's remaining units and the code, 43 of them the kind a builder would hit. START HERE had grown to 30,708 characters of duties to hand on that no check had ever read.

## Root Cause

- Every review lens asks "what could go wrong?" None asks "what does the owner need to know, and what is the cheapest thing that tells him?" Each check adds; nothing subtracts.
- A plan checked once, before building, drifts from the code with every unit built after it. Duties parked in the queue file are a second plan that escapes every check.

## Fix

- The lean plan (2026-11-11) replaced the remaining units and the head-to-head with seven steps and a light trial. Its rule: a guard goes in only with the incident that earned it, and no command is added for recovery.
- The remaining-units update re-checked the remaining units against the code before the cut. START HERE went back to naming the next step and what is owed after it, nothing else.

## Key Insight

Before a plan adds a proof or a guard, ask three things: what does the owner need to know, what is the cheapest thing that tells him, and has the guarded thing ever happened to us? Re-check a long plan against the code at its midpoint, and keep duties in the plan, where a check reads them.

## Also Applies To

- Security or reliability reviews that only ever add controls.
- Test plans sized by "what could break" instead of "what would we act on".
- Hand-off notes that grow into a shadow spec.

## Extended (2026-11-12): in ce-plan's run the deepen added two mechanisms, and only the check's scope reviewer took them out

In the plan-step trial's ce-plan arm (playbook-4), the deepen's helpers added two mechanisms the request did not need: 457(b) plans as new account kinds (the deepen's KTD12), and a reach read of saved plans for the leak fix's pricing change. The plan took both. Nothing asked "does the request need this?" until the check's scope reviewer did, and the check reversed both (the arm's `check-resolved-review.md`: the kinds "bought a limit family and Act 5 coordination the charge does not need"; the reach "would cost five files for no reader", since no real save exists).

What it adds: the question that subtracts has a seat, CE's scope reviewer, and every other step, the deepen included, only adds. Keep that seat in every plan check, and read its reversals as the plan's scope, not as noise.
