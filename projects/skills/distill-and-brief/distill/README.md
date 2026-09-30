# /distill

Preserves hard-won debugging knowledge as structured insight docs so future sessions never rediscover the same root cause.

Part of the [Distill & Brief](../README.md) system — /distill writes the knowledge, [/brief](../brief/) reads it back.

## When It Fires

The skill triggers on preservation intent paired with a surprising discovery:

- "distill this", "write it up", "capture this", "document this"
- "before we forget", "lets not lose this", "worth noting for next time"
- Any time you've just described a non-obvious root cause and want it saved

It does NOT fire for: fixing bugs, adding features, reading existing solutions (that's /brief), writing inline code comments, or updating README/TODO files.

## What It Produces

A insight doc at `docs/insights/<number>-<slug>.md` with YAML frontmatter and five required sections:

| Section | Purpose |
|---------|---------|
| **Problem** | What you observed — symptoms, not diagnosis |
| **Root Cause** | The actual cause, detailed enough to recognize next time |
| **Fix** | What changed and why |
| **Key Insight** | The generalizable lesson — the most important section |
| **Also Applies To** | Where else this pattern might appear |

Docs are kept under 60 lines. Reference material, not novels.

## How It Works Under the Hood

When invoked, the skill dynamically:

1. **Lists existing insight filenames** — numeric order, the newest 250, each cut to 100 chars (bounded at about 25 KB at any corpus size); the quality bar then greps the corpus's `title:` / `tags:` lines, so duplicates are caught without injecting any insight body
2. **Auto-numbers the next file** — takes the highest number among the digit-prefixed `docs/insights/*.md` names and adds 1 (`001` when there are none)
3. **Provides the template** — frontmatter format, required sections, quality bar

The `!` backtick syntax in SKILL.md marks those two shell commands. Current Claude Code hands each one back to the model to run exactly as written (an `[output of command N, …]` placeholder) instead of running it at skill load; the output is the same either way. Never put a dollar sign followed by a digit anywhere in SKILL.md: Claude Code replaces it with a /distill argument before the shell or the model sees it (the comment above the Next Number command says how to escape one).

## Enforcement Hooks

Two hooks work together to enforce /distill at the right moment:

1. **`remind-distill-after-work.sh`** (PostToolUse) — silently drops a marker file (`/tmp/.distill-needed`) when `/ce:work` or `/ce:review` loads. No output.
2. **`stop-distill-gate.sh`** (Stop) — fires when Claude tries to finish responding. If the marker exists, blocks with "run /distill." This fires when work is actually DONE, not when the skill loads.

If nothing non-obvious surfaced, the agent says so during /distill and moves on.

## Installation

The SKILL.md in this directory is the source of truth. It's junction-linked to `~/.claude/skills/distill/` so Claude Code picks it up automatically.
