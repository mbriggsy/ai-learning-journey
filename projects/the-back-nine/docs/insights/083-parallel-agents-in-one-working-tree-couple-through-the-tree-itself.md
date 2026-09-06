---
title: Parallel agents in ONE working tree couple through the tree itself — vitest collects a teammate's scratch probe, a whole-file rewrite flips the repo's EOL, and sibling tests pin an edit that hasn't landed
date: 2026-07-12
phase: Act 3 follow-up (the ask-for-Medicare-extras unit — the parallel seed-tuner, session 2026-07-11; reconstructed from the tuner transcript at the closeout review)
modules: [e2e, ui, process]
tags: [parallel-agents, shared-working-tree, scratch-fixtures, vitest-globs, eol, crlf, coordination, decide-before-dispatch, seed-tuning]
---

## Problem

The extras build ran a parallel **seed-tuner** agent in the SAME working tree as the
coordinator (building the engine/intake halves) and a sibling test-writer. The tuner's work was
excellent — drift recorded before re-tune, six knobs landed, 24/24 pins green — but the
transcript records three coupling surfaces:

1. **The collected scratch probe.** The tuner wrote its drift-capture probe as a temp test at
   the project root — its own words: *"reliably picked up by vitest."* Reliably-collected cuts
   both ways: for as long as that probe existed, EVERY other agent's `vitest`/lint run in the
   shared tree would collect a throwaway fixture that must never ship — and its mid-window
   deletion makes a teammate's two runs silently non-comparable.
2. **The EOL flip.** The tuner's python rewrite of `devSeeds.ts` silently converted CRLF→LF —
   a 914/873-line whole-file diff hiding six real edits. The repo convention is CRLF with
   `core.autocrlf=false` (nothing auto-restores it); the tuner burned a round-trip diagnosing
   its own diff before converting back in binary mode.
3. **Fixture pins on a pending edit.** The tuner found `staleness.test.ts` already referencing
   `medicareExtrasByPerson: [...]` on the retired seed — *"confirming the parallel team coded
   the sibling tests expecting exactly my retired edit."* The coordination HELD, but only by
   shared context at dispatch: two agents held write-expectations over one fixture surface with
   no mechanism making the expectation binding.

## Root Cause

Agents sharing one tree interfere through the tree itself — and no agent's own green gates can
see any of it.

## Fix

- Scratch probes live OUTSIDE the collected globs — the session scratchpad, `temp/`, or a
  Workflow `isolation: 'worktree'` — never a path vitest/eslint collect in the shared tree. If
  a probe MUST be collected to run, the agent's charter includes delete-before-handoff AND the
  join point re-runs the pinned suites (the tuner's own caveat, institutionalized: re-run
  `devSeeds.test.ts` once at the merge before the single commit).
- Whole-file writers preserve EOL byte-for-byte (python `newline=''` / binary mode) — on this
  repo, anything else turns a six-line edit into an unreviewable whole-file diff.
- A fixture surface two agents both touch is a DECIDE-BEFORE-DISPATCH fact (the delegated-build
  laws): the dispatch names who owns the seed values and what the sibling tests may pin, so
  the coordination is carried by the charter, not by luck.

## Key Insight

Agents don't only couple through the code they hand off — they couple through the WORKING TREE
as a shared runtime: test-collection globs, line-ending conventions, lint sweeps, and fixture
expectations are all channels where one agent's scratch state becomes another agent's input.
Before dispatching parallel builders into one tree, enumerate the tree-level channels the way
you'd enumerate API contracts — and give any agent that mints collected artifacts (tests,
fixtures, probes) either an isolated tree or a hygiene clause with a join-point re-verify.
(The review-fleet scratch-file sweep in memory `review-workflow-agents-leave-scratch-files` is
this lesson's earlier sibling; the seed-tuner adds the collected-by-DESIGN probe and the
EOL channel.)
