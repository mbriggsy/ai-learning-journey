# ATC — TODO

> **Last updated:** 2026-04-25 end-of-session (Phase 2 closed; squeaky-clean ran).
> **Resume here when continuing.**

---

## Done

- ✅ **Phase 0** — Alignment decisions locked (ADRs 1–8 initial, then 9–13 added through Phase 1B+2)
- ✅ **Phase 1A** — Skills landscape research (5 parallel agents, broad sweep across Microsoft, Databricks, Anthropic, community, CE, worktrees)
- ✅ **Phase 1B** — Synthesis into 3 reference docs: `data-engineering-skills-landscape.md`, `agentic-execution-pattern.md`, `ce-comparison.md`
- ✅ **Phase 1B-VERIFY** — Citation audit (~9 stale URLs replaced via gemini-grounding, counts softened, X tweet IDs removed, audit logs appended to each doc)
- ✅ **Phase 2** — Methodology PRD with Chapter 1 / Chapter 2 framing per ADR-013

## Up next — Phase 3

**`reference/SPEC.md` + `reference/skills-catalog.md`** — skill graph, composition, hooks layout, MCP scoping, ATC Tower architecture. Resolves the six open questions in PRD §10.

### Open questions Phase 3 must resolve

1. **Q1.** Phase 6 execution: Anthropic Agent Teams primitive or manual subagent spawning?
2. **Q2.** Evidence-package on-disk format: directory of Markdown + JSON + CSV, or single bundle file format?
3. **Q3.** ATC Tower observability mechanism: file-based NDJSON log + simple HTML viewer, or richer (e.g., Databricks App MCP)?
4. **Q4.** Orchestrator triggering: explicit `/atc:run` slash command only, or auto-trigger on PRD presence?
5. **Q5.** Cross-runner portability smoke-test: which non-Claude-Code runner is the target?
6. **Q6.** RTM curation: live in Markdown table + always-run agent, or dedicated structured-data file with a viewer?

### What Phase 3 produces

- `reference/SPEC.md` — architecture / composition / hooks / MCP / Tower
- `reference/skills-catalog.md` — every ATC skill with name, purpose, REUSE/ADAPT/BUILD-OWN, pass-rate threshold, and which phase it serves

## After Phase 3 — sequenced

- **Phase 4** — Per-phase skill specs in `02_PHASES.md` (one phase per pass, **stop+review** per `feedback-stop-after-every-phase`)
- **Phase 5** — Narrative docs: `00_START.md` (mental model) + `01_RUN.md` (end-to-end walkthrough) + `03_AUDIT.md` (evidence package + risk-partner addendum)
- **Phase 6** — Worked example inside `01_RUN.md` — **a Chapter 1 walkthrough** (RE-driven rebuild, output-match as the spine of the evidence package)
- **Phase 7** — Microsite: custom HTML scrollytelling, ATC metaphor done literally (runways = phases, planes = skills, tower = observability), embedded mock-live ATC Tower dashboard, aviation palette
- **Phase 8** — Slide deck (Reveal.js alt-mode of microsite OR Pitch deck mirroring its visuals)
- **Phase 9** — Executive summary (1–2 page leadership-voice distillation)
- **Phase 10** — Final ADR audit + DECISIONS.md polish

## Working rules locked for this project

- **ADR-012** — ATC minimalist, outputs maximalist. When in tension, cut machinery, keep output quality.
- **ADR-013** — Chapter 1 (RE-driven proving ground) → Chapter 2 (greenfield). Every external surface leads with the arc.
- **Stop after every phase.** Write one phase, present, get review, then next.
- **Citation hygiene** per `docs/insights/01-research-agents-paste-plausible-but-wrong-citations.md`. Verify URLs/dates before they calcify. Counts in audit logs, not body text.
- **Skills-forward.** Reuse Anthropic + Databricks + CE before building. Build only the data-engineering gap.
- **No deploy-collision coordination yet** (per ADR-011). Flag stays in `agentic-execution-pattern.md`; mutex builds only when a real project hits parallel deploys.

## Landmines / gotchas

- **`anthropic.com/news/<slug>` URLs are unreliable.** Anthropic content splits across `claude.com/blog/`, `anthropic.com/engineering/`, and `anthropic.com/news/`. Always verify before citing.
- **X.com returns HTTP 200 for any status path.** HTTP 200 ≠ "tweet exists." Don't cite specific tweet IDs without authenticated verification.
- **Catalog counts drift fast.** CE skill counts, Azure MCP tool counts, anthropics/skills inventory — keep these in date-stamped audit logs, never in body text.
- **`microsoft/mcp` is a CATALOG**, not just "the Azure MCP Server." `Azure.Mcp.Server` + `Fabric.Mcp.Server` are the two production servers it ships.
- **CE has Rails-shop DNA** in many of its reviewer agents. ATC inherits the orchestrator pattern + 5 generic reviewer bodies, NOT the Rails-flavored ones.
- **`docx`/`pdf`/`pptx`/`xlsx` Anthropic skills are source-available** (not Apache-2). Verify enterprise rights before depending in audit deliverables.
- **CLAUDE.md does NOT auto-load into spawned subagents** (incl. `context: fork`). If a subagent needs project context, declare via `skills:` field or pass in the spawn prompt.

## Companion projects

- [`../etl-reverse-engineering/`](../etl-reverse-engineering/BRIEF.md) — produces the rebuild-ready PRDs that ATC consumes in Chapter 1. Pre-plan brainstorm. Pilot job not yet selected.
