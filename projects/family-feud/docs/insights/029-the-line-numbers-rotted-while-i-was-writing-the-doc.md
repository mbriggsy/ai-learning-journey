---
title: The remedy doc's line numbers rotted while I was writing the remedy doc
date: 2026-08-18
phase: draft prep
modules: [docs/draft-day-runbook.md, scripts/watch_draft_state.py, TODO.md]
tags: [documentation, line-numbers, drift, remedy, anchoring, grep, stale-citation]
---

## Problem

The new `### If the draft was re-created` section in `docs/draft-day-runbook.md` is a 10-file edit
list you follow under time pressure with the draft gone. It cited each site as `file:line`. Every
number was verified against source at the moment it was typed.

Measured over the same night, on the same branch:

| Citation | At session start | After authoring | After the correction pass |
|---|---|---|---|
| runbook's own two draft-id pins | 168, 181 | 263, 276 | **306, 319** |
| `TODO.md`'s three pins | 1687, 1854, 1915 | 1861, 2028, 2089 | **1922, 2089, 2150** |
| `watch_draft_state.py`'s 2nd alert | 330 | 332 | **333** |

The section moved its own citations **twice in one night**. Note `2089` appears in two columns
pointing at *different lines* — a stale number does not read as stale, it reads as precise.

Three compounding failures, all mine, all in a doc whose entire value is being right at 7am:

1. **The arithmetic fix was wrong too.** Correcting for the insertion I used **+85** for a
   **95-line** section — off by ten on both pins.
2. **The worst one was a DO-NOT-EDIT fence.** It said *"NOT this file at `:266`"*, protecting a
   recorded `cf-cache-status: HIT` measurement from being falsified. `:266` was a blank line; the
   measurement was at `:276` — **unguarded**. The fence pointed at nothing while the thing it
   existed to protect sat open.
3. **A line number reached a RUNTIME ALERT.** `watch_draft_state.py` briefly emitted
   *"feud_mule.ps1:169 and :177"* inside the message that fires when the draft is replaced — a
   citation that rots silently in a string nobody re-verifies, printed under a clock.

And while writing *this* insight, a surviving citation in the corrected section
(`watch_draft_state.py:314`) was found to have become `:315`. **The doc warning about line-number
rot contained a rotted line number.**

## Root Cause

A line number is not a property of the thing cited. It is a property of everything **above** it —
so a citation is invalidated by edits to code it does not mention, in files it does not name, made
by someone who never read it. Here the invalidating edits were **the doc's own**.

Nothing detects this. It is not a broken link, a failing import, or a red test. `grep` for the id
still finds the hit; the number beside it is just prose. There is no gate in this repo — or in
most — that can tell a correct `file:line` from a stale one.

## Fix

- **Grep is the method; the numbers are a checklist, not an index.** The section now opens by
  telling you to run `grep -rIl` and work from *its* output. It states that the grep returns **44
  files, of which 10 change and 34 must not** — the list's job is to say *which*, never *where*.
- **Anything load-bearing is anchored by surrounding text.** The DO-NOT-EDIT fence now reads
  *"the hit inside the blockquote beginning `Half obsolete, half CORRECTED 2026-08-14`, in the
  sentence `three bare fetches … returned cf-cache-status: HIT`."* That survives any insertion.
- **Counts replaced positions** where identity was already unambiguous: `TODO.md` (3), not
  `TODO.md:1861,2028,2089`.
- **The runtime alerts carry the method, not coordinates** — *"grep for the old id rather than
  trusting any line number."*
- Two explanatory (non-instructional) citations survive on purpose. Explanatory rot costs a reader
  ten seconds; instructional rot costs a wrong edit.

## Key Insight

**A `file:line` citation is a cache with no invalidation.** It is correct only at the instant it is
written, decays from edits anywhere above it, and **fails silently and confidently** — the reader
jumps to a real line holding the wrong thing.

The strongest tell: **the very act of writing a doc full of citations shifts the citations.** If
your prose and your targets share a file, or a session, the numbers are stale before the commit.

Rank the risk by what the citation *does*:
- **A DO-NOT-EDIT fence keyed to a line number is the worst case.** When it drifts it does not
  merely fail to protect — it fences off innocent content and leaves the real thing exposed.
- **A line number inside a runtime message is second worst.** It ships, it is never re-read, and it
  is printed at the exact moment nobody has time to check it.
- Explanatory pointers are cheap and can stay.

**Cite by content, not coordinates.** Quote the line, name the function, or give the grep. If a
number is genuinely the clearest thing to write, say what it was true of — and never let a number
be the only way to find something that must not be touched.

## Also Applies To

- `CLAUDE.md`'s landmines, which already hedge this correctly: *"Lines 84-96 as of Aug 7; find it
  by the comment `# --- integrity gate:` rather than trusting that number."* This insight is that
  instinct, measured and generalised.
- Every `docs/insights/` doc citing source, and every prescription in `TODO.md` — where two of
  three were separately found to have drifted the same night.
- Review and agent output: a subagent reporting `file:line` is reporting against the tree it read.
  Concurrent edits, or its own, invalidate it — **re-grep before acting on a delegated citation.**
- Commit messages and PR descriptions, which are immutable by design and therefore rot fastest.
- Test failure messages, stack-trace annotations, and any comment saying *"see line N"*.
