---
title: The shape banner printed after the advisory, but only when nobody was watching
date: 2026-08-08
phase: machinery-rebuild
modules: [scripts/run_engine.py, draft-kit/draft_engine.py]
tags: [subprocess, stdio, buffering, windows, draft-day, verification]
---

## Problem

`run_engine.py` prints where every number came from, then hands the terminal to `draft_engine.py`:

```
--- run_engine: league shape resolved from the draft, not from memory ---
  [source] draft 1390509994847240192, status pre_draft, cargo was 16 min old
  [draft] teams=8 · rounds=16 · roster QB1 RB2 WR2 TE1 K1 DEF1 + 2 FLEX
--- launching: python draft_engine.py 3 8 16 1390509994847240192 ---
=== BOARD STATE: 120 picks in · next is pick 121 ===
...the advisory...
```

That ordering is the entire point: the banner qualifies the advisory, so it has to come first.

On a terminal it does. Redirect to a file — `run_engine.py 3 > draft.log` — and the banner comes
out **last**, underneath the advisory it was supposed to introduce.

It was found by redirecting to a file to capture an exit code, not by reading the code. Nothing
about the source suggests it; the `print()` calls are unambiguously above the `subprocess.call()`.

## Root cause

The parent and the child write to the **same file descriptor** by different routes.

Python picks its stdout buffering from what stdout *is*. A terminal is line-buffered, so every
`print()` reaches the fd immediately and the order matches the source. A pipe or a file is
**block-buffered** (8 KB), so the banner — a few hundred bytes — is still sitting in the parent's
userspace buffer when `subprocess.call()` runs.

The child inherits the fd, not the buffer. It writes straight through, finishes, and exits. Only
when the parent then terminates does CPython flush what it has been holding, appending the banner
after everything the child produced.

So the bug is invisible in exactly the conditions under which anyone would notice it, and appears
only in the conditions under which nobody is watching in real time: a log file, a `tee`, a CI
capture. It is a **presentation** bug with no wrong values anywhere, which is why no test caught it
and no amount of re-reading would have.

## Fix

One line, immediately before handing the descriptor over:

```python
sys.stdout.flush()
return subprocess.call(argv_out, cwd=KIT, env=child_env(plan))
```

Costs nothing on a tty. Verified the way it was found — redirect to a file, read the first six
lines, confirm the banner leads.

## Lesson

**Flush before you hand your stdout to a child process.** Any time a parent prints and then
`subprocess.call`/`Popen`s something that inherits stdout, the parent's buffered output can land
after the child's. It is not a race and not a Windows quirk; it is deterministic, and it flips
based on whether stdout is a terminal.

Two wider points this project keeps re-learning:

- **A tty is not a representative environment.** The interactive run is the one case where
  buffering hides the defect. Anything whose output might be logged, piped, or captured should be
  checked at least once through a redirect — the same class as
  [`003`](003-the-locale-default-broke-a-script-nobody-had-run-on-this-os.md), where the failure
  depended on what stdout happened to be attached to.
- **Running it found what reading it could not.** The ordering is correct in the source and wrong
  in the artifact. This is the whole argument for the runtime-truth rule: green tests and a careful
  read both said fine.

Draft-day relevance is direct — a wrapper whose provenance banner sinks to the bottom of the log is
a wrapper whose warnings get read after the decision they were meant to inform.
