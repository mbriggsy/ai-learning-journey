# Analysis: Skills Documentation Consolidation

**Status:** Phase 1 deliverable — awaiting Phase 2 design decisions
**Produced:** April 16, 2026
**Inputs:** `Claude_Skills_2.0_User_Guide.md` (v2.1, 1110 lines), `Skill_Creator_Practitioners_Guide.md` (v1.0, 697 lines), `Skills_Agents_and_Subagents_Oh_My.md` (v1.1, 565 lines)
**Purpose:** Surface every decision the consolidation needs to make, with line citations. No edits made to any source doc.

Shorthand used throughout:
- **UG** = `Claude_Skills_2.0_User_Guide.md`
- **SCG** = `Skill_Creator_Practitioners_Guide.md`
- **SAS** = `Skills_Agents_and_Subagents_Oh_My.md`

---

## Table of Contents

1. [Redundancy catalog](#1-redundancy-catalog)
2. [Voice comparison](#2-voice-comparison)
3. [Diagram inventory](#3-diagram-inventory)
4. [Gap analysis](#4-gap-analysis)
5. [Inconsistency catalog](#5-inconsistency-catalog)
6. [Cross-link opportunities](#6-cross-link-opportunities)
7. [Proposed collection architecture](#7-proposed-collection-architecture)
8. [Cross-cutting themes](#8-cross-cutting-themes)
9. [Summary of decisions needed from Phase 2](#9-summary-of-decisions-needed-from-phase-2)

---

## 1. Redundancy Catalog

Every concept that appears in multiple docs. For each: current locations, proposed canonical home, and what stays elsewhere as a cross-reference.

### 1.1 "Don't Build Agents, Build Skills Instead" thesis

| Doc | Lines | Treatment |
|-----|-------|-----------|
| UG | 1000–1006 | Framed as "the MCP playbook, again" — Anthropic's strategic move. Zhang/Murag not cited by name here. |
| SCG | 595–609 | Talk attribution (Zhang/Murag, Nov 2025). Microsoft echo. Bridge from "Level 0 vibes" to engineered skills. |
| SAS | 21, 236–270 | Fullest architectural treatment. Core claim. Microsoft echo (lines 254–260). Four architectural implications (lines 263–269). |
| SAS | 543–548 | Primary-source citation for the talk itself (Appendix A). |

**Redundancy:** The thesis is stated in substantially different framings (strategy / engineering rigor / architecture), but the *fact* of the thesis is restated three times. Microsoft's "Agents are built on top of skills" quote appears in SCG (line 568 and 601) **and** SAS (line 257) — the same content twice within SCG, once more in SAS.

**Proposed canonical home:** SAS §4 (architectural treatment is the richest). UG §18 and SCG §16 retain their contextual angles but link to SAS §4 for the canonical statement; drop the Microsoft echo from both UG and SCG and keep it only in SAS.

### 1.2 Skill Creator (the meta-skill itself)

| Doc | Lines | Treatment |
|-----|-------|-----------|
| UG | 643–687 | Section 11: compressed overview. ASCII core loop (lines 649–667), "what it includes" bullet list, where-it-works matrix (lines 681–685). |
| SCG | All | The entire 697-line doc is the expanded treatment. |

**Redundancy:** UG §11 is a small version of SCG. The ASCII core loop in UG (lines 649–667) becomes a Mermaid diagram in SCG §3 (lines 128–149). The "where it works" matrix in UG (lines 681–685) is a subset of the SCG §13 matrix (lines 534–544).

**Proposed canonical home:** SCG. Shrink UG §11 to a ~5-line stub with a pointer.

### 1.3 `context: fork` mechanic

| Doc | Lines | Treatment |
|-----|-------|-----------|
| UG | 282 | Deploy example uses it (no explanation). |
| UG | 494, 1062 | Frontmatter reference entry + cheat sheet entry. |
| UG | 562–589 | §10 "Running Skills in a Subagent" — feature explainer, agent types, "not for reference-only" warning, Skills+Subagents two-directions table. |
| UG | 909 | DON'T bullet. |
| UG | 1092 | Glossary entry. |
| SAS | 137–143 | Built-in subagent types table (referenced by `agent:` field). |
| SAS | 293–302 | §5 "When to add `context: fork`" — the decision half. |
| SAS | 397–406 | §6 "`context: fork` Mechanics" — runtime mechanics + version note + Skill-tool limitation + issue `#17283`. |
| SAS | 446–450 | Misconception 3: does NOT enable parallelism. |
| SAS | 482 | Misconception 9: the one case that approximates "unloading." |
| SAS | 519 | Glossary. |

**Redundancy:** Heavy. Three glossary-style entries (UG, SAS, cheat sheet). Three decision-level treatments (UG §10, SAS §5, plus UG cheat sheet). Two mechanics treatments that disagree in depth (UG §10 surface, SAS §6 nuanced).

**Proposed canonical home:** Split by purpose.
- **How to use it** → UG §10 (keep; add cross-link to SAS §6 limitations).
- **Runtime mechanics + limitations** → SAS §6 canonical.
- **Decision criteria** → SAS §5 canonical; UG §10 trims to feature explainer with "see SAS §5 for when to reach for this."

### 1.4 Skills = Slash Commands unification

| Doc | Lines | Treatment |
|-----|-------|-----------|
| UG | 97–103 | §2: Announcement. Claude Code v2.1.3, January 24, 2026. Precedence rule. |
| UG | 366–368 | §7: "Legacy Commands Compatibility" — duplicates precedence + no-migration claim. |
| SAS | 227–232 | §3 "Slash Commands Are Skills Too" — duplicates date, version, precedence, directory conventions. |

**Redundancy:** Three near-identical statements of the same fact. UG states it twice within its own doc.

**Proposed canonical home:** UG §2 (it's a core concept). UG §7 drops the duplication. SAS §3 trims to one sentence + cross-link.

### 1.5 Progressive disclosure (three-tier loading)

| Doc | Lines | Treatment |
|-----|-------|-----------|
| UG | 77–89 | §2 primary treatment: three-tier table (metadata / body / resources), 2%/16K budget, `/context`, `SLASH_COMMAND_TOOL_CHAR_BUDGET`. |
| UG | 1085 | Glossary entry. |
| SAS | 186, 198 | §3 brief treatment; references UG. Line 198 adds "context is append-only" — critical qualifier. |
| SAS | 478–487 | Misconception 9: what progressive disclosure is NOT (post-task unloading). 25K-token compaction budget. Issues `#14882`, `#45091`. |

**Redundancy:** Low. UG §2 is the how. SAS Misconception 9 is the corrective. They complement but are not cross-linked.

**Proposed canonical home:** UG §2 for concept, SAS §7 M9 for corrections. Add mutual cross-links.

### 1.6 Triggering / description matching / invocation paths

| Doc | Lines | Treatment |
|-----|-------|-----------|
| UG | 91–95 | §2: description-driven triggering, "under-trigger" nuance, descriptions must be "pushy." |
| UG | 183–213 | §4: runtime sequence + two invocation paths (automatic, manual). |
| UG | 432–449 | §8: bad/good description example. |
| UG | 502–506 | §9: invocation control matrix (three frontmatter states). |
| UG | 944–950 | §17: troubleshooting — skill not triggering. |
| SAS | 350–358 | §6: four invocation paths (slash, auto-trigger, called-by-another-skill, preloaded-via-subagent). |
| SAS | 378 | §6: "routing text" framing for subagent description matching. |
| SCG | 156 | §3: "descriptions should be 'pushy' — Claude under-triggers by default." |
| SCG | 405–452 | §10: entire phase on description optimization (train/test split, iteration cap). |

**Redundancy:** Low–moderate. Each doc's treatment is from a different angle (design / runtime / engineering). "Pushy description" phrasing recurs (UG line 96, SCG line 156).

**Proposed canonical home:** UG §2 for concept, UG §8 for writing descriptions, SAS §6 for invocation mechanics, SCG §10 for optimization methodology. Consolidate the "pushy" talking point to one authoritative mention with cross-refs.

### 1.7 Capability Uplift vs Workflow/Preference skill taxonomy

| Doc | Lines | Treatment |
|-----|-------|-----------|
| UG | 234–257 | §5 primary treatment with examples. |
| UG | 1010–1016 | §18 "Planning Your Skill Investments" — restates the same taxonomy with minor additional framing ("retire capability skills as models improve"). |
| UG | 1088–1089 | Glossary. |

**Redundancy:** Within a single doc. §18 reasonably adds strategic framing but largely repeats §5.

**Proposed canonical home:** UG §5 canonical; §18 trims to the strategic insight only, without re-enumerating the examples.

### 1.8 Real-world example skills (deploy, PR summary, etc.)

| Doc | Lines | Treatment |
|-----|-------|-----------|
| UG | 277–288 | §5 deploy example. |
| UG | 373–418 | §8 meeting-notes step-by-step (distinct — not duplicated). |
| UG | 538–557 | §10 PR summary with dynamic injection. |
| UG | 713–726 | §12 Example 2: deploy — near-duplicate of §5 deploy. |
| UG | 747–765 | §12 Example 4: PR summary — near-duplicate of §10 PR summary. |
| SCG | 210–251 | Draft PR review skill (richer than UG PR summary, includes review checklist). |

**Redundancy:** Within UG itself. Deploy shown twice (§5 and §12). PR summary shown twice (§10 and §12), then again as a richer "review-pr" draft in SCG §6.

**Proposed canonical home:** Dedupe within UG — §12 drops deploy and PR-summary duplicates, or §5/§10 strip to pure explanation with §12 holding canonical examples. SCG's review-pr skill is a *different* example (review, not summary) and stays distinct.

### 1.9 Best practices / pitfalls (DO / DON'T)

| Doc | Lines | Treatment |
|-----|-------|-----------|
| UG | 886–910 | §15: 9 DOs and 8 DON'Ts — skill design. |
| SCG | 572–592 | §15: 7 DOs and 6 DON'Ts — skill engineering. |

**Overlap** (same-substance bullets across the two sections):
- "Keep test prompts realistic" (UG line 893 / SCG line 578)
- "Commit evals alongside skill" (SCG line 581) vs "version in Git" (UG line 896)
- "Don't skip examples" (UG line 905) vs "include examples" implied across SCG
- "Reasoning beats rigid commands" (UG line 893 / SCG line 386 in §9, and both lists)
- "Don't make descriptions vague/too broad" (UG line 902 / SCG line 589)

**Redundancy:** Low. Each doc's DO/DON'T leans on its own frame (design vs engineering). Bullets that recur are largely complementary, not repetitive.

**Proposed canonical home:** Preserve both. UG §15 stays design-focused; SCG §15 stays engineering-focused. Remove only verbatim duplicates.

### 1.10 Environment matrix (Claude Code / Claude.ai / Cowork)

| Doc | Lines | Treatment |
|-----|-------|-----------|
| UG | 681–685 | 3-row matrix: Claude Code / Claude.ai / Cowork, coarse-grained. |
| SCG | 534–544 | 8-row matrix: same three environments, feature-by-feature. |

**Redundancy:** UG matrix is a subset of SCG matrix.

**Proposed canonical home:** SCG §13. UG §11 stub drops the matrix.

### 1.11 Glossary entries

| Doc | Lines | Entries |
|-----|-------|---------|
| UG | 1078–1094 | Appendix A — 13 entries: Skill, SKILL.md, Frontmatter, Progressive Disclosure, Triggering, .skill file, Capability Uplift Skill, Workflow/Preference Skill, Bundled Skill, Subagent, Context fork, Agent Skills Spec, MCP. |
| SAS | 513–528 | §9 — 13 entries: Agent (concept), Agent SDK, Agent tool, Agent Teams, `context: fork`, Hook, MCP, Plugin, Skill, `skills:` field, Subagent definition, Subagent instance, Task tool. |

**Overlapping terms:** Skill (both), MCP (both), `context: fork` (both), Subagent (UG one entry; SAS splits into definition + instance).

**Complementary terms:** SAS holds the agent-related entries (Agent concept/SDK/tool/Teams, Plugin, Hook, skills: field, definitions vs instances). UG holds the skill-lifecycle entries (SKILL.md, frontmatter, progressive disclosure, .skill file, capability/workflow taxonomy, bundled, Agent Skills Spec).

**Tension on overlapping terms:** Definitions are close but not identical. Example — "Skill":
- UG: "A directory containing SKILL.md and optional supporting resources" (line 1082).
- SAS: "A folder containing SKILL.md plus optional resources. Packaged instructions that agents load on demand. Portable across 30+ platforms" (line 523).

SAS's definitions tend to be more precise and architecturally framed. UG's are shorter.

**Proposed canonical home:** Merge into a single canonical glossary, likely in a new hub README. Source the architectural terms from SAS, the lifecycle terms from UG.

### 1.12 Enterprise / organizational skill provisioning

| Doc | Lines | Treatment |
|-----|-------|-----------|
| UG | 322 | §6: "For Team and Enterprise plans, organization Owners can provision skills for all users." |
| UG | 352 | §7 storage table: "Enterprise — Managed settings — All users in org — Highest." |
| UG | 864–867 | §14 distribution scope: "Managed — Deploy via managed settings — Org-wide." |
| UG | 935 | §16 security mitigations: "Use org provisioning to control available skills." |
| SCG | 510–514 | §12 Enterprise Scale Problem: governance is process-based (no centralized admin testing). |

**Redundancy:** Moderate. UG states "org provisioning" four times from four angles (Claude.ai feature / storage precedence / distribution channel / security mitigation) without ever cross-linking them. SCG adds the governance-gap caveat.

**Proposed canonical home:** UG §6 or §14 as the feature explainer; SCG §12 as the governance perspective. Cross-link rather than dedupe — the four UG mentions serve different purposes in their sections.

### 1.13 Microsoft / Fabric / 130+ skills citation

| Doc | Lines | Treatment |
|-----|-------|-----------|
| SCG | 568 | "Microsoft's adoption validates the entire ecosystem — their `microsoft/skills` repo (134 skills…) and `microsoft/skills-for-fabric`… 'Agents are built *on top of* skills.'" |
| SCG | 601 | "Microsoft published 134 skills following the Agent Skills spec, explicitly documenting that agents are orchestrators built *on top of* skills." |
| SAS | 254–260 | §4 "The Microsoft Echo" — enumerates four Microsoft repos, same quote. |

**Redundancy:** Three mentions of the same fact across two docs. SCG mentions it twice within itself.

**Proposed canonical home:** SAS §4. Drop from both SCG locations (or keep one SCG mention as a pointer).

### 1.14 Sentence-level near-duplicates

Beyond concept-level repetition, specific sentences are near-copies across docs. A teammate reading the collection front-to-back sees each of these twice or more.

| # | Phrase / Claim | Locations |
|---|----------------|-----------|
| a | "If a skill and a command share the same name, the skill takes precedence." | UG line 103, UG line 367, SAS line 230 |
| b | "Descriptions need to be somewhat 'pushy' — Claude under-triggers by default." | UG line 95, SCG line 156 |
| c | "Agents are built *on top of* skills." (Microsoft quote) | SCG line 568, SCG line 600, SAS line 257 |
| d | "Keep SKILL.md under 500 lines." | UG line 459, UG line 904 (DON'T variant: "Don't dump everything in SKILL.md") |
| e | "Don't skip examples. / Include examples." | UG line 458, UG line 905, SCG (implicit throughout §9) |
| f | "Skills do not auto-unload when their task completes." / "context is append-only." | SAS line 198, SAS lines 478–487 (Misconception 9) |

**Pattern:** Each of these is stated in good faith within its local context but reads as repetition to a linear reader. The fix is one canonical sentence + cross-links. Entries (a)–(c) are the most glaring because the exact wording is nearly identical.

---

## 2. Voice Comparison

Three representative paragraphs per doc, chosen to capture each voice at its most distinctive.

### 2.1 UG voice — expansive, industry-framing, strategic

From UG lines 7–11:
> "The industry is converging on a vision that would have sounded absurd 18 months ago: a single general-purpose agent runtime that loads different skill libraries on demand. Instead of building a coding agent, a research agent, a data analysis agent, and a customer service agent as separate products, you build one agent and give it different skills for different jobs."

From UG lines 972–973:
> "Most coverage of Skills 2.0 focuses on the Claude Code developer experience — and rightfully so, the `context: fork`, dynamic injection, and bundled skills are genuinely impressive engineering. But that's one chapter of a much larger story. To really understand what's happening here, you need to zoom out."

From UG line 25 (closing of executive summary):
> "Whether you're a solo dev building a PR reviewer or an enterprise admin provisioning workflows for 10,000 employees, Skills are how you stop repeating yourself and start compounding your expertise."

**Voice signature:** Industry-level framing. "The industry is converging." "Zoom out." "Compounding." Addresses the reader as a strategist.

### 2.2 SCG voice — practitioner, engineering-discipline, sleeves-rolled

From SCG lines 50–52:
> "Here's a scenario that plays out thousands of times a day: someone writes a SKILL.md file, tries it a couple times, says 'looks good,' and ships it. Three weeks later, a teammate uses it on a slightly different input and it produces garbage. Or the model updates and the skill's carefully tuned phrasing stops working."

From SCG line 63:
> "The analogy to software engineering is exact: you wouldn't ship code without tests. You shouldn't ship skills without evals."

From SCG line 605:
> "This task is pretty important (we are trying to create billions a year in economic value here!) and your thinking time is not the blocker."

**Voice signature:** Concrete scenarios ("someone writes a SKILL.md, tries it a couple times, says 'looks good,'"). Engineering-discipline framing ("you wouldn't ship code without tests"). Pragmatic and slightly combative toward vibes-based work.

### 2.3 SAS voice — pointed, corrective, taxonomic

From SAS lines 9–11:
> "'Agent' is the most overloaded word in AI right now. Inside a single Anthropic product — Claude Code — it can mean at least four distinct things… These four meanings aren't synonyms. They're different layers of the stack, and collapsing them leads to architectural choices that don't survive contact with reality."

From SAS lines 429–432 (Misconception 1):
> "**FALSE.** A spawned subagent instance starts with a clean context. It does not inherit the skills the parent had loaded into its working context.
>
> **What's actually true:** Subagent definitions have a `skills:` field in their frontmatter…"

From SAS line 59:
> "If you think subagents inherit skills from their parent, but they don't, your orchestration pattern will silently fail — the subagent will have no idea the skill exists."

**Voice signature:** Precision-first. Direct verdicts ("FALSE.", "AMBIGUOUS — needs precision."). Names the failure mode before naming the fix. Reader is treated as someone about to make a mistake the doc is here to prevent.

### 2.4 Normalization recommendation

Three options:

**Option A — Preserve all three voices as intentional signatures.** Each voice matches its doc's purpose: strategic framing needs expansive voice; engineering rigor needs procedural voice; terminology correction needs pointed voice. Normalize only surface mechanics (heading levels, callout syntax, footer format).

**Option B — Partial normalization.** Unify intros/executive summaries to a common pattern (same structure, same length range, same "tl;dr → what's in this doc → who it's for"). Preserve body voice differences.

**Option C — Full homogenization.** One voice across all. Risk: loses character, makes each doc less distinctive on its own. Likely violates Briggsy's CLAUDE.md guidance: *"Preserve voice, tone, and structure of the source docs where appropriate — don't 'improve' prose into something blander or generic."*

**Recommendation:** Option A, optionally with B's intro normalization. The voices are doing actual work; flattening them costs reader trust.

---

## 3. Diagram Inventory

Current state: one Mermaid diagram total, at SCG lines 128–149 (the Skill Creator core loop). Below are candidate additions, prioritized.

### High priority

**3.1 Progressive disclosure — three-tier loading flow**

- **Home:** UG §2 (companion to the existing table at lines 81–88).
- **Type:** Flowchart showing context-budget flow across turns.
- **Communicates:** *When* each tier loads, not just *what*. The prose table says "loaded when skill triggers"; a diagram shows the user message → description scan → body load → supporting-file reference sequence.
- **Why prose alone is insufficient:** Readers routinely misunderstand this as "the whole skill loads when triggered." Visual reinforces that `references/` only load when the skill's body references them at a specific moment.

**3.2 Four meanings of "agent" — layered architecture**

- **Home:** SAS §2 (before or after the quick-reference table at lines 164–169).
- **Type:** Layered architecture diagram. Bottom layer: Concept (LLM-in-a-loop). Above it: Agent SDK (library). Above that: Claude Code runtime. Two artifacts plugged into the runtime: Subagent Definition (config file) and Subagent Instance (spawned child).
- **Communicates:** These are *different layers*, not different flavors of the same thing.
- **Why prose alone is insufficient:** The whole doc hinges on teammates *seeing* the layering. The table at lines 164–169 is good but ordinal; a diagram shows adjacency and containment.

**3.3 Skill invocation sequence (main path)**

- **Home:** UG §4 (replaces or augments the ASCII sequence at lines 187–203).
- **Type:** Sequence diagram. Actors: User, Main Claude, Skill Files, Tools.
- **Communicates:** The seven-step runtime sequence with explicit control returning to main Claude at each step.
- **Why prose alone is insufficient:** The ASCII diagram at UG lines 187–203 is readable but doesn't show that control never leaves main Claude — a common misconception. Sequence diagrams force that explicit.

**3.4 Parallel fan-out**

- **Home:** SAS §6 (companion to the code block at lines 387–392).
- **Type:** Flowchart. Orchestrator skill → Main Claude (one turn) → N Agent tool calls → N concurrent subagents → N summaries returning to Main Claude.
- **Communicates:** Parallelism requires main Claude emitting multiple tool calls in a single turn. The skill is not doing the spawning.
- **Why prose alone is insufficient:** Misconception 3 (SAS lines 446–450) is still misunderstood in the wild. Visual shows the distinction between "skill tells Main Claude what to do" and "main Claude does the spawning."

### Medium priority

**3.5 Storage hierarchy / skill precedence**

- **Home:** UG §7 (companion to the table at lines 351–356).
- **Type:** Tree with precedence arrows — Enterprise → Personal → Project → Plugin (namespaced).
- **Communicates:** Conflict resolution when skills share names across levels.
- **Why prose alone is insufficient:** The "Priority" column in the existing table is terse and easy to miss. Visual makes the resolution path explicit.

**3.6 Decision framework — primitive selection**

- **Home:** SAS §5 (companion to the decision table at lines 324–332).
- **Type:** Decision tree. Root: "What are you building?" → branches for skill / skill+fork / subagent definition / Agent SDK / hook.
- **Communicates:** The decision at a glance.
- **Why prose alone is insufficient:** A table is two-dimensional; a decision tree captures precedence of questions (portability first? isolation first? parallelism first?).

**3.7 Skills + subagents — two directions**

- **Home:** UG §10 (replaces or augments the table at lines 584–589).
- **Type:** Side-by-side architecture comparison. Left: skill with `context: fork`. Right: subagent definition with `skills:` field.
- **Communicates:** The two paths to "run in isolation with a playbook" and which configuration yields which behavior.
- **Why prose alone is insufficient:** The existing table has four columns but no visual of *where the SKILL.md content lands* in each case.

### Low priority / skip

**3.8 Three-surface strategy (UG §18).** Could be a Venn or three-panel. Prose handles it adequately at UG lines 988–998.

**3.9 Maturity model staircase (SCG §12).** Already a table (lines 518–524). Staircase would be decoration.

**3.10 Skill file structure tree (UG §3 / SCG §2).** Currently in ASCII (UG lines 149–162, SCG lines 89–112). ASCII is readable and searchable; formal tree diagram adds little.

### Summary

**Recommend adding 4 diagrams (high priority) + up to 3 medium-priority.** Skip the low-priority set. Upper bound: 7 diagrams total across the collection.

---

## 4. Gap Analysis

Concepts a system of record needs but the collection currently underserves. Prioritized by how often a teammate will hit the gap.

### 4.1 Plugin packaging [HIGH]

- **Current coverage:** UG line 354 (plugin path in storage table), UG line 864 (one-row distribution scope), SAS lines 179, 522 (adjacent-confusion + glossary).
- **Missing:** Plugin manifest structure, `.claude/plugins/` layout, what a plugin bundles (skills + subagent definitions + hooks + commands + MCP servers — SAS line 179 hints but doesn't elaborate), publishing to a marketplace, `/plugin marketplace` command, enabling/disabling, skill namespacing within plugins (the `plugin-name:skill-name` convention is mentioned once in UG line 357 with no elaboration).
- **Load-bearing:** A teammate who wants to distribute a bundle of skills to their team hits this gap immediately.
- **Fix scope:** A new section (candidate home: UG §14 expansion, or a new dedicated doc).

### 4.2 Hooks relationship to skills [HIGH]

- **Current coverage:** UG line 496 (`hooks` frontmatter field — one sentence: "Hooks scoped to this skill's lifecycle"), SAS lines 178, 333, 520 (adjacent-confusion + decision-table row + glossary). SAS line 333 says "Hooks (not covered here)."
- **Missing:** Hook event list (`PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreCompact`, `Notification`, `SubagentStop`). How a `hooks:` field on a skill differs from a top-level hook configured in `settings.json`. When to use a hook vs a skill (SAS §5 decision table says "autonomous behavior → Hooks" but doesn't explain).
- **Load-bearing:** "My skill needs to run when X happens" is a common request; teammates currently have to leave the collection to answer it.
- **Fix scope:** New subsection under UG §10 (Advanced Patterns) or a dedicated section. SAS §5 decision table gets a cross-link, not a full treatment.

### 4.3 MCP vs skills at depth [MEDIUM]

- **Current coverage:** UG line 1094 glossary, UG line 311 (partner skills with MCP connectors), SAS lines 175, 462–464, 521 (adjacent-confusion, Misconception 6, glossary).
- **Missing:** When to expose a capability via MCP vs package as a skill. How they compose (a skill can invoke MCP tools from the agent it's loaded into). MCP server frontmatter field on subagent definitions (SAS line 97 mentions `mcpServers` on definitions but without cross-link to MCP concept).
- **Load-bearing:** Any teammate integrating an external system will ask this.
- **Fix scope:** Short subsection in either UG or SAS. Probably belongs in SAS as a "related primitive" expansion.

### 4.4 How Claude actually scans available skills [MEDIUM]

- **Current coverage:** UG §7 lines 360–364 (auto-discovery, nested `.claude/skills/`, `--add-dir`). UG §17 line 959 (character budget can exclude skills).
- **Missing:** The exact scan order. What "in context" means for skill metadata. How budget allocation decides which skills get loaded when total exceeds 2%/16K. Whether project skills always beat user skills in scanning order.
- **Load-bearing:** "Why didn't my skill load?" is the most common debugging question.
- **Fix scope:** Expand UG §4 or §17 by ~15 lines.

### 4.5 Environment variables affecting skill behavior [LOW]

- **Current coverage:** UG line 89 (`SLASH_COMMAND_TOOL_CHAR_BUDGET`), SAS line 177 (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`).
- **Missing:** A consolidated list. `CLAUDE_SESSION_ID` and `CLAUDE_SKILL_DIR` are covered in UG §9 but as string substitutions, not env vars.
- **Fix scope:** An appendix or glossary note. Optional.

### 4.6 Live-reload semantics [LOW]

- **Current coverage:** UG line 363 ("live change detection" for `--add-dir`).
- **Missing:** Whether other skill locations hot-reload. What state is preserved when a skill changes mid-session. Whether frontmatter changes require restart.
- **Fix scope:** One paragraph in UG §7. Optional.

### 4.7 Skill security model / PreToolUse audit pattern [LOW]

- **Current coverage:** UG §16 (lines 913–939) at surface level.
- **Missing:** The `disallowedTools: Skill(skill-name)` syntax (mentioned only in SAS line 93 and line 436 for subagent definitions — no cross-link from UG §16). PreToolUse hook pattern for skill auditing.
- **Fix scope:** 5–10 lines cross-linking UG §16 ↔ SAS §2 ↔ Hooks treatment.

### 4.8 Agent Teams (experimental) [LOW]

- **Current coverage:** SAS line 177 (one mention).
- **Missing:** How skills interact with Agent Teams. This is explicitly experimental — likely defer.
- **Fix scope:** Flag as "out of scope for this pass."

### 4.9 `memory:` field and subagent state [MEDIUM]

- **Current coverage:** SAS line 98 — one sentence: "Enables a persistent `MEMORY.md` file for this subagent. First 200 lines injected at startup; the subagent can read/write/curate it across sessions."
- **Missing:** How subagent memory interacts with skills preloaded via `skills:`. Whether a skill can read/write that MEMORY.md. The project-level `memory/` directory convention (the auto-memory system the current session itself uses) is nowhere in the collection, even though it's an adjacent primitive teammates will hit.
- **Load-bearing:** Any long-running specialist subagent ends up wanting memory; the collection currently gives them one line.
- **Fix scope:** Either expand SAS §2.2 by ~15 lines with cross-reference to skills, or flag explicitly as "see official docs for the memory primitive."

### 4.10 The `--agent` flag: running a subagent as the main session [LOW]

- **Current coverage:** SAS line 96 (passing mention: "do *not* fire when the subagent is run as the main session via `--agent`"). SAS line 103 mentions `initialPrompt` tied to this mode.
- **Missing:** The mechanics of `--agent` as a launch mode. How a subagent behaves when it's the top-level session rather than a spawned child. Whether skills declared in its `skills:` field still preload.
- **Fix scope:** One paragraph in SAS §2.2, or flag as "defer to official docs."

### 4.11 Skill testing without the Skill Creator [LOW / OUT OF SCOPE]

- **Current coverage:** SCG treats the Anthropic tool only.
- **Missing:** CI/CD integration, manual eval patterns.
- **Fix scope:** PRD §5 excludes "building tooling around the docs." Defer.

### 4.12 Gap-fill priority summary

**Fix in this pass:** 4.1 (plugins), 4.2 (hooks), 4.3 (MCP depth), 4.4 (skill scanning), 4.9 (`memory:` field).
**Defer or cross-link only:** 4.5, 4.6, 4.7, 4.8, 4.10.
**Explicitly out of scope:** 4.11.

---

## 5. Inconsistency Catalog

Subtle conflicts and completeness gaps between docs. Each entry flagged as **conflict** (the docs disagree) or **gap** (one doc omits what another carries).

### 5.1 Built-in subagent types count [gap]

- UG §10 line 579: "`Explore` (read-only codebase exploration), `Plan` (planning mode), `general-purpose` (full capabilities), or any custom subagent from `.claude/agents/`." → **3 named**.
- SAS §2 lines 135–144: enumerates **5** — `Explore`, `Plan`, `general-purpose`, `statusline-setup`, `Claude Code Guide`.
- **Resolution:** SAS is more complete. UG §10 should be updated to reference the SAS table or match the 5-entry list.

### 5.2 Agent tool rename from Task [gap]

- UG: no mention. UG §10 and §19 cheat sheet both implicitly reference the mechanism without naming the tool.
- SAS: lines 114, 453, 517, 527 — explicit "renamed from Task in Claude Code 2.1.63; both names work as aliases."
- **Resolution:** UG silent; SAS carries. Consolidation: UG §10 adds a one-sentence note or cross-links SAS §2.3.

### 5.3 Skill tool limitation with `context: fork` [gap]

- UG §10 lines 562–581: doesn't mention the limitation.
- SAS §6 line 406: "when a skill is invoked via the Skill tool directly (rather than triggered by description matching), `context: fork` and `agent:` frontmatter fields are currently ignored" — with issue `#17283` citation.
- **Resolution:** UG §10 should note the limitation with a cross-link, given how load-bearing it is for teammates.

### 5.4 Context budget numbers and scope [potential conflict — needs explicit framing]

- UG line 89: "2% of the context window, with a fallback of 16,000 characters" for skill **metadata** (descriptions in context).
- SAS line 483: "25,000-token budget" for **invoked skills carried forward through auto-compaction**.
- **Resolution:** These are different budgets (metadata-always-in-context vs invoked-bodies-after-compaction). Neither doc states this explicitly. A teammate reading both could easily conclude "the number is different therefore one doc is wrong." The consolidated treatment must label them distinctly.

### 5.5 CLAUDE.md loading in forked skill context [unverified]

- UG line 587–589 (Skills + Subagents table): claims skill with `context: fork` "Also Loads: CLAUDE.md."
- SAS: doesn't address whether CLAUDE.md travels into a forked context.
- **Resolution:** Primary-source verification needed before shipping. PRD §6 requires it (*"every load-bearing claim verified against primary source before it ships"*) and §5 scope excludes re-verifying facts from the v1.1 list — but this claim is *not* on the v1.1 list, so it's subject to verification.

### 5.6 `disable-model-invocation: true` — does it literally remove description from context? [unverified]

- UG line 503 (invocation matrix): "Description **not** in context."
- UG line 506: "completely removes the skill from Claude's awareness — it won't even see the description."
- SAS: doesn't address.
- **Resolution:** Self-consistent within UG, but the claim is strong ("won't even see") and deserves primary-source check before propagating.

### 5.7 `hooks:` frontmatter — skill-scoped vs settings-global [gap + potential confusion]

- UG line 496: "`hooks` ... Hooks scoped to this skill's lifecycle."
- SAS lines 178, 333, 520: hooks as a distinct mechanism for event-driven automation, not the same as skills.
- **Resolution:** Both true, but the collection doesn't stitch them together. A teammate reading UG thinks "skills have hooks"; a teammate reading SAS thinks "hooks are separate." Both are right — skills can declare hooks scoped to themselves *and* hooks exist as a top-level primitive configured in `settings.json`. Consolidation must make this explicit.

### 5.8 Bundled-skills list completeness [gap, partially version-drift]

- UG §7 lines 338–345: lists 5 bundled skills (`/simplify`, `/batch`, `/debug`, `/loop`, `/claude-api`).
- Current-session reality (from the active system-reminder): adds `/update-config`, `/keybindings-help`, `/brief`, `/distill`, `/schedule` and more.
- **Resolution:** Open question — is UG §7 meant to be canonical or illustrative? If canonical, it's out of date. If illustrative, it should say so and link to a source of truth for the current list.

### 5.9 Microsoft skill count (134 vs ~130) [minor conflict]

- SCG line 568: "134 skills for Azure, Fabric, M365."
- SCG line 601: "Microsoft published 134 skills."
- SAS line 255: "~130 Azure skills."
- **Resolution:** Minor drift. Verify against the repo (`microsoft/skills`). Pick one number and propagate.

### 5.10 Skill Creator install count [unverified]

- SCG lines 18, 559: "77,000+ installs" asserted twice.
- **Resolution:** Not from the v1.1 verification list. Primary-source check before shipping if we keep it; otherwise soften to "among the most-used skill tools in the ecosystem" and drop the specific number.

### 5.11 "Pushy" description guidance [minor phrasing overlap]

- UG line 95: "The description needs to be somewhat 'pushy' — explicitly listing trigger scenarios — to ensure reliable activation."
- SCG line 156: "Descriptions should be 'pushy' — Claude under-triggers by default."
- **Resolution:** Not a conflict — same advice, compatible phrasings. Consolidation candidate: cite once, cross-link.

### 5.12 Slash-commands-are-skills precedence [triple statement]

- UG line 103, UG line 367, SAS line 230: same precedence rule, three times.
- **Resolution:** Flagged in §1.4 above. One canonical statement + two cross-references.

### 5.13 October 2025 launch vs December 2025 open-standard publication [gap + imprecision risk]

- UG line 21: "The October 2025 launch introduced Agent Skills as a first-class feature. The December 2025 update was the real game-changer: Anthropic published the Agent Skills specification as an **open standard**."
- UG line 806: "In December 2025, Anthropic published the Agent Skills specification as an **open standard** at [agentskills.io](https://agentskills.io)."
- SAS line 251: references "Anthropic's own October 2025 announcement of Agent Skills."
- SCG: no explicit launch-date framing.
- **Resolution:** Not a contradiction — UG is correct that these are two distinct events (feature launch vs spec publication). But a reader who only reads SAS will think the spec dropped in October. The collection needs one authoritative timeline (candidate: the hub README) so no single doc has to carry both dates in-line.

### 5.14 "30+ platforms" / "30+ other platforms" — verification status [unverified, load-bearing]

- UG line 9: "portable across 30+ platforms" (intro blockquote).
- UG line 23: "unchanged in OpenAI Codex, OpenCode, Cursor, GitHub Copilot, VS Code, Gemini CLI, Windsurf, and 30+ other platforms."
- UG line 25: "they're an open standard that 30+ platforms have already adopted."
- UG line 996: "A skill written for Claude Code works in OpenAI Codex, Cursor, GitHub Copilot, VS Code, Gemini CLI, and 30+ other platforms. The same SKILL.md format, the same progressive disclosure architecture, the same filesystem-based portability."
- SAS line 247: "A SKILL.md written for Claude Code works unchanged in Codex, Cursor, Copilot, Gemini CLI, and 30+ other platforms."
- **Status:** Specific numeric claim ("30+") appearing in both UG and SAS. Not on the v1.1 verification list. SAS's platform compatibility matrix (UG §13 lines 812–826) only names 10 platforms explicitly. The "30+" count has no visible primary source within the collection.
- **Resolution:** Primary-source verify or soften to "dozens of platforms" if a specific count can't be anchored. Per Briggsy's `feedback-hallucinated-references` memory: "any specific number gets primary-source check before shipping."

### 5.15 Doc version-metadata format drift [minor]

- UG line 3: "Version: 2.1 | Last Updated: March 12, 2026 | Author: Claude (with Briggsy)" — specific day.
- SCG line 3: "Version: 1.0 | Last Updated: March 2026 | Author: Claude (with Briggsy)" — month only.
- SAS line 4: "Version: 1.1 | Last Updated: April 16, 2026 | Author: Claude (with Briggsy)" — specific day.
- **Resolution:** Trivial — standardize on `YYYY-MM-DD` or full-date format at consolidation time.

---

## 6. Cross-Link Opportunities

Specific sentences or sections that should be linking to another doc but aren't. Numbered for reference in Phase 2 decisions.

Format: `[source doc, line range] → [target doc, section] — why`.

1. **UG §2 Progressive Disclosure (lines 77–89)** → **SAS §7 Misconception 9 (lines 478–487)** — readers need the "what this does NOT mean" corrective.
2. **UG §2 Skills = Slash Commands (lines 97–105)** → **SAS §3 "Slash Commands Are Skills Too" (lines 227–232)** — or collapse one of the two.
3. **UG §2 triggering (lines 91–95)** → **SCG §10 description optimization (lines 405–452)** — natural progression from concept to engineering.
4. **UG §4 invocation paths (lines 207–213)** → **SAS §6 four invocation paths (lines 350–358)** — SAS adds paths 3 and 4 that UG omits.
5. **UG §5 reference vs task content (lines 258–288)** → **SAS §5 decision framework (lines 274–342)** — the choice between reference and task content drops into the broader primitive decision.
6. **UG §7 bundled skills (lines 334–345)** → **SAS §6 parallel fan-out (lines 384–395)** — `/simplify` and `/batch` are canonical examples.
7. **UG §8 building your own (lines 371–460)** → **SCG (all)** — natural next step is engineering rigor.
8. **UG §9 frontmatter reference (lines 463–529)** → **SAS §6 runtime mechanics (lines 344–421)** — frontmatter fields are easier to understand when tied to what they control at runtime.
9. **UG §10 `context: fork` (lines 560–589)** → **SAS §5 when-to-use (lines 293–302), SAS §6 mechanics (lines 397–406), SAS §7 Misconception 3 (lines 446–450), SAS §7 Misconception 9 (lines 478–487)** — every nuance lives in SAS; UG §10 is the feature explainer only.
10. **UG §10 Skills + Subagents table (lines 583–589)** → **SAS §3 worker/playbook model (lines 204–216)** — conceptual grounding for the two-direction distinction.
11. **UG §11 Skill Creator (lines 643–687)** → **SCG (entire)** — this section should shrink to a stub and cross-link only.
12. **UG §13 cross-platform (lines 805–843)** → **SAS §4 unification thesis (lines 236–270)** — why portability is the argument, not just a feature.
13. **UG §15 DO/DON'T (lines 886–910)** → **SCG §15 DO/DON'T (lines 572–592)** — pair the design list with the engineering list.
14. **UG §16 security (lines 913–939)** → **SAS §2 `disallowedTools` field (line 93)** — UG §16 doesn't currently mention this syntax.
15. **UG §18 endgame (lines 1018–1026)** → **SAS §4 architectural implications (lines 263–269)** — the endgame is what the thesis argues for.
16. **SCG §3 core loop (lines 128–149)** → **UG §2 progressive disclosure (lines 77–89)** — prerequisite knowledge for why iteration-based skill dev works.
17. **SCG §16 "skills, not agents" (lines 595–609)** → **SAS §4 full thesis (lines 236–270)** — SCG gives the framing; SAS gives the architecture.
18. **SAS §3 "what a skill actually is" (lines 183–232)** → **UG §2/§3/§4 (lines 75–230)** — SAS defers to UG for anatomy; make the deferral explicit with a link.
19. **SAS §4 unification thesis (lines 236–270)** → **SCG §16 (lines 595–609) and UG §18 (lines 998–1026)** — the contextual framings for the architectural statement.
20. **SAS §6 invocation paths (lines 350–358)** → **UG §4 runtime sequence (lines 187–203)** — the full runtime sequence complements the paths.
21. **SAS §7 Misconception 9 (lines 478–487)** → **UG §2 progressive disclosure (lines 77–89)** — the claim being corrected.
22. **All three docs' "Further Resources" appendices** → each other's sections (not just to each doc as a whole). Current cross-doc references point to file names only.

---

## 7. Proposed Collection Architecture

Three options, with trade-offs. Phase 2 decides.

### 7.1 Option A: README hub + three specialized docs (minimum change)

New file: `README.md` (or `00-START-HERE.md`) — orientation document, ~150 lines.

Contents:
- **"Start here if you're new."** tl;dr in 3 paragraphs.
- **Reading order** with one-sentence purpose for each doc.
- **Consolidated glossary** — merging UG Appendix A and SAS §9 canonical (per §1.11 of this analysis).
- **Decision flowchart** (Mermaid) — "I want to build / understand / engineer / distribute → go to X."
- **Quick-find index** — "I want to build a skill → UG §8." "I'm confused about agent terminology → SAS." Etc.
- **"Going deeper" links** — curated Anthropic official doc links for topics the collection intentionally defers.

Keep UG, SCG, SAS — edit for redundancy, add cross-links, add diagrams.

**Trade-offs:**
- **Pro:** Minimal restructuring. Clear entry point. Preserves each doc's identity.
- **Pro:** PRD acceptance test #1 ("identify the intended reading order within 5 seconds") is automatic.
- **Con:** Four files to read.
- **Con:** Exhaustive reference material still lives inline in UG (§9 frontmatter table, §13 cross-platform matrix).

### 7.2 Option B: Option A + optional-depth reference appendix (recommended for PRD "optional depth" principle)

Same as Option A, plus **one new reference file**: `REFERENCE_frontmatter_and_platforms.md` (or split into two).

Contents pulled out:
- UG §9 field-by-field frontmatter breakdown (lines 483–506).
- UG §13 cross-platform matrix and feature-comparison table (lines 812–843).
- UG §19 cheat sheets (lines 1030–1074).

Main reading path (UG) keeps the conceptual treatment of frontmatter and platforms but links to the reference file for exhaustive tables.

**Trade-offs:**
- **Pro:** Directly serves PRD §6 "progressive disclosure for the reader." Casual readers skip the reference file; power users know where to find it.
- **Pro:** Keeps UG reading-length down (potentially ~200 lines lighter).
- **Con:** Extra file to maintain. Risk of drift between reference and main docs.
- **Con:** Teammates reading offline (printed, downloaded) may miss the appendix.

### 7.3 Option C: Restructure around reader personas

Five files:
- `00-START-HERE.md` (hub)
- `01-BUILD.md` (consolidates UG §8 and SCG worked example)
- `02-UNDERSTAND.md` (consolidates UG §2/§4, SAS §2/§3/§6)
- `03-ENGINEER.md` (SCG governance + engineering)
- `04-REFERENCE.md` (frontmatter, cross-platform, env vars, full tables)

**Trade-offs:**
- **Pro:** Clean reader-persona mapping.
- **Con:** Massive restructuring. Each source doc's voice (§2 above) gets chopped up and scattered. Violates PRD §6 "preserve voice, tone, structure." Violates PRD §6 "smallest change needed."
- **Con:** v1.1 of SAS just landed after an adversarial review pass — reorganizing its content dilutes that investment.

### 7.4 Honest comparison: A vs. B

A and B are **coequal paths** under the PRD's constraints. Both add a hub README (the largest lift). Both revise the three existing docs in place. They differ on one axis only: whether exhaustive reference material (UG §9 frontmatter field-by-field, UG §13 cross-platform matrix, UG §19 cheat sheets) lives inline in UG or in a separate `REFERENCE_*.md` file.

**Shared premise of A and B:** the hub README is doing the heavy lifting for the "productive in 15 minutes" reader. It carries the reading order, consolidated glossary, decision flowchart, and curated official-docs links. Whether the three docs keep their full reference tables or not, the hub is what makes the collection navigable.

**What Option B actually delivers over A:**
- UG main reading path is ~200 lines lighter (1110 → ~900).
- One physical home for all reference tables — easier to keep current as Anthropic adds frontmatter fields.

**What Option B costs over A:**
- Breaks UG standalone-readability: a reader who wants frontmatter details must open a second file. PRD §12 explicitly names this as a risk.
- One more file to maintain and keep consistent with the main docs (drift risk).
- The reference file is ~250 lines of mostly tables — a file that doesn't "read" as prose and may feel like an orphan.

**What Option A actually delivers over B:**
- Each doc remains standalone-complete.
- Four-file collection (hub + 3) is simpler to hold in a reader's mind.
- Optional-depth material can still be clearly flagged inline (e.g., "Optional: full frontmatter table" collapsible or labeled subsection) — doesn't require file-level separation.

**What Option A costs over B:**
- UG stays at ~1100 lines. Reference tables co-exist with prose.
- No single home for reference material; updates happen in the doc where the table lives.

**Not a real option:** Option C (persona-based restructuring) violates PRD §6 'smallest change needed' and 'preserve voice.' Exclude from Phase 2 discussion unless Briggsy specifically wants to revisit.

### 7.5 File set under each option

**Option A final collection (5 files):**

| File | Role | Approx. lines |
|------|------|---------------|
| `README.md` (new) | Orientation, reading order, canonical glossary, decision flowchart | ~150 |
| `Claude_Skills_2.0_User_Guide.md` (revised) | Full skill treatment incl. inline reference tables | ~1050 (light revision) |
| `Skill_Creator_Practitioners_Guide.md` (revised) | Engineering discipline, evals, governance | ~650 |
| `Skills_Agents_and_Subagents_Oh_My.md` (revised) | Terminology, decision framework, runtime mechanics | ~600 |
| `proposed_changes_skills_agents_subagents.md` (archive/delete) | Working artifact | — |

**Option B final collection (6 files):**

| File | Role | Approx. lines |
|------|------|---------------|
| `README.md` (new) | Same as Option A | ~150 |
| `Claude_Skills_2.0_User_Guide.md` (revised, lighter) | Anatomy, runtime, using skills — reference tables moved out | ~900 |
| `Skill_Creator_Practitioners_Guide.md` (revised) | Same as Option A | ~650 |
| `Skills_Agents_and_Subagents_Oh_My.md` (revised) | Same as Option A | ~600 |
| `REFERENCE_frontmatter_and_platforms.md` (new) | Full frontmatter field-by-field, cross-platform matrix, cheat sheets | ~250 |
| `proposed_changes_skills_agents_subagents.md` (archive/delete) | Working artifact | — |

**The Phase 2 call:** does pulling exhaustive reference material *out* of UG make the main reading path meaningfully more consumable, or does it just fragment a coherent doc? No objective metric settles this — it depends on how Briggsy expects teammates to actually use the collection.

---

## 8. Cross-Cutting Themes

Four meta-level observations that don't fit cleanly into any single section above but shape multiple decisions in Phase 2.

### 8.1 Verification discipline is uneven across the three docs

SAS v1.1 carries a rigorous footer (line 565) that explicitly names verified GitHub issues: `anthropics/claude-code#14882`, `#17283`, `#32910`, `#45091`. Its adversarial-review pass produced specific, check-able citations.

UG and SCG carry softer footers ("Built from primary source analysis…") with no issue-level anchors. Specific numeric or verbatim claims (Microsoft's 134 skills, 77K+ installs, "30+ platforms") are not anchored to a primary source the way SAS anchors its mechanics claims.

**Implication:** The consolidated collection should raise UG and SCG to SAS's verification bar — or at minimum, flag unverified load-bearing claims the way `feedback-hallucinated-references` memory demands. Phase 2 should decide: verify-and-keep vs soften-and-retain vs remove.

### 8.2 The collection addresses three legitimately different audiences

- **UG** addresses "solo dev building a PR reviewer or an enterprise admin provisioning workflows for 10,000 employees" (line 25). Audience: the strategic builder.
- **SCG** addresses "anyone building skills that need to work reliably — whether you're a solo developer creating a PR review skill, a team lead standardizing deployment workflows, or an enterprise architect" (line 22). Audience: the engineering-rigorous builder.
- **SAS** addresses "anyone who has ever squinted at 'create an agent' instructions, written `.claude/agents/foo.md` while meaning to write a skill, or tried to reason about how an orchestrator skill fans out work" (line 27). Audience: the architecturally-confused practitioner.

These are *different people at different moments*. Phase 2 must decide whether the hub README signposts readers to the right doc based on their current moment, or picks a single "canonical reading order" regardless of audience. The PRD's acceptance test #1 (5-second orientation) assumes the former.

### 8.3 Version and timeline information is scattered

Specific dates, versions, and renames appear throughout:
- "Claude Code v2.1.3, January 24, 2026" (UG line 99, SAS line 228)
- "Claude Code 2.1.63" for the Agent-tool rename (SAS lines 114, 453)
- "November 21, 2025" for the Zhang/Murag talk (SAS line 238)
- "October 2025" / "December 2025" / "September 2025" for various launches (UG lines 21, 806; SAS line 505)
- "Claude Code 2.1.32+" for experimental Agent Teams (SAS line 177)

None of this is wrong. But a teammate trying to date-stamp their mental model has to chase fragments across three docs. A consolidated timeline sidebar (candidate home: hub README) would serve reference use cases and also make version-drift easier to audit in the future. Phase 2 decision: include a timeline sidebar, or leave distributed.

### 8.4 "Official Anthropic docs as safety net" is implicit, not systematic

The PRD tertiary acceptance test requires: "Navigate to any deep-dive reference material (optional appendices, exhaustive tables, official Anthropic doc links) in one hop, when they choose to go further."

The current collection holds Anthropic links in each doc's "Further Resources" appendix. But there's no in-line "for the full official treatment of X, see Y" pattern at the points where a reader might want to go deeper. A teammate reading UG §9 (frontmatter reference) who wants the canonical Anthropic treatment has to jump to Appendix B and guess which of 7 links is right.

**Implication:** Phase 2 should decide a convention for inline "going deeper" references. Examples:
- Footnote-style pointers at end of sections: *"For Anthropic's authoritative treatment, see [code.claude.com/docs/en/skills/frontmatter]."*
- A right-margin callout pattern (GitHub-rendered Markdown doesn't support these natively — would require blockquote convention).
- A "Further reading" subsection at the end of every major section.

---

## 9. Summary of decisions needed from Phase 2

Consolidated from the sections above. Order reflects suggested working order during Phase 2.

1. **Canonical-home rules** — agree on the proposed canonical homes in §1 (redundancy catalog). 14 concepts listed; each is a separate yes/no/alternative.
2. **Sentence-level dedupe tolerance** — §1.14 lists six sentences repeated verbatim or near-verbatim. Pick one canonical instance per sentence, or accept redundancy as the price of standalone readability.
3. **Voice normalization** — Option A (preserve) vs B (intro-level normalize) vs C (full homogenize). §2.4.
4. **Diagram list** — which of the 7 proposed diagrams (4 high + 3 medium) to commit to. §3.
5. **Gap-fill scope** — confirm 5 HIGH/MEDIUM gaps (plugins, hooks, MCP depth, skill scanning, `memory:` field) are in scope for this pass. §4.12.
6. **Inconsistency resolutions** — confirm approach for each §5 entry. Highest-priority for verification: 5.5 (CLAUDE.md in forked context), 5.6 (disable-model-invocation scope), 5.10 (77K installs), 5.14 ("30+ platforms"), 5.8 (bundled-skills list canonicity).
7. **Verification bar** — §8.1. Raise UG + SCG to SAS's citation discipline, or accept softer claims with explicit flagging.
8. **Audience signposting strategy** — §8.2. Hub READS for audience-based routing, or enforce a single canonical reading order.
9. **Timeline sidebar** — §8.3. Centralize version/date information in the hub, or leave distributed.
10. **"Going deeper" convention** — §8.4. How in-line references to official Anthropic docs are styled.
11. **Cross-link conventions** — link syntax (footnote-style vs inline anchor), whether every §6 opportunity is honored or a subset.
12. **Fate of `proposed_changes_skills_agents_subagents.md`** — delete / archive / rename. PRD default is archive.
13. **Architecture choice** — Option A vs B (coequal paths; see §7.4 honest comparison). Option C excluded unless Briggsy reopens it.
14. **Hub file name** — `README.md` vs `00-START-HERE.md` vs other. Numeric prefixes on other files to force reading order?
15. **Reference file scope** — if Option B: which sections move to `REFERENCE_*.md`.
16. **Execution order for Phase 3** — which doc ships first. Suggestion: hub README → SAS (canonical home for most architectural material) → UG (absorbs cross-links and shrinks §11 stub) → SCG (smallest revision) → reference file if Option B.

---

*End of analysis. All claims backed by line citations against the three source docs at the revisions listed in the header.*
