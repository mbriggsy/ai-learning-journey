---
name: distill
description: "Preserve a hard-won technical insight so future sessions don't rediscover it. Triggers: 'capture this', 'distill', 'write it up', 'document this', 'before we forget', 'worth noting for next time'. Not for: fixing bugs, adding features, or /brief."
argument-hint: "[optional: brief description of what was solved]"
---

# Distill: Write an Insight Doc

## Existing Insights

<!-- Keep this output under Claude Code's 30,000-char inline cap: past it the harness shows only a 2 KB preview (at 139 insights the old path-list-plus-titles output was 49.7 KB, so /distill saw 23 filenames and no titles). Filenames only, numeric order, newest 250 at most, each cut to 100 chars: a hard bound of about 25 KB at any corpus size. The dedup check in the Quality Bar greps the corpus itself. -->
!`n=$(ls docs/insights 2>/dev/null | grep -c -E '^[0-9]+-.*\.md$'); if [ "$n" -gt 0 ]; then echo "$n insights (filenames cut to 100 chars, numeric order, newest 250 at most):"; ls docs/insights | sed -n 's/^\([0-9][0-9]*-.*\)\.md$/\1/p' | sort -n | tail -n 250 | cut -c1-100; else echo "No existing insights."; fi`

## Next Number

<!-- Never put a dollar sign followed by a digit anywhere in a SKILL.md body (a !-command, prose, or a code fence alike): Claude Code substitutes it throughout the file with that /distill argument before the shell or the model sees it, and only when that argument exists, so a bare run looks fine (it once turned awk's first-field reference into the user's words). Where a literal dollar-digit is meant, put a backslash before the dollar sign; Claude Code turns that pair back into a lone dollar sign. The line below reads basenames, counts only digit-prefixed .md files (README.md and friends are skipped), takes the numeric max (no sort, no grep -P), and awk's END prints 001 when nothing matched. -->
!`ls docs/insights 2>/dev/null | sed -n 's/^\([0-9][0-9]*\)-.*\.md$/\1/p' | awk '{ n = $NF + 0; if (n > max) max = n } END { printf "%03d\n", max + 1 }'`

## Instructions

Create `docs/insights/` if it doesn't exist. Write an insight doc at `docs/insights/<next-number>-<slug>.md` with this format:

```yaml
---
title: <descriptive title — the problem, not the fix>
date: <today's date YYYY-MM-DD>
phase: <current phase if applicable>
modules: [<affected src/ modules>]
tags: [<searchable keywords>]
---
```

### Required Sections

1. **## Problem** — What you observed (symptoms, not diagnosis)
2. **## Root Cause** — The actual cause, with enough detail to recognize it next time
3. **## Fix** — What was changed and why
4. **## Key Insight** — The generalizable lesson. What pattern to watch for.
5. **## Also Applies To** — Where else this pattern might appear

### Quality Bar

- If the root cause is obvious from the fix, it doesn't need a solution doc
- The "Key Insight" is the most important section — it's what prevents the next person from hitting the same wall
- Keep it under 60 lines. These are reference docs, not novels.
- Don't duplicate: the list above is filenames only — before writing, grep the insight files' `title:` and `tags:` lines for your problem's key terms and read any hit before deciding the insight is new

$ARGUMENTS
