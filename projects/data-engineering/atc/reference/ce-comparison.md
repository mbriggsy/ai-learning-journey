# CE Comparison — What ATC Steals, What ATC Leaves

> 🚧 **DRAFT — Phase 1B output, citation-audited 2026-04-25.** CE itself moves week-over-week; the *patterns* ATC inherits are stable, the *specific skill names and counts* drift. Re-audit before external publication.
> **Audience:** Engineers familiar with Compound Engineering wondering what's different about ATC. And risk-partners asking "why not just use CE?"

---

## TL;DR

**Compound Engineering's pipeline shape is right. Its skill bodies are mostly Rails/web-shop DNA and don't carry into Azure data engineering.** ATC reuses CE's orchestrator pattern, steals 8–10 of its skills verbatim, and rebuilds the rest as data-engineering-native.

CE remains a benchmark, an inspiration, and (since it's already in our harness) a useful peer that runs alongside ATC during pilot phase. ATC is not a CE fork — it's a CE-inspired sibling with different domain DNA.

---

## Why not just use CE?

CE is the closest existing methodology to ATC's pipeline. We considered (ADR-002):
- (a) Use CE-the-product as the runner, wrap data-engineering skills around it.
- (b) Build our own orchestrator skill, CE-inspired. *(Selected.)*
- (c) Two-track.

We picked (b). The reasons, expanded with what we learned in research:

1. **Portability.** CE skill bodies cross-reference each other via `compound-engineering:` plugin namespaces (e.g., `compound-engineering:research:learnings-researcher`). That breaks if you cherry-pick individual skills onto Codex / Cursor / Copilot. ATC skills are designed standalone-portable — no plugin-namespaced internal references.

2. **Customization.** CE's reviewer fleet is `dhh-rails-reviewer`, `kieran-{rails,python,typescript}-reviewer`, `andrew-kane-gem-writer`, `julik-frontend-races-reviewer`. **Zero data-platform reviewers.** ATC's review phase is the heaviest BUILD-OWN — we'd be replacing 70% of CE's review surface anyway, so building our own orchestrator costs only marginally more than wrapping CE.

3. **Risk-partner story.** Each ATC skill carries its own DECISIONS.md and evals (Skills 2.0 Level 3 commit bar). The audit trail is self-contained. With option (a), the audit trail was "trust this third-party plugin orchestrator" — harder to defend in front of risk partners.

4. **Context-budget churn.** CE's recent CHANGELOG (v2.36 → v2.37) shows real instability around context limits in serial/parallel review modes. We don't want our methodology blocked on someone else's context-budget bug.

5. **Bonded to Claude-Code-specific Task semantics.** CE's orchestration uses Claude Code's Task tool (now Agent tool) directly. ATC writes skill bodies that work on any agentskills.io-compatible runner — the orchestrator handles runtime-specific bits and the skill bodies stay portable.

---

## What ATC steals from CE (the patterns)

### 1. Gated orchestrator with explicit STOP between phases
CE's `/lfg` and `/slfg` orchestrators STOP between phases waiting for human input. ATC adopts this — it IS the autonomy-ladder pattern. ATC's PRD lock and Evidence lock are CE-style STOPs.

### 2. Configurable reviewer roster
CE writes `compound-engineering.local.md` per project to configure which review agents run. ATC adopts the pattern as `atc.local.md`:

```yaml
# atc.local.md — per-project reviewer roster

reviewers:
  always-run:
    - learnings-researcher       # CE skill, reused verbatim
    - atc-rtm-curator            # ATC build-own
  conditional:
    - pyspark-performance-reviewer:    "notebooks/**/*.py"
    - delta-migration-expert:          "**/migrations/*.dlt"
    - unity-catalog-grants-reviewer:   "**/grants/**/*.sql"
    - adf-pipeline-reviewer:           "**/pipelines/*.json"
    - bicep-reviewer:                  "**/*.bicep"
    - terraform-reviewer:              "**/*.tf"
    - pii-phi-scanner:                 always
    - lineage-attestation-reviewer:    "phase >= 7"
```

### 3. Conditional reviewers triggered by file globs
CE: `db/migrate/*.rb` → migration reviewers. ATC: `**/*.dlt`, `notebooks/**/*.py`, `pipelines/*.json`, `*.bicep`, `*.tf`, `bundle.yml`, `**/grants/**/*.sql`.

### 4. Findings-as-files
CE's review writes `todos/{id}-{status}-{priority}-{slug}.md` with YAML frontmatter. ATC adopts this verbatim — these files become **part of the evidence package**, not just review output. Risk partners can grep them.

### 5. Protected artifacts
CE protects `docs/plans/`, `docs/solutions/`, `todos/` from cleanup agents. ATC adds `evidence/`, `evals/`, `decisions/` to the protected list. Critical for audit-trail durability.

### 6. Always-run agents
CE's `learnings-researcher` always grepping `docs/solutions/` is the institutional-memory loop. ATC adopts this — and adds `atc-rtm-curator` as an always-run agent that keeps the Requirements Traceability Matrix current across rebuild commits.

### 7. The compound flywheel
CE's `compound` skill distills solved problems into `docs/solutions/` for future runs. **ATC adopts verbatim** — this is exactly the kind of compounding feedback loop that turns a methodology into a moat.

### 8. Parallel/serial mode auto-switch at 5+ agents
CE auto-switches review fan-out from parallel to serial when agent count crosses 5. ATC inherits — risk-partner reviews routinely cross this threshold.

---

## CE skills ATC reuses verbatim

These CE skills are domain-neutral enough to lift wholesale:

| CE skill | Used in ATC phase | Notes |
|---|---|---|
| `ce-brainstorm` | Phase 1 (Brief) | Collaborative requirements dialogue |
| `ce-plan` | Phases 2, 4 (PRD, Phased Plan) | Both creation and deepen modes |
| `document-review` | Phases 2–3 (PRD, Spec) | Persona-based parallel review |
| `ce-work` | Phase 6 (Execute) | Plan-driven execution |
| `ce-review` (the orchestrator pattern) | Phase 7 (Review) | The *fan-out + synthesis* pattern, not all reviewers |
| `orchestrating-swarms` | Phase 6 | Multi-agent swarm patterns |
| `learnings-researcher` (always-run) | All phases | Institutional memory grep |
| `compound` | Phase 9 (Evidence/Distill) | Distills solved problems |
| `git-worktree` | Infrastructure | KISS worktree pattern (one branch = one worktree) |
| `agent-native-architecture` | Reference | Design philosophy |
| `security-sentinel` | Phase 7 (Review) | Generic security reviewer |
| `performance-oracle` | Phase 7 (Review) | Generic performance reviewer (still need data-platform-specific `pyspark-performance-reviewer` on top) |
| `architecture-strategist` | Phase 7 (Review) | Generic architecture reviewer |
| `code-simplicity-reviewer` | Phase 7 (Review) | Generic simplicity reviewer |
| `pattern-recognition-specialist` | Phase 7 (Review) | Generic pattern reviewer |

---

## CE skills ATC adapts (renames + de-couples)

| CE skill | ATC equivalent | What changes |
|---|---|---|
| `compound-engineering.local.md` | `atc.local.md` | Different roster, data-platform reviewer slots |
| `ce-pr-description` | `atc-pr-description` | Add evidence-package linkage in body, link to RTM coverage report |
| `file-todos` | `atc-todos` | Same shape, evidence-protected directory |
| `setup` skill (writes config) | `atc-setup` | Writes `atc.local.md` with roster defaults for data engineering |

All adaptations: **remove plugin-namespaced internal references** so each skill is standalone-portable.

---

## CE skills ATC leaves behind (and why)

| CE skill | Why leave |
|---|---|
| `dhh-rails-reviewer`, `kieran-rails-reviewer` | Rails-only; ATC has no Rails. |
| `kieran-typescript-reviewer`, `kieran-python-reviewer` | Generic language reviewers — but Kieran's specific bar is web-app coded. ATC builds `pyspark-python-reviewer` with a data-engineering bar. |
| `andrew-kane-gem-writer` | Ruby gem authoring. N/A. |
| `julik-frontend-races-reviewer` | Stimulus/Turbo lifecycle races. N/A. |
| `ankane-readme-writer` | Ruby-gem README style. N/A. |
| `xcode-test`, much of browser-test bias | iOS/web-app testing. ATC tests data pipelines. (`test-browser` REUSED for the microsite only.) |
| `data-migration-expert` (CE's version) | Rails-flavored — ActiveRecord migrations, not Delta MERGE. ATC builds `delta-migration-expert` with the data-platform-specific bar. |

---

## CE patterns ATC explicitly DOESN'T adopt

### Plugin-namespaced agent invocations
CE skills internally reference `compound-engineering:research:learnings-researcher` etc. **ATC skills must be standalone** — no plugin-namespaced internal references. This is non-negotiable for portability.

### Bonded-to-Claude-Code orchestration
CE assumes Claude Code's Task-tool semantics throughout. ATC's *orchestrator* can be runtime-specific, but ATC's *skill bodies* must work on any agentskills.io-compatible runner.

### Lack of formal evidence-package output
CE's `compound` skill captures solved problems for future runs. It doesn't assemble a shippable evidence package targeting risk partners or auditors. **ATC's Phase 9 evidence assembler is net-new** — the gap CE doesn't fill.

### Browser/iOS test bias
CE's `test-browser` and `xcode-test` skills assume the artifact under review is a web/mobile app. ATC's artifacts are Delta tables, ADF pipelines, Databricks bundles. Different test surface entirely.

---

## Migration path (for CE users)

A team currently running CE who wants to adopt ATC:

1. **Keep CE installed.** Many CE skills are reused verbatim. They keep working alongside ATC.
2. **Install ATC alongside.** ATC's orchestrator skill (`atc-orchestrator`) lives at `.claude/skills/atc-orchestrator/`. Triggered explicitly via `/atc:run` (or auto-trigger on PRD presence).
3. **Replace `compound-engineering.local.md` with `atc.local.md`.** ATC's setup skill writes a default. Customize as needed.
4. **Remove plugin-namespaced reviewer references** from any project-local config. ATC reviewers live in `.claude/skills/<name>/`.
5. **Pilot one project.** ATC publishes its own evidence package; compare against CE's `docs/solutions/` output. Both can run side-by-side.

---

## Sources

- CE plugin source (verified locally 2026-04-25): `~/.claude/plugins/marketplaces/compound-engineering-plugin/`
- CE GitHub: https://github.com/EveryInc/compound-engineering-plugin
- CE CHANGELOG (v2.36–v2.37): documented context-budget churn in serial/parallel review modes
- Anthropic multi-agent research blog: https://www.anthropic.com/engineering/multi-agent-research-system (90.2% improvement claim, June 13, 2025 — internal eval, breadth-first research queries, ~15× token cost; quotable for the leadership deck with that caveat)
- Phase 1B synthesis: this doc; raw findings in [`data-engineering-skills-landscape.md`](data-engineering-skills-landscape.md)

---

## Citation audit log

**2026-04-25** — Phase 1B-VERIFY pass. CE plugin metadata verified via local source: `package.json` shows v2.37.1 (latest CHANGELOG entry, 2026-03-16); `marketplace.json` shows v2.40.0 with description "28 specialized agents and 46 skills." Skills directory listing confirmed 46 entries; agents directory recursive count confirmed 28. CHANGELOG context-budget churn verified (v2.36.0 added "compound: context budget precheck and compact-safe mode"; v2.36.1 added "review: serial mode to prevent context limit crashes"; v2.37.1 had to "remove overly defensive context budget precheck"). Anthropic multi-agent blog URL corrected from `anthropic.com/news/...` to `anthropic.com/engineering/...`.
