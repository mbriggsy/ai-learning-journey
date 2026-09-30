# /brief

Surfaces documented gotchas, root causes, and lessons from `docs/insights/` before starting work — so the agent doesn't walk into a known landmine.

Part of the [Distill & Brief](../README.md) system — [/distill](../distill/) writes the knowledge, /brief reads it back.

## When It Fires

The skill triggers on context-gathering intent BEFORE acting:

- "brief me", "brief me on the renderer", "brief me before I dig in"
- "what should I know before I start?", "any gotchas with X?"
- "any known issues?", "what do we know about X?"
- "have we seen this before?", "check the docs"

It does NOT fire for: performing work (writing code, fixing bugs, building features, creating docs). The defining signal is the user pausing to gather knowledge before acting, not asking you to do the thing.

## What It Produces

A compact brief for ONE topic (the words after `/brief`, else what you said you're about to work on; with neither, it asks "Brief on what?"): at most 5 insights chosen by a frontmatter grep and score, read in full and checked against today's code (`CURRENT` / `MOVED` / `CONFLICTS` / `NO CODE CLAIM`), plus up to 5 also-relevant lines and 1–3 before-you-start actions. It never dumps the corpus.

If no insights exist yet, or nothing matches the topic, the skill says so, lists what it searched, and points to /distill.

## How It Works Under the Hood

The skill's one `!` injection runs `corpus.mjs`, which prints a corpus card capped under 4 KB: counts, frontmatter-field coverage, the ids a frontmatter grep can't see (empty tags, no frontmatter), and the tag vocabulary by use count — never an insight body. (Current Claude Code hands the injection back to the model to run instead of running it at load; the card is the same either way.) The agent then greps the `title:` / `tags:` / `modules:` / `phase:` lines and the filename slugs for the topic (broadening to a body search when fewer than 3 candidates hit), scores the candidates from frontmatter alone, reads the top 5 in full, and checks each against the code. It never injects the corpus itself: at 139 insights the old full dump was ~370 KB, and Claude Code cut it to a 2 KB preview holding insight 001 alone, so every brief silently recalled nothing.

## Enforcement Hook

A PreToolUse blocking hook (`enforce-brief-before-work.sh`) gates `/ce:work` — the agent can't start work without running `/brief` first. The hook blocks `/ce:work`, tells Claude to run `/brief`, and allows `/ce:work` through on re-run via a marker file (`/tmp/.brief-gate`).

This means the agent gets briefed every time, mechanically — no one has to remember, no instructions to skip under task pressure.

## Installation

`SKILL.md` + `corpus.mjs` in this directory are the source of truth. The directory is junction-linked to `~/.claude/skills/brief/` so Claude Code picks it up automatically (the injection runs `corpus.mjs` through that path).
