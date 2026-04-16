# Skills 2.0 — Reference Collection

A consolidated, system-of-record treatment of Anthropic's Agent Skills standard for engineers, operators, and collaborators who need a working understanding of skills without reading Anthropic's official documentation cover-to-cover.

**Last updated:** 2026-04-16

---

## What this collection is

Three reference docs, each written for a different reader moment, plus this hub for orientation. Every load-bearing claim is backed by a primary source. Depth is one click away when you need it but never forced on a casual reader.

| Doc | Best for | Approx. read time |
|-----|----------|-------------------|
| [Skills, Agents, and Subagents — Oh My!](Skills_Agents_and_Subagents_Oh_My.md) | Sorting out what skills, agents, and subagents actually are. The architecture and decision framework. | ~20 min |
| [Claude Skills 2.0 — User Guide](Claude_Skills_2.0_User_Guide.md) | Full ecosystem treatment. Anatomy, runtime, distribution, security, cross-platform. | ~45 min |
| [Skill Creator Practitioner's Guide](Skill_Creator_Practitioners_Guide.md) | Engineering discipline for shipping reliable skills. Evals, A/B tests, governance. | ~30 min |

## What this collection isn't

A replacement for Anthropic's official documentation — those remain authoritative for the canonical spec. This collection sits one layer above: practical, navigable, and biased toward how teammates actually use skills in real work. Where official docs go deeper than we do, we link out.

---

## Where to start

Pick the entry that matches your current moment.

| Your moment | Start here | Why this path |
|---|---|---|
| **"I want to understand what skills are and how they fit in the ecosystem"** | [SAS](Skills_Agents_and_Subagents_Oh_My.md) → [UG](Claude_Skills_2.0_User_Guide.md) | SAS clears up the four meanings of "agent" and the architecture (~20 min); UG adds the full ecosystem framing |
| **"I want to build my first skill"** | [UG §8 — Building Your Own Skills](Claude_Skills_2.0_User_Guide.md#8-building-your-own-skills) → [SCG](Skill_Creator_Practitioners_Guide.md) | §8 is the worked example; SCG kicks in when you need engineering rigor past the first happy path |
| **"I'm distributing skills to a team or org"** | [UG §6](Claude_Skills_2.0_User_Guide.md#6-using-skills-in-claudeai) + [§7](Claude_Skills_2.0_User_Guide.md#7-using-skills-in-claude-code) → [SCG §12](Skill_Creator_Practitioners_Guide.md#12-the-governance-angle-show-me-your-tests) | Distribution surfaces first; governance and review gates second |
| **"I keep mixing up agent vs subagent vs skill — terminology is killing me"** | [SAS §2](Skills_Agents_and_Subagents_Oh_My.md#2-the-four-meanings-of-agent) + [§5](Skills_Agents_and_Subagents_Oh_My.md#5-decision-framework-when-to-reach-for-each-primitive) | The four meanings of "agent" + the decision framework. That's the whole fix. |
| **"I want the engineering discipline — evals, A/B tests, governance"** | [SCG](Skill_Creator_Practitioners_Guide.md), especially [§10](Skill_Creator_Practitioners_Guide.md#10-phase-6-optimize-the-description) and [§12](Skill_Creator_Practitioners_Guide.md#12-the-governance-angle-show-me-your-tests) | The entire SCG is built for this; §10 is the description-tuning method, §12 is the review gate |
| **Not sure** | Read in this order: [SAS](Skills_Agents_and_Subagents_Oh_My.md) → [UG](Claude_Skills_2.0_User_Guide.md) → [SCG](Skill_Creator_Practitioners_Guide.md) | Terminology first, ecosystem second, engineering rigor third |

---

## Glossary

The canonical glossary for this collection. Each entry links to the section that gives the concept its fullest treatment.

| Term | Definition | Canonical home |
|------|------------|----------------|
| **Agent (concept)** | A system where an LLM dynamically directs its own processes and tool usage. The abstract category — distinct from any specific tool, library, or artifact. | [SAS §2.1](Skills_Agents_and_Subagents_Oh_My.md#21-agent-the-concept) |
| **Agent SDK** | `claude-agent-sdk` (Python) / `@anthropic-ai/claude-agent-sdk` (TypeScript). Library for building custom agent runtimes. Renamed from Claude Code SDK in September 2025. | [SAS §2.4](Skills_Agents_and_Subagents_Oh_My.md#24-agent-sdk-the-library) |
| **Agent Skills Spec** | The open standard published by Anthropic at [agentskills.io](https://agentskills.io). Defines the SKILL.md format and runtime expectations cross-platform. | [UG §13](Claude_Skills_2.0_User_Guide.md#13-cross-platform-compatibility) |
| **Agent Teams** | Experimental Claude Code feature (v2.1.32+) enabling peer-to-peer subagent messaging. Toggle via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. | [SAS §2 adjacent confusions](Skills_Agents_and_Subagents_Oh_My.md#the-adjacent-confusions) |
| **Agent tool** | The tool main Claude uses to spawn subagent instances. Renamed from Task in Claude Code v2.1.63. Both names work as aliases. | [SAS §2.3](Skills_Agents_and_Subagents_Oh_My.md#23-subagent-instance-the-runtime-spawn) |
| **Bundled Skill** | Skill that ships with Claude Code (e.g. `/simplify`, `/batch`, `/debug`). The current set evolves with Anthropic releases. | [UG §7](Claude_Skills_2.0_User_Guide.md#7-using-skills-in-claude-code) |
| **Capability Uplift Skill** | Skill that extends what the model can do (e.g. document generation, image manipulation). May become obsolete as base models improve. | [UG §5](Claude_Skills_2.0_User_Guide.md#5-types-of-skills) |
| **`context: fork`** | Skill frontmatter flag that runs the skill's body inside a single spawned subagent. Single-subagent isolation, not parallelism. Claude Code-specific. | [SAS §6 mechanics](Skills_Agents_and_Subagents_Oh_My.md#context-fork-mechanics) |
| **Frontmatter** | YAML block between `---` delimiters at the top of a SKILL.md file. Carries `name`, `description`, and optional fields. | [UG §9](Claude_Skills_2.0_User_Guide.md#9-complete-frontmatter-reference) |
| **Hook** | Claude Code mechanism for event-driven automation (PreToolUse, PostToolUse, Stop, SessionStart, etc.). Configured in settings.json or scoped per-skill via the `hooks:` frontmatter field. Distinct from skills and agents. | [SAS §2 adjacent confusions](Skills_Agents_and_Subagents_Oh_My.md#the-adjacent-confusions) |
| **MCP** | Model Context Protocol. Open standard for how agents communicate with tool providers. Distinct from skills — MCP exposes tools; skills package instructions. | [SAS §2 adjacent confusions](Skills_Agents_and_Subagents_Oh_My.md#the-adjacent-confusions) |
| **Plugin** | Distribution bundle that packages skills, subagent definitions, hooks, commands, and/or MCP servers as one installable unit. A packaging primitive, not an architectural one. | [SAS §2 adjacent confusions](Skills_Agents_and_Subagents_Oh_My.md#the-adjacent-confusions) |
| **Progressive Disclosure** | Three-tier loading: descriptions always in context; SKILL.md body loads on trigger; supporting resources load only when the body references them. | [UG §2](Claude_Skills_2.0_User_Guide.md#2-core-concepts) |
| **Skill** | A folder containing SKILL.md plus optional resources. Packaged instructions that agents load on demand. Portable across 30+ platforms via the [Agent Skills Spec](https://agentskills.io). | [SAS §3](Skills_Agents_and_Subagents_Oh_My.md#3-what-a-skill-actually-is-and-isnt) |
| **`skills:` field** | Frontmatter field on subagent definitions that preloads named skills into the instance's context at spawn time. The bridge between subagent definitions and skills. | [SAS §2.2](Skills_Agents_and_Subagents_Oh_My.md#22-subagent-definition-the-static-artifact) |
| **SKILL.md** | Required Markdown file that defines a skill. Frontmatter at top, instructions in the body, references to supporting resources as needed. | [UG §3](Claude_Skills_2.0_User_Guide.md#3-anatomy-of-a-skill) |
| **`.skill` file** | ZIP archive of a skill directory packaged for distribution. | [UG §14](Claude_Skills_2.0_User_Guide.md#14-skill-distribution--package-management) |
| **Subagent definition** | Static config file at `.claude/agents/<name>.md`. Describes a reusable persona/role. Inert until instantiated. | [SAS §2.2](Skills_Agents_and_Subagents_Oh_My.md#22-subagent-definition-the-static-artifact) |
| **Subagent instance** | Runtime child Claude process spawned by the Agent tool. Isolated context; returns one summary to parent. Ephemeral — discarded when done. | [SAS §2.3](Skills_Agents_and_Subagents_Oh_My.md#23-subagent-instance-the-runtime-spawn) |
| **Triggering** | The agent deciding to load a skill based on its description matching the current task context. Description quality determines reliability. | [UG §2](Claude_Skills_2.0_User_Guide.md#2-core-concepts) |
| **Workflow/Preference Skill** | Skill that encodes organizational knowledge or stylistic preferences (e.g. PR review checklist, deployment runbook). Long-lived; survives model upgrades. | [UG §5](Claude_Skills_2.0_User_Guide.md#5-types-of-skills) |

---

## Going deeper — official Anthropic docs

For canonical specifications, latest releases, and topics this collection intentionally defers:

- **Agent Skills spec (open standard):** [agentskills.io](https://agentskills.io)
- **Anthropic Skills documentation:** [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)
- **Claude Code Subagents documentation:** [docs.anthropic.com/claude/docs/subagents](https://docs.anthropic.com/claude/docs/subagents)
- **Claude Agent SDK overview:** [docs.anthropic.com/claude/docs/agent-sdk-overview](https://docs.anthropic.com/claude/docs/agent-sdk-overview)
- **Anthropic Skills GitHub repo:** [github.com/anthropics/skills](https://github.com/anthropics/skills)
- **"Equipping agents for the real world with Agent Skills" (Oct 2025):** [anthropic.com/news/claude-skills](https://www.anthropic.com/news/claude-skills)
- **Microsoft Skills (real-world example, 200+ skills):** [microsoft/skills](https://github.com/microsoft/skills) and [microsoft/skills-for-fabric](https://github.com/microsoft/skills-for-fabric)

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

Sources: Anthropic blog posts, Claude Code release notes, [agentskills.io](https://agentskills.io), AI Engineering Code Summit recordings.

</details>

---

*This README is the entry point for the Skills 2.0 reference collection. The three source docs preserve their individual voices and serve different reader moments — this hub orients readers to the right one and consolidates the shared glossary, official-doc links, and timeline. For background on how this collection was assembled, see commit history.*
