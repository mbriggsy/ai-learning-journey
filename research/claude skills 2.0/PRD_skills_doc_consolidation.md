# PRD: Skills Documentation Consolidation

**Status:** DRAFT — awaiting execution in a fresh session
**Owner:** Briggsy (ATC) + Claude (pilot)
**Created:** April 16, 2026
**Target:** The three-doc set in `research/claude skills 2.0/` becomes THE authoritative skills reference for our teammates — Pulitzer-worthy rigor, highly consumable presentation, zero redundancy, clean cross-linking. After reading the collection, a teammate should have a solid mental model of what skills are, when to use them, and what they aren't — **without having to dig through Anthropic's official documentation to be productive.** Official docs remain available as optional deep-dive reference, easy to navigate to from our collection when a teammate wants to go further.

---

## 1. Vision / North Star

Turn the three existing documents into one coherent work — authoritative, rigorous, factual, and genuinely pleasant to read. A **teammate** lands on the collection, knows where to start, moves through the material in a deliberate order, and finishes with a complete mental model of skills within the Claude Code ecosystem. Crucially: they get there from our docs alone. Anthropic's official docs are always a click away for depth, but reading them shouldn't be a prerequisite for productive work.

**Who this is for.** Our teammates — engineers, operators, and collaborators on Briggsy's AI projects. They may or may not have prior exposure to Claude Code skills. What they have in common: they need a solid, practical understanding of skills to do their work, and they shouldn't have to read Anthropic's official documentation to get there.

**Acceptance test:** A teammate landing on this collection — even one who has never touched Claude Code skills — can follow the reading path and come out the other side with:

- A precise understanding of what a skill is, how it differs from other Claude Code primitives (agents, subagents, hooks, MCP, plugins), and how skills behave at runtime.
- A working mental model for when to reach for each primitive.
- Verified facts backed by primary sources — no folklore.
- Enough practical guidance to actually build, test, and ship their first skill.
- Confidence that they don't need to read Anthropic's official docs to be productive. If they want to go deeper, the collection tells them exactly where to go.

**Secondary acceptance test:** A returning expert can use the collection as a reference. Every load-bearing concept has exactly one canonical home, and everything else links to it.

**Tertiary acceptance test (the "optional depth" test):** Exhaustive reference material (full frontmatter tables, every enum value, every edge case) is available but clearly marked as optional. The main reading path stays consumable; depth is a click away but never forced on a casual reader.

---

## 2. Current State

Three documents live in `research/claude skills 2.0/`:

| File | Lines | Role |
|------|-------|------|
| `Claude_Skills_2.0_User_Guide.md` | 1110 | Comprehensive "everything about skills" guide — Anthropic ecosystem framing, anatomy, runtime, cross-platform, best practices, the lot. |
| `Skill_Creator_Practitioners_Guide.md` | 697 | Engineering discipline for skill development — evals, A/B testing, description optimization, governance model. |
| `Skills_Agents_and_Subagents_Oh_My.md` | 565 (v1.1) | Terminology clarification — the four meanings of "agent," decision framework, misconceptions. Adversarial-review pass just landed. |
| `proposed_changes_skills_agents_subagents.md` | 259 | The offline review that drove v1.1. Can be archived/deleted after consolidation — it was a working artifact, not a deliverable. |

Each doc is individually strong. Collectively, they have problems.

---

## 3. Problem Statement

**Redundancy.** The Zhang/Murag "Don't Build Agents, Build Skills Instead" thesis is treated in all three docs. `context: fork` is covered in two. Glossary entries overlap. "Progressive disclosure" is explained in multiple places with slightly different emphasis. Shared concepts don't have canonical homes.

**No reading order.** The docs don't signal which one to read first, or why. A newcomer has to guess. Each doc pretends to be standalone, which drives the redundancy problem.

**Inconsistent voice.** Three distinct tones coexist:
- Skills 2.0 Guide: expansive, industry-framing, strategic
- Skill Creator Guide: practitioner, sleeves-rolled, engineering-discipline
- Terminology doc: pointed, corrective, taxonomic

Some of the variation may be intentional; some is accident. Worth a deliberate call.

**Minimal visual aids.** Only the Skill Creator guide has one Mermaid diagram (the core loop). The other two are pure prose. For a reference work, key architectural relationships and flows deserve diagrams.

**Weak cross-linking.** Internal links within each doc are decent. Cross-doc links are rare. The collection doesn't feel like a collection.

**Likely gaps.** A system of record on skills probably needs stronger treatment of: plugin packaging (the `.claude/plugins/` system), hooks relationship to skills, MCP-vs-skills distinction at depth, the relationship between skills and the broader Claude Code extensibility surface.

**Working artifacts in the deliverable directory.** `proposed_changes_skills_agents_subagents.md` was a review, not a deliverable. It's in the same folder as the reference docs and muddies the collection's identity.

---

## 4. Success Criteria

A teammate reading the completed collection can:

- [ ] Identify the intended reading order within 5 seconds of landing on the collection.
- [ ] Find any concept's canonical treatment in one click.
- [ ] Follow a reference from doc A to doc B without feeling they've lost context.
- [ ] Verify any factual claim by clicking through to primary source.
- [ ] Read any single doc somewhat independently (not hostage to the others).
- [ ] Use the collection as an in-session reference without the prose getting in the way.
- [ ] **Finish the main reading path confident they understand skills well enough to work without needing to read Anthropic's official docs.**
- [ ] **Navigate to any deep-dive reference material (optional appendices, exhaustive tables, official Anthropic doc links) in one hop, when they choose to go further.**

Quality bar per Briggsy: **water beads off it.** No "good enough," no defer-to-later. Every page must feel deliberate.

---

## 5. Scope

**IN scope:**
- Restructuring across the three docs (move sections, rename, resplit, etc.)
- Adding new structural pieces (e.g., a `README.md` or `00-START-HERE.md` hub that orients readers)
- Adding diagrams (Mermaid) where they materially aid understanding
- Normalizing voice
- Eliminating redundancy via cross-linking
- Filling identified gaps (plugin packaging, hooks, MCP depth)
- **Optional-depth reference material** (exhaustive frontmatter listings, full API surface, edge-case tables) structured as clearly-marked appendices or separate reference files so casual readers aren't buried in it
- **Curated links to Anthropic's official docs** at the points where a teammate might want to go deeper — not "instead of" our content, but "after" it
- Archiving or removing the `proposed_changes_skills_agents_subagents.md` working artifact

**OUT of scope:**
- Re-verifying facts already verified in the v1.1 adversarial review pass (listed in `Skills_Agents_and_Subagents_Oh_My.md` footer)
- Non-docs work
- Building tooling around the docs (that's a separate project)

---

## 6. Constraints & Principles

Per Briggsy's durable guidance from the v1.1 session and CLAUDE.md:

- **Preserve voice, tone, and structure** of the source docs where appropriate — don't "improve" prose into something blander or generic.
- **Smallest change needed** for any given goal. No drive-by refactors.
- **Match existing style** when adding new sections — same heading levels, same table style, same prose density.
- **System-of-record-true**: every load-bearing claim verified against primary source before it ships. No propagated folklore. The same standard applies to an internal verifier's quotes as to an external reviewer's citations.
- **Primary source wins** over web summaries. Anthropic's docs + verified GitHub issues are the ground truth.
- **Progressive disclosure for the reader.** The main reading path is the minimum-viable productive knowledge — it must stand on its own. Depth and exhaustive reference material (full API tables, edge cases, enum lists) live in clearly-marked optional sections (appendices, reference files, or links to official docs). The teammate who just wants to be productive shouldn't have to wade through or skip past material they didn't ask for.
- **Mermaid only** for diagrams — portable across GitHub, Obsidian, VS Code.
- **No WebFetch.** Use `mcp__gemini-grounding__search_*` or `curl -sL --max-time 15`.
- **Stop at phase boundaries** for Briggsy review. No batching.

---

## 7. Phased Approach

Work proceeds in three phases. Each phase ends at a review gate. **Never proceed to the next phase without Briggsy's explicit approval.**

### Phase 1 — Analysis (single session, read-only)

Goal: produce a structured analysis document that surfaces every decision the collection needs to make.

**Deliverable:** `research/claude skills 2.0/ANALYSIS_skills_doc_consolidation.md` containing:

1. **Redundancy catalog.** Every concept that appears in multiple docs, with line citations. For each: proposed canonical home + what stays where it is as a short cross-reference.
2. **Voice comparison.** 2-3 paragraphs pulled from each doc demonstrating the voice differences, plus a proposed normalization target (or case for preserving differences).
3. **Diagram inventory.** Every place a Mermaid diagram would materially aid understanding. For each: what kind (flowchart, sequence, architecture), what it communicates, why prose alone is insufficient.
4. **Gap analysis.** Concepts a system of record needs but the current collection doesn't adequately cover. Prioritized by load-bearing-ness.
5. **Inconsistency catalog.** Places where the three docs make conflicting claims (including subtle ones).
6. **Cross-link opportunities.** Specific sentences/sections that should be linking to other docs but aren't.
7. **Proposed collection architecture.** 1-2 options for the final shape (e.g., "three docs + README hub" vs. "four docs with clearer separation" vs. something else), with trade-offs.

**Constraints on Phase 1:**
- Read-only. No edits to any doc.
- Every claim in the analysis backed by a line citation to the source doc.
- Deliverable is a structured reference document, not a memo.

### Phase 2 — Design decisions (interactive)

Goal: Briggsy makes every design call needed for Phase 3 execution.

**Process:** Claude walks through the analysis, one decision at a time, with specific examples. Briggsy answers. Decisions captured by appending to this PRD under Section 9 ("Design Decisions Made").

**Expected decisions:**
- Canonical source rules (one home per concept)
- Reading order / hub strategy
- Voice normalization target
- Diagram inventory (which to add, which to skip)
- Gap-fill priorities (which gaps to close in this pass, which to defer)
- Cross-link conventions
- Fate of `proposed_changes_skills_agents_subagents.md` (delete / archive / rename)
- Naming (current filenames stay or change)
- Any scope adjustments based on what analysis surfaced

### Phase 3 — Execute (one doc at a time)

Goal: ship the consolidated collection.

**Process:** Claude edits one doc, commits, pushes. Briggsy reviews. Only then move to the next doc. Order determined in Phase 2 (likely: foundational/canonical docs first so later docs can cross-link to them).

**Per-doc workflow:**
1. Announce what's about to change and why.
2. Make surgical edits per Phase 2 decisions.
3. Self-verify: every new claim has a primary source; every new cross-link resolves; every new diagram renders; voice is consistent.
4. Commit + push.
5. Wait for Briggsy's review before moving to next doc.

---

## 8. Deliverables

| Phase | Artifact |
|-------|----------|
| 1 | `ANALYSIS_skills_doc_consolidation.md` (new) |
| 2 | Updated Section 9 of this PRD (design decisions captured) |
| 3 | Revised three docs + any new structural pieces (hub doc, etc.), one commit per doc |

After Phase 3 completes, this PRD and the analysis doc can be archived (moved to `research/claude skills 2.0/archive/` or similar) as historical record.

---

## 9. Design Decisions Made

*Populated during Phase 2.*

- **2026-04-16:** Restructuring of the three docs is permitted. New structural pieces (e.g., README/hub doc) allowed. Source migration between docs allowed where clearly warranted.
- **2026-04-16:** Three-phase approach adopted (analyze → decide → execute) with explicit gates between phases.
- **2026-04-16 — Decision 1 (Architecture): Option A+ adopted.** Final collection is 5 files: a new hub README + the three revised source docs + the archived working artifact. Reference-heavy sections in UG (§9 frontmatter table, §13 cross-platform matrix, §19 cheat sheets, and any other exhaustive tables surfaced during execution) are wrapped in `<details>` / `<summary>` collapsible blocks, collapsed by default. **Convention:** every `<summary>` line must be descriptive enough to tell the reader what's inside *without* expanding (e.g., "Full 15-field frontmatter reference (Anthropic spec, January 2026)"), never generic ("Click to expand"). Rationale: serves PRD §6 progressive-disclosure principle better than a separate REFERENCE file (depth is one click away, not one file away), preserves standalone readability of UG, eliminates two-file drift risk, and renders correctly on GitHub / VS Code / Obsidian.
- **2026-04-16 — Decision 2 (Voice): Option B adopted.** Body voice of each source doc is preserved as-is (UG expansive/strategic, SCG practitioner/engineering, SAS pointed/taxonomic). The voices are doing real work and flattening them costs reader trust. **Intros are normalized** to a common pattern across all three docs: same skeleton (what's in this doc / who it's for / how long it'll take / what to read next), different voice in the prose. Surface mechanics also normalized: heading levels, callout syntax, footer format, and version-metadata format (`YYYY-MM-DD` everywhere per analysis §5.15). The hub README owns "selling the collection" so individual doc intros can step back from worldview-setting and just deliver navigation.
- **2026-04-16 — Decision 3 (Hub strategy): audience-routed signposting, `README.md` filename, no numeric prefixes on source docs.**
  - **3a Signposting:** Hub uses audience-routed entry points ("I want to understand skills" / "I want to build my first skill" / "I'm distributing to a team" / "I'm confused about agent terminology"), each routing to the right doc and section. A fallback "if in doubt, read in this order" is included for indecisive readers. Serves the PRD 5-second-orientation acceptance test without flattening the three legitimately different audiences identified in analysis §8.2.
  - **3b Hub filename:** `README.md` — GitHub auto-renders it as the directory landing page; zero discoverability work.
  - **3c Numeric prefixes:** None. They would contradict the audience-routed approach (no single 1-2-3 order) and would break existing file references. Source doc filenames stay as they are.
- **2026-04-16 — Decision 4 (Verification bar): Option 1 adopted.** UG and SCG are raised to SAS v1.1's primary-source citation discipline. Every load-bearing claim — specifically including the five flagged in analysis (Microsoft 134 skills, 77K+ installs, 30+ platforms, CLAUDE.md loads into forked context, `disable-model-invocation` description-not-in-context behavior) plus any other specific numbers or verbatim-looking quotes surfaced during execution — gets a primary-source check before shipping. Unverifiable claims are softened (e.g., "30+ platforms" → "dozens of platforms" if no primary source can be anchored) or removed. The v1.1 SAS verifications (`#14882`, `#17283`, `#32910`, `#45091`) remain out of scope for re-verification per PRD §5. Verification methods: `mcp__gemini-grounding__search_*`, `curl -sL --max-time 15` to GitHub repos and Anthropic docs, direct issue lookups. Per `feedback-hallucinated-references` and `feedback-primary-source-wins`.
- **2026-04-16 — Decision 5 (Gap-fill scope): Option 1 adopted (analysis recommendation exactly).**
  - **IN scope (full treatment in this pass):** 4.1 plugin packaging (manifest, `.claude/plugins/` layout, what plugins bundle, marketplace, namespacing), 4.2 hooks relationship (event list, `hooks:` field vs settings.json hooks, when to use hook vs skill), 4.3 MCP-vs-skills depth (when to use which, composition, `mcpServers:` field on subagent definitions), 4.4 how Claude scans skills (scan order, "in context" semantics, budget allocation), 4.9 `memory:` field and subagent state (interaction with `skills:`, project-level `memory/` convention).
  - **Cross-link only / defer:** 4.5 env vars, 4.6 live-reload, 4.7 security/PreToolUse audit pattern, 4.8 Agent Teams (flag as experimental), 4.10 `--agent` flag (one-paragraph treatment or defer to official docs).
  - **Explicitly out of scope:** 4.11 skill testing without Skill Creator (PRD §5 excludes tooling-building work).
  - **Note:** plugin packaging (4.1) is the largest single addition; aim for the practical surface (manifest, namespacing, marketplace pointer) without ballooning into a plugin tutorial.
- **2026-04-16 — Decision 6 (Diagram list): Option 1 adopted (all 7 from analysis §3).**
  - **High priority (4):** 3.1 Progressive disclosure three-tier loading (UG §2), 3.2 Four meanings of "agent" layered architecture (SAS §2), 3.3 Skill invocation sequence main path (UG §4), 3.4 Parallel fan-out (SAS §6).
  - **Medium priority (3):** 3.5 Storage hierarchy / skill precedence (UG §7), 3.6 Decision framework primitive selection (SAS §5), 3.7 Skills + subagents two-directions (UG §10).
  - **Skip:** 3.8 three-surface strategy, 3.9 maturity model staircase, 3.10 skill file structure tree (ASCII works).
  - All diagrams in Mermaid for portability across GitHub / VS Code / Obsidian. If any diagram fails to render cleanly during execution, flag and either fix or drop — never ship a broken diagram. Approximate budget: ~120 lines of Mermaid source added across the collection.
- **2026-04-16 — Decision 7 (Canonical-home rules): Option 1 adopted (all 13 as analysis §1 recommends, with 1.8 resolved as Option B).**
  - **1.1 Don't-Build-Agents thesis:** SAS §4 canonical; UG §18 + SCG §16 keep their angles and link to SAS; drop Microsoft echo from UG and SCG.
  - **1.2 Skill Creator (meta-skill):** SCG canonical; UG §11 shrinks to ~5-line stub + pointer.
  - **1.3 `context: fork`:** Split 3 ways — UG §10 = how to use; SAS §6 = mechanics + limitations; SAS §5 = decision criteria. Cross-links must be airtight (handled by D12 convention).
  - **1.4 Skills = Slash Commands:** UG §2 canonical; UG §7 drops duplication; SAS §3 trims to one sentence + cross-link.
  - **1.5 Progressive disclosure:** UG §2 (concept) + SAS §7 M9 (corrective); add mutual cross-links.
  - **1.6 Triggering / description matching / invocation:** 4 homes by angle — UG §2 concept, UG §8 writing descriptions, SAS §6 invocation mechanics, SCG §10 optimization. "Pushy description" phrasing consolidated to one canonical mention.
  - **1.7 Capability vs Workflow taxonomy:** UG §5 canonical; UG §18 trims to strategic insight only.
  - **1.8 Real-world examples (deploy, PR summary):** UG §5 and §10 stay detailed (examples land harder in context); UG §12 trims to a "we've seen these throughout — quick-reference index" with cross-links back. SCG's review-pr skill stays distinct (it's a different example, not a duplicate).
  - **1.9 Best practices DO/DON'T:** Preserve both — UG §15 design-focused, SCG §15 engineering-focused. Remove only verbatim duplicate bullets.
  - **1.10 Environment matrix:** SCG §13 canonical; UG §11 stub drops the matrix.
  - **1.11 Glossary:** Merged into hub README. UG Appendix A and SAS §9 collapse into a single canonical glossary in the hub. Source architectural terms from SAS, lifecycle terms from UG (per analysis §1.11).
  - **1.12 Enterprise / org provisioning:** Cross-link rather than dedupe — UG §6 (feature), UG §14 (distribution), UG §16 (security), SCG §12 (governance) each serve distinct purposes; stitch with cross-links.
  - **1.13 Microsoft / Fabric / 134 skills citation:** SAS §4 canonical; drop from both SCG mentions (or keep one as a pointer at most).
- **2026-04-16 — Decision 8 (Sentence-level dedupe): Option 2 adopted (loose dedup with intra-doc trim only).** Eliminate intra-doc repetition; accept cross-doc repetition as the price of standalone readability per PRD §6. Specific cuts:
  - **(a) Precedence rule:** cut UG line 367 (§7 "Legacy Commands Compatibility" duplicate of §2). Keep one in UG, keep one in SAS.
  - **(b) "Pushy" descriptions:** keep both UG line 95 and SCG line 156 — different docs, different framings (concept vs engineering context).
  - **(c) Microsoft "agents on top of" quote:** cut one of SCG's two mentions (likely line 600 — §16 closing repeats §15). Keep one in SCG; SAS §4 canonical per D7 1.13.
  - **(d) "Keep SKILL.md under 500 lines":** cut UG line 904 (§15 DON'T variant restating §8). Keep §8.
  - **(e) "Don't skip examples":** cut UG line 905 (DON'T-list duplicate of §8). Keep §8.
  - **(f) "Skills don't auto-unload":** both SAS instances stay — line 198 is passing qualifier in §3, lines 478–487 are full corrective in §7 M9. Different purposes.
- **2026-04-16 — Decision 9 (Inconsistency resolutions): Option 1 adopted with hybrid verification timing.**
  - **Already resolved by other decisions:** 5.4 (handled by D7 1.5 — label budgets distinctly), 5.11 (D8 b), 5.12 (D8 a), 5.13 (D10 timeline sidebar), 5.15 (D2 — `YYYY-MM-DD`).
  - **Verification work — hybrid timing:**
    - **Cross-doc claims batched upfront** (before any doc edits in Phase 3): 5.9 Microsoft skill count (134 vs ~130), 5.14 "30+ platforms" (5 mentions across UG + SAS). Single verified value propagated identically to every doc. Eliminates drift risk.
    - **Doc-specific claims verified serially as the relevant doc is touched:** 5.5 (CLAUDE.md in forked context — UG only), 5.6 (`disable-model-invocation` description-not-in-context — UG only), 5.10 (77K installs — SCG only).
    - **Default action if unverifiable** (per D4): soften the claim. 5.5 → "may load" or remove from table. 5.6 → soften "won't even see" to "marks the skill as not auto-discoverable." 5.10 → "among the most-used skill tools." 5.14 → "dozens of platforms."
  - **Gap-style fixes (done as the relevant doc is touched):**
    - **5.1** Built-in subagent types: align UG §10 with SAS's 5-entry list (or cross-link).
    - **5.2** Agent-tool rename from Task: UG §10 adds one-sentence note + cross-link to SAS §2.3.
    - **5.3** Skill tool limitation with `context: fork`: UG §10 adds limitation note + cross-link to SAS §6 (issue `#17283`).
    - **5.7** `hooks:` field scoped vs settings.json global: explicit stitching needed in both UG §9 and SAS §2.
  - **5.8 Bundled-skills list canonicity: Option A adopted (illustrative).** UG §7 reframed to "Examples include: `/simplify`, `/batch`, `/debug`, `/loop`, `/claude-api`. The full current set is shipped with Claude Code and may evolve; check `claude /help` or Anthropic's release notes for the canonical list." Survives Anthropic's release schedule without bit-rot.
  - **Execution-model note:** Claude has autonomy on tactical batching/serialization decisions in Phase 3 as long as operational goals (verification rigor, no drift, quality bar) stay intact.
- **2026-04-16 — Decision 10 (Timeline sidebar): Option 1 adopted, appendix-style placement.** Consolidated chronological timeline lives in the hub README as an appendix (bottom-of-hub), wrapped in `<details>` collapsible per the Decision 1 A+ pattern. Trigger line: descriptive (e.g., `▶ Timeline of major Skills ecosystem events (2025–2026)`). Resolves analysis §5.13 (October vs December date confusion) automatically. Hub README structure becomes: (1) TL;DR / what this collection is, (2) audience-routed signposts, (3) reading-order fallback, (4) consolidated glossary, (5) going-deeper links to official Anthropic docs, (6) Timeline (collapsed appendix).
- **2026-04-16 — Decision 11 ("Going deeper" convention): Option 4 adopted (end-of-section "Further reading" + collapsible).** At the end of every section where Anthropic has a deeper canonical treatment we're not mirroring, add a `### Further reading` subsection wrapped in `<details>` per the A+ pattern. Trigger line: descriptive count (e.g., `▶ Further reading (3 official Anthropic links)`). **Discipline:** use only where there's genuinely deeper material to point to — spamming "Further reading" at every section dilutes the signal. For sections where the doc *does* mirror Anthropic's treatment (e.g., the inline-collapsible frontmatter reference), still include the link with framing that signals our doc is the working reference and Anthropic's is the canonical source.
- **2026-04-16 — Decision 12 (Cross-link conventions): Option 1 adopted (all three sub-recommendations).**
  - **12a Link syntax:** Section-relative path with anchor — e.g., `[SAS §6 mechanics](Skills_Agents_and_Subagents_Oh_My.md#6-context-fork-mechanics)`. Standard markdown practice; GitHub-renderable; link target visible in prose.
  - **12b Coverage:** Honor all 22 cross-link opportunities from analysis §6, with discipline. If any read as link-spam in context during execution, drop and document why. The 22 are filtered candidates, not exhaustive scans.
  - **12c Direction:** Directional based on canonical home — non-canonical → canonical always; canonical → non-canonical only when the non-canonical adds genuine value (e.g., SAS §7 M9 links back to UG §2 because the corrective only makes sense if you've seen what's being corrected). Avoids the bidirectional-everywhere clutter and the one-way-only blind-spot.
  - **Discipline:** Section anchors are stable contracts after Phase 3 ships. Heading rewrites in later passes require updating all referring links.
- **2026-04-16 — Decision 13 (Fate of `proposed_changes_skills_agents_subagents.md`): Option 1 adopted (delete), with one-off preservation commit beforehand.** The working artifact was never committed during the v1.1 review — it lived only as an untracked file. To preserve the trail before deletion, the file is committed once in its current form (so `git log --all -- <path>` recovers it later). The Phase 3 cleanup step then deletes it from the main directory. Net effect: deliverable directory ends with only deliverables; historical trail of the v1.1 adversarial-review process is recoverable from git history.
- **2026-04-16 — Decision 14 (Phase 3 execution order): Option 1 adopted (analysis-recommended order with verification batch first).**
  - **Step 0 — Verification batch.** Before any doc edit, run a focused research pass on the cross-doc claims: 5.9 Microsoft skill count and 5.14 "30+ platforms." Lock verified values (or softened replacements) for propagation.
  - **Step 1 — Hub README (new).** Carries decisions other docs reference: canonical glossary (D7 1.11), audience routing (D3), going-deeper convention pattern (D11), timeline appendix (D10). Other docs need stable anchors to link into.
  - **Step 2 — SAS revision.** Smallest content delta but anchor-critical: trim duplicates that move to canonical homes elsewhere, add diagrams 3.2 / 3.4 / 3.6, add cross-link return paths, normalize intro per D2.
  - **Step 3 — UG revision.** Largest single revision: absorb cross-links to SAS (now stable), shrink §11 stub per D7 1.2, dedup internal repetitions per D8, add diagrams 3.1 / 3.3 / 3.5 / 3.7, fold in gap-fill content per D5 (plugins, hooks, MCP depth, scanning, memory:), wrap reference-heavy sections in inline `<details>` per D1 A+, perform doc-specific verifications (5.5 CLAUDE.md in fork, 5.6 disable-model-invocation).
  - **Step 4 — SCG revision.** Smallest revision: drop or trim Microsoft echo per D7 1.13, normalize intro per D2, add cross-links per D12, perform doc-specific verification (5.10 77K installs).
  - **Step 5 — Cleanup.** Delete the working artifact per D13. Final pass for cross-link breakage. Squeaky-clean state.
  - **Per-doc workflow (per PRD §7):** announce → edit → self-verify → commit + push → **wait for Briggsy review before next step.** Each commit is its own review surface. No batching steps.

---

## 10. Open Questions (for Phase 2)

*Placeholders. Phase 1 analysis will surface additional ones and ground these in concrete examples.*

- Canonical source rule: does the most foundational doc always own a shared concept, or does the most specialized?
- Voice normalization: one target voice, or preserve intentional differences?
- Hub doc: yes or no? If yes, what's in it (overview? reading-order? glossary consolidation?)
- Diagram count: what's the upper bound before decoration overtakes utility?
- Gap-fill scope: plugin packaging, hooks depth, MCP depth — all three? Some subset?
- **Reference material strategy:** where does exhaustive depth live? Options, not mutually exclusive: (a) inline with "optional — skip if you just want the gist" markers, (b) per-doc appendices, (c) a dedicated reference file (e.g., `REFERENCE_skill_frontmatter.md`), (d) curated links to Anthropic's official docs where we don't want to mirror their content. Phase 1 analysis will propose specific allocations.
- **Depth threshold:** what's the bar for "include in our docs as optional depth" vs. "link to official Anthropic docs instead"? (E.g., do we mirror the full skill frontmatter table, or link to it? Do we mirror the cross-platform compatibility matrix, or link to it?)

---

## 11. Context Pointers for a Fresh Session

A fresh Claude session picking this up should read in this order:

1. **This PRD** (full).
2. **`MEMORY.md`** — key entries: `feedback-hallucinated-references.md`, `feedback-primary-source-wins.md`, `feedback-water-beads-polish.md`, `feedback-stop-after-every-phase.md`, `feedback-wait-for-all-agents.md`, `feedback-plans-are-baking-recipes.md`, `feedback-debate-pushback.md`.
3. **The three source docs** in `research/claude skills 2.0/` (read in the order listed in Section 2 above).
4. **Recent commits affecting this work:** `fc5d0e6e` (v1.1 corrections), `89fb5cac` (title/subtitle fix), `975ffa2f` (initial terminology doc), `e78cbe51` and earlier (baseline).
5. **Verified citations from v1.1** that remain authoritative for this work: `anthropics/claude-code#14882`, `#17283`, `#32910`, `#45091`. Do not re-verify; do not challenge without new evidence.

**Operating notes:**

- Work on `main`. No branches.
- Commit per doc, per phase gate. Small, descriptive messages. Co-authorship trailer per CLAUDE.md.
- Screenshots/temp artifacts go in `temp/`, not the project root.
- At ~70% context, prompt Briggsy to start a fresh session (per `feedback-context-window-warning.md`).
- "Squeaky clean" at session end = run the `/squeaky-clean` skill.

---

## 12. Risks

- **Scope creep.** Three docs could balloon into six if we're not careful. Mitigation: Phase 2 locks scope before Phase 3 opens.
- **Voice homogenization killing personality.** Some tonal variation is a feature. Mitigation: Phase 2 decision on normalization is deliberate, not default.
- **Redundancy elimination that breaks standalone readability.** Each doc should survive being read alone. Mitigation: cross-links are additive; we don't gut a section just because another doc covers it.
- **Diagram decoration.** Mermaid is cheap to add, which means it's easy to overdo. Mitigation: Phase 1 inventory only catalogs diagrams that materially aid understanding; Phase 2 locks the list.
- **Propagated folklore from internal agents.** The v1.1 process had a near-miss where a verifier's quote was trusted without independent verification (caught by Briggsy). Mitigation: explicit standard — any specific number or verbatim-looking quote gets primary-source check before shipping, regardless of which agent surfaced it.

---

*End of PRD. Next action: fresh session, read this PRD, begin Phase 1.*
