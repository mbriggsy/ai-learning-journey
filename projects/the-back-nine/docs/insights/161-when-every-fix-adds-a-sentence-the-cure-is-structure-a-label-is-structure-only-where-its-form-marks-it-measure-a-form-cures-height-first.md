---
title: When every refuter's fix adds a sentence, the paragraph gets longer, not clearer — run-in labels in body weight are not structure, and a form cure walked without measuring its height comes back "a wall" again
date: 2026-11-23
phase: Build 2 (the surplus question) — U11's Caddie walks 2 to 6 on W's stale paragraph
modules: [src/intake/workingYearLeftOver.ts, src/ui/NotePartsBlock.tsx, src/ui/noteParts.ts, src/ui/copy.ts]
tags: [copy-form, structure, labels, run-in-label, wall-of-text, paragraph-growth, fold-json, caddie, council, measure-first, note-parts, refuter-fixes]
---

## Problem

W's stale paragraph on the working-year step went through walks 2, 3 and 4. Every walk's refuters fixed what their
seats misread by adding a one-fact sentence. The paragraph got longer, not easier, and the threads broke at
connectives that were doing a label's job ("So…", "Until…").

b9-5 took the form question to council `wf_7fa86902-35c` (7/10), which ruled run-in labels as copy words (never color
or `::before`). Walk 5 rendered them mid-line in body weight, and they vanished for every cold reader. Each reader
said the split helped once told it was there.

Walk 5's fix round (`ec3514a7`) put each label on its own line in semibold (a `<br>` plus `<strong>` per label in
`NotePartsBody`, then) and added the reasons walk 5 asked for. Walk 6 measured the gate's note 50 to 90% taller
(`fold.json`, `.reentry-notes`), with C's door ending at 841 px on the 791 px frame. Every seat still called it a
wall, and the labels read clinical even on their own lines (5 of 5).

## Root Cause

Two things were mixed up. Each refuter judged one misread and cured it with words, so a walk of N findings added N
sentences, and nobody owned the paragraph's total. And "structure" was taken to mean label words. A label works only
where its form marks it: a line start and a weight. Words mid-line in body weight are prose, whatever they say.

The walk-6 round then argued form from the readers' word "wall" without measuring what had grown. Walk 6's R6 refuter
re-rendered both walks' paragraphs from `copy.txt` in the project's own font at the captured column (every height
within 1 px of the capture). Removing the breaks and then the semibold one at a time showed about 89% of the growth was
added words, not spacing.

## Fix

Council `wf_22858e04-f7a` ruled on that measurement: structure and routing, not spacing. It retired the one `<p>` on
every host for one shared block component (`NotePartsBlock`, over `noteParts.ts`): an opening, a `dl` of labelled
parts, and the Result's door as the last `dt`/`dd`, with the gate's route moved under its buttons (`e6e9c3649`).

## Key Insight

**Once a walk's fixes all add length, stop fixing sentences and take the form question up whole.** Then:

- **A label is structure only where its form marks it**: a line start and a weight, or a real list/term element.
  Plain label words in running text are copy, and cold readers read straight past them.
- **Before walking a form cure, measure its height against the last walk's bundle.** A `fold.json` diff answers
  "lighter, or only longer?" before a fan-out is spent.
- **Before a council argues form, split the paragraph's growth into words and form** by re-rendering it at the
  captured column and taking out one formal change at a time. Most of what readers call a wall may be words, and then
  the cure is routing and cutting, not spacing.

## Also Applies To

- Insight 162 (what a reader does with a sentence): many of the added sentences were cures for those misreads, so
  the two are one budget. Each rosy misread still gets its fix; the form decides where it lives.
- Insight 097 (a copy swap on a fold-law frame is a layout change): the height measurement here is the same reading.
- Any Caddie round whose fixes all lengthen one block: the record card, the gate's notes, the facts page's groups.
