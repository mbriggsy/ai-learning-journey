---
title: The draft engine had never once run on the machine it was written for
date: 2026-08-07
phase: cowork-migration
modules: [draft-kit/draft_engine.py, draft-kit/players_data.json]
tags: [encoding, utf-8, cp1252, windows, python, portability, migration, smoke-test]
---

## Problem

Smoke-testing `draft_engine.py` after migrating the project from a Linux sandbox to a Windows
laptop, it died before printing a single line:

```
UnicodeDecodeError: 'charmap' codec can't decode byte 0x8f in position 538
```

This is the project's load-bearing tool — the thing that computes advice against a 120-second draft
clock. It had been written, reviewed, and used across three mock drafts. On this machine it had a
0% success rate, and nobody knew.

## Root Cause

Python on Windows defaults **both** file reads and `sys.stdout` to the locale code page — cp1252
here. The board JSON is UTF-8 and carries emoji badge icons, so a bare `open()` hit byte `0x8f`
(part of a U+26A0 variation selector) and died.

The second fault hid behind the first. Fixing the read would have moved the crash, not removed it:
`sys.stdout` is *also* cp1252, and the tier-cliff line prints `⚠` (U+26A0), which cp1252 cannot
**encode**. The next failure would have landed on the exact output the whole draft doctrine keys
off — and would have looked like a completely new bug.

Neither fault could ever appear in the original environment, where UTF-8 is the default for both.
The code was never wrong *there*; it was never portable, and nothing had tested the assumption.

## Fix

Explicit `encoding="utf-8"` on every `open()`, plus a guarded `sys.stdout.reconfigure(encoding=
"utf-8")`. Verified against three real states — empty draft, mid-draft, and a *forced tier cliff*
specifically to make the `⚠` glyph render. Recorded in the project landmines, since anything new
that reads this data inherits the same trap. (Python 3.15's PEP 686 makes UTF-8 the default, which
will make the guard redundant rather than wrong.)

## Key Insight

**An environment migration silently invalidates every implicit default the old environment
supplied.** Locale, encoding, path separators, case sensitivity, line endings, available binaries —
code doesn't reference these, so nothing flags them, and a green test suite elsewhere says nothing.

Two habits follow. **Run the load-bearing tool as the very first act after a migration** — not the
test suite, the actual tool, on real data, and read the output. And when you find one instance of an
implicit default, **fix the whole class in one pass**: encoding bugs come in read/write pairs, and
patching only the half that crashed converts a caught bug into a latent one that resurfaces later,
wearing a different error message.

## Also Applies To

- Any script moving between Linux/macOS and Windows, or between CI and a developer machine
- Docker images whose base sets a different `LANG`/`LC_ALL` than the host
- Case-sensitive vs case-insensitive filesystems (`Draft Kit/` vs `draft kit/` resolving the same)
- CRLF vs LF assumptions in tools that rewrite whole files
- Anything that "works on my machine" where the machines differ by OS rather than by dependency
