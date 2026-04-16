# Proposed Changes: *Skills, Agents, and Subagents, Oh My!*

**Reviewer:** Claude (with Briggsy)
**Review date:** April 16, 2026
**Doc reviewed:** `Skills_Agents_and_Subagents_Oh_My.md` v1.0 (April 15, 2026)
**Goal:** Get the doc to "system of record true" — every load-bearing claim verified against primary sources, no half-truths, no propagated folklore.

---

## Overall Assessment

**Verdict: structurally sound, mostly accurate, but with a handful of factual errors that undermine the "system of record" claim.** The four-meanings framing, the worker/playbook model, the decision framework, and the misconceptions section are all genuinely useful and largely correct. The architectural intuitions hold up. What needs fixing is a small number of specific factual claims and one attribution error — plus a few nuances that distinguish "true" from "true with an asterisk."

Verified against Anthropic's official Claude Code docs, the Claude API docs, the Claude Agent SDK docs, the Claude Code GitHub issue tracker, the agentskills.io spec, the Microsoft skills repos, and the Zhang/Murag talk record.

Issues are tagged by severity:

- 🔴 **CRITICAL** — factually wrong, must fix for credibility
- 🟡 **NUANCE** — true but oversimplified; add qualifiers
- 🟢 **ENHANCEMENT** — accurate as-is, but additions would strengthen the "system of record" claim

---

## 🔴 CRITICAL #1 — Skills are not "dropped from context" after task completion

**Location:** Section 3, "What a Skill Actually Is (And Isn't)" → "A Skill Is Not An Agent" → step 4 of the invocation list.

**Current text:**

> 4. When the task is done, the skill content is dropped from context.

**Problem:** No such mechanism exists. LLM context windows are append-only within a session — content does not get selectively removed. Once a skill body is loaded, it stays loaded for the rest of the session. This is contradicted by:

- **Anthropic's official Context Windows docs** describe linear, append-only token accumulation: "previous turns are preserved completely."
- **GitHub Issue #45091** is an active Claude Code feature request to *add* a `clear: true` skill frontmatter field — the request itself proves the behavior doesn't currently exist; the only workaround is manually typing `/clear`.
- **GitHub Issue #14882** documents users discovering skill bodies are loaded fully and stay in context (sometimes 50k+ tokens at startup with multiple plugins).
- **Anthropic's Skills overview docs** describe progressive disclosure as *deferred loading* (frontmatter at startup, body when triggered, supporting files when referenced) — never as post-task unloading.

**Why it matters:** This wrong claim makes skills sound cheaper than they actually are, leading readers to load them casually and then wonder why their session degrades two hours in. It's the exact kind of misconception Section 7 was written to prevent.

**Proposed replacement:**

> 4. The skill content remains in context for the rest of the session, contributing to context-window growth alongside everything else. Skills do not auto-unload when their task completes. The only ways skill content effectively leaves the active context are: (a) the skill was invoked with `context: fork`, in which case it lived inside a discarded subagent context and only the summary returned to main; (b) the user runs `/clear` to wipe the session; (c) Claude Code's auto-compaction kicks in at the context limit (lossy summarization, not targeted skill removal); (d) the session ends.

**Bonus:** Add this to Section 7 (Misconceptions) as **Misconception 9: "Skills are unloaded from context when their task completes."** It's a pervasive enough belief — driven by sloppy use of "progressive disclosure" — that it deserves its own correction.

---

## 🔴 CRITICAL #2 — Microsoft attribution is to the wrong repo

**Location:** Section 4 ("Unification Thesis") → "The Microsoft Echo" subsection. Also Appendix A.

**Current text:**

> Microsoft's public skills ecosystem — `microsoft/skills` (134 skills for Azure, Fabric, and M365) — includes explicit documentation that reads:
>
> > "Agents are built on top of skills."

**Problem:** That exact quote does not appear in `microsoft/skills`. It appears in **`microsoft/skills-for-fabric`**, a different Microsoft repository. The repos are related (same design principles, same skills spec) but they are not the same repository, and citing the wrong one is the kind of error that erodes "system of record" credibility on a ten-second fact-check.

**Proposed replacement:**

> Microsoft's public skills ecosystems — `microsoft/skills` (~133 Azure SDK skills as of early 2026), `microsoft/skills-for-fabric`, and `MicrosoftDocs/Agent-Skills` — all build on the Agent Skills open standard. The `skills-for-fabric` README states the thesis explicitly:
>
> > "Agents are built on top of skills."
>
> The same architectural pattern recurs across Microsoft's `dotnet/skills` repo, GitHub's `github/awesome-copilot` collection, and dozens of vendor-published skill libraries (Stripe, Cloudflare, Sentry, Vercel, Netlify, Hugging Face, Figma, Brave, etc.). The thesis isn't a single quote — it's how the entire ecosystem is organizing itself.

**Appendix A fix:** Update the Microsoft Skills bullet to point to the correct source URL for the quote (`https://github.com/microsoft/skills-for-fabric`), and add `MicrosoftDocs/Agent-Skills` and `dotnet/skills` for ecosystem completeness.

---

## 🟡 NUANCE #1 — Misconception 1 needs a qualifier on filesystem discoverability

**Location:** Section 7 ("Common Misconceptions"), Misconception 1: "Subagents inherit skills from their parent."

**Current text says:** Subagents start with clean context, don't see parent's loaded skills, can't auto-discover skills "in the same way the main agent can," and the only way to get skills into a subagent is the `skills:` frontmatter field.

**Problem:** Mostly true, but oversimplified. Per **GitHub Issue #32910** (verified by Anthropic engineers in March 2026), the `skills:` field controls *startup injection of skill content into the system prompt*. But subagents with filesystem access — including the built-in `general-purpose` subagent — **can still discover and invoke project skills by scanning `.claude/skills/` directories** at runtime, because skills are filesystem-based artifacts and the subagent has bash/glob/read tools. The `skills:` field is therefore an *injection mechanism*, not an *access restriction*. To prevent a subagent from invoking a particular skill, you need `disallowedTools: Skill(skill-name)`.

**Why it matters:** Readers designing orchestration patterns will assume "subagent can't see the skill unless I declare it" and therefore assume security/scope guarantees that don't actually exist.

**Proposed addition** (insert after the existing "What's actually true" paragraph in Misconception 1):

> **Important nuance:** The `skills:` field controls *startup injection of skill content into the system prompt*. It is **not** an access restriction. Subagents with filesystem access (notably the built-in `general-purpose` subagent) can still discover and invoke project skills at runtime by scanning `.claude/skills/` directories using their normal Read/Glob/Grep tools. If you need to prevent a subagent from invoking a particular skill, use `disallowedTools: Skill(skill-name)` rather than relying on absence from `skills:`. (Source: GitHub Issue anthropics/claude-code#32910, verified March 2026.)

---

## 🟡 NUANCE #2 — Frontmatter table is incomplete for "system of record" purposes

**Location:** Section 2.2 ("Subagent Definition") — the frontmatter fields table.

**Current table** lists: `name`, `description`, `tools`, `model`, `skills`.

**What's missing** (per official Claude Code docs and the `--agents` CLI flag spec):

| Field | Purpose |
| --- | --- |
| `disallowedTools` | Removes specific tools from inherited or explicit tool set; evaluated *after* `tools`. Use for "Skill(name)" entries to block specific skills. |
| `permissionMode` | One of `acceptEdits`, `bypassPermissions`, `plan`, `default`, `auto`. Inherited modes from parent take precedence in some cases (see docs). |
| `hooks` | Lifecycle hooks scoped to this subagent (`PreToolUse`, `PostToolUse`, `Stop`, etc.). Fire when spawned via Agent tool or @-mention; do *not* fire when run as main session via `--agent`. |
| `mcpServers` | MCP server configurations scoped to this subagent. |
| `memory` | Enables a persistent `MEMORY.md` file (first 200 lines injected at startup) that the subagent can read/write/curate across sessions. |
| `effort` | Override effort level: `low`, `medium`, `high`, `max` (Opus 4.6 only). |
| `color` | UI label color. |
| `background` | Whether the agent runs in background by default. |
| `isolation` | Process isolation control. |
| `initialPrompt` | Auto-submitted as first user turn when this agent runs as main session via `--agent`. |
| `maxTurns` | Caps autonomous turn count. |

**Recommendation:** Either expand the table to cover all of these (system-of-record mode), or add a sentence acknowledging the table is "the most commonly used fields; see the official Claude Code subagents docs for the complete list" and link to `https://code.claude.com/docs/en/sub-agents`.

**Note for the `tools` row:** The current entry should also mention the `Agent(agent_type)` syntax — when used in main Claude's tools allowlist, it restricts *which* subagents main Claude can spawn (e.g., `tools: Read, Write, Agent(monitor)` lets main spawn only the `monitor` subagent). Worth distinguishing this from the (still correct) rule that subagents themselves cannot list Agent in their own tools.

---

## 🟡 NUANCE #3 — Skill frontmatter coverage is too thin for a system-of-record doc

**Location:** Section 6 ("How Invocation Actually Works") and the discussion of `context: fork`.

The doc covers `context: fork`, `agent:`, and the backtick-bang syntax. For "system of record" completeness, also cover the other commonly used skill frontmatter fields:

| Field | Purpose |
| --- | --- |
| `disable-model-invocation: true` | Skill can only be triggered manually via `/skill-name`; Claude will never auto-invoke it. Critical for skills with side effects (deploys, sends, pushes). |
| `user-invocable: false` | Inverse — skill is available for Claude to use but doesn't appear in the slash menu for the user. Good for "background knowledge" skills. |
| `allowed-tools` | Explicit allowlist of tools the skill is permitted to use when active. |
| `model` | Override model for the skill's execution (e.g., `model: opus` for a deep-analysis skill). |
| `shell` | Specify shell for `!` command blocks (`bash` default, `powershell` for Windows). **Briggsy-relevant: this is the field for your Windows machine if you ever use dynamic context injection.** |
| `argument-hint` | Improves the slash-menu autocomplete by showing expected arguments (e.g., `"<pr-number> <priority>"`). |
| `version` | Metadata for tracking skill versions. |
| `mode: true` | Categorizes skill as a "mode command" (debug-mode, expert-mode, review-mode); appears in a separate section of the skills list. |

Add a short "Skill Frontmatter Reference" subsection in Section 6 covering these. Also explicitly note that **`$ARGUMENTS`** captures everything after the command name as a single string, while **`$0`, `$1`, `$2`** capture individual space-separated tokens. The doc mentions `$ARGUMENTS` in passing but doesn't formally define it.

---

## 🟡 NUANCE #4 — Add a version note for `context: fork`

**Location:** Throughout — but especially Section 5 (Decision Framework) and Section 6 (Invocation).

`context: fork` is a **Claude Code 2.1** feature. Skills that predate 2.1 don't have it. Worth a one-sentence acknowledgment somewhere ("`context: fork` shipped in Claude Code 2.1; older Claude Code versions don't support it") so readers on older versions don't bash their heads against the wall.

Also note the bug captured in **GitHub Issue #17283**: there has been a known issue where `context: fork` is *ignored* when a skill is invoked via the Skill tool directly (vs. when triggered by description matching). Worth a footnote or a "known issues" mention so the doc doesn't read as if `context: fork` is bulletproof.

---

## 🟡 NUANCE #5 — Slash commands and skills have merged

**Location:** Section 3 (What a Skill Actually Is) or Section 6 (Invocation).

Worth one explicit paragraph: **custom slash commands have been merged into skills.** A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and behave identically. Existing `.claude/commands/` files keep working. Skills are the recommended forward path because they support frontmatter control, supporting files, and auto-invocation. If both exist with the same name, the skill takes precedence.

This is documented on the official Claude Code skills page and worth including because a lot of people still mentally separate "slash commands" from "skills" and design accordingly.

---

## 🟢 ENHANCEMENT #1 — Add a "Built-in Subagent Types" reference table

**Location:** New subsection in Section 2.3 (Subagent Instance) or in Section 5 (Decision Framework).

Per the official Claude Code subagents docs, the built-in subagent types are:

| Built-in Subagent | Model | Tools | Purpose |
| --- | --- | --- | --- |
| `Explore` | Inherits | Read-only (search, glob, grep) | Fast, read-only codebase search/analysis. Used by `context: fork` skills doing exploration. |
| `Plan` | Inherits | Read-only | Codebase research during plan mode (prevents infinite nesting since subagents can't spawn). |
| `general-purpose` | Inherits | All tools | Multi-step exploration + action; the default fallback. |
| `Bash` | Inherits | Bash | Terminal commands in separate context. |
| `statusline-setup` | Sonnet | Limited | Used by `/statusline` configuration. |
| `Claude Code Guide` | Haiku | Limited | Answers questions about Claude Code itself. |

Including this table makes the doc more useful as a reference and explicitly grounds claims like "agent: Explore" in something readers can map to.

---

## 🟢 ENHANCEMENT #2 — Add SendMessage tool to the Glossary

**Location:** Section 8 (Glossary).

The `SendMessage` tool is how you resume an existing subagent (vs. spawning a fresh one). It's only available when `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set. Worth a glossary entry since the doc already covers Agent Teams and resumption is a real and useful capability. When a subagent completes, Claude receives an agent ID; `SendMessage` with that ID as `to` resumes with full prior context.

---

## 🟢 ENHANCEMENT #3 — Strengthen the "Adjacent Confusions" list

**Location:** End of Section 2 (Quick Reference Table → Adjacent Confusions).

The current list (MCP servers, ChatGPT/Claude Agents product names, Agent Teams) is good. Two more worth adding:

- **Hooks.** Mentioned in passing but never disambiguated. Hooks are event-driven automations (`PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, etc.) that fire on lifecycle events. They're *not* agents, *not* skills, *not* subagents — they're a separate Claude Code mechanism. Worth one line distinguishing them.
- **Plugins.** Anthropic ships and supports plugins as bundles of skills + agents + hooks + commands + MCP servers. A plugin is a *distribution unit*, not a primitive. Useful to call out so readers understand "should this be a plugin?" is a packaging question, not an architectural one.

---

## 🟢 ENHANCEMENT #4 — Consider adding a Mermaid diagram of the worker/playbook relationships

**Location:** Section 3 (worker/playbook model).

Per the editorial pattern Briggsy has used elsewhere in this research collection (Mermaid diagrams for portability across GitHub, Obsidian, and VS Code), this section would land harder with a diagram showing:

```
[Main Claude] --reads--> [SKILL.md (loaded into context)]
     |
     | --calls Agent tool--> [Subagent Instance]
                                  |
                                  | --preloads (via skills: field)--> [SKILL.md (injected at spawn)]
                                  | --filesystem discovery--> [Other skills in .claude/skills/]
```

A second diagram showing parallel fan-out (orchestrator skill → main Claude → 3 parallel Agent calls → 3 subagents → 3 summaries → main) would make the parallelism mechanics undeniable. Section 6's current prose explanation is good but a picture would solidify it.

---

## 🟢 ENHANCEMENT #5 — Add a "When the docs lie to you" footer

**Location:** End of Section 7 (Misconceptions) or as a new short Section 7.5.

Misconception 8 already acknowledges that Anthropic's own docs use "subagent" to mean both file and instance. Worth expanding into a short "what to watch for in the official docs" survival guide:

- Look for "subagent" in the same paragraph as both "file" and "spawn" — it almost certainly means both definition and instance simultaneously.
- "Agent" alone almost always means the concept; "the Agent tool" means the specific tool; "an agent definition" means the file.
- "Claude Code SDK" in older docs = "Claude Agent SDK" today (renamed September 2025).
- "Task tool" in older examples = "Agent tool" today (renamed in 2.1.63, both still work).

This is the kind of survival metadata that makes a doc genuinely useful as a reference.

---

## 📋 Quick Fix Checklist

Sortable, actionable summary for when Briggsy is ready to merge changes:

- [ ] **CRITICAL:** Replace step 4 in Section 3's invocation list ("dropped from context")
- [ ] **CRITICAL:** Add Misconception 9 covering the same point with full evidence
- [ ] **CRITICAL:** Fix Microsoft attribution — quote is from `microsoft/skills-for-fabric`, not `microsoft/skills`
- [ ] **NUANCE:** Add filesystem-discoverability qualifier to Misconception 1
- [ ] **NUANCE:** Expand subagent frontmatter table OR add explicit "see official docs for complete list"
- [ ] **NUANCE:** Add skill frontmatter reference (disable-model-invocation, allowed-tools, model, shell, argument-hint, version, mode)
- [ ] **NUANCE:** Add version note that `context: fork` is a Claude Code 2.1 feature
- [ ] **NUANCE:** Add the "slash commands have merged into skills" paragraph
- [ ] **ENHANCEMENT:** Built-in subagent types table (Explore, Plan, general-purpose, Bash, etc.)
- [ ] **ENHANCEMENT:** SendMessage glossary entry
- [ ] **ENHANCEMENT:** Add Hooks and Plugins to "Adjacent Confusions"
- [ ] **ENHANCEMENT:** Mermaid diagrams for worker/playbook and parallel fan-out
- [ ] **ENHANCEMENT:** "When the docs lie to you" survival guide

---

## Closing Note

The doc's core thesis — that the word "agent" carries four distinct loads and conflating them produces broken architecture — is correct, well-argued, and genuinely useful. None of the proposed changes touch that thesis. They sharpen the technical claims supporting it and patch the specific factual errors that would otherwise let a hostile reader dismiss the whole doc on a fact-check.

The single most important fix is the "dropped from context" claim. It's the kind of quietly wrong statement that propagates because it sounds plausible and reinforces the (also wrong) intuition that progressive disclosure means automatic cleanup. Killing that misconception in this doc could save hundreds of downstream readers from designing context-management patterns that don't actually work.

Once these changes are in, this doc will be the cleanest "what is what and how do they actually compose" reference in the Claude Code documentation orbit — including, in several places, sharper than Anthropic's own published docs.

— end of review —
