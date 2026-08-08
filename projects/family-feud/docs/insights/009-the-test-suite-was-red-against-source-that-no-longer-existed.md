---
title: The test suite was red against source that no longer existed
date: 2026-08-07
phase: machinery-rebuild
modules: [draft-kit/normalize.py, tests/test_normalize.py]
tags: [verification, mutation-testing, bytecode-cache, pycache, python, false-positive, windows]
---

## Problem

U3's mutation pass plants a defect, runs the suite, asserts it goes red, restores the file, and
moves on. Eleven mutants behaved. Then the **restored, correct, unmodified** repo reported:

```
RESTORED: RED
FAILED (failures=3)
AssertionError: norm_spec.json drifted from SPEC -- run: python normalize.py --emit
```

`git status` showed nothing unexpected. `grep` showed `normalize.py` holding the correct step order
(`nfkd_ascii` before `lower`) and `norm_spec.json` agreeing with it. Both files on disk were right,
and the suite failed claiming they disagreed — while reporting `normalize.SPEC` still held the
**mutated** order.

## Root Cause

CPython invalidates a cached `.pyc` on **(source mtime truncated to whole seconds, source size)**.
Nothing else. Not a hash, not the content.

The mutation was `{"op": "nfkd_ascii"}, {"op": "lower"}` → `{"op": "lower"}, {"op": "nfkd_ascii"}`:
a pure reorder, therefore **byte-length preserving**. Mutate → run → restore completed well inside
one second. So the restored file's stamp matched the stale `.pyc`'s stamp *exactly*, and Python
loaded bytecode compiled from source that had already been deleted.

Measured directly, after the restore:

```
source: size=9071 mtime=1786150868
pyc   : size=9071 mtime=1786150868   -> python REUSES the cached bytecode
```

Both conditions were required. A mutation that changes file length is caught; a slow harness is
caught. Size-preserving edits inside one second are exactly the blind spot, and *reordering lines is
the most natural size-preserving mutation there is.*

## Fix

Purge `__pycache__` after every write in any harness that rewrites source between runs:

```python
def purge_pycache():
    for p in ROOT.rglob("__pycache__"):
        if ".git" in p.parts:
            continue
        for f in p.glob("*.pyc"):
            f.unlink(missing_ok=True)
```

`python -B` is **not** the fix — it suppresses *writing* bytecode, not *reading* an existing cache.

## Key Insight

**A red suite is a claim about code, and that claim can be stale.** This project has repeatedly
caught instruments that read falsely green ([`002`](002-a-frozen-success-code-is-indistinguishable-from-a-healthy-one.md),
[`006`](006-four-verification-steps-that-could-silently-do-nothing.md),
[`007`](007-presence-is-not-health-the-third-instance-of-one-pattern.md),
[`008`](008-a-broken-instrument-returns-zero-and-zero-reads-like-a-finding.md)). This is the same
failure wearing the opposite sign, and the opposite sign is *more* dangerous in one specific way:
a false green invites you to stop, but a **false red invites you to "fix" correct code.** The
obvious next move was to edit `normalize.py` until the suite passed — which would have introduced a
real defect to satisfy a phantom one.

The tell was a contradiction, and the rule already on the books covered it: *two sources
disagreeing IS the problem.* The file said one thing and the running process said another. That is
never "flaky" — something between the file and the interpreter is lying, and on Python that
something has exactly one name.

## Also Applies To

- **Any before/after benchmark that edits a module in place.** Same stamp collision, and the result
  is a performance number measured against the wrong build.
- **U4's schema gate**, if it ever mutates a fixture *module* rather than JSON data — JSON has no
  bytecode cache, so keeping fixtures as data sidesteps this entirely. Prefer data.
- **`git checkout`/`git stash` during a test loop.** Git restores mtime to *now*, not to the
  original, so it usually dodges this — but a checkout of a same-size file twice within a second
  does not.
- The general rule: when the file and the process disagree about what the code says, **believe
  neither until you have found the cache.**
