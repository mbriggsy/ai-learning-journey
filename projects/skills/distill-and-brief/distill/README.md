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

1. **Lists existing insight docs** — prevents duplicates by showing the agent what's already captured
2. **Auto-numbers the next file** — scans `docs/insights/` and increments
3. **Provides the template** — frontmatter format, required sections, quality bar

The `!` backtick syntax in SKILL.md runs shell commands at skill-load time, injecting live context before the agent sees the prompt.

## Enforcement Hook

A PreToolUse blocking hook (`enforce-brief-before-work.sh`) gates `/commit` — the agent can't ship without running `/distill` first. The hook blocks the commit, tells Claude to run `/distill`, and allows the commit through on re-run via a marker file (`/tmp/.distill-gate`).

If nothing non-obvious surfaced, the agent says so during `/distill` and moves on — the marker is set either way.

## Installation

The SKILL.md in this directory is the source of truth. It's junction-linked to `~/.claude/skills/distill/` so Claude Code picks it up automatically.
