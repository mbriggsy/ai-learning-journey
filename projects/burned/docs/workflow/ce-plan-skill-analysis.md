# `/ce:plan` Skill — Academic Analysis

*Captured: 2026-04-10*
*Context: Briggsy asked for a purely academic comparison — what does the `/ce:plan` skill (from the compound-engineering plugin) bring to the table that native Claude planning doesn't? No bias, no advocacy. This analysis was not directly BURNED work, but was captured here for future reference because the insight is useful.*
*Not BURNED-specific. Applies to any project considering whether to use `/ce:plan` over ad-hoc planning.*

---

## What `/ce:plan` actually does

It's a 6-step pipeline, not just a planning template.

**Step 0 — Brainstorm ingestion.** Checks `docs/brainstorms/` for recent (<14d) relevant docs, reads them thoroughly, carries *all* decisions forward with `(see brainstorm: path)` back-references, then cross-checks at the end that nothing dropped. Explicit "origin document" pattern.

**Step 1 — Parallel local research (always runs).** Two agents:
- `repo-research-analyst` — existing patterns, CLAUDE.md guidance, tech familiarity
- `learnings-researcher` — scans `docs/solutions/` for prior institutional gotchas that might apply

**Step 1.5 — Research decision gate.** Evaluates signals (user familiarity, intent, topic risk, uncertainty) to decide if external research is warranted. Announces the decision.

**Step 1.5b — Conditional external research (parallel).** Two more agents if the gate fires:
- `best-practices-researcher`
- `framework-docs-researcher`

**Step 1.6 — Research consolidation** with `file:line` references required, institutional learnings documented, external URLs captured.

**Step 2 — Title & filename discipline.** Today's date prefix + zero-padded daily sequence number + type prefix + kebab-case + `-plan` suffix. Concretely: `2026-04-10-001-feat-css-foundation-rebuild-plan.md`. Across 20+ plans, this matters for findability. Also requires stakeholder analysis (who's affected, complexity, required expertise).

**Step 3 — SpecFlow Analyzer pass.** A dedicated agent whose entire job is finding gaps and edge cases in the spec. Acceptance criteria get updated from its findings.

**Step 4 — Choose detail level.** Three *fixed* templates (MINIMAL / MORE / A LOT), each with required sections. Not "comprehensive-ish" — explicit shape. The MORE+ templates force a **System-Wide Impact** section with five mandatory subsections:
- Interaction graph (trace 2+ levels deep)
- Error & failure propagation
- State lifecycle risks
- API surface parity
- 3–5 integration test scenarios unit tests can't catch

Plus mandatory **Alternative Approaches Considered**, three-tier acceptance criteria split (Functional / Non-Functional / Quality Gates), and a structured Sources section (Origin / Internal / External / Related Work).

**Step 6 — Brainstorm cross-check** at the end — re-reads origin doc, verifies every decision reflected, constraints captured, open questions resolved or flagged.

**Post-write — standardized 7-option menu:** open, `/deepen-plan`, review & refine, share to Proof, `/ce:work`, `/ce:work` remote, create issue. The plan is a handoff artifact with a defined downstream graph.

**Hard gate at the very end:** `NEVER CODE! Just research and write the plan.`

---

## What Claude would do natively without knowing this skill exists

- Read the spec and any TODO file
- Maybe spawn one exploratory `Explore` agent if scope warranted it — probably wouldn't, would trust the spec
- Draft a plan to `docs/plans/` with ad-hoc section organization, mirroring whatever recent plans in the folder looked like
- Filename: `2026-04-10-css-foundation-rebuild-plan.md` — no sequence number, no type prefix
- Include what *feels* important from context without a forcing function deciding what's required
- Acceptance criteria as checkboxes, but unlikely to split into functional / non-functional / quality-gate tiers
- No explicit stakeholder analysis
- No SpecFlow gap-finder pass
- No disciplined "system-wide impact" section — would cover migration risk ad-hoc, probably miss interaction-graph and state-lifecycle angles unless they jumped out
- Alternatives-considered only if it felt relevant
- Sources section maybe yes, maybe no, definitely not structured
- Post-write: offer ad-hoc next-step options, not a canonical menu
- No downstream hook into `/deepen-plan` unless remembered
- No "NEVER CODE" self-gate — would probably start drafting implementation in the same session if it felt small enough

---

## The delta — what `/ce:plan` genuinely adds

**1. Pre-built agent orchestration Claude wouldn't reach for.** Four specialized agents (repo-research, learnings-researcher, best-practices, framework-docs) plus SpecFlow. Native Claude would maybe spawn one Explore agent. The parallel-local → gate → conditional-external pattern is an orchestration Claude wouldn't reinvent on the fly.

**2. Forcing functions for sections Claude would skip.** System-Wide Impact is the biggest. "Interaction graph 2 levels deep," "state lifecycle risks," "API surface parity" — things Claude *knows* matter but skips unless prompted. The template is an anti-laziness device.

**3. Dedicated gap-finder agent (SpecFlow).** Claude doesn't naturally spawn "a gap-finder" — assumes the gaps are caught. A synthetic second pair of eyes catches what self-review misses. Probably the single highest-value piece for a plan derived from a spec — it stress-tests the spec-to-plan translation.

**4. Institutional-learnings surfacing.** `learnings-researcher` scanning `docs/solutions/` is a habit, not a one-shot. Claude would only hit that directory if it remembered the directory existed. The skill treats it as standard operating procedure.

**5. Filename + metadata discipline that compounds.** Sequence numbers, type prefixes, frontmatter with `origin:` field. Across a project with 20+ plans, findability is the difference between "I know there was a plan about X" and "which of the seven 2026-04 plans was about X?"

**6. Explicit downstream orchestration.** The plan is a node in a graph: `/ce:brainstorm` → `/ce:plan` → `/deepen-plan` → `/ce:work`. That changes the *shape* of the artifact — it's designed to be a handoff to an executor, not a document read once and discarded. The 7-option menu enforces the handoff.

**7. The "NEVER CODE" hard gate.** Possibly the biggest behavioral difference. Without it, even with good intentions Claude drifts toward "well, while I'm here I could just draft..." The skill is structurally research-only mode. That forces the plan to stand on its own because no code lands with it — if the plan is unclear, it has to be fixed in the plan, not papered over at execution time.

---

## Where `/ce:plan` is overkill

Being fair to the native approach:

- **Brainstorm ingestion doesn't always apply.** When a locked product spec exists (e.g., BURNED's `PRODUCT-SPECIFICATION.md`), the spec IS the authoritative input. Step 0 becomes a no-op.
- **External research may be skipped by the gate.** When ADRs lock the tech choices, external best-practices research on those stacks adds little. The gate at Step 1.5 will fire "skip."
- **Alternatives Considered can be partially redundant.** When ADRs already document rejected alternatives at the architectural level, the plan only needs to cover *implementation strategy* alternatives (big-bang vs. incremental migration), not stack alternatives.
- **The "A LOT" template is often too much.** MORE is usually the right fit — discipline without bloat. "A LOT" includes sections like "Resource Requirements" and "Future Considerations" that rarely earn their keep on a single plan.
- **The 7-option post-write menu** is fine but can be ignored in practice — most users just pick one of two or three canonical next actions.

---

## Academic bottom line

`/ce:plan` is not magic. It's **codified discipline** — the set of things a senior engineer does consistently for important plans that Claude, unprompted, does inconsistently. The value is mechanical, not conceptual:

| Value source | What it enforces |
|---|---|
| Agent orchestration | 4–5 parallel research agents Claude wouldn't spawn solo |
| Template forcing functions | Sections Claude would hand-wave (System-Wide Impact, Alternatives, Quality Gates) |
| Filename/metadata discipline | Cross-plan findability that compounds over time |
| Downstream handoff | Plan as a node in a graph, not a standalone doc |
| NEVER CODE gate | Keeps the plan honest — no "while I'm here" drift |
| Standardized next-steps menu | Removes "what now?" cognitive load on both sides |

**Highest-leverage forcing function for spec-derived plans:** System-Wide Impact → interaction graph + state lifecycle risks. Not because those sections are magic, but because they're exactly where native planning gets lazy — "the blast radius is bounded" assumptions that miss second-order effects. The template doesn't let Claude assume.

**The natural downside** is ceremony on tasks where the forcing functions don't pay rent. For a 3-line bug fix, `/ce:plan` is comedy. For foundational work where getting it wrong means revisiting the autopsy, the discipline is arguably the whole point.

That's the trade.

---

## When to reach for `/ce:plan` vs. native planning

Rough heuristic derived from this analysis:

**Use `/ce:plan` when:**
- The work is foundational (tokens, schemas, architecture rewrites)
- The blast radius is non-obvious (migration with hibernated state, protocol changes, shared infrastructure)
- The plan will be handed off to a separate execution session
- The project has > 10 plans already and cross-plan findability matters
- A SpecFlow-style gap-finder pass would catch things self-review would miss

**Skip `/ce:plan` and plan natively when:**
- The work is a bounded bug fix or isolated feature
- A locked spec or ADR already answers the architectural questions
- Same session will execute the plan (no handoff artifact needed)
- The planning ceremony will outweigh the execution effort
