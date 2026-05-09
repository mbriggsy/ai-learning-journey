---
aliases: [skills-2.0-start, skills-2-start]
tags: [research]
---

# Skills 101

**Read time:** ~5 minutes. Read this first.

You're about to build agentic systems with Claude Code. Before you write a single `.md` file, you need one idea in your head — the idea that makes every subsequent architectural decision obvious. Here it is:

> **A skill is a folder that teaches Claude how to do something. An agent is the thing doing the work. You give the agent skills; you don't build more agents.**

That's the entire game. Internalize that sentence and most of the confusion evaporates.

---

## What a skill actually is

A skill is a directory with a `SKILL.md` file. The file has a chunk of YAML at the top (frontmatter) and Markdown instructions below. Optionally, the directory holds scripts, reference docs, and assets.

```
release-notes/
├── SKILL.md          # Required. Frontmatter + instructions.
├── scripts/          # Optional. Executable helpers.
├── references/       # Optional. Detail the agent loads only when needed.
└── assets/           # Optional. Templates, images.
```

`SKILL.md` looks like this:

```markdown
---
name: release-notes
description: Generate release notes from merged PRs since the last tag.
---

Read the recent git log, identify merged PRs, and produce a release note
grouped by category (features, fixes, breaking changes)...
```

That's it. No runtime, no framework, no magic. The whole thing is a Markdown file Claude reads and follows.

---

## The worker/playbook mental model

| Role | What it is |
|------|------------|
| **The worker** | Claude itself. The agent. The thing with tools and a context window. |
| **The playbook** | A skill. Packaged instructions the worker consults on demand. |
| **The call to action** | A user request, a slash command, or another skill pointing at this one. |

Claude is the worker. Always. Skills don't execute. They don't loop. They don't spawn anything. They sit on disk until Claude decides (or is told) to read one into its working context. Then Claude follows the instructions using Claude's own tools.

If you remember nothing else from this doc, remember: **the skill is passive. Claude does the work.**

---

## "But what about agents?"

The word "agent" is overloaded to the point of uselessness. In our world it means at least four things:

1. **The concept** — any LLM-in-a-loop with tools. Claude Code is an agent. So is a custom Python script calling the API. Abstract category.
2. **A subagent definition** — a config file at `.claude/agents/<name>.md` that describes a specialist role. Inert on disk until spawned.
3. **A subagent instance** — a child Claude process spawned at runtime by the Agent tool, with its own context window. Ephemeral.
4. **The Agent SDK** — `claude-agent-sdk`, a Python/TypeScript library for building your own agent runtime from scratch. You reach for this only when you're outside Claude Code.

For your first skill, you won't touch #2, #3, or #4. That's the whole point of skills-first. Once you start composing — orchestrating specialists, restricting tools, isolating heavy context — subagent definitions earn their keep. [02_SHARPEN.md](02_SHARPEN.md) covers when. The Agent SDK is for people building runtimes outside Claude Code; you almost certainly aren't.

**The Anthropic position,** straight from the Zhang/Murag talk: don't build more agents. Build one great agent (Claude) and give it a library of skills. Skills compose; agent definitions don't travel as cleanly; custom agent runtimes have no equivalent eval tooling.

If you find yourself sketching a custom agent, stop. Ask yourself: could this be a skill? The answer is usually yes.

---

## When to reach for each primitive

Use this table like a flowchart. Start at the top and stop at the first row that fits.

| If you need... | Build this | Why |
|----------------|-----------|-----|
| A workflow, rubric, or body of knowledge Claude should apply | **Skill** | Default answer. Portable, testable, composes with other skills. |
| A heavy-context task (long diffs, big research) that shouldn't bloat the main chat | **Skill with `context: fork`** | Runs the skill's body in a spawned subagent; only the summary comes back. |
| N independent analyses running in parallel | **Orchestrator skill** that tells Claude to fan out to N subagents in a single turn | Parallelism comes from multiple Agent tool calls, not from the skill itself. |
| Tool restrictions on a specialist (no Write, no Bash) | **Subagent definition** with explicit `tools:`, preloading a skill | Limits blast radius; keeps the substantive logic portable in the skill. |
| Event-driven, deterministic side effects (on file save, on PR submit) | **Hook** | Skills don't fire on events. Hooks do. |
| A runtime outside Claude Code entirely | **Agent SDK** | Build your own harness. |

Default: **skill**. The bar for "should this be a skill?" is low. The bar for anything else should be high.

---

## How a skill actually runs

There are exactly two ways a skill enters Claude's context:

**Automatic (model-invoked).** Every session, Claude sees the `name` and `description` of every available skill. When a user message matches a description, Claude loads the skill's body into its context and follows the instructions. This is the default path and the one that makes skills feel like magic — they just show up when needed.

**Manual (user-invoked).** Typing `/skill-name` loads the skill directly, bypassing description matching. Use when you want deterministic control ("don't wait for Claude to decide; just run the deploy skill").

Two more paths matter once you're composing skills, but they reduce to the first two:

- A skill's body can say "now invoke `/other-skill`" — but what actually happens is Claude reads the instruction and runs the second skill. Skills don't call each other; Claude does.
- A subagent definition can preload skills via a `skills:` frontmatter field. When the subagent spawns, those skills are already in its context.

---

## The three expensive misconceptions

Three things newcomers get wrong. Save yourself the debugging time.

**1. Subagents do NOT inherit skills from the parent.** A spawned subagent starts with a clean context. If you want it to have a skill, declare it in the subagent definition's `skills:` field. Assumption-based orchestration will fail silently.

**2. Skills do NOT spawn subagents themselves.** A skill's body is instructions *to Claude*. If the body says "spawn three reviewers in parallel," Claude is the one making the Agent tool calls. The skill is a script; Claude holds the tools.

**3. `context: fork` is NOT parallelism.** It creates ONE isolated subagent to run the skill's body. For parallel fan-out, you need an orchestrator that tells Claude to emit multiple Agent calls in a single turn.

---

## What's portable, what's not

The `SKILL.md` format is an open standard at [agentskills.io](https://agentskills.io). Any skills-compatible platform — Codex, Cursor, Copilot, Gemini CLI, and the growing list at [agentskills.io/clients](https://agentskills.io/clients) — can consume a skill. That portability is real and strategic: the IP in your skills isn't locked to Claude Code.

Claude Code adds extensions on top: `context: fork`, dynamic shell injection (`` !`command` ``), lifecycle hooks, custom subagent types. Skills using those features still *work* on other platforms; they just don't *use* those extensions.

Rule of thumb: write the core logic in portable SKILL.md Markdown. Use Claude Code extensions when they genuinely help. Don't scatter Claude-Code-only features for flex.

---

## Slash commands are skills

As of Claude Code 2.1.3, custom slash commands and skills are the same primitive. A skill named `release-notes` becomes `/release-notes`. Existing `.claude/commands/` files keep working, but skills are the recommended path — they support supporting files, frontmatter, subagent execution, and automatic loading when relevant.

If a command and a skill share a name, the skill wins.

---

## Where skills live

| Location | Who sees it |
|----------|-------------|
| `~/.claude/skills/<name>/` | You, across all your projects. Personal. |
| `.claude/skills/<name>/` | Anyone cloning this repo. Project-level. Commit these. |
| Managed settings (enterprise) | Everyone in the org. |
| Plugin | Anywhere the plugin is enabled. |

For the POC, commit project skills into `.claude/skills/` so the team works from the same set. Personal skills are for experimentation and preferences.

---

## What to do next

1. **Read [01_BUILD.md](01_BUILD.md).** You'll build a real skill — a release-notes generator — end-to-end, using the Skill Creator. Takes ~15 minutes.
2. **After that, [02_SHARPEN.md](02_SHARPEN.md)** when you're ready to compose skills with subagents, hooks, and MCP.
3. **[03_SHIP.md](03_SHIP.md)** when you're ready to put a skill into the hands of teammates and want to do it without shipping garbage.
4. **[reference docs](reference/README.md)** — when you hit a weird case and need the authoritative answer.

If you take only one thing from this page: **skill first, everything else later, and only when you can name the specific reason a skill won't do the job.**
