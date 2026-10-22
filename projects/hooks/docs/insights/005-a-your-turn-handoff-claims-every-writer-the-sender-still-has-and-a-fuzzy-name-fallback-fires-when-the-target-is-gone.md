---
title: A "your turn" handoff claims every writer the sender still has, and a fuzzy name fallback fires exactly when the named target is gone
date: 2026-10-22
phase: our-setup (squeaky-clean step 10, the successor handoff)
modules: [projects/skills/squeaky-clean/SKILL.md, projects/skills/squeaky-clean/tests/docs.test.mjs]
tags: [cross-session, sendmessage, handoff, successor, squeaky-clean, background-workflows, stop-hooks, name-matching, fallback, platform-behavior, measurement]
---

## Problem
Squeaky's new step 10 messages a successor session ("Handoff: ...; your turn.") so an overnight chain keeps moving. The first draft passed 276 tests and a 6-mutant check. Two ultramode rounds still confirmed 17 issues, then 8 (all P2 by round 2):
- Six of nine round-1 lenses found the same gap on their own. The message carried a "Still running here: background Workflows" line and said "your turn" anyway.
- The name matcher tried the exact name first, then any name that contains it. Round 1 limited it to sessions on this machine. Round 2 showed it still woke a lookalike ("b9-11 probe") when the named "b9-11" had exited.
- The Stop hook asking for /distill fired in this very session after the turn ended. In a closer, that comes after the send, so insight files could land in the tree the successor now works in.
- I labeled "a completion notice wakes an idle session" as measured. The run I cited measured a background shell's exit, not a Workflow's notice.

## Root Cause
- **"Your turn" is a claim about the whole sender,** not about the step that sends it. Squeaky's step 8b stopped background shells. Nothing waited for the session's own Workflows or agents. Nothing covered what runs after the turn ends: Stop hooks, late notices.
- **The fuzzy branch runs only when there's no exact hit.** For a session Briggsy named, "no exact hit" usually means it's gone, which is exactly when a lookalike is the only candidate. The fallback's hits lean toward the wrong target.
- **The "measured" label was copied from a neighboring measurement** (insight 003, repeated by its own author).

## Fix
- **Step 0 now opens by waiting** for this session's background Workflows and agents: end the turn, then restart at step 0 when the notice arrives. It never stops one unasked, since a stop mid-edit half-applies the edits.
- **Step 10 runs last, and after the send this session edits and commits nothing.** A later wake (an agent's notice, a /distill hook) gets a report to Briggsy, not a write.
- **Exact-name matching only** (ignoring case), against peers.mjs `others`, the registry's live sessions on this machine. A miss reports near-misses as a fact: "No handoff: no live session on this machine is named successor; msg-test-successor only contains it." Two exact matches, or an `unverified` row, also send nothing.
- **Every non-send ends in a "No handoff:" line.** A property test asserts that none tells anyone to run anything (insight 004).
- **The label now says what was seen:** "a background Workflow's notice starts a new turn... seen 2026-10-22; an agent's is unmeasured."
- **Evidence:**
  - 277 tests, plus 21 of 21 mutants killed on a copy.
  - A live run: a throwaway closer followed only step 10. The nickname gave the near-miss line. The full name handed off, and the successor woke under 1 s later.
  - `git status` was unchanged.
- **Platform facts, measured 2026-10-22 on CLI 2.1.308:**
  - A peer message wakes a fully idle session in 0.2 to 3 s.
  - A busy session reads it after its current tool call, in the same turn.
  - `notify_when_idle` wakes an idle subscriber, but fires on any brief idle.
  - Status values: `busy`, `idle`, `waiting` (permission prompt), and `shell` (turn ended, background shell running).

## Key Insight
1. A "done, your turn" signal is only as true as the sender's quietest writer. Before sending, list every way the sender can still write (background jobs, hooks that fire after the turn, wakes that come later). Wait for them before the work the signal summarizes, and forbid writes after it.
2. In an exact-then-fuzzy resolver, the fuzzy branch runs only when the exact target is absent. For a target someone named, absent usually means gone, so fuzzy hits lean toward the wrong target. Resolve exactly, and report near-misses as facts so a human fixes the name.
3. A "measured" label is itself a platform claim: cite the run that measured that exact thing.

## Also Applies To
- CI or deploy stages that report "done" while uploads, migrations or cache warms still run.
- Any lookup with a fuzzy fallback: CLI prefix matching, git short refs, "did you mean" that auto-runs, user lookup by display name.
- Agent orchestration: a Workflow reporting "complete" while a background task still writes; messaging a session or agent by name.
