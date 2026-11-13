---
title: A runtime can disguise a failure as something else; a Workflow parallel's null reads as a dead helper, a nested node --test is silent, and an ESM probe copy fails at link time
date: 2026-11-12
phase: the plan step's own skill (U3 and U5)
modules: [projects/archive/skills/ultramode-plan/lib/workflow-stub.mjs, projects/archive/skills/ultramode-plan/lib/workflows.test.mjs, projects/archive/skills/ultramode-plan/lib/run-record.test.mjs]
tags: [workflow, parallel, pipeline, null, swallowed-errors, dead-helper, coverage-hole, node-test, NODE_TEST_CONTEXT, esm, link-time, fault-injection, syncBuiltinESMExports, testing, agent-tool, output-file, empty-file, subagent-transcript]
---

*The `ultramode-plan` code this lesson came from is archived at `projects/archive/skills/ultramode-plan/` (2026-11-12); the lesson stands on its own.*

## Problem

- **A script bug reads as a dead helper.** The Workflow runtime turns a throwing `parallel` thunk into null, the same null a helper that died returns. A TypeError in the script's own code shows up as a coverage hole, never as a failure. The guard built for it then caught a test fixture that set a field to undefined, which the stub's schema check threw inside `parallel`.
- **A nested test run prints nothing.** U5's inlined-copy test starts `node --test` from inside a test, and the child printed nothing.
- **A probe fails with the wrong message.** U5's redirect check used an ESM copy of a module that only throws. It failed at link time with a missing-export error, never its own message.

## Root Cause

- `parallel` and `pipeline` catch a thunk's throw and return null in its place.
- The child `node --test` inherits the runner's `NODE_TEST_CONTEXT` and reports up the parent's channel instead of to its own output.
- ESM links imports before any code runs, so a copy missing the exports its importer names fails before its throw is reached.

## Fix

- U5's stub records every error `parallel` and `pipeline` swallowed (`swallowed`), and a test of a clean run asserts the list is empty (`632c9b97`).
- The nested run deletes `NODE_TEST_CONTEXT` from the child's environment.
- The probe copy keeps the module's exports, so the import links and the throw runs.
- To fail a filesystem call on purpose in ESM code under test: a named ESM import of a builtin is a live binding, so `createRequire("node:fs").renameSync = ...` followed by `syncBuiltinESMExports()` reaches the module's own `renameSync`. Restore it in `t.after` (used for F8's locked stray and F13's fold crash).

## Key Insight

When a harness turns errors into nulls or silence, record what it swallowed and assert the record is empty on a clean run. When a test of a failure shows a different message than the one planted, suspect the harness failed first.

## Also Applies To

- `Promise.allSettled` or `catch(() => null)` patterns that merge "failed" with "no result".
- Test runners started from inside other test runners.
- Mocks of ESM modules: keep the export shape, or the mock fails before it runs.

## Extended (2026-11-12): an Agent helper's output file is empty, so it reads as a helper that said nothing

An Agent tool helper's completion notice names an output file (`tasks/<id>.output` in the session's temp folder). In playbook-5 the contract-brief helper's file held 0 bytes; its words were in its transcript, `~/.claude/projects/<slug>/<session-id>/subagents/agent-<id>.jsonl`, and a saved copy was proven word for word only against that. A count on 2026-11-12 found every Agent output file on this laptop empty: 21 of 21, across seven sessions, while 4 of the 107 finished Bash and Workflow task files beside them were.

What it adds: the empty file is how the Agent tool works here, not a failed helper. Read an Agent's words from its completion notice or its transcript, never from its output file, and never read that file's emptiness as a dead helper.
