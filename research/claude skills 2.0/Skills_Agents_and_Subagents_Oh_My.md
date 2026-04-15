# Skills, Agents, and Subagents, Oh My!
## A Terminology & Architecture Clarification

**Version:** 1.0 | **Last Updated:** April 15, 2026 | **Author:** Claude (with Briggsy)
**Companion to:** [Claude Skills 2.0: The Definitive User Guide](Claude_Skills_2.0_User_Guide.md) and [The Skill Creator: A Practitioner's Guide](Skill_Creator_Practitioners_Guide.md)

---

> "Agent" is the most overloaded word in AI right now. Inside a single Anthropic product — Claude Code — it can mean at least four distinct things: an LLM running in a loop with tools, a Markdown file defining a reusable persona, a child Claude process spawned at runtime with its own context window, or a Python/TypeScript SDK for building agent harnesses. These four meanings aren't synonyms. They're different layers of the stack, and collapsing them leads to architectural choices that don't survive contact with reality.
>
> This doc is the untangling. It defines each meaning precisely, clarifies how skills fit alongside them, and gives you a framework for reaching for the right primitive at the right time. It also corrects a handful of intuitive-but-wrong assumptions about how these pieces compose at runtime — the kind of assumptions that waste a weekend of architecture work before you discover they don't match the actual mechanics.

---

## Executive Summary

**The word "agent" is doing four jobs.** In the Claude Code ecosystem, it refers to (1) the general AI concept of an LLM-in-a-loop, (2) a subagent *definition file* (`.claude/agents/<name>.md`), (3) a subagent *running instance* spawned via the Agent tool at runtime, and (4) the Claude Agent SDK (`claude-agent-sdk`). These are different layers. Treating them as one thing produces confused architecture.

**Skills are not a kind of agent.** A skill is a packaged, loadable set of instructions and resources — closer to a library than a runner. Skills don't execute on their own; they get loaded into an agent's context when triggered. The agent is the worker; the skill is the playbook the worker consults.

**Anthropic's thesis: build skills, not agents.** At the AI Engineering Code Summit (November 2025), Barry Zhang and Mahesh Murag argued for one universal agent runtime powered by a library of domain-specific skills, rather than many specialized agents. Microsoft's skills ecosystem documents the same pattern: "Agents are built on top of skills." This thesis has direct architectural consequences: reach for skills first, drop to subagent definitions only when you need runtime isolation, and reach for the Agent SDK only when you're building outside Claude Code.

**The decision framework:** If it's a rubric, workflow, or persona → skill. If it's a persona that needs its own context window → skill with `context: fork`, or a subagent definition that preloads the skill. If it's N independent analyses in parallel → an orchestrator skill that instructs main Claude to spawn N subagent instances. If it's a custom agent outside Claude Code → Agent SDK.

**The three most expensive misconceptions:** (1) subagents do NOT inherit skills from the parent session — they need an explicit `skills:` field in their definition, (2) skills do NOT spawn subagents directly — the skill's body is instructions *to main Claude*, which then uses the Agent tool, (3) `context: fork` creates ONE isolated subagent, not parallel execution.

**This doc is for anyone** who has ever squinted at "create an agent" instructions, written `.claude/agents/foo.md` while meaning to write a skill, or tried to reason about how an orchestrator skill fans out work and found the mechanics murky. If you've read the Skills 2.0 User Guide and still aren't sure where subagents end and the Agent SDK begins, this is the doc.

---

## Table of Contents

1. [Why This Doc Exists](#1-why-this-doc-exists)
2. [The Four Meanings of "Agent"](#2-the-four-meanings-of-agent)
3. [What a Skill Actually Is (And Isn't)](#3-what-a-skill-actually-is-and-isnt)
4. [The Unification Thesis: "Don't Build Agents, Build Skills Instead"](#4-the-unification-thesis-dont-build-agents-build-skills-instead)
5. [Decision Framework: When to Reach for Each Primitive](#5-decision-framework-when-to-reach-for-each-primitive)
6. [How Invocation Actually Works](#6-how-invocation-actually-works)
7. [Common Misconceptions & Corrections](#7-common-misconceptions--corrections)
8. [Glossary](#8-glossary)
9. [Appendix A: Sources](#appendix-a-sources)

---

## 1. Why This Doc Exists

Here is a real exchange that plays out constantly in Claude Code communities:

> **Person A:** "Build an agent that reviews PRs."
> **Person B:** "OK — do you mean a `.claude/agents/pr-reviewer.md` file? Or a skill with `context: fork`? Or a standalone program using the Agent SDK? Or something else?"
> **Person A:** "...yes?"

The problem isn't that Person A is being sloppy. The problem is that the word "agent" has been asked to do four different jobs in the same sentence — and Anthropic's own documentation uses the word freely across all four meanings without always flagging which one is in play.

This matters because the four meanings live at different layers of the stack, and architectural decisions depend on knowing which one you're reaching for:

- **If you think "agent" means a definition file, but the speaker meant the SDK**, you'll build the wrong thing.
- **If you think subagents inherit skills from their parent, but they don't**, your orchestration pattern will silently fail — the subagent will have no idea the skill exists.
- **If you think a skill with `context: fork` spawns parallel workers, but it spawns one**, your "parallel review" design will run serially.
- **If you conflate the concept-of-agent with the Claude Code artifact called an agent**, you'll assume things are automatic that actually require explicit wiring.

This doc fixes the terminology problem at its root. Once the four meanings are separated, the downstream architectural questions become much easier to reason about. Skills vs. subagents stops being a confused debate and becomes a straightforward choice between primitives with different properties.

---

## 2. The Four Meanings of "Agent"

Here are the four things the word "agent" refers to, in the order you're most likely to encounter them.

### 2.1 Agent (The Concept)

**Definition:** A system where an LLM dynamically directs its own processes and tool usage, maintaining control over how it accomplishes a task. The canonical Anthropic framing, from their December 2024 essay [Building Effective Agents](https://www.anthropic.com/news/building-effective-ai-agents):

> "Agents are systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks."

**In practice:** An LLM in a loop, with tools, working memory, and some environment it observes and acts upon. This is the *conceptual* layer. It doesn't specify any particular implementation — an agent in this sense could be Claude Code itself, a custom Python script using the Agent SDK, an OpenAI Assistants API deployment, or a hand-rolled loop calling Anthropic's API directly.

**What to remember:** When a blog post, research paper, or industry analyst says "the rise of agents," this is almost always the meaning. It's a *category of system*, not a specific artifact you can point at in a directory.

### 2.2 Subagent Definition (The Static Artifact)

**Definition:** A Markdown file at `.claude/agents/<name>.md` (project-level) or `~/.claude/agents/<name>.md` (user-level), containing YAML frontmatter plus a system prompt body. This is a *configuration file*, not a running process. Nothing executes until something spawns an instance of it.

**Frontmatter fields (verified against Anthropic docs):**

| Field | Purpose |
|-------|---------|
| `name` | Identifier. Referenced by the Agent tool's `subagent_type` parameter. |
| `description` | Routing text. Main Claude reads this to decide when to delegate automatically. Phrases like "use proactively" or "use PROACTIVELY" encourage auto-invocation. |
| `tools` | Comma-separated list of tools available to the instance. If omitted, inherits all tools from the parent. **Subagents cannot spawn other subagents** — do not list `Agent` or `Task` here. |
| `model` | `sonnet`, `opus`, `haiku`, or a full model ID. Defaults to parent's model. |
| `skills` | List of skills to preload into the instance's context when it spawns. **Critical field** — see misconceptions section. |

**System prompt:** The markdown body after the frontmatter becomes the subagent's system prompt. This is where you write the persona, the review rubric, the style guide, the output contract.

**What to remember:** Think of this like a class definition or a template. It's inert until instantiated. The file exists to be referenced by name when something else decides to spawn an instance.

### 2.3 Subagent Instance (The Runtime Spawn)

**Definition:** A child Claude process, created at runtime, with its own isolated context window. Spawned by main Claude's use of the **Agent tool** (renamed from `Task` in Claude Code 2.1.63; both names still work as aliases).

**Key properties:**

- **Isolated context.** The instance cannot see the parent conversation. It receives only the prompt main Claude passes plus whatever its definition preloads.
- **Own tool permissions.** Governed by the definition's `tools:` field.
- **Returns a single summary.** When the instance finishes, it returns one message back to the parent. Main Claude then incorporates that summary into the ongoing conversation.
- **Cannot recursively spawn.** An instance cannot call the Agent tool itself. All fan-out must be orchestrated by the top-level Claude.

**Invocation parameters:**

```
Agent({
  subagent_type: "pr-reviewer",      # Which definition to instantiate
  prompt: "Review the diff in PR 42", # The task
  description: "Review PR 42"         # Short label for the operation
})
```

**What to remember:** This is the thing that actually *runs*. It's ephemeral — it exists for the duration of one task and is discarded. Think of the definition as a blueprint and the instance as a building constructed from that blueprint, which gets demolished as soon as the occupants move out.

### 2.4 Agent SDK (The Library)

**Definition:** `claude-agent-sdk` (Python) and `@anthropic-ai/claude-agent-sdk` (TypeScript). A software library for building your own agent harnesses — outside of Claude Code, outside of Claude.ai.

**History:** Renamed from "Claude Code SDK" in September 2025. The rename signaled a shift in positioning: the library is for building *any* agent, not just extensions to Claude Code. The underlying code is largely what powers Claude Code itself — Anthropic made the runtime available as a dependency you can import.

**Use cases:**

- A CLI tool that embeds an agent as a feature (not the whole product).
- A backend service that runs agent workflows on a schedule.
- A custom chat interface built on top of Anthropic's API with your own tool definitions.
- A research harness for running experiments on agent behavior.

**What to remember:** The Agent SDK is the *foundation* layer. It's what you reach for when Claude Code doesn't fit your deployment model and you need to build a runtime yourself. If you're working inside Claude Code, you almost never need it — Claude Code *is* an agent built on this stack.

### Quick Reference Table

| Meaning | Layer | Artifact Type | Example |
|---------|-------|---------------|---------|
| **Concept** | Abstract | N/A | "This product is an AI agent for sales research" |
| **Subagent definition** | Config | `.claude/agents/<name>.md` | `.claude/agents/security-reviewer.md` |
| **Subagent instance** | Runtime | Ephemeral child process | What the Agent tool spawns |
| **Agent SDK** | Library | Installable package | `pip install claude-agent-sdk` |

### The Adjacent Confusions

Three more terms you'll encounter that are NOT agents but often get lumped in:

- **MCP servers** (Model Context Protocol). These are *tool providers*, not agents. An MCP server exposes tools over a standard protocol so agents can call them. MCP is to agents what HTTP is to browsers — the connective layer.
- **"ChatGPT Agent" / "Claude Agents" (product names).** Sometimes Anthropic or OpenAI brands a consumer-facing feature as "Agent." These are products, not primitives.
- **Agent Teams** (Claude Code 2.1.32+, experimental). A peer-to-peer messaging layer where multiple subagents can communicate with each other directly, rather than fanning out hub-and-spoke from main Claude. This is a separate feature toggled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` and shouldn't be confused with the default subagent model.

---

## 3. What a Skill Actually Is (And Isn't)

A skill is a **folder** containing a `SKILL.md` file plus optional supporting resources (scripts, references, assets). It's a packaged, loadable set of instructions that *an agent* can pull into context on demand.

The Skills 2.0 User Guide covers the full anatomy. The point worth hammering here is what a skill *is not*.

### A Skill Is Not An Agent

A skill has no runtime. It doesn't execute. It doesn't spawn. It doesn't loop. It sits in a directory as Markdown and YAML until an agent decides to load it.

When you "invoke" a skill, what actually happens is:

1. Some agent (main Claude, a subagent instance, another compatible platform's runtime) matches the skill's `description` against a user request — or the user types `/skill-name` explicitly.
2. That agent reads the skill's `SKILL.md` into its own context window.
3. That agent follows the skill's instructions *using its own tools*.
4. When the task is done, the skill content is dropped from context.

At no point does the skill itself *do* anything. It's a playbook. The agent is what works from the playbook.

### The Worker/Playbook Mental Model

| Role | Claude Code Term |
|------|------------------|
| The worker | Agent (any of meanings 2.2 / 2.3 / 2.4) |
| The playbook the worker consults | Skill |
| A specialized worker's job description | Subagent definition (`.claude/agents/*.md`) |
| That specialized worker showing up to do a job | Subagent instance (spawned via Agent tool) |
| The factory that builds custom workers from scratch | Agent SDK |

This model holds up across every question you might ask:

- *Can a skill call another skill?* Only in the sense that one playbook can instruct the worker to open another playbook. The worker (main Claude) is what does the opening.
- *Can a skill spawn a subagent?* Only in the sense that the playbook can instruct the worker to dispatch a specialist. The worker makes the Agent tool call.
- *Can a subagent instance load a skill?* Only if its job description (the `.claude/agents/*.md` file) includes the skill in its `skills:` field — or if the specific platform it runs on has its own mechanism. Skills do not walk themselves into a subagent's context.

### Why This Matters Architecturally

Collapsing skills and agents into one mental category causes bad decisions. Two common failure modes:

**Failure mode 1: Treating a skill like an agent.** You write a skill and expect it to "run in the background" or "watch for events." It won't. Skills have no runtime. If you need event-driven behavior, you need hooks (a Claude Code mechanism) or an actual agent process (Agent SDK), not a skill.

**Failure mode 2: Treating an agent like a skill.** You write a `.claude/agents/foo.md` file when the content is really a rubric. Now you've put your portable IP (the rubric itself) inside a Claude-Code-specific artifact that can't travel to Codex, Cursor, or any other platform that speaks the Skills spec. The skill-vs-agent choice has *portability consequences*, and those flow from the fundamental difference between a playbook (skill) and a worker (agent).

---

## 4. The Unification Thesis: "Don't Build Agents, Build Skills Instead"

At the AI Engineering Code Summit on **November 21, 2025**, Anthropic's Barry Zhang and Mahesh Murag delivered a talk titled **"Don't Build Agents, Build Skills Instead."** The title is deliberately provocative. The argument underneath is pragmatic.

### The Core Claim

Instead of building many specialized agents (a coding agent, a research agent, a customer service agent, a data analysis agent), you should build **one general-purpose agent runtime** and give it a library of **domain-specific skills** it can load on demand.

Reasons this works in practice:

- **Skills compose.** Two skills can coexist in the same agent without fighting for control. Two specialized agents can't — they each assume they're in charge.
- **Skills are portable.** The Skills 2.0 spec is filesystem-based. A SKILL.md written for Claude Code works unchanged in Codex, Cursor, Copilot, Gemini CLI, and 30+ other platforms. Agent definitions don't travel like that.
- **Skills are testable.** The Skill Creator (see the Practitioner's Guide) makes skill development a proper engineering discipline with evals, A/B comparison, and description optimization. Agent definitions don't have equivalent tooling.
- **The agent runtime is getting better fast.** Betting on "one great runtime + many skills" lets you ride improvements to the runtime. Betting on many specialized agents means maintaining many specialized runtimes.

Anthropic's own [October 2025 announcement of Agent Skills](https://www.anthropic.com/news/claude-skills) frames this the same way: skills are how agents acquire capabilities, not a separate category of thing.

### The Microsoft Echo

Microsoft's public skills ecosystem — `microsoft/skills` (134 skills for Azure, Fabric, and M365) — includes explicit documentation that reads:

> "Agents are built on top of skills."

This isn't a random observation. It's the same thesis, validated by a second large organization that had every incentive to invent their own competing abstraction and chose not to.

### Architectural Implications

The thesis isn't just a slogan. It translates into concrete defaults:

1. **When in doubt, make it a skill.** The bar for "should this be a skill?" is low. The bar for "should this be a subagent definition or an SDK-based agent?" should be high.
2. **Put IP in skills, not agent definitions.** Rubrics, style guides, workflows, personas — these are your long-lived IP. They belong in portable skill files, not in Claude-Code-specific agent definitions.
3. **Use subagent definitions as thin wrappers.** If you need a subagent for runtime reasons (context isolation, tool restrictions), let its definition preload a skill via the `skills:` field. The definition becomes plumbing; the skill holds the substance.
4. **Reach for the Agent SDK only when you leave the runtime.** If you're inside Claude Code, Claude.ai, or any other skills-compatible platform, you almost never need the SDK. Reach for it when you need to build your own deployment.

The thesis is architecturally load-bearing. It's the reason to care about the skill-vs-agent distinction in the first place.

---

## 5. Decision Framework: When to Reach for Each Primitive

Given the four meanings of "agent" plus skills, here's how to decide what to build.

### The Default: Skill

Most things you're tempted to call an "agent" are actually skills. The test is simple:

> **If the thing is primarily a body of instructions, knowledge, or workflow that some agent should consult — it's a skill.**

Examples that are skills:
- A code review rubric
- A deployment checklist
- A style guide
- A persona ("write like Hemingway")
- A template-driven workflow (meeting notes, incident reports)
- A lens applied to a diff (security review, performance review)

### When to Add `context: fork`

Add `context: fork` to a skill's frontmatter when *both* of these are true:

1. The skill will consume significant context (large diffs, long documents, heavy research).
2. You don't want that context to pollute the main conversation.

`context: fork` causes the skill's body to run inside a single spawned subagent instance. The main conversation never sees the intermediate work — only the final summary comes back.

**Trade-off:** `context: fork` is Claude Code-specific. If portability matters, skip it and use a subagent definition wrapper instead (see next section).

### When to Write a Subagent Definition

Reach for `.claude/agents/<name>.md` when any of these apply:

- You need **parallel fan-out** — multiple instances running concurrently. The Agent tool requires a `subagent_type` to spawn, so you need at least a generic or custom definition to target.
- You need **tool restrictions** — limiting what a specialist can touch. The `tools:` field in the definition caps the blast radius.
- You need **portability of the leaf logic** — put the rubric in a skill, have the subagent definition preload it via `skills:`. Now the skill travels to other platforms while the definition stays as Claude-Code-specific plumbing.
- You need **reusable personas** — the same specialist called from many different orchestrators.

### When to Reach for the Agent SDK

Reach for `claude-agent-sdk` only when you're building outside Claude Code / Claude.ai. Specifically:

- A CLI tool that embeds an agent as one feature among others.
- A backend service running agent workflows on a schedule or trigger.
- A custom chat interface with your own tool definitions.
- A research harness for experimenting with agent behavior.

If you're already inside Claude Code, you almost certainly don't need the SDK. Claude Code is itself built on it.

### The Decision Table

| Need | Reach For | Why |
|------|-----------|-----|
| Workflow, rubric, or knowledge to apply | **Skill** | Portable, testable, loadable on demand |
| Heavy-context task that shouldn't pollute the main chat | **Skill with `context: fork`** | One-file isolation; Claude Code-specific |
| Persona that runs isolated AND stays portable | **Skill + subagent definition that preloads it** | Leaf is portable; wrapper is plumbing |
| N independent analyses in parallel | **Orchestrator skill instructing main Claude to spawn N subagents** | Parallelism requires the Agent tool |
| Tool restrictions on a specialist | **Subagent definition with explicit `tools:`** | Limits blast radius |
| Custom runtime outside Claude Code | **Agent SDK** | You need your own harness |
| Autonomous behavior without explicit invocation | **Hooks** (not covered here) | Skills/agents don't fire on events; hooks do |

### Anti-Patterns

- **Writing `.claude/agents/foo.md` when the content is really a rubric.** The rubric should be a skill. The agent definition, if needed at all, should be a thin wrapper.
- **Reaching for the Agent SDK when a skill would do.** If you're inside Claude Code, a skill is almost always the right answer.
- **Assuming subagents inherit skills.** They don't. See Section 7.
- **Using `context: fork` to achieve parallelism.** It doesn't. It produces one isolated subagent. For parallel fan-out, you need an orchestrator skill that instructs main Claude to make multiple Agent tool calls.

---

## 6. How Invocation Actually Works

Mental model clarity requires understanding the actual runtime mechanics. Here's what happens when each primitive is invoked.

### Skill Invocation Paths

There are four ways a skill enters an agent's context:

**Path 1: User types `/skill-name`.** The slash command triggers the skill directly, bypassing description matching. Arguments (if any) are passed via `$ARGUMENTS`, `$0`, `$1`, etc.

**Path 2: Auto-trigger via description.** The agent reads available skills' `description` metadata on every turn. If a user message matches a description, the agent loads that skill. This is why descriptions need to be specific and "pushy."

**Path 3: Called by another skill's body.** A skill's body can contain instructions like "invoke `/other-skill` on the diff." Critically, **this is instructions to main Claude, not a direct skill-to-skill call**. Main Claude reads the instruction, decides to invoke `/other-skill`, and loads it. Skills don't call each other directly; they instruct the agent to make the call.

**Path 4: Preloaded via a subagent definition.** If a `.claude/agents/<name>.md` file has `skills: [foo, bar]` in its frontmatter, an instance spawned from that definition will have skills `foo` and `bar` loaded into its context from the moment it starts. No explicit invocation needed.

### Subagent Invocation

Subagents are invoked exclusively through the Agent tool. The mechanics:

1. Main Claude decides to delegate (either because a skill's instructions told it to, or because a user request matched a subagent's `description` routing text).
2. Main Claude calls the Agent tool:
   ```
   Agent({
     subagent_type: "security-reviewer",
     prompt: "Review the auth middleware changes in the current diff",
     description: "Security review of auth changes"
   })
   ```
3. The runtime creates a child Claude process, applies the subagent definition (system prompt, tools, preloaded skills), and starts it with the provided prompt.
4. The child runs autonomously with its isolated context window. Main Claude is blocked waiting (unless `run_in_background: true`).
5. When the child finishes, it returns one message summarizing its work.
6. Main Claude incorporates that summary into its own context and continues.

The child cannot:
- See the parent conversation.
- Call the Agent tool itself (no recursive spawning).
- Load arbitrary skills at runtime (only what its definition preloaded).

### Parallel Fan-Out

Parallelism happens one way: **main Claude makes multiple Agent tool calls in the same message.** When multiple tool calls are emitted in a single assistant turn, the runtime executes them concurrently.

```
# Single message, three Agent calls → three parallel subagents
Agent({ subagent_type: "security-reviewer", ... })
Agent({ subagent_type: "performance-reviewer", ... })
Agent({ subagent_type: "maintainability-reviewer", ... })
```

An orchestrator skill's body instructs main Claude to emit multiple Agent calls in a single turn. The skill is not spawning anything — it's telling the agent what tool calls to make. This is how `/simplify` and `/batch` achieve their fan-out.

### `context: fork` Mechanics

`context: fork` on a skill frontmatter changes the invocation path. Instead of loading the skill into main Claude's context, the runtime:

1. Spawns a subagent instance (of the type specified by the `agent:` field — `Explore`, `Plan`, `general-purpose`, or a custom definition).
2. Runs the skill's body *inside that subagent*.
3. Returns the subagent's summary to main Claude.

This is effectively a shorthand for "skill + subagent wrapper" — one frontmatter block instead of two files. It's single-subagent isolation, not parallelism. Parallelism still requires an orchestrator with multiple Agent tool calls.

### Dynamic Context Injection

The backtick-bang syntax (`` !`command` ``) in a skill body runs the shell command **before** the skill content is sent to the agent. The command output replaces the placeholder. This is preprocessing at skill-load time, not at agent-execution time — the agent only ever sees the rendered output, not the template.

```yaml
---
name: pr-context
description: Prepare PR context for review
---
PR diff: !`gh pr diff`
```

When this skill loads, the runtime executes `gh pr diff`, substitutes the output, and the agent sees the expanded text.

---

## 7. Common Misconceptions & Corrections

These are the misconceptions that cost the most time when they're wrong.

### Misconception 1: "Subagents inherit skills from their parent."

**FALSE.** A spawned subagent instance starts with a clean context. It does not see the skills the parent had loaded, and it cannot auto-discover skills in the same way the main agent can.

**What's actually true:** Subagent definitions have a `skills:` field in their frontmatter. Skills listed there are preloaded into the instance's context when it spawns. If you need a subagent to have access to a skill, you must declare it in the definition.

**Why this matters:** If you design an orchestration where main Claude spawns generic `general-purpose` subagents and tells them to "invoke `/leaf-skill`," the subagents won't find the skill. You need either (a) a custom subagent definition that preloads the skill, or (b) to inline the skill's content into the prompt you pass to the subagent.

### Misconception 2: "Skills can spawn subagents directly."

**FALSE.** A skill has no runtime. It cannot spawn anything.

**What's actually true:** A skill's body is instructions that the main agent reads and follows. If the skill body says "spawn three subagents in parallel," the main agent is the one making the Agent tool calls. The skill is a script the agent follows; the agent is the one holding the tools.

**Why this matters:** Designs that assume skills have autonomous execution will fail. The skill can only influence behavior by shaping the agent's prompt.

### Misconception 3: "`context: fork` enables parallel execution."

**FALSE.** `context: fork` creates ONE isolated subagent running the skill's body. It is single-subagent isolation, not parallelism.

**What's actually true:** For parallel execution, you need an orchestrator skill whose body instructs main Claude to emit multiple Agent tool calls in a single turn. Each tool call spawns one subagent; the runtime handles concurrency.

### Misconception 4: "The Task tool and the Agent tool are different tools."

**FALSE.** They're the same tool. The Agent tool was renamed from Task in Claude Code 2.1.63. Both names continue to work as aliases. Older documentation and examples using `Task(...)` still function identically.

### Misconception 5: "Subagent definitions and the Agent SDK are the same thing."

**FALSE.** They live at different layers entirely.

**What's actually true:** A subagent definition is a config file used by Claude Code's built-in runtime to parameterize child processes. The Agent SDK is a separate library for building your own agent runtime from scratch. You use subagent definitions *inside* Claude Code. You use the Agent SDK *outside* Claude Code.

### Misconception 6: "MCP servers are agents."

**FALSE.** MCP servers are tool providers. They expose tools over the Model Context Protocol so agents can call them. MCP is the connective layer between agents and external systems — it's to agents what HTTP is to browsers.

### Misconception 7: "One skill can call another skill directly."

**AMBIGUOUS — needs precision.** A skill's body can contain instructions like "now invoke `/other-skill`," but the invocation is performed by the main agent reading the instruction, not by the skill reaching into another skill. The indirection goes through the agent.

**Why this matters:** You can't assume data flows directly between skills. Whatever one skill "passes" to another has to go through the agent's context — which means it has to be written explicitly as text the agent can see and pass along.

### Misconception 8: "Anthropic's documentation distinguishes consistently between subagent-the-file and subagent-the-instance."

**FALSE — but this one isn't your fault.** Anthropic's own documentation uses "subagent" to mean both the definition file and the running instance, often in the same paragraph. There's no canonical glossary that pins the terms down. This is why your doc (this one) can actually improve on the official sources.

---

## 8. Glossary

| Term | Precise Definition |
|------|--------------------|
| **Agent (concept)** | A system where an LLM dynamically directs its own processes and tool usage. The abstract category. |
| **Agent SDK** | `claude-agent-sdk` (Python) / `@anthropic-ai/claude-agent-sdk` (TypeScript). Library for building custom agent runtimes. Renamed from Claude Code SDK in September 2025. |
| **Agent tool** | The tool main Claude uses to spawn subagent instances. Renamed from Task in Claude Code 2.1.63. |
| **Agent Teams** | Experimental Claude Code feature (2.1.32+) enabling peer-to-peer subagent messaging. Toggle via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`. |
| **`context: fork`** | Skill frontmatter flag that runs the skill's body inside a single spawned subagent. Single-subagent isolation, not parallelism. Claude Code-specific. |
| **Hook** | Claude Code mechanism for event-driven automation. Fires on tool use, session events, etc. Not the same as skills or agents. |
| **MCP** | Model Context Protocol. Open standard for how agents communicate with tool providers. Distinct from skills. |
| **Skill** | A folder containing SKILL.md plus optional resources. Packaged instructions that agents load on demand. Portable across 30+ platforms. |
| **`skills:` field** | Frontmatter field on subagent definitions that preloads named skills into the instance's context at spawn time. |
| **Subagent definition** | Static config file at `.claude/agents/<name>.md`. Describes a reusable persona/role. Inert until instantiated. |
| **Subagent instance** | Runtime child Claude process spawned by the Agent tool. Isolated context; returns one summary to parent. Ephemeral. |
| **Task tool** | Older name for the Agent tool. Still works as an alias. |

---

## Appendix A: Sources

**Primary Anthropic sources:**

- [Building Effective Agents](https://www.anthropic.com/news/building-effective-ai-agents) — Dec 2024. Canonical definition of "agent (concept)."
- [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/news/claude-skills) — Oct 2025. Zhang, Lazuka, Murag. Companion reading to the Zhang/Murag talk.
- [Claude Code Subagents documentation](https://docs.anthropic.com/claude/docs/subagents) — frontmatter fields, invocation mechanics.
- [Claude Code Skills documentation](https://docs.anthropic.com/claude/docs/skills) — skill structure and triggering.
- [Agent Skills API reference](https://docs.anthropic.com/claude/reference/agent-skills)
- [Agent SDK overview](https://docs.anthropic.com/claude/docs/agent-sdk-overview)

**The "Don't Build Agents" talk:**

- **Title:** *Don't Build Agents, Build Skills Instead*
- **Speakers:** Barry Zhang & Mahesh Murag (Members of Technical Staff, Anthropic)
- **Event:** AI Engineering Code Summit, November 20–21, 2025 (talk delivered Nov 21)
- **Video:** Published on the AI Engineer YouTube channel
- **Summit repo:** `The-Focus-AI/2025-11-20-ai-engineering-code-summit`

**Ecosystem validation:**

- [Microsoft Skills repository](https://github.com/microsoft/skills) — 134 skills following the Agent Skills spec; documents "Agents are built on top of skills."
- [Agent Skills Specification](https://agentskills.io/specification) — open standard, Apache 2.0 (code) / CC-BY-4.0 (docs).

**Companion documents in this research collection:**

- [Claude Skills 2.0: The Definitive User Guide](Claude_Skills_2.0_User_Guide.md) — full skill anatomy, frontmatter, triggering, cross-platform compatibility.
- [The Skill Creator: A Practitioner's Guide](Skill_Creator_Practitioners_Guide.md) — engineering discipline for skill development: evals, A/B testing, description optimization.

---

*Built from primary source analysis of Anthropic's subagent and skills documentation, the agentskills.io specification, the Claude Agent SDK documentation, Microsoft's skills ecosystem, the Zhang/Murag AI Engineering Code Summit talk, and cross-verification against the companion Skills 2.0 User Guide and Skill Creator Practitioner's Guide. Reflects the ecosystem as of April 2026. Corrections to common misconceptions verified against Anthropic's official docs rather than community folklore.*
