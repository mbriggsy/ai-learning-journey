# Leveling Up

**Read time:** ~12 minutes. Read this after you've shipped one or two skills and you're ready to compose them.

You've built a skill. Maybe two. The Skill Creator loop is muscle memory. Now you're asking: when do I reach for something *besides* a plain skill? Subagents, hooks, MCP, `context: fork` — what's each for, and when is a skill still the answer?

This doc is the decision tree once you're past your first skill. The recurring theme: **skills are still the default**. Everything else is a targeted tool for a specific problem. If you can't name the specific problem, you don't need the tool.

**One thing to know up front.** Most of what follows is Claude Code-specific — subagent definitions, hooks, `context: fork`, the memory pattern. Your portable IP stays in the SKILL.md body; everything in this doc is the Claude Code plumbing around those portable bodies. That's a deliberate trade: use the platform's power now, keep the core logic portable. When you see a feature tagged *(Claude Code-specific)*, that's the heads-up that it doesn't travel to Codex, Cursor, Copilot, or the other spec-compatible platforms.

---

## When to wrap a skill in a subagent definition

*(Claude Code-specific.)*

Write a subagent definition at `.claude/agents/<name>.md` when you need a reusable specialist — a role you'll call from multiple orchestrators, with tool restrictions tighter than `allowed-tools` alone, or with its own memory/MCP access.

Concretely, reach for a subagent definition when you need:

- **Reusable specialist persona** — the same job description called from multiple orchestrators.
- **Tool restrictions that go beyond `allowed-tools`** — e.g., a subagent that can't call `Write` at all, not just "asks for permission first."
- **Custom MCP server access scoped to this specialist** via the `mcpServers:` field.
- **Persistent memory across spawns** via the `memory:` field.
- **Preloading multiple skills as one coherent role.**

The pattern that matters most for the POC: **subagent definition as thin wrapper, skill holds the substance.**

```markdown
---
name: pr-reviewer
description: Reviews pull requests against team standards.
tools: Read, Grep, Glob, Bash(gh *)
skills: [review-pr, security-review-checklist]
---

You are a PR reviewer. Use the skills loaded into your context to
produce a review. Be thorough but concise.
```

The subagent definition is Claude-Code-specific plumbing. The *skills* it preloads are portable — they travel to Codex, Cursor, Copilot, anywhere that reads SKILL.md. When the ecosystem shifts, the substance moves with it; only the plumbing stays behind.

**The opposite anti-pattern:** writing a monolithic `.claude/agents/foo.md` that embeds a 500-line rubric in the system prompt. Now your IP is trapped in Claude-Code-specific format. Refactor that rubric into a skill and have the agent definition preload it.

---

## Parallel fan-out

*(Claude Code-specific orchestration; the *skill* itself is portable — it's just instructions.)*

Parallelism in skills works exactly one way: **an orchestrator skill tells Claude to emit multiple Agent tool calls in a single turn.** The runtime executes those tool calls concurrently.

```markdown
---
name: comprehensive-review
description: Run security, performance, and maintainability reviews in parallel.
---

Review the current PR from three angles simultaneously. Launch all
three reviewers in a single assistant turn — do not run them sequentially.

1. Spawn a `security-reviewer` subagent with the diff and ask for
   security findings.
2. Spawn a `performance-reviewer` subagent with the same diff and ask
   for performance concerns.
3. Spawn a `maintainability-reviewer` subagent and ask for readability
   and testability concerns.

When all three return, synthesize their findings into a unified review,
noting any conflicts between reviewers.
```

The skill is passive — it's just instructions. Claude reads them and makes three Agent tool calls in one turn. The runtime parallelizes the execution.

**When fan-out is worth it:** independent analyses where latency matters. Sequential: *"review the diff"* → review comes back → *"now review it for security"* → security comes back → *"now check performance"*. Parallel: all three run simultaneously, roughly the time of the slowest single reviewer.

**When fan-out is NOT worth it:** the reviewers need to see each other's findings. If reviewer B's behavior depends on reviewer A's output, you have a serial dependency, and parallelism doesn't help.

---

## When to reach for `context: fork`

*(Claude Code-specific.)*

Add `context: fork` to a skill's frontmatter when both of these are true:

1. The skill consumes significant context — big diffs, long documents, heavy research.
2. That context would bloat the main conversation if it loaded inline.

`context: fork` spawns a single subagent, runs the skill's body there, and returns only the subagent's final summary to the main thread. Your chat stays clean; the heavy lifting happens in an isolated context window.

```yaml
---
name: codebase-audit
description: Audit the codebase for security patterns and report findings.
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob
---
```

**The tempting wrong move (part 1):** using `context: fork` on every skill "for isolation." Don't. Each fork is a subagent roundtrip — more tokens, more latency, more moving parts. If the skill doesn't produce a lot of intermediate context, running it inline is faster and simpler.

**The tempting wrong move (part 2):** assuming `context: fork` gets you parallel execution. It does not. Fork spawns exactly *one* subagent. If you want three reviewers running concurrently, that's an orchestrator skill with three Agent calls in one turn (see the previous section), not a fork.

**When NOT to use `context: fork`:**

- Reference-only skills (brand guidelines, style guides, API conventions). No task = no useful subagent output.
- Skills whose output you want to *iterate on* in the main conversation. A fork returns one summary; if you want back-and-forth about the result, keep it inline.
- Short, fast tasks. Forking has overhead. Fork for skills that do significant work, not for every `/foo`.

**Version-specific caveat:** if a skill gets invoked via the Skill tool directly (not by description match or `/skill-name`), the `context: fork` and `agent:` fields are currently ignored — the skill runs in main Claude's context anyway. Tracked in [claude-code#17283](https://github.com/anthropics/claude-code/issues/17283). For now, trigger via description match or slash command if isolation matters.

---

## Skills vs. MCP — they compose

These get confused constantly. Cut through it:

- **Skills package instructions.** A skill tells Claude *how* to do something. It's Markdown Claude reads into context.
- **MCP servers package tools.** An MCP server exposes *callable functions* with typed inputs and outputs. It's a process the agent talks to over the Model Context Protocol.

They aren't competitors. They compose:

- **The capability is procedural** ("how to write a good PR description") → skill.
- **The capability is a callable function** ("get the diff for PR #N") → MCP tool.
- **The capability needs both** ("read the PR via MCP, then format the review per our standards") → skill that instructs Claude to call MCP tools.

**Scoped MCP servers for specialists.** A subagent definition can declare its own `mcpServers:` field — letting a narrow specialist reach a system the main session shouldn't touch directly. This is great for sandboxing:

```yaml
---
name: jira-investigator
description: Investigates bugs tied to Jira tickets.
skills: [jira-investigation-playbook]
mcpServers:
  jira: { command: "node", args: ["~/mcp-servers/jira/server.js"] }
---
```

The main session doesn't get Jira access. The `jira-investigator` subagent does, plus a skill that tells it how to use that access.

**The tempting wrong move:** building an MCP server when a skill would do. If the "capability" you want is really a rubric or a workflow, that's a skill. MCP is for *new tools the agent couldn't call before*, not for packaging prompts.

---

## When a hook is the answer, not a skill

*(Claude Code-specific.)*

A hook is Claude Code's event-driven primitive. Unlike a skill — which Claude reads and decides whether to follow — a hook *always* fires on its event. Deterministic. No model in the loop.

**Hook events** (the useful ones):

| Event | Fires when |
|-------|-----------|
| `PreToolUse` | Before any tool call. Can block or modify the call. |
| `PostToolUse` | After a tool call succeeds. Useful for logging, side effects. |
| `Stop` | When Claude stops generating in the main loop. |
| `SubagentStop` | When a spawned subagent finishes. |
| `SessionStart` / `SessionEnd` | At the boundaries of a session. |
| `UserPromptSubmit` | When the user submits a message, before Claude sees it. |
| `PreCompact` | Before auto-compaction runs. |

**The decision rule:**

- You want **deterministic action on an event** ("every `git commit` triggers a linter", "every session start preloads the project context") → **hook**.
- You want **a body of instructions Claude consults when relevant** → **skill**.
- You want **deterministic side effects during a skill's execution** → **both**. Write the skill normally, and configure hooks scoped to that skill via the `hooks:` frontmatter field. The hooks fire only while the skill is active.

**Example where a hook beats a skill:** you want Slack notifications every time a deploy completes. A deploy skill that says "and also post to Slack" is unreliable — Claude might forget the last step. A `Stop` hook scoped to the deploy skill is reliable — it always fires.

**Example where a skill beats a hook:** you want Claude to review PRs against your team's rubric. A skill is right — the content is a playbook Claude consults, not a side effect tied to an event.

**The tempting wrong move:** trying to make a skill "fire on something." Skills don't fire. Skills get loaded when Claude decides to (description match) or when you invoke them (`/name`). If you want "on event X, do Y," you want a hook.

---

## Skill-to-skill composition

A skill's body can say *"now invoke `/other-skill`"*. That works — but understand what's actually happening: Claude reads the instruction, decides to run the second skill, and loads it. **Skills don't call each other. Claude makes the call.**

This has two practical consequences:

1. **Data between skills has to flow through Claude's context.** There's no return value, no function call. Whatever skill A "passes" to skill B has to be written in text Claude can see and pass along.
2. **The indirection can fail.** Claude might decide *not* to invoke the second skill even though the first one told it to. If reliability matters, make the instruction strong ("ALWAYS invoke `/validate` after generating the output") — or, better, fold the second skill's content into the first so there's no composition at all.

**When to compose skills:**

- The individual skills are useful independently AND valuable together.
- The skills come from different authors/teams and you don't want to merge them.
- One skill is generic (e.g., `format-markdown`) and many skills should invoke it.

**When to just merge:**

- The skills are only ever used together.
- One skill is a thin wrapper around another.
- Composition is causing flakiness.

---

## Skills that persist state: the memory pattern

*(Claude Code-specific.)*

Long-running specialist subagents can use the `memory:` frontmatter field to maintain a persistent `MEMORY.md` across spawns:

```yaml
---
name: pr-reviewer
description: Reviews pull requests against team standards.
skills: [review-pr]
memory: true
---

You are a PR reviewer. Use your MEMORY.md to track recurring issues
you've seen across PRs in this project. Update it when you spot a
pattern.
```

When `memory: true`:

- A persistent MEMORY.md is associated with this subagent.
- The first 200 lines are injected into the subagent's context at spawn.
- The subagent can read/write/curate the file using its normal tools.
- It persists across sessions — institutional memory accumulates.

**When this is useful:** specialists whose quality improves with experience. A PR reviewer that remembers "we've seen this exact N+1 pattern in payment code three times" is strictly better than one that rediscovers it each time.

**When it's overkill:** one-off tasks. If the subagent spawns, does one thing, and returns — there's no state to accumulate.

Distinct from this: Claude Code also supports a project-level `memory/` convention for the main session. Different primitive; separate concern. This section is only about subagent memory as it pairs with skills.

---

## CLAUDE.md and subagents

Common gotcha: CLAUDE.md does **not** auto-load into spawned subagents (including `context: fork`). Verified in [claude-code#29423](https://github.com/anthropics/claude-code/issues/29423).

If your skill or subagent depends on context that lives in CLAUDE.md, you need to:

- Pass it in via the skill body, or
- Embed it in the subagent's system prompt, or
- Package it as a skill and use the `skills:` field to preload.

Don't assume project context travels automatically. It doesn't.

---

## Context lifecycle: the thing everyone gets wrong

One more expensive misconception to kill before you go: **skill bodies don't unload when "the task" ends.**

LLM context is append-only. Once a skill's body is loaded into Claude's working context, it stays there for the rest of the session. There is no mechanism that removes a skill after it "finishes" — because there's no runtime signal that marks a task as finished.

Four things affect skill presence in context:

1. **`context: fork`** — the skill ran in a spawned subagent whose context was discarded on return. Only the summary reaches main Claude. This is the one case that *approximates* unloading, and it's opt-in per skill.
2. **Auto-compaction** — when the context window fills, Claude Code compacts. Per Anthropic's docs, invoked skills get a 25,000-token carry-forward budget; if you've invoked many skills in one session, older ones can be dropped from the re-attached set.
3. **Manual `/clear`** — nukes the session.
4. **Session end** — everything goes.

**Why this matters:** "Progressive disclosure" means *deferred loading* — metadata always visible, body loads when triggered, supporting files load only when referenced. It does NOT mean "unloads after task." Treating skills like they free context when they're done leads to mystery session degradation — the bloat is the accumulated weight of every skill invoked across the session, not any single one.

If a skill is context-heavy AND only needed for a single bounded task, `context: fork` is the right move specifically because it's the only mechanism that gets the body out of the main thread when the work's done.

---

## The tempting wrong moves, consolidated

A checklist of things to *not* do. Review before every non-trivial skill:

- Writing `.claude/agents/foo.md` with a 500-line rubric inside. **Refactor the rubric into a skill; have the agent definition preload it.**
- Reaching for the Agent SDK because "this feels too complex for a skill." **If you're inside Claude Code, the answer is almost never the SDK. Build a skill and compose.**
- Building an MCP server when the thing you want is a workflow, not a callable function. **MCP is for new tools. Skills are for instructions.**
- Assuming subagents inherit skills from the parent. **They don't. Declare `skills:` on the subagent definition.**
- Assuming CLAUDE.md loads into forked contexts. **It doesn't. Pass context in explicitly.**
- Writing skills with MUSTs and NEVERs in caps. **Explain reasoning. Models generalize from reasoning; they get brittle around rules.**
- Skipping the baseline A/B in evals. **Without it, you don't know if your skill actually helps.**

---

## Next

- **[03_SHIP.md](03_SHIP.md)** — how to put skills in teammates' hands without shipping garbage. Evals, pass-rate thresholds, ADR pattern, governance.
- **[reference docs](reference/README.md)** — when you hit a weird case, this is where the authoritative answer lives:
  - [Skills, Agents, and Subagents — Oh My!](reference/Skills_Agents_and_Subagents_Oh_My.md) — the full architecture and terminology treatment.
  - [Claude Skills 2.0 — User Guide](reference/Claude_Skills_2.0_User_Guide.md) — the comprehensive manual.
  - [Skill Creator Practitioner's Guide](reference/Skill_Creator_Practitioners_Guide.md) — the full engineering-discipline treatment.
