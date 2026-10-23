---
title: Matching a program's refusal by a loose phrase also matches every other message that shares it; check the pattern against everything the program can print
date: 2026-10-22
phase: our-setup U3 step 8b (Q8's --bg arm in a trusted folder)
modules: [projects/hooks/probes/defs/q08-session-kind-env.mjs, projects/hooks/probes/run.mjs]
tags: [platform-behavior, measurement, output-parsing, regex, probes, cli, false-positive, review-rounds]
---

## Problem
Probe Q8 launches `claude --bg` and reads its output. Until step 8b the arm was always refused ("Workspace not trusted ..."), and the def took the refusal with `/not trusted/i`, tested before it looked for the session id. `run.mjs`'s cleanup copied that pattern (`Q8_BG.refused`) to decide that a refused launch made no job folder. Step 8b's review raised it twice, from security and from reliability: what if a launch that started also printed "not trusted"? The lenses had reasoned it, not run it.

## Root Cause
- **The pattern was written from the one message seen, not from everything the program can say.** `grep -a -i 'not trusted'` over the 2.1.309 binary found about 20 other messages holding the phrase. Some are printed by a session that *starts*: "Cloud gateway <x> is not trusted on this machine — run /login ..." (written to stderr), "Remote settings: the stored copy is not trusted at rest ...", "... skipped because this workspace was not trusted when plugins were scanned", "certificate not trusted".
- **Refusal was checked first and won.** A started launch printing any of those would read as BLOCKED. Q8 would then never `stop` or `rm` it, and cleanup would never look for its job folder: a live background session left running, under a verdict that says none started.
- **Every real trust refusal holds the longer phrase.** That covers the `--bg` one (measured verbatim), "... could not be resolved on disk", the home-directory one, the interactive `Error:` forms and Remote Control's: all say "Workspace not trusted".

## Fix
- `/Workspace not trusted/i` in the def and in `Q8_BG.refused`. The existing word-for-word pin test fails if either is reverted on its own (mutants M20 and M21).
- The narrowed pattern matches a strict subset of the old one, so no launch can newly read as refused. A reworded future refusal reads INCONCLUSIVE ("neither refused nor printed a session id"), which fails safe: the probe stays unpassed.

## Key Insight
A text match on another program's output is a claim about **everything** that program can print, not just the line in front of you. When the program's strings are readable (a binary, a source tree, its message catalog), grep them for the phrase before trusting it. Prefer the longest phrase that every case you mean shares. And when one branch wins over another (refused before started), ask what the losing branch would have caught.

## Also Applies To
- Error and status detection on CLI output (`/not found/`, `/denied/`, `/failed/`, `/timeout/`), log scrapers, and test helpers that read stderr.
- Any parser that checks a "bad" pattern first and stops: a false hit there hides the good path entirely.
- Insight 003 (a platform rule is a map until a run measures it): here the measurement was a grep over the binary's strings, and it turned a reviewer's hypothesis into a fact before any code changed.
