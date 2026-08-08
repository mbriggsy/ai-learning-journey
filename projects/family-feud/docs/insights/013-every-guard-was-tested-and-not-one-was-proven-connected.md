---
title: Every guard had a test, and not one of them proved the guard was connected to anything
date: 2026-08-08
phase: Phase 1 boundary — ultramode review of U6
modules: [scripts/build_board.py, scripts/validate_board.py, tests/test_build_board.py]
tags: [testing, wiring, call-site, mutation-testing, false-green, guards]
---

## Problem

U6 shipped with 315 passing tests and a schema gate that had just gone from 13 findings to zero.
An adversarial review asked one question — *what wrong code passes this green suite?* — and the
answer was most of the guards:

| Mutation | Suite result |
|---|---|
| `gate_staged` stubbed to return `[]` | **315/315 green** |
| the `if bad: raise` deleted from inside `stage()` | **315/315 green** |
| `check_generated_fields` removed from `validate()` | **315/315 green** |
| `_content_equal` forced to `False` | **315/315 green** |
| `BADGE_GLYPH = {}` in the engine | **315/315 green** |

The first line is the one that matters: **nothing in the suite proved the gate was wired to the
emit at all.** A build could have shipped a board the gate had rejected, and every test would
still have passed.

## Root Cause

Every one of those guards *had* a test. `assert_pdf_safe` was tested against an emoji.
`check_generated_fields` was reachable and correct. The tests covered the **function** and never
the **call site** — so they proved the guard worked if called, and said nothing about whether
anyone called it.

This is not [`006`](006-four-verification-steps-that-could-silently-do-nothing.md), where the
steps never ran. Here the step runs, is well covered, and is simply *unplugged from the thing it
protects*. A function test and a wiring test look equally green and answer different questions.

The same shape appeared one level down, in an assertion that could not fail: the engine's badge
output was checked by intersecting stdout with all eight glyphs — but four of them are `+ ! ^ v`,
ordinary characters the advisory prints anyway, so the intersection was never empty and
`BADGE_GLYPH = {}` sailed through. It had to be narrowed to the four distinctive non-ASCII glyphs.
That trap bit **twice** in this unit; a source-grep test hit it first.

## Fix

Seven tests that stub the guard to a **sentinel** and assert the *caller* reacts —
`gate_staged` returns `["INJECTED: ..."]`, and the test asserts `build()` raises and that nothing
was written.

Then, the part that makes them trustworthy: **every one was mutation-verified** — plant the
defect, confirm the test goes RED, restore, confirm GREEN. The engine-glyph test failed its own
mutation on the first attempt, which is how the vacuous-intersection bug was found. Each plant
changes the file **length**, so CPython cannot serve a stale `.pyc` keyed on
(mtime-to-the-second, size) — [`009`](009-the-test-suite-was-red-against-source-that-no-longer-existed.md).

## Key Insight

**A test for a guard proves the guard works. It does not prove anything still calls it.** Those
are two assertions, and codebases routinely carry only the first — because the first is the one
that is natural to write while you are writing the guard.

The cheap check: *if I delete this guard's call site and leave the guard itself intact, does
anything go red?* If not, the guard is decoration, however well tested it is.

And a new test is a hypothesis until it has failed once on purpose. Writing it green and watching
it stay green proves nothing about the test.

## Also Applies To

- Middleware, hooks, decorators, signal handlers, `beforeSave`/`afterCommit` callbacks — anything
  whose registration is separate from its definition.
- Feature flags and kill switches: the branch is tested, the flag read is not.
- CI: a verify script with its own passing tests that no workflow ever invokes.
- Any assertion on the *presence* of a token that is common enough to appear for other reasons —
  a substring, a status code, an exit code of 0, a non-empty list.
