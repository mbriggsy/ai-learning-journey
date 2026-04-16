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

*Populated during Phase 2. Empty now.*

- **2026-04-16:** Restructuring of the three docs is permitted. New structural pieces (e.g., README/hub doc) allowed. Source migration between docs allowed where clearly warranted.
- **2026-04-16:** Three-phase approach adopted (analyze → decide → execute) with explicit gates between phases.

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
