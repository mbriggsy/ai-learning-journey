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

Inline context — every insight doc in `docs/insights/` is read and presented to the agent so it can work with full awareness of known pitfalls. No separate tool call needed, no manual lookup.

If no solutions exist yet, the skill says so and points to /distill.

## How It Works Under the Hood

When invoked, the skill dynamically reads every `docs/insights/*.md` file using the `!` backtick syntax, injecting their content at skill-load time. The agent sees the full knowledge base before it starts reasoning about the task.

## Enforcement Hook

A PreToolUse blocking hook (`enforce-brief-before-work.sh`) gates `/ce:work` — the agent can't start work without running `/brief` first. The hook blocks `/ce:work`, tells Claude to run `/brief`, and allows `/ce:work` through on re-run via a marker file (`/tmp/.brief-gate`).

This means the agent gets briefed every time, mechanically — no one has to remember, no instructions to skip under task pressure.

## Installation

The SKILL.md in this directory is the source of truth. It's junction-linked to `~/.claude/skills/brief/` so Claude Code picks it up automatically.
