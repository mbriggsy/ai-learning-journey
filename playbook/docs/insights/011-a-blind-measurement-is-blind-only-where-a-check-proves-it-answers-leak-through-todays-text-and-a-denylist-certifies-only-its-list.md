---
title: A blind measurement is blind only where a check proves it; answers leak through today's text, an instruction is not a check, and a list of forbidden folders certifies only those folders
date: 2026-10-31
phase: the brief recall fix (U4, U5 and U6)
modules: [projects/skills/distill-and-brief/brief/bench/audit-transcripts.mjs, projects/skills/distill-and-brief/brief/bench/build-copies.mjs, projects/skills/distill-and-brief/brief/results/applies-when-lines-2026-10-31.json]
tags: [blindness, benchmark, leakage, git-blob, audit, allowlist, denylist, workflow, transcripts, judges, scratch-files, measurement]
---

## Problem

- The backfill's line writers had to be blind to the benchmark. Of its 222 judged pairs, 70 involved a lesson changed after its brief, 63 of them by a later `## Extended` section, and 22 of those described the very work that had missed them. A line written from today's text would have carried the answer into the as-of copies.
- A Workflow script cannot read files, so "give each helper only this text" could not be done inline. It became "the helper reads one scratch file".
- The run audit flagged any named live lessons folder. The whole-file review found that a relative `docs/insights`, a Grep with no path (which searches the helper's working folder, the live playbook) or a `..` step out of the copy would all have passed it.
- Several judges wrote lesson dumps into the scratch folder despite "write no files", and the earlier parts' output files, every arm's picks, sat inside the copies folder while the judges ran.

## Root Cause

- Today's text sits downstream of the outcome being measured.
- A rule in a helper's prompt is a request, and the helper decides.
- A denylist proves only that the places it names were left alone. Blindness needs the opposite shape: everything outside a short list of the helper's own places is a breach (the Back Nine's insight 128 is the same shape, a denylist harness that adopts any unlisted spec).

## Fix

- One writer per git blob, given only that blob's bytes in its own scratch file (the plan's KTD5): 197 lines, and 0 breaches in 214 helper transcripts.
- `bench/audit-transcripts.mjs` checks blindness from the transcripts after the run. `reads` holds the writers to the Read tool inside their own folder. `runs` is an allowlist since `ee67c08a`: a helper's own copy, its own arm, a saved tool result, and a judge's own scratch file. A Grep or Glob with no path or a relative one, a `..` step, `docs/insights` outside its copy, and corpus.mjs without its copy are breaches. The 108 measured transcripts pass it.
- A part's outputs are kept outside the folder the next part's helpers can reach (`make-rescore.mjs`'s usage note).

## Key Insight

Blindness is a property proved after the run, not one asked for before it:
1. Write from the version the measured moment saw (its git blob), never from today's text.
2. Audit every helper's transcript against an allowlist of its own places. A denylist certifies only its list.
3. Check what helpers wrote as well as what they read. A write the prompt forbade means the prompt's other rules were requests too.

## Also Applies To

- Eval sets built from current docs or code when the eval measures a past decision.
- Any agent told "don't read X": audit the transcript, by an allowlist.
- Holdout data kept next to the data being tuned on.
