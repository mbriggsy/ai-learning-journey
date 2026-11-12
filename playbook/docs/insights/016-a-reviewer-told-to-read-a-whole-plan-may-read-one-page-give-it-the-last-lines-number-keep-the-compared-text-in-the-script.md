---
title: A reviewer told to read a whole plan may read one page; give it the last line's number, keep the text the check compares in the script, and walk the recovery path whenever a fix changes what the check can catch
date: 2026-11-12
phase: the plan step's own skill (ultramode-plan U4, and the hybrid plan's check)
modules: [projects/archive/skills/ultramode-plan/lib/reads.mjs, projects/archive/skills/ultramode-plan/lib/prompts.mjs]
tags: [reviewers, whole-plan-read, read-tool-limit, paging, reading-check, last-line, prompt-leak, recovery-path, short-read, workflow, helpers]
---

## Problem

- One Read of the 153 KB pay-check spec returned lines 1 to 269 of 1,059. A reviewer told to "read the whole plan" who takes one Read reviews about a quarter of it and says nothing about the rest.
- The hybrid plan's check gave each reviewer the plan's last line number and its opening words, a 160-line paging rule, and asked for a quoted inventory back. All ten reviewers, over two rounds, reached the last line (609, then 620).
- U4 built that into the reading check, and its paging block quoted the plan's last line to every whole-plan reader. Six of U4's ten review lenses found, each on its own, that a reader who stopped halfway could echo the quote and pass.
- The fix (R4-1) stopped quoting the line. A lazy reader now reported the right line number and failed only the quote or the page count, and `promptShortRead`, built for a reader who "stopped short", had no way to ask for that re-run (7 findings across 6 lenses in U4's round 2).

## Root Cause

- The Read tool returns at most one page of about 25,000 tokens. A reader who takes that page for the file reviews only the page.
- Words that help a reader find the end are not proof it read there. When the prompt holds the answer, the check measures copying. The hybrid plan's ten readers show the words help a reader reach the end; they never showed the check catches one who doesn't.
- A recovery path is built for the failures known when it is written. A fix that changes what a check catches creates new kinds of failure, and the recovery code has no branch for them.

## Fix

- A whole-plan reader is told the last line's number, never its text; the script holds the text and compares the reader's quote against it (`lib/reads.mjs`, R4-1 and R4-17).
- The re-run prompt takes a list of the short-read kinds the check can report, `stopped`, `inventory` and `notes` (`PROMPT_SHORT_KINDS` in `lib/prompts.mjs`), and refuses a kind it does not know.

## Key Insight

Assume a reader of a long document read one page until it proves otherwise. Tell it where the end is (the number) and keep what the check compares (the text) out of the prompt. After any fix to a check, list each failure the check can now report and walk each one through the recovery path.

## Also Applies To

- Any agent told to read a long log, transcript or spec in one go.
- A judge prompt that contains the expected answer.
- Retry or re-run logic after a validator's rules change.
