---
title: git log parsing gotchas — trusting the command shape over the real bytes
date: 2026-05-25
phase: 0
modules: [tools/project-metrics/src/git-stats.ts, tools/project-metrics/src/session-tokens.ts]
tags: [git, git-log, parsing, numstat, co-authored-by, NUL, jq, verification, windows]
---

## Problem

Three git-log parses written from the plan's command spec were wrong in ways that
unit tests on small fixtures would NOT necessarily catch, but real data did:

1. `projectAgeDays` came out 0 on a 46-day-old repo.
2. The `-z --numstat` parser couldn't cleanly separate the commit body from the
   first changed-file line.
3. Claude's co-authored line counts were undercounted on some commits.

## Root Cause

1. **`git log --reverse --max-count=1` returns the NEWEST commit, not the oldest.**
   `--max-count` is applied BEFORE `--reverse`, so you limit to 1 (the newest in
   the default order) and then reverse a one-element list. "First commit" derived
   this way silently equals "last commit" → age 0. (Verified on BURNED: identical
   to `-1`.)
2. **Under `-z`, `%B` and the first `--numstat` line share one NUL field.** Format
   was `%H%x00%aI%x00%aN%x00%B` — but git puts the numstat block right after the
   body with only a `\n` between them, and `%B` itself contains `\n`, so splitting
   on `\0` glues `body + "\n" + firstNumstatLine` into one un-splittable field.
3. **Git trailers are case-insensitive; real commits use `co-Authored-By`** (lowercase
   leading `c`). A `/^Co-[Aa]uthored-[Bb]y/` char-class regex pins the first two
   chars to `Co` and misses the lowercase-`c` variant.

## Fix

1. ONE newest-first pass `git log --pretty=format:%aI -- .`; take `dates[0]`=newest
   (last) and `dates[dates.length-1]`=oldest (first) in JS. No POSIX `head`/`tail`
   (no shell via `execFile` on Windows anyway).
2. Append a trailing `%x00` after `%B`. Then the per-commit fields are
   `[sha, date, name, body, numstat1(leading \n), numstat2, …, ""(boundary)]` —
   each numstat line its own NUL field, commit boundary = an empty field.
3. `/^co-authored-by:\s*(.+?)\s*<[^>]*>/gim` — and iterate with `matchAll`, not a
   `.exec` loop (a naive shell-exec substring also trips security-reminder hooks).

## Key Insight

**A git command's documented behavior is a claim; the real byte stream is the
source.** When parsing `git log` (especially `-z`, `--numstat`, `--pretty=format`,
or option ordering like `--reverse`/`--max-count`), dump `... | od -c` on a tiny
controlled repo and parse against what git ACTUALLY emits — option interactions and
field delimiters are not what the flag names imply.

**Corollary — verify the PROBE before declaring a code bug.** Twice this session a
"null field" looked like a bug but was a malformed jq query:
`.git | {timeline: {activeDays}}` reads `activeDays` off `.git` (null), not
`.git.timeline`. A surprising empty/null result is often the measurement, not the code.

## Also Applies To

- Any `git log`/`git diff` machine parsing — pick explicit field separators (`%x00`),
  give every field its own delimiter, and confirm option ordering empirically.
- `--reverse` with ANY commit-limiting flag (`-n`, `--max-count`, `--skip`): limiting
  happens first, reverse second.
- jq / JSONPath / any nested extraction: a surprising empty result → re-check the
  query scope before suspecting the data.
