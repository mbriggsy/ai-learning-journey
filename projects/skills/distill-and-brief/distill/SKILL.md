---
name: distill
description: "Preserve a hard-won technical insight so future sessions don't rediscover it. Triggers: 'capture this', 'distill', 'write it up', 'document this', 'before we forget', 'worth noting for next time'. Not for: fixing bugs, adding features, or /brief."
argument-hint: "[optional: brief description of what was solved]"
---

# Distill: Write an Insight Doc

## Existing Insights

!`ls docs/insights/*.md 2>/dev/null && echo "---" && for f in docs/insights/*.md; do title=$(sed -n '/^---$/,/^---$/{ /^title:/{ s/^title: *//; p; q; } }' "$f"); echo "- $(basename "$f"): ${title:-untitled}"; done || echo "No existing insights."`

## Next Number

!`ls docs/insights/*.md 2>/dev/null | sort -V | tail -1 | grep -oP '^\d+' | awk '{printf "%03d", $1+1}' || echo "001"`

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
- Check the existing solutions list above — don't duplicate

$ARGUMENTS
