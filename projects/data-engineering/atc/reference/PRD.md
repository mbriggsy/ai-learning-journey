# ATC — Methodology PRD

> 🚧 **DRAFT — Phase 2 output (2026-04-25).** Locks at Briggsy approval; revisions land as ADRs.
> **Inputs (Phase 1B):** [`data-engineering-skills-landscape.md`](data-engineering-skills-landscape.md), [`agentic-execution-pattern.md`](agentic-execution-pattern.md), [`ce-comparison.md`](ce-comparison.md), [`DECISIONS.md`](DECISIONS.md) ADRs 1–12.
> **Foundational principle:** [ADR-012](DECISIONS.md#adr-012--design-philosophy-atc-is-minimalist-its-outputs-are-maximalist) — methodology lean, outputs maximalist.

This is the **requirements contract for ATC**, not for any one project that uses ATC. Anything stated here governs every downstream phase. Anything not stated here is subject to design choice in Phase 3 SPEC.

---

## 1. Purpose

ATC turns any Azure data-engineering PRD into shipped, audited, world-class delivery — with humans directing authoring and approving release, and agents executing the work in between, observable throughout.

ATC adopts in two chapters (per [ADR-013](DECISIONS.md#adr-013--adoption-arc-chapter-1-re-driven-proving-ground--chapter-2-greenfield)):

- **Chapter 1 — proving ground (current).** Pair ATC with the companion [`etl-reverse-engineering`](../../etl-reverse-engineering/BRIEF.md) skill. Reverse-engineer an existing shit-show ETL job into a rebuild-ready PRD, run that PRD through ATC. **Rebuild output must match original output**, modulo documented intentional divergences for flagged correctness issues. Empirical, deterministic, risk-partner-defensible.
- **Chapter 2 — change the world (future).** Once Chapter 1 has banked track record, ATC unleashes on greenfield data engineering: **elite virtual data engineering teams** — agents standing in for a team of expert engineers, full pipeline, no human writing code in the middle, world-class delivery. No output-diff testbed exists for greenfield, but by Chapter 2 the methodology has Chapter 1's empirical credibility to lean on.

ATC exists because Briggsy's team has the opportunity to operate at a level no commercial competitor currently does. The methodology is the asset; every project run compounds it.

---

## 2. Audience

ATC docs target three audiences with one source. Voice is calibrated to whoever is reading.

| # | Audience | Reads | Voice |
|---|---|---|---|
| 1 | **Engineering team** *(primary)* | Reference docs, per-phase skill specs, the playbook | Direct, dense, expert-to-expert. No hand-holding. |
| 2 | **Leadership** *(secondary)* | Microsite + executive summary + slide deck | Plain language. Show the gates. Show the evidence. Frame as human-elevated, not human-removed. |
| 3 | **Risk partners** *(tertiary, high-leverage)* | Audit/risk addendum (`03_AUDIT.md`) + evidence package examples | Specific. Auditable. Every claim has a referent. Common objections answered before they're asked. |

The same source content drives all three. Different views — same truth.

---

## 3. Success criteria

Success criteria are sequenced by chapter (per [ADR-013](DECISIONS.md#adr-013--adoption-arc-chapter-1-re-driven-proving-ground--chapter-2-greenfield)). Chapter 1 criteria are testable now. Chapter 2 criteria lock when Chapter 1 has produced enough projects to set the bar.

### Chapter 1 success (current — the empirical proving ground)

- **S1.** A data-engineering PRD enters the methodology and produces a shipped artifact + evidence package without bypassing either human gate (PRD-lock, evidence-lock).
- **S2.** The evidence package answers the most common risk-partner objections without follow-up questions. **For Chapter 1, the rebuild-vs-original output diff is itself the most disarming evidence.** Tested by handing the package to a skeptic-archetype reviewer cold.
- **S3.** A new engineer joining Briggsy's team can read the ATC docs cold and execute one project end-to-end on the second attempt at the latest. The methodology is its own onboarding doc.
- **S4.** Skills authored for ATC pass the [agentskills.io](https://agentskills.io) validator and run on at least one non-Claude-Code runner without modification. Portability is real, not aspirational.
- **S5.** The microsite delivers the methodology story to a non-engineer leadership audience in under ten minutes and leaves them able to articulate (a) the chapter arc, (b) the autonomy ladder, (c) the evidence package, (d) the WOW differentiator. Tested by a teammate who has never seen the doc.
- **S6 (Chapter 1).** **Three RE-driven rebuilds complete the full pipeline with output matching the original** (modulo documented intentional divergences per the RE brief's RTM `divergence` column). This is the load-bearing empirical proof of ATC. Three is the bar because one is luck, two is coincidence, three is a track record.
- **S7.** Every ATC-authored skill ships with evals + a documented pass-rate threshold per the Skills 2.0 Level 3 commit bar. No "vibes-shipped" skills exist in the repo.

### Chapter 2 success (future — greenfield, elite virtual data engineering teams)

Locked when Chapter 1 has banked at least three matching rebuilds. Anticipated shape (do not pre-commit): "an ATC-driven greenfield project of similar scope to a real human-team build delivers a comparable artifact at quality bar X within Y elapsed time." X and Y wait for evidence from Chapter 1.

A criterion that is not yet testable is not yet a success criterion. Requirements without testability are aspirations.

---

## 4. Non-goals

What ATC is **explicitly NOT.** Each line is a guardrail against future scope creep.

- **NG1.** ATC is **not** a CE fork. CE is inspiration and benchmark; ATC's orchestrator is its own (per ADR-002).
- **NG2.** ATC is **not** a regulatory compliance framework. Internal risk-averse, no external regulator (per ADR-003). Compliance-specific extensions can ride on top later if a regulator enters scope.
- **NG3.** ATC is **not** a generic agentic SDLC. Designed for Azure data engineering. Generality kills depth.
- **NG4.** ATC is **not** a Databricks-only or ADF-only methodology. It's the full Azure data stack: ADF, Databricks, Unity Catalog, ADLS Gen2, Delta Lake.
- **NG5.** ATC does **not** build coordination for problems that haven't happened yet (per YAGNI / ADR-011). Flags stay in the failure-mode docs; implementations land against real use cases.
- **NG6.** ATC does **not** replace humans. It elevates them from typing code to directing agents and reviewing outcomes. The two human gates and continuous observability are the load-bearing claim against "removing the humans."
- **NG7.** ATC is **not** a closed product. Skill bodies are portable across [agentskills.io](https://agentskills.io) runners. Vendor lock would betray the design.

---

## 5. Functional requirements (what ATC does)

The methodology must do these things on every project run.

- **F1.** Run any data-engineering PRD through nine phases — Brief, PRD authoring, Spec, Phased plan, Deepening, Execute, Review, Documentation, Evidence — to a release-ready package.
- **F2.** Stage authoring (Phases 1–2) is human-directed, agent-supported. Stage execution (Phases 3–9) is agent-driven, observable. Release is human-approved.
- **F3.** Two human gates **MUST** be present and **CANNOT** be bypassed: **PRD-lock** (between authoring and execution) and **Evidence-lock** (between execution and release).
- **F4.** An **ATC Tower observability layer** exposes, at any time during Stage execution: which phase is running, which agents are in flight, which artifacts are accumulating, which gates are pending. Humans observe; they do not have to gate each step.
- **F5.** Every project produces a single comprehensive **evidence package** (a directory of files, format defined in Phase 3 SPEC) covering: agent action log, code review approvals, test results, lineage attestation, RTM coverage report, deploy attestation, human approval signatures.
- **F6.** Code review uses **multi-angle parallel agent fan-out** — at minimum: security, performance, correctness, simplicity, plus data-platform-specific reviewers triggered by file-glob match.
- **F7.** Per-phase artifacts persist in human-readable form (Markdown + structured data files: JSON, CSV, SQL). No proprietary formats for any pipeline artifact.
- **F8.** Per-phase work runs in a dedicated git worktree at `<repo>/.claude/worktrees/<phase>-<ticket>/`; one PR per phase; orchestrator owns push authority (per ADR-009).
- **F9.** Institutional memory: every project's solved problems distill back into `docs/solutions/` (per CE's `compound` skill, reused verbatim) and `docs/insights/` for hard-won lessons. Future projects benefit automatically.
- **F10.** Project setup writes an `atc.local.md` per project: reviewer roster, conditional file-glob mappings, optional overrides. The orchestrator reads it.

---

## 6. Non-functional requirements (how ATC behaves)

- **N1. Skills-forward.** Reuse Anthropic, Databricks, CE, and community skills before building. Build only what doesn't exist mature elsewhere — primarily the data-platform reviewer fleet (per Phase 1B landscape).
- **N2. Skill bodies portable.** No plugin-namespaced internal references in any ATC SKILL.md. Skills must run on Claude Code, Codex, Cursor, Copilot, Gemini CLI without modification. Validated by `agentskills.io` validator + at least one cross-runner test.
- **N3. Skills 2.0 Level 3 commit bar** for every ATC-authored skill: SKILL.md + README.md + DECISIONS.md + `evals/` directory + pass-rate threshold (70% reference / 80% workflow / 90% side-effect / 95%+ safety-critical, picked per skill in DECISIONS.md).
- **N4. Markdown source of truth.** Microsite, slide deck, and any future surface render from the same Markdown corpus. No content lives in a proprietary format upstream of the docs.
- **N5. Methodology lean. Outputs maximalist** (per ADR-012). Every requirement above is in service of this asymmetry. When in tension, cut machinery, keep output quality.
- **N6. GitHub-native source control.** Worktree-per-phase, one PR per phase, orchestrator-pushed (per ADR-009). Branch protection on main, required PR review for the autonomy-ladder gates.
- **N7. Evidence-package legibility.** A risk-partner reading the evidence package as a stranger can answer (a) what was changed, (b) who/what changed it, (c) what was reviewed, (d) what was tested, (e) what would roll back. No background knowledge of ATC required.
- **N8. Citation hygiene** (per [insight #01](../docs/insights/01-research-agents-paste-plausible-but-wrong-citations.md)). Every load-bearing URL/date/version in any ATC artifact verified at synthesis time. Counts in audit logs, not body text.
- **N9. Institutional-memory loop.** ATC inherits the standing `/brief` + `/distill` + `docs/insights/` + `docs/solutions/` workflow already in Briggsy's environment. Skills written for ATC may extend the loop; they do not replace it.

---

## 7. Constraints

The non-negotiable environment ATC must fit into.

- **C1.** Briggsy's team uses Claude Code as the primary runner today, but skill bodies must port elsewhere (NG7).
- **C2.** Stack scope is Azure data engineering: **ADF, Databricks, Unity Catalog, ADLS Gen2, Delta Lake.** Fabric, Synapse, and Power Platform are explicit deferrals (revisit when a real project enters scope).
- **C3.** Internal risk-averse environment, no formal external regulator (per ADR-003). Evidence package optimizes for internal credibility, not auditor box-ticking.
- **C4.** Visual / aesthetic outputs (microsite, deck) **MUST** carry the WOW bar (per `feedback-water-beads-polish`, `feedback-wow-over-simplicity`). Generic AI-aesthetic deliverables are a P0 failure mode.
- **C5.** Briggsy is colorblind. Claude owns palette decisions for any visual artifact. Color-only meaning is forbidden; sufficient luminance contrast is required.
- **C6.** Phase 1B–Phase 9 sequence is locked (per `stop-after-every-phase`); each phase produces one artifact, gets review, then the next phase starts.
- **C7.** No deploy-collision coordination is built until a project actually needs parallel deploys (per ADR-011). The flag stays in `agentic-execution-pattern.md`.

---

## 8. Risks + mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | Agent quality drift over time (model updates, skill rot) | Evals committed alongside skills; baseline A/B pass-rate run on every skill release; monthly cross-model regression check post-launch |
| R2 | Evidence package incomplete on first attempt | Evidence-lock gate refuses passage with a structured "what's missing" report; humans see the gap, agents iterate |
| R3 | Risk partner pushback at first project | `03_AUDIT.md` addendum specifically addresses the most common objections before they're raised; ATC Tower transparency makes "what is the agent doing right now?" answerable in real time |
| R4 | Scope creep into "build everything" | ADR-012 + ADR-011 + N1; every BUILD-OWN candidate must justify against a real, current use case |
| R5 | Orchestrator skill becomes plugin-coupled (the trap CE fell into) | Portability test in evals; review checklist explicitly forbids plugin-namespaced refs in SKILL.md bodies; cross-runner smoke test required for orchestrator changes |
| R6 | Microsite / deck rot as content evolves | Single-source architecture: both render from the Markdown corpus. CI builds them on every merge. |
| R7 | Methodology applies poorly outside Azure data engineering | NG3: it's not supposed to. Any future generalization is a separate methodology. |
| R8 | Citation drift — load-bearing URLs go stale | N8 + audit-log footers in each doc + spot-check before any external publication |
| R9 | Pilot-driven over-fit (the "design works only for the first project" failure) | S6 explicitly demands three distinct project types before declaring methodology success |

---

## 9. Out of scope (today — explicit YAGNI list)

These are deferred. Don't build them. Don't design for them.

- Deploy-collision coordination protocols (ADR-011)
- Formal regulatory compliance schemas (SOX, HIPAA, GDPR) *(no humans doing this today; build only when needed)*
- Microsoft Fabric / Synapse / Power Platform integration *(Briggsy's team does not have Fabric today; future work)*
- Multi-tenant ATC (one ATC instance serving multiple unrelated teams)
- ATC-as-a-service offering (productizing for external teams)
- IDE integrations beyond Claude Code's native runner
- A user-facing dashboard separate from the ATC Tower observability layer
- Continuous-deployment automation past the evidence-lock gate (release stays human-triggered)
- Anything that would require Briggsy's team to install non-Claude-Code infrastructure today

Each item lands as a separate ADR + scope expansion if and when a real use case demands it.

---

## 10. Open questions for Phase 3 SPEC

These are explicitly punted to architecture, not requirements.

- **Q1.** Should Phase 6 (Execute) use Anthropic's Agent Teams primitive or manual subagent spawning? (Phase 1B research raised this; both work.)
- **Q2.** Evidence-package on-disk format: directory of Markdown + JSON + CSV, or a single bundle file format? (Affects how risk partners consume it.)
- **Q3.** ATC Tower observability mechanism: file-based NDJSON log + simple HTML viewer, or richer (Databricks App MCP, etc.)?
- **Q4.** Orchestrator triggering: explicit `/atc:run` slash command only, or auto-trigger on PRD presence in the right directory?
- **Q5.** Cross-runner portability test mechanism: which non-Claude-Code runner do we use as the smoke-test target?
- **Q6.** RTM curation: live in Markdown table + always-run agent (per CE-style), or a dedicated structured-data file with a viewer? (Affects how the RTM appears in the evidence package.)

Phase 3 SPEC resolves each of these into a locked design; new ADRs land for any choice that changes the methodology's surface.

---

## 11. What this PRD does not lock

So we're explicit:

- **Skill bodies.** SKILL.md content is Phase 3+ work.
- **Specific eval cases.** Per-skill evals belong to per-skill DECISIONS.md.
- **Microsite visual design.** Phase 7 — owned by Claude with Briggsy review (per C5).
- **Worked example details.** Phase 6 — abstract reference example chosen at write time.
- **Specific reviewer agent names** (e.g., exact names of `pyspark-performance-reviewer` etc.) — Phase 4 — names lock when we write the per-phase skill specs.

This PRD is the contract. The contract is intentionally short.
