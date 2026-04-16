# Skills 2.0 — Team Playbook

An engineer's on-ramp to building agentic systems with Claude Code, following Anthropic's skills-first approach. Four short docs get you from zero to shipping. Three deep reference docs are here when you need precision.

**Last updated:** 2026-04-16

---

## Start here

Read in this order. Each doc builds on the one before it.

| # | Doc | Read time | What it gives you |
|---|-----|-----------|-------------------|
| 1 | **[00_START.md](00_START.md)** | 5 min | The mental model. What a skill is, how it differs from an agent, when to reach for what. |
| 2 | **[01_BUILD.md](01_BUILD.md)** | 15 min (plus 30 min hands-on) | Your first skill, end-to-end. Release-notes generator built with the Skill Creator. |
| 3 | **[02_SHARPEN.md](02_SHARPEN.md)** | 12 min | Composition. `context: fork`, subagents, MCP, hooks, parallel fan-out. |
| 4 | **[03_SHIP.md](03_SHIP.md)** | 10 min | Shipping discipline. Evals, pass-rate thresholds, ADRs, the PR checklist. |

If you read only one: **[00_START.md](00_START.md)**. It kills the skills-vs-agents confusion and gives you the decision framework in five minutes.

---

## When to go deep

The four docs above cover 90% of what you need. The three deep docs below are reference material — where you go when you hit a weird case and need the authoritative answer. They're dense; they're thorough; they're not meant for first reads.

| Doc | What it's for |
|-----|---------------|
| **[reference/Skills_Agents_and_Subagents_Oh_My.md](reference/Skills_Agents_and_Subagents_Oh_My.md)** | Every meaning of "agent" untangled. The full decision framework. Runtime mechanics. Misconceptions and their corrections. |
| **[reference/Claude_Skills_2.0_User_Guide.md](reference/Claude_Skills_2.0_User_Guide.md)** | The comprehensive user guide. Anatomy, frontmatter, runtime, distribution, security, cross-platform, troubleshooting. |
| **[reference/Skill_Creator_Practitioners_Guide.md](reference/Skill_Creator_Practitioners_Guide.md)** | Full engineering-discipline treatment of the Skill Creator. Phase-by-phase mechanics, eval framework, governance model. |

---

## The five terms that matter

"Agent" is overloaded. These five disambiguations kill 90% of the confusion. Full vocabulary lives in the reference docs.

| Term | What it is |
|------|------------|
| **Skill** | A folder with a `SKILL.md` file that teaches Claude how to do something. Passive — Claude loads it and follows the instructions. Portable across any platform implementing the [Agent Skills Spec](https://agentskills.io). |
| **Subagent definition** | Static config file at `.claude/agents/<name>.md`. Describes a specialist role (tools it can use, skills it should preload). Inert on disk until something spawns an instance from it. |
| **Subagent instance** | Runtime child Claude process, spawned by the Agent tool, with its own context window. Does its work, returns one summary to the parent, then discarded. |
| **Agent tool** | The tool the main Claude uses to spawn a subagent instance. Renamed from Task in Claude Code v2.1.63; both names still work. |
| **Agent SDK** | `claude-agent-sdk` — the library for building your own agent runtime *outside* Claude Code. If you're inside Claude Code, you don't need it. |

For everything else (Progressive Disclosure, `context: fork`, `skills:` field, hooks, MCP, plugins, `.skill` files, bundled vs. capability-uplift skills): see the [reference docs](reference/README.md).

---

## Official Anthropic sources

For canonical specs and anything beyond what these docs cover:

- **Agent Skills spec (open standard):** [agentskills.io](https://agentskills.io)
- **Anthropic Skills documentation:** [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)
- **Claude Code Subagents documentation:** [docs.anthropic.com/claude/docs/subagents](https://docs.anthropic.com/claude/docs/subagents)
- **Claude Agent SDK overview:** [docs.anthropic.com/claude/docs/agent-sdk-overview](https://docs.anthropic.com/claude/docs/agent-sdk-overview)
- **Anthropic Skills GitHub repo:** [github.com/anthropics/skills](https://github.com/anthropics/skills)
- **"Equipping agents for the real world with Agent Skills" (Oct 2025):** [anthropic.com/news/claude-skills](https://www.anthropic.com/news/claude-skills)
- **"Don't Build Agents, Build Skills Instead" — Barry Zhang & Mahesh Murag, AI Engineering Code Summit, Nov 2025**

---

<details>
<summary><strong>▶ Timeline of major Skills ecosystem events (2025–2026)</strong></summary>

| Date | Event |
|------|-------|
| 2025-09 | Claude Code SDK renamed to Claude Agent SDK (reflecting that the library is for building any agent, not just Claude Code extensions) |
| 2025-10 | Agent Skills launched as a first-class feature in Claude Code |
| 2025-11-21 | Barry Zhang & Mahesh Murag deliver *"Don't Build Agents, Build Skills Instead"* at the AI Engineering Code Summit |
| 2025-12-18 | Anthropic publishes the Agent Skills specification as an open standard at [agentskills.io](https://agentskills.io) |
| 2026-01-24 | Claude Code v2.1.3 unifies skills and slash commands (skills win on naming conflicts) |
| 2026-02-06 | Claude Code v2.1.32 introduces experimental Agent Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) |
| 2026-02-28 | Claude Code v2.1.63 renames the Task tool to the Agent tool (both names work as aliases) |

</details>

---

## Navigation cheat sheet

Lost? Use this to jump to the right doc.

- *"What is a skill?"* → [00_START.md](00_START.md)
- *"How do I build one?"* → [01_BUILD.md](01_BUILD.md)
- *"When do I use `context: fork`?"* → [02_SHARPEN.md](02_SHARPEN.md)
- *"What's the pass-rate threshold for shipping?"* → [03_SHIP.md](03_SHIP.md)
- *"What does frontmatter field X do?"* → [reference/UG §9](reference/Claude_Skills_2.0_User_Guide.md#9-complete-frontmatter-reference)
- *"Why didn't my skill trigger?"* → [reference/UG §17](reference/Claude_Skills_2.0_User_Guide.md#17-troubleshooting)
- *"What's the difference between a subagent definition and a subagent instance?"* → [reference/SAS §2](reference/Skills_Agents_and_Subagents_Oh_My.md#2-the-four-meanings-of-agent)
- *"How does the Skill Creator description optimizer work?"* → [reference/SCG §10](reference/Skill_Creator_Practitioners_Guide.md#10-phase-6-optimize-the-description)

---

*Skills first. Evals before ship. Write the decision down.*
