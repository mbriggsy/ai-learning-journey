---
title: A broken instrument returns zero, and zero reads like a finding
date: 2026-08-07
phase: machinery-rebuild
modules: [docs/plans/, draft-kit/family-feud-cheat-sheet.pdf, newsletter/data/inbox/]
tags: [verification, measurement, false-negatives, positive-control, encoding, elementtree, python]
---

## Problem

While verifying the rebuild plan against the repo, three separate checks returned a **clean,
plausible, specific number** — and all three were wrong. Each ran to completion. Each produced
output shaped exactly like a successful measurement. Two were reported as findings before being
caught.

Sibling of [`006`](006-four-verification-steps-that-could-silently-do-nothing.md), not a repeat:
there the steps **never ran**. Here they ran fine and measured the wrong subject.

## Root Cause

Three mechanisms, one shape:

| Check | Reported | Truth | Mechanism |
|---|---|---|---|
| Round-header bug line numbers in the board HTML | 232, 251 | **233, 252** | Grepped a temp copy with line 200 stripped. Everything after shifted by one. |
| Players present in the cheat-sheet PDF | 156 of 174 | **150 of 174** | Matched **surnames**. Six DEF "hits" were team nicknames inside a *prose* line (`1 Texans 2 Broncos … 6 Jaguars`), not rows. |
| Board players across 3 candidate RSS feeds | **0** of 55 items | 9, 5, 5 | `t = it.find("title") or it.find(atom)` — an `xml.etree` Element with no children is **falsy**, so every real `<title>` was discarded and the fallback returned `None`. |

The PDF stacked a second trap under the first: it is **ASCII85-then-Flate**, so a zlib-only
extractor yields zero text — reading as *"the PDF is empty"* rather than *"my reader is broken."*
And the falsy-Element case is the sharpest: Python emitted a `DeprecationWarning` naming the exact
behaviour, which scrolled past as noise above the result table.

## Fix

Per case: measure against the unmodified file; match full names, not tokens that also occur in
prose; use `t = it.find(...)` then `if t is None:` — never `or` on an Element.

Generally: run a **positive control on the instrument**, not on the subject. One question would
have caught each in seconds — *does my PDF extractor find any string I know is in this PDF?* (it
found **0 of 174**; that was the tell, read as a fact about the PDF). *Does my feed matcher find a
player in a feed I know contains one?* (the cargo's rotowire item was literally `Cam Skattebo:
Harbaugh downplays exit`).

## Key Insight

**A check that can fail loudly can still succeed at measuring the wrong thing.** 006's rule — make
it able to fail — is necessary and not sufficient. Nothing about a well-formed number tells you the
instrument was pointed at the subject.

**Zero and total-failure results deserve *more* suspicion than partial ones.** A broken instrument
almost always returns zero; a working instrument on a genuinely empty subject is rare.

Corollary, same day: **asserting the right message is present does not prove the wrong one is
absent.** The U9 watcher had 26 passing tests and still printed *"previous snapshot unreadable"* on
a clean first run, because `save()` wrote the file before the "was there a previous one?" check.
The test asserted `"baseline established" in out` and stopped. Running it for real caught it; the
suite could not.

## Also Applies To

- **U4's schema gate.** Acceptance is "the gate rejects X" across a list of mutations — and *a gate
  that rejects everything passes every one.* Needs a clean-board positive control plus an assertion
  that each mutation actually altered the fixture before the gate saw it.
- **U6's old-value repo sweep.** A grep matching nothing is indistinguishable from a grep that is
  wrong — which is how `scripts/test_*.py` drift survived a search for the known-bad `draft-kit/`
  prefix. Enumerate the invariant (*every test path is under `tests/`*), don't hunt the instance.
- **U11's Wire matching**, which is this substring problem by nature: board DEF names match ordinary
  team articles, and naive matching on `Michael Pittman Jr.` found DK Metcalf and missed Pittman.
- Any future "I measured it" claim here. Measure a known-positive first.
