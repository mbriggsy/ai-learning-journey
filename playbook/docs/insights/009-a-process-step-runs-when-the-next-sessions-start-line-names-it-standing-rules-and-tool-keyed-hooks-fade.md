---
title: A process step runs when the next session's START HERE line names it; standing rules and hooks keyed on a tool's name fade
date: 2026-10-31
phase: dev-process
modules: [playbook/principles.md, projects/skills/squeaky-clean, projects/hooks]
tags: [process, flow, start-here, todo, standing-rules, hooks, enforcement, brief, distill, deepen, plan-check, squeaky-clean, sizable]
---

## Problem

The flow's steps kept lapsing even though rules and hooks existed for them:
- Plan, deepen and the whole-plan check fell out of use over the summer, ran again 10-19 to 10-23, then thinned again. Two written rules ("deepen ALL plans first", then "sizable work MUST run the full flow") both faded.
- A project TODO's standing line asked for `/brief` before every unit from June on; main sessions ran it 0 times from 09-17 to 10-18.
- The brief gate held only the `ce-work` skill, unused since 08-08, so it held nothing.
- The distill Stop gate armed when a review skill loaded and fired at the next turn end: mid-review in 6 of 6 review sessions checked (10-20 to 10-31), waved off 5 times.

## Root Cause

Each step depended on something that isn't in front of the session when it picks its next action.
- **A standing rule** (a memory note, a TODO's standing-cadences list) loads, but it competes with the concrete task START HERE hands the session, and the concrete task wins.
- **A hook keyed on a tool's name** watches one path. The work moved to other paths (hands-on builds, Workflows), so the gate either never fired or fired at the wrong moment: a Stop hook means "the next turn end", not "the work is done".
- **What a session actually executes is its START HERE line.** Every step a START HERE line named ran (10-20 to 10-31): the tax-floor and pay-check flows, each whole-file review and its batch `/distill`, a skipped review carried to the front. After the written rule named the plan check (10-22), every later plan got one (10-23, 10-27 twice, 10-29). `/brief`, left out of START HERE, ran in about 4 of 13 pay-check build sessions.
- Caveat: about ten days of record, a strong pattern, not a controlled test.

## Fix

- squeaky-clean step 1: for a sizable job, START HERE names the next step by what it is and its bar, then the steps still owed; a skipped step goes first; lessons queue in DISTILL CANDIDATES.
- principles.md states it, and defines "sizable" (new logic, or more than one session).
- The three skill-name flow hooks were retired (Briggsy's words, 2026-10-31).
- Skills that run their own next step carry steps too: ce-plan deepens and checks in one run; ultramode ends in `/distill`.

## Key Insight

To make a recurring step stick, put its name in the hand-off the next session executes, or inside a tool that is already running and does it as its own next step. Don't put it in a list the session might consult, or in a gate that watches one tool's name. Rules compete with the concrete task and lose; tool-keyed gates go blind when the work changes path. A gate is justified only by a time a step START HERE named was skipped.

## Also Applies To

- Any cadence that should recur: doc audits, the stats-site refresh, "verify once" checks owed in a TODO.
- Any hook or check keyed on a skill or tool name: re-check it whenever the work's usual path changes.
- A project TODO's "standing cadences" section: if a cadence matters for the next job, copy it into that job's START HERE.
