# ATC — Decisions Log (ADRs)

Each entry locks a load-bearing architectural decision with the date, alternatives considered, and reasoning. Decisions can be revised by adding a new entry that supersedes (and links to) the old one. **Never delete an ADR** — supersede it instead, so the historical reasoning survives.

This is the answer to "why did you build it this way?" — written down once, surviving every future challenge.

---

## ADR-001 — Methodology name: ATC

**Date:** 2026-04-25
**Status:** Locked

The methodology is named **ATC**. The metaphor (Air Traffic Control) is load-bearing — humans direct/approve, agents execute the flights, and the observability layer is the ATC Tower.

**Alternatives considered:**
- *"Agentic Data Engineering SDLC"* — too generic; no identity.
- *"Pilot/ATC"* — redundant; ATC implies pilots.
- Unnamed — kills brand, kills shareability.

**Why ATC wins:** identity + metaphor coherence. The metaphor encodes the authority model — every word ("tower," "runway," "clearance," "in flight," "gate") maps onto the methodology and is internally consistent. The team will use the metaphor's vocabulary unprompted, which is the cheapest possible alignment mechanism.

---

## ADR-002 — Orchestrator: build our own, CE-inspired

**Date:** 2026-04-25
**Status:** Locked

ATC is implemented as a **library of skills + an own-built orchestrator skill** that runs them. CE-the-product is inspiration and benchmark, not a dependency.

**Alternatives considered:**
- (a) Use CE-the-product as the runner, wrap data-engineering skills around it.
- (b) **Build our own orchestrator skill.** *(Selected.)*
- (c) Two-track: build (b) but keep (a) as a fallback runner.

**Why (b) wins:**
1. **Portability.** SKILL.md bodies travel to any [agentskills.io](https://agentskills.io)-compatible runner (Codex, Cursor, Copilot, Gemini CLI). IP isn't trapped in one vendor's orchestrator.
2. **Customization.** Data engineering needs `context: fork` for codebase audits, parallel fan-out for multi-angle reviews, MCP scoping for Azure / Databricks / Unity Catalog. Our orchestrator is designed around those primitives from day one.
3. **Risk-partner story.** Every skill carries its own DECISIONS.md and evals. The audit trail is self-contained, not "trust this third-party runner."

**What we steal from CE:** the phase model concept, the brief→plan→execute→review→ship loop, the "skills compose, agents don't" philosophy, the use of subagents for tool-restricted specialists. See `reference/ce-comparison.md` (planned).

**Cost:** more work up front. Mitigated by skills-forward composition — most phases reuse existing community skills, we only build the orchestration layer and the data-engineering-specific skills.

---

## ADR-003 — Risk environment: internally risk-averse, no formal regulator

**Date:** 2026-04-25
**Status:** Locked

ATC must satisfy internal risk partners and skeptical leadership. There is **no formal external regulator** (no SOX, HIPAA, GDPR audit relationship) driving evidence-package format.

**Implication:** the evidence package is designed for **internal credibility**, not external compliance certification. Format is shaped by what convinces risk partners and disarms haters, not by what an auditor's checklist demands. This affects `03_AUDIT.md` content materially: we optimize for legibility and reproducibility, not for box-ticking.

**Future:** if a formal regulator enters the picture, we revise this ADR and the evidence-package format expands accordingly. Designing for internal-credibility-first means the format will only need to be **augmented**, not redesigned, when that day comes.

---

## ADR-004 — Authority model: two-stage autonomy ladder + ATC Tower

**Date:** 2026-04-25
**Status:** Locked

ATC adopts a **two-stage autonomy ladder** with a continuous observability layer.

```
STAGE 1 — Authoring (human-directed, agent-supported)
  ├─ Brief / discovery        — back-and-forth between human and agent
  ├─ PRD authoring            — agent drafts, human shapes/approves
  └─ ⛔ PRD LOCK GATE         — explicit human sign-off, locked in writing

STAGE 2 — Execution (agent-driven, human-OBSERVED via ATC Tower)
  ├─ Spec authoring
  ├─ Phased plans
  ├─ Deepening
  ├─ Execution (with /brief and /distill)
  ├─ Code review
  ├─ Documentation
  ├─ Evidence assembly
  └─ ⛔ EVIDENCE LOCK GATE    — explicit human sign-off on the package

STAGE 3 — Release (human-approved)
  └─ Human merges and ships
```

**ATC Tower (observability layer)** runs continuously through Stage 2. Humans see what each agent is doing in real time — task tracker, activity log, pipeline status, in-flight artifacts — without gating each step.

**Why this model:**
- It's how we work today on top-down racer, BURNED, and similar projects. We are documenting a proven loop, not inventing one.
- Risk partners get **two human gates** (PRD lock, evidence lock) plus continuous observability. That's *more* human review surface than a typical hand-coded project, not less.
- Reframes the doc's positioning: ATC is **human-elevated, not human-removed**. Engineers shift from typing code to directing agents and reviewing outcomes.

**Failure modes designed-around:**
- Agent runs off the rails between gates → ATC Tower surfaces the deviation; human can pause Stage 2 at any point.
- Evidence package is incomplete → Evidence lock gate refuses to pass; package gets back to the agents to complete.
- PRD is wrong → humans see the deviation in Stage 2 outputs, can revise the PRD and re-enter Stage 2 from any phase.

---

## ADR-005 — Pilot anchoring: abstract reference example

**Date:** 2026-04-25
**Status:** Locked

The methodology document is anchored on an **abstract reference example**, not a real pilot ETL job.

**Reasoning:** ATC is a reusable methodology. Tying the doc to one specific pilot would:
- Couple the doc to that pilot's quirks (a job's framework choice, schema, business domain).
- Bias readers toward thinking ATC only works for "ETL like that one."
- Slow the doc down — we'd have to wait for a pilot to complete before publishing.

**What's in the doc:** an abstract reference example for `01_RUN.md`'s walkthrough. Realistic but not real. Demonstrates every gate, every artifact, every ATC Tower view, without depending on a specific job.

**Future:** when a real pilot completes (likely the first ETL rebuilt by combining `etl-reverse-engineering` + ATC), it lands in `01_RUN.md` as a *case study* alongside the abstract example. Both stay.

---

## ADR-006 — Source control: GitHub + git worktrees (provisional)

**Date:** 2026-04-25
**Status:** Superseded by ADR-009 (2026-04-25) — direction confirmed and locked after Phase 1B research return.

> **Original status (for the record):** Provisional (pending Phase 1 research return on Boris Cherny pattern + Anthropic guidance)

ATC runs on **GitHub** for source control. Agent isolation uses **git worktrees** — likely the Boris Cherny pattern, pending Phase 1 research return.

**Locked direction:**
- Each major phase that mutates code runs in its own worktree.
- Each worktree feeds a single PR.
- PRs are gated by the autonomy ladder (PRD-lock = first PR threshold; evidence-lock = release-PR threshold).
- Cleanup is owned by the orchestrator skill (post-merge worktree removal).

**Open questions** (resolve in Phase 1B synthesis):
- One agent per phase, each in its own worktree, OR parallel agents in separate worktrees on the same branch?
- Failure modes: race conditions on shared resources, multi-agent push collisions, merge-conflict resolution authority.
- Worktree-cleanup convention (auto-cleanup on PR merge, manual gc, etc.).

**Why provisional:** the right pattern depends on what Anthropic + Boris have published. We commit to GitHub + worktrees as the direction; the *exact* shape lands in Phase 1B alongside the skills-landscape doc.

---

## ADR-007 — Delivery formats: three coordinated layers, one source

**Date:** 2026-04-25
**Status:** Locked

ATC delivers in three coordinated formats, all driven from the same source content.

| Layer | Format | Audience | Purpose |
|---|---|---|---|
| **The Repo** | Markdown in `projects/data-engineering/atc/` | Engineering team | Engineering-grade source of truth, version-controlled, where the work happens. |
| **The Microsite** | Custom HTML scrollytelling page (`microsite/index.html`), GitHub Pages deployable | Anyone with a browser — engineering, leadership, risk partners | The WOW artifact. ATC metaphor done literally (runways = phases, planes = skills, tower = observability). Embedded mock-live ATC Tower dashboard widget. |
| **The Slide Deck** | Reveal.js alt-mode (`microsite/deck.html`) — same source, slide-presentation view — OR a Pitch deck mirroring the microsite visuals | Leadership readouts, offline meetings | Same metaphor, same colors, same message. Engineers scroll the page; leadership flips through slides. |

**Why this combination:** WOW over simplicity (per memory: `feedback-wow-over-simplicity.md`). Markdown alone is engineering-credible but not jaw-dropping. Slides alone are leadership-credible but lack depth. The microsite is the unifier — it carries the WOW, makes the metaphor literal, and renders the same content as both scroll-page and slide-deck.

**Aviation-inspired palette** owns the metaphor visually: deep navy, runway markings, taxiway yellow, FAA-chart greens, runway-end red. (Briggsy is colorblind — Claude owns palette decisions; sufficient luminance contrast is a hard requirement, color-only meaning is forbidden.)

**Out of scope (for now):** Confluence, Notion, Sharepoint mirrors. Future ADR if/when adopted.

---

## ADR-008 — Phase 1 (skills landscape research) scope: broad

**Date:** 2026-04-25
**Status:** Locked

Phase 1 is a **broad gemini-grounding sweep** across:
1. Microsoft / Azure published agentic skills (ADF, Fabric, Synapse, Power Platform, Microsoft Graph)
2. Databricks published agentic skills + Mosaic AI / Databricks Assistant ecosystem
3. Anthropic + community skills (anthropics/skills repo, agentskills.io clients, community PySpark / Delta / Unity Catalog)
4. Boris Cherny + Anthropic guidance on git worktrees + agentic dev patterns
5. Compound Engineering current state + code-review skills landscape

**Outcome:** `reference/data-engineering-skills-landscape.md`, `reference/agentic-execution-pattern.md`, `reference/ce-comparison.md`. Each item gets a verdict: REUSE / ADAPT / IGNORE / BUILD-OWN.

**Why broad first:** we don't know what we don't know. Trim is cheap; rediscovery is expensive. We'd rather see "Microsoft published nothing for ADF as of today" written explicitly than discover it during Phase 4 and have to redesign.

**Out of scope for Phase 1:** detailed skill design (that's Phase 3), per-phase skill specs (Phase 4), or any code. Phase 1 is research and synthesis only.

---

## ADR-009 — Worktree pattern: per-phase, one PR per phase, orchestrator-pushed

**Date:** 2026-04-25
**Status:** Locked (supersedes ADR-006)

ATC executes work in **per-phase git worktrees** at `<repo>/.claude/worktrees/<phase-id>-<phase-name>-<ticket>/`, with **one PR per phase**. The orchestrator skill owns push authority; subagents commit-only inside their assigned worktree. During Phase 6 (Execute), subagents are spawned with Anthropic's native `isolation: worktree` frontmatter.

**Alternatives considered:**
- (a) Worktree-per-agent across the board.
- (b) **Worktree-per-phase, with subagent isolation inside execute.** *(Selected.)*
- (c) Worktree-per-PR-author (Boris Cherny's batched-migration pattern).
- (d) No worktrees — single working tree, agents coordinate via locks.

**Why (b) wins:**
1. ATC's 9 phases are mostly sequential; only Phase 6 fans out. (a) and (c) over-spawn worktrees for sequential authoring phases.
2. Phase-coupled changes (e.g., Delta schema change + writer + consumer) belong in one PR, not N. (c) breaks coupling visibility.
3. Anthropic's native `isolation: worktree` subagent primitive (announced Feb 2026) gives us (a)'s benefit *inside* phase 6 without spawning N top-level worktrees.
4. (d) sacrifices Boris's productivity unlock and breaks the audit-trail-per-phase model.

**Authority model:**
| Action | Who | Why |
|---|---|---|
| Spawn worktree | Orchestrator | Centralized control |
| Commit | Subagents | Each in its assigned worktree |
| **Push** | **Orchestrator only** | Serializes pushes — no remote collisions |
| Open PR | Orchestrator | Centralized PR description authoring |
| **Merge PR** | **Human** | Autonomy-ladder gate |
| Delete worktree | Orchestrator (post-merge hook) + Anthropic auto-cleanup | Belt-and-suspenders |

**Implications:**
- ATC commits a `.worktreeinclude` at repo root listing secrets to auto-copy (`.env`, `.databrickscfg`, `azure-credentials.json`, etc.).
- ATC ships a `WorktreeCreate` hook to allocate ports (`BASE_PORT + worktree_index * 10`) and deploy targets.
- See [`reference/agentic-execution-pattern.md`](agentic-execution-pattern.md) for the full pattern.

**Affected docs:** `reference/agentic-execution-pattern.md`, `reference/SPEC.md` (planned), `reference/skills-catalog.md` (planned), `02_PHASES.md` (planned).

---

## ADR-010 — Deploy collisions: orchestrator-held mutex (default), per-worktree targets (optimization)

**Date:** 2026-04-25
**Status:** Superseded by ADR-011 (2026-04-25) — deferred per YAGNI; pilot ATC use cases are sequential, no collision to solve yet.

The data-engineering-specific landmine that no published guidance covers: **two parallel agents both running `databricks bundle deploy --target dev` (or `az datafactory pipeline create-or-update`) against the same workspace will race**. The git layer is fine; the *deployed-state layer is shared infrastructure outside git*.

ATC adopts:
- **(b) Deploy mutex held by the orchestrator** *(default)*. Subagents request "deploy clearance" from the orchestrator; the orchestrator grants one deploy at a time. Matches the ATC metaphor (clearance from the tower) and is the simpler design.
- **(a) Per-worktree deploy targets** *(optimization, opt-in)*. Each worktree gets its own Databricks bundle target (`dev-worktree-02`, `dev-worktree-06`) and worktree-suffixed ADF pipeline names. Faster parallel execution, requires more dev infrastructure.

**Alternatives considered:**
- (a)-only — too much dev-infrastructure proliferation for ATC's normal sequential workload.
- (b)-only — caps parallelism even when projects could benefit; locks us out of Boris-style 10-parallel migrations.
- No coordination — accept races, retry on failure. **Rejected** — risk-partner-unacceptable; failed deploys against shared dev infrastructure are visible and auditable as incidents.

**Why this combination wins:** (b) is the default because most ATC work is sequential; the mutex is a tiny coordination overhead. (a) is available when a project explicitly wants parallel execution and has the dev-infrastructure budget.

**Implications:**
- ATC ships an `atc-deploy-mutex` skill that subagents call before any deploy operation. The skill blocks until clearance is granted, then writes a deploy-attempt record into the ATC Tower log.
- The mutex protocol (file-based lock vs. orchestrator-process-singleton vs. Databricks UC table-row lock) is finalized in Phase 3 SPEC.
- Per-worktree deploy targets, when adopted, are allocated by the `WorktreeCreate` hook and reclaimed by the post-merge hook.

**Affected docs:** `reference/agentic-execution-pattern.md`, `reference/SPEC.md` (planned), `reference/skills-catalog.md` (planned, includes `atc-deploy-mutex`).

---

## ADR-011 — Deploy collision handling: deferred per YAGNI

**Date:** 2026-04-25
**Status:** Locked (supersedes ADR-010)

ATC's pilot use cases run **sequentially**: one phase at a time, one deploy at a time per project. The deploy-collision scenario (two parallel agents both running `databricks bundle deploy --target dev`) only emerges when Phase 6 (Execute) fans out to subagents that *each* perform deploys against shared infrastructure.

**This is not the pilot use case. Per YAGNI, ATC defers the deploy-mutex protocol and the `atc-deploy-mutex` skill until the first project that actually needs parallel deploys.**

**Alternatives considered:**
- ADR-010 (superseded): build the orchestrator-held mutex skill now, design for parallel deploys from day one.

**Why deferring wins:**
1. Pilot ATC projects are sequential — there is no parallel-deploy collision to solve.
2. Building a mutex protocol now codifies a design we may never use, and it complicates the skills catalog.
3. The collision risk is **documented as a flag** in [`agentic-execution-pattern.md`](agentic-execution-pattern.md) (Failure Mode 3). Engineers running ATC on a project that drifts toward parallel deploys will see the warning and add coordination at that point — against a real use case.
4. Per-worktree deploy targets remain available as a future option without the mutex layer.

**What this changes:**
- `atc-deploy-mutex` removed from the BUILD-OWN execution-skills list.
- "Deploy clearance" subagent protocol — deferred.
- Phase 3 SPEC does not commit to a mutex protocol.
- The failure-mode flag stays in `agentic-execution-pattern.md` so the constraint is visible without the implementation overhead.

**Trigger for revisiting:** the first ATC project that introduces parallel subagent deploys against shared dev infrastructure. At that point, pick (a) per-worktree targets or (b) orchestrator-held mutex against the actual use case, and write a new ADR.

**Affected docs:** `reference/agentic-execution-pattern.md` (Failure Mode 3 softened), `reference/data-engineering-skills-landscape.md` (`atc-deploy-mutex` removed from BUILD-OWN + composition map).

---

## ADR-012 — Design philosophy: ATC is minimalist, its outputs are maximalist

**Date:** 2026-04-25
**Status:** Locked. Foundational — every subsequent ADR and skill design respects this asymmetry.

**The methodology itself is lean. The artifacts it produces are world-class.**

This is the load-bearing design philosophy for ATC. The asymmetry is deliberate.

**Minimalist machinery (what ATC IS):**
- Few skills — only those that earn their place against a real, current use case (YAGNI throughout — see ADR-011 for the canonical example)
- Few human gates — PRD lock, evidence lock; that's it
- Few moving parts — one orchestrator skill, file-glob conditional reviewers, no speculative coordination protocols
- Few standing rules — no rules-for-rules-sake
- Plain markdown source of truth — no proprietary formats, no vendor lock-in
- Portable skill bodies — no plugin-namespaced internal references; skills travel to any agentskills.io runner

**Maximalist outputs (what ATC PRODUCES):**
- PRDs are world-class — RTM-driven, lineage-first, "wow" from the best ETL engineers
- Specs are paint-by-numbers detailed (per `feedback-plans-are-baking-recipes`)
- Code is polished, tested, reviewed by multi-angle agent fan-out
- Documentation is onboarding-grade — a stranger picks up the project cold and is productive fast
- Evidence package is comprehensive enough to disarm any risk-partner objection
- Worked examples are jaw-dropping
- Microsite is stunning — water-beads polish (per `feedback-wow-over-simplicity`)

**Why the asymmetry wins:**
1. **The machinery is what we maintain forever.** Lean = debuggable, portable, easy to audit, hard to break. Every line of methodology is one we'll re-read on a Tuesday morning at 8 AM.
2. **The outputs are what risk partners, leadership, and engineers actually see.** Maximalist = the methodology proves itself in every deliverable, every release.
3. **Without the asymmetry, you get the worst of both worlds:** complex machinery (hard to maintain) producing average outputs (no one impressed). Most "agentic SDLC" pitches fail here.

**How to apply (the rule, every time):**
- Every new skill on the BUILD-OWN list must justify itself against a real, current use case — not a speculative future one.
- Every output artifact gets the WOW treatment — depth, polish, presentation, evidence.
- When the two are in tension: **cut machinery, keep output quality.**

**The metaphor, literally.** An ATC tower is one room, a few screens, a few people. The flights it manages are 747s carrying hundreds of passengers and tons of cargo. The system is small. The traffic is enormous. ATC the methodology = the tower. ATC's outputs = the flights.

**Affected docs:** every downstream doc and skill. ADR-012 is foundational; cite it whenever a "should we add X?" question comes up.

---

## ADR-013 — Adoption arc: Chapter 1 (RE-driven proving ground) → Chapter 2 (greenfield)

**Date:** 2026-04-25
**Status:** Locked. Foundational alongside ADR-012 — every external-facing artifact (microsite, exec summary, risk-partner addendum) leads with chapter framing.

ATC adopts in two chapters with deliberately different ambition levels.

### Chapter 1 — Proving ground (current)

Pair ATC with the companion [`etl-reverse-engineering`](../../etl-reverse-engineering/BRIEF.md) skill. Take an existing shit-show ETL job, reverse-engineer it into a rebuild-ready PRD, and run that PRD through ATC. **The rebuild's output must match the original's output**, modulo documented intentional divergences for flagged correctness issues (per the RE brief's RTM `divergence` column).

**Why RE-driven rebuild is the right Chapter 1:**

1. **Ground truth exists.** The original job produces output. ATC's rebuild produces output. Side-by-side diff is the proof. No AI hype, no subjective quality judgments, no trust required — just `output_rebuild == output_original`.
2. **Risk partners can't reasonably dismiss it.** The test doesn't depend on whether they "believe in agentic SDLC." It depends on whether the data matches.
3. **Failure mode is obvious.** If output doesn't match, ATC failed for that project. No rationalization possible. The methodology surfaces the failure cleanly via the RTM coverage report.
4. **Track record compounds.** By project #3 the empirical case has been made. Each completed Chapter 1 project banks credibility for Chapter 2.

### Chapter 2 — Greenfield (future, change-the-world)

Once Chapter 1 has established credibility, ATC unleashes on greenfield data engineering: net-new pipelines, net-new schemas, net-new DQ flows. **"Elite virtual data engineering teams"** — agents standing in for a team of expert engineers, with one orchestrator coordinating, full ATC pipeline, world-class delivery, no human writing code in the middle.

Greenfield has no output-diff testbed (no original to match), but by Chapter 2 the methodology has Chapter 1's track record to lean on.

### Implications for the docs we write

- **Chapter 1 success criterion is empirical:** rebuild output matches original output (with documented intentional divergences). See PRD §3, S6.
- **Chapter 2 success criteria are deferred** until Chapter 1 has produced enough projects to lock the methodology and the metric set. Don't over-design Chapter 2 today.
- **All external-facing surfaces** (microsite Phase 7, slide deck Phase 8, exec summary Phase 9) lead with chapter framing. It's the most defensible story for risk partners and the most ambitious story for leadership.
- **Risk-partner story leans on Chapter 1's empiricism.** "Match the original output" is a test risk partners understand and can't argue with.

### Alternatives considered

- **(a) Greenfield-first.** Rejected: no ground truth, hardest to defend at first project. The exact opposite of the empirical-proof-first instinct ATC is built around.
- **(b) Mixed Chapter 1** — any project type as long as the methodology runs. Rejected: dilutes the empirical claim. Chapter 1 needs the same shape every time so the proof generalizes cleanly.

### Affected docs

- `reference/PRD.md` §1 (Purpose), §3 (Success Criteria), §11 (What's not locked)
- Microsite (Phase 7), exec summary (Phase 9), audit addendum (`03_AUDIT.md`) — all lead with chapter framing
- Companion: [`etl-reverse-engineering/BRIEF.md`](../../etl-reverse-engineering/BRIEF.md) — produces the PRDs ATC consumes in Chapter 1

---

## How to add a new ADR

1. Append to this file. Never edit the body of an existing ADR — supersede it with a new one and link the supersession.
2. Use the next sequential number (`ADR-014`, `ADR-015`, ...).
3. Required fields: **Date, Status, Decision, Alternatives considered, Why this wins, Implications.**
4. If the decision affects multiple docs, list the docs in an **Affected docs** field at the bottom.
5. Status values: `Locked` (decided, in effect), `Provisional` (decided pending more info), `Superseded by ADR-NNN` (no longer in effect).
