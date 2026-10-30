---
title: urllib let a dropped connection through unwrapped, and the crash exited with the code that means "read this"
date: 2026-10-29
phase: in-season
modules: [scripts/gameday_check.py, scripts/trade_eval.py, tests/test_gameday_check.py]
tags: [urllib, exceptions, http-client, exit-code, scheduled-tasks, silent-failure, degrade, network]
---

## Problem

`gameday_check.get_json` caught `(URLError, TimeoutError, JSONDecodeError)` and turned each into a
`Refuse`: Sleeper's becomes a clean exit 2, ESPN's becomes a line on the report. A plan-check reviewer
measured with a local socket that a server closing the connection, or sending a short body, got
past it. The scheduled run died in a traceback, wrote nothing to GAMEDAY.md, and exited **1**. The
docstring defines exit 1 as *"something worth reading was written."* The code review then found a
third escape: a non-UTF-8 body raises `UnicodeDecodeError` from `.decode()`. That is a `ValueError`,
not a `JSONDecodeError`.

## Root Cause

CPython's `AbstractHTTPHandler.do_open` (checked on this machine's 3.14) wraps only `h.request(...)` in
`except OSError: raise URLError(err)`. `h.getresponse()` sits OUTSIDE that wrapper, and `r.read()`
runs later in our own `with` block. What escapes:

- `http.client.RemoteDisconnected`: MRO `ConnectionResetError → OSError` and `BadStatusLine →
  HTTPException`. An OSError, but NOT a URLError, so `except URLError` misses it.
- `http.client.IncompleteRead`: `HTTPException` only, raised by `read()` on a truncated body.

Python's unhandled-exception exit status is 1, which collides with the project's own exit code for
"worth reading". The failure looked like an alert, and the alert's file was empty.

trade_eval.py had already met this (`except (OSError, http.client.HTTPException)` around `load()`,
commented "a dropped connection get_json does not wrap") and patched its own call site. The bug in the
shared helper stayed.

## Fix

`get_json` catches `(OSError, http.client.HTTPException, ValueError)`. OSError covers URLError, TimeoutError
and ConnectionResetError; ValueError covers JSONDecodeError and UnicodeDecodeError. Every caller now gets a
`Refuse`, and `external_projections._get` got the same tuple. Tests:
`test_a_dropped_connection_is_a_refusal_from_get_json`, plus a main-level run with `urlopen` raising each
class, which must print the "ESPN unavailable" line and exit by the rows (mutant M7 goes red).

## Key Insight

**`urllib.error.URLError` is not "every network failure".** It is whatever `do_open` chose to wrap, and
it skips the response half of the exchange. Catch `OSError` + `http.client.HTTPException` at the HTTP
boundary.

Second: **when a caller patches around a shared helper's gap, fix the helper.** The workaround in
trade_eval was a documented sighting of this exact bug, and it left every other caller exposed.

Third: **an unattended script's exit codes should not collide with the interpreter's.** A crash is exit 1,
and Task Scheduler's Last Result then reads "1 = something to read". The project already distrusts that
column (insights 002, 007; `install-gameday.ps1` proves a run by GAMEDAY.md freshness), so the real cost
is the silence: the crashed run left no entry, and a missing entry looks like "nothing ran".

## Also Applies To

- Any new fetcher: use the same except tuple (`external_projections._get` had the identical gap; fixed
  in the same commit).
- `merge_picks.py` / the mule's fetchers: any urllib call whose failure must degrade, not crash.
- Any scheduled task whose exit code is read as a signal (insight 002: a frozen success code).
