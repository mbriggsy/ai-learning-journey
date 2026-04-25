# ATC — Agentic SDLC for Azure Data Engineering

> 🚧 **DRAFT — ATC in active build. Phase 2 of 10 complete (2026-04-25).** This README and downstream docs revise as later phases land. The ADRs in [`reference/DECISIONS.md`](reference/DECISIONS.md) are individually locked and stable.

A skills-forward, human-directed, agent-executed software development methodology for Azure data engineering. **Engineers are ATC; agents fly the planes.** Humans direct authoring, agents execute delivery, and the ATC Tower observability layer lets humans watch the planes without gating every step.

ATC adopts in two chapters (per [ADR-013](reference/DECISIONS.md#adr-013--adoption-arc-chapter-1-re-driven-proving-ground--chapter-2-greenfield)):

- **Chapter 1 — proving ground (current).** Pair ATC with [`etl-reverse-engineering`](../etl-reverse-engineering/BRIEF.md). Take an existing shit-show ETL job, reverse-engineer to a PRD, run the PRD through ATC. **Rebuild output must match original output.** Empirical, risk-partner-defensible.
- **Chapter 2 — change the world (future).** Once Chapter 1 has banked track record, ATC unleashes on greenfield: **elite virtual data engineering teams** — agents standing in for a team of expert engineers.

---

## Read in this order

| # | Doc | Read time | What it gives you |
|---|-----|-----------|-------------------|
| 1 | **[00_START.md](00_START.md)** *(planned)* | 5 min | The mental model. ATC pattern, autonomy ladder, skills-first, evidence-first. |
| 2 | **[01_RUN.md](01_RUN.md)** *(planned)* | 15 min | End-to-end walkthrough of one project, all 9 phases, all gates, evidence package assembling as you go. |
| 3 | **[02_PHASES.md](02_PHASES.md)** *(planned)* | 20 min | Per-phase skill specs. The playbook spine. |
| 4 | **[03_AUDIT.md](03_AUDIT.md)** *(planned)* | 12 min | Evidence package format, risk-partner answers, observability layer, the answer to every "but what about..." question. |
| 5 | **[EXEC-SUMMARY.md](EXEC-SUMMARY.md)** *(planned)* | 2 min | 1–2 page leadership view. |

If you read only one: **00_START.md** — it kills the "agentic SDLC = no humans" misconception and gives you the decision framework.

---

## Reference material (when you need precision)

| Doc | What it's for |
|-----|---------------|
| **[reference/PRD.md](reference/PRD.md)** | The methodology's own PRD. What ATC must deliver, who it serves, success criteria, non-goals. *(Phase 2 done, 2026-04-25)* |
| **[reference/SPEC.md](reference/SPEC.md)** *(planned)* | The skill graph. Composition, hooks, MCP scoping, parallel fan-out, ATC Tower architecture. |
| **[reference/skills-catalog.md](reference/skills-catalog.md)** *(planned)* | Every skill in ATC, with name, purpose, pass-rate threshold, status (REUSE/ADAPT/BUILD-OWN). |
| **[reference/data-engineering-skills-landscape.md](reference/data-engineering-skills-landscape.md)** | What MS / Databricks / Anthropic / community publishes today. What we reuse vs. build. *(Phase 1B done, 2026-04-25)* |
| **[reference/agentic-execution-pattern.md](reference/agentic-execution-pattern.md)** | git worktrees + the agent execution pattern. Per-phase worktrees, orchestrator-pushed, deploy-mutex'd. *(Phase 1B done, 2026-04-25)* |
| **[reference/ce-comparison.md](reference/ce-comparison.md)** | What we steal from Compound Engineering, what we leave, why. *(Phase 1B done, 2026-04-25)* |
| **[reference/DECISIONS.md](reference/DECISIONS.md)** | All architectural decisions with date + alternatives + reasoning. The answer to "why did you build it this way?" |

---

## Visual surfaces

| Surface | Audience | Status |
|---|---|---|
| **[microsite/](microsite/)** — custom HTML scrollytelling page, ATC metaphor done literally, embedded mock-live ATC Tower dashboard | Engineering team + leadership + risk partners (anyone with a browser) | Planned |
| **[microsite/deck.html](microsite/deck.html)** — Reveal.js alt-mode of microsite, slide-presentation view of the same content | Leadership readouts, offline meetings | Planned |

Same source. Three views. Same metaphor, same colors, same message.

---

## The five terms that matter

| Term | What it is |
|------|------------|
| **ATC** | The methodology. Air Traffic Control = humans direct/approve, agents execute, observability layer makes the work watchable. |
| **Autonomy ladder** | Two-stage gate model. Stage 1 (Authoring) is human-directed; Stage 2 (Execution) is agent-driven, observable. PRD lock and Evidence lock are the human gates. |
| **ATC Tower** | The observability layer. Live view of agents in flight, what each is doing, where they are in the pipeline. Humans watch without gating. |
| **Skill** | An Anthropic Agent Skill — a folder with `SKILL.md`, optional scripts/references/assets. Portable across any [agentskills.io](https://agentskills.io) runner. ATC is built from skills. |
| **Evidence package** | The audit-trail deliverable. Code review approvals, test results, lineage diffs, agent action logs, human approval signatures. The artifact that disarms risk partners. |

---

## How ATC compares to Compound Engineering

ATC is **CE-inspired but standalone.** We chose to build our own orchestrator skill rather than use CE-the-product, so SKILL.md bodies stay portable to Codex / Cursor / Copilot / Gemini CLI, and the audit trail doesn't depend on a third-party runner. CE remains a benchmark and reference. See [reference/ce-comparison.md](reference/ce-comparison.md) when written.

---

## Where ATC came from

The companion project [`../etl-reverse-engineering/`](../etl-reverse-engineering/) reverse-engineers shit-show ETL jobs into rebuild-ready PRDs. That brief leaves the rebuild as future work — the doc reads *"a downstream skills-based rebuild workflow … picks up the PRD and builds the world-class version."* **ATC is that workflow.** It takes any data-engineering PRD (RE-derived or net-new) and runs it to a shipped, audited, world-class delivery.

---

*Skills first. Evals before ship. Evidence before release. Human direction at the gates that matter.*

***Methodology lean. Outputs maximalist.*** *— [ADR-012](reference/DECISIONS.md#adr-012--design-philosophy-atc-is-minimalist-its-outputs-are-maximalist) is foundational.*
