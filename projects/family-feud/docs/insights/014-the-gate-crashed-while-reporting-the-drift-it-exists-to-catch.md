---
title: The gate crashed while printing the drift it exists to catch
date: 2026-08-08
phase: Phase 1 boundary — ultramode review of U6
modules: [scripts/validate_board.py]
tags: [encoding, cp1252, windows, error-path, reporting, false-red, insight-003]
---

## Problem

`scripts/validate_board.py` is the board schema gate — the thing that refuses to let a board the
engine cannot eat reach draft morning. Run it on a Windows console with a board carrying any
non-cp1252 character, and it dies:

```
UnicodeEncodeError: 'charmap' codec can't encode character '☃'
```

Not while *checking*. While **printing the problem it had correctly found.** The check worked
perfectly; the report killed the process.

## Root Cause

`main()` never did `sys.stdout.reconfigure(encoding="utf-8")`. `draft_engine.py` has done it since
[`003`](003-the-locale-default-broke-a-script-nobody-had-run-on-this-os.md), and
`build_board.py` was written with it. The gate — added later, by the unit whose whole subject is
correctness — was the one file that missed it.

What makes this worse than an ordinary crash is **which direction it fails in**. The gate's
messages quote board values by design: player names, the badge glyphs it is checking for
encodability, the em-dashes in the strategy prose. So the messages most likely to kill it are
exactly the ones reporting a real defect. To the operator it reads as *"the gate is broken"*, not
*"the board is wrong"* — and the rational response to a tool that crashes on you at 7am is to stop
running it. A false red that discredits the gate is worse than a false green
([`009`](009-the-test-suite-was-red-against-source-that-no-longer-existed.md) recorded the same
asymmetry).

Fourth instance of 003's locale trap in this project. It keeps recurring because it lives on the
**error path**, which is the least-exercised code in any program: the happy path runs constantly
and carries clean data, while the error path runs rarely and, by definition, is the only path that
ever handles the worst data.

## Fix

Force UTF-8 stdout in `main()`, guarded, like the engine and the generator already do.

Reproduced under cp1252 before and after, with a poisoned badge glyph, rather than reasoned about:
before, a traceback and no report; after, **exit 1, zero tracebacks, and the offending `☃` printed
intact** inside the message naming it.

## Key Insight

**The error path is the least-tested code and the only code that ever meets the worst input.**
Those two facts point in opposite directions, and the gap between them is where reporters die.

So test the *reporting* of a failure, not only its *detection*. "Does it catch X" and "can it tell
me it caught X" are different assertions, and a suite that only ever asserts on returned values —
never on the rendered output — checks the first and never the second.

The tell: any code path that only executes when something is already wrong, and whose job is to
describe the wrongness using the offending data itself.

## Also Applies To

- Every log line, exception message, or diff that interpolates untrusted/user data — the crash
  lands precisely when the data is unusual, which is when you need the message.
- Structured logging that serializes an object which is only non-serializable in the failure case.
- Alerting paths: a monitor that raises while formatting its own alert is a silent monitor.
- Any project rule of the form "always do X" — grep for the files that *don't*, especially ones
  added after the rule was written. The newest file is the likeliest to have missed it.
