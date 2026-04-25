# Data Engineering Skills Landscape

> 🚧 **DRAFT — Phase 1B output, citation-audited 2026-04-25.** Skills landscape moves quickly (vendor releases, repo reorganizations). Re-audit before any external publication. Phase 3+ may revise based on architectural choices.
> **Purpose:** What skills, MCP servers, and orchestrator patterns already exist for data engineering, and what ATC must build vs. reuse.
> **Audience:** ATC engineering team. The doc the architect reads before designing the skill graph (Phase 3).

---

## TL;DR — five headlines

1. **The Anthropic Agent Skills (`SKILL.md`) ecosystem is real, multi-runtime, and growing fast.** [agentskills.io](https://agentskills.io) is the open standard; Claude Code, OpenAI Codex (`.agents/skills/`), Cursor 2.4+, Gemini CLI 0.24+ (`.gemini/skills/`), GitHub Copilot (`.github/skills/`), Databricks Assistant, OpenClaw all consume the format. **Skills written for ATC port to anywhere a teammate runs.**

2. **Microsoft and Databricks have published MCP servers (the *tool* layer) but almost no Skills (the *instruction* layer) for data engineering.** Azure MCP Server (GA — one of multiple servers in [microsoft/mcp](https://github.com/microsoft/mcp), Microsoft's official MCP catalog) and Microsoft Fabric MCP (Local GA / Remote Preview, announced Ignite 2025) are first-party callables; Azure MCP exposes dozens of Azure services across the `Azure.Mcp.Tools.*` packages. **No** Microsoft-authored `SKILL.md` bundles for ADF / Databricks / UC / ADLS / Delta exist as of 2026-04-25. Databricks has shipped an official skills repo (`databricks/databricks-agent-skills`) covering apps, core, **dabs** (Asset Bundles), jobs, lakebase, model-serving, pipelines, and serverless-migration — broader than initial reports suggested but still narrower than ATC's full data-engineering surface.

3. **The data-engineering Skill gap is genuinely greenfield, confirmed across three corpora** (Microsoft, Databricks, broader community). No mature SKILL.md exists for: PySpark performance review, Delta MERGE safety, Unity Catalog grant policy, ADF pipeline JSON review, dbt model lineage, Great Expectations / DQ flows, OpenLineage attestation. **This is where ATC's net-new value lives.**

4. **Compound Engineering's phase model maps 1:1 onto ATC phases 1–6.** ATC inherits CE's orchestrator pattern (gated phases, configurable roster, file-glob conditional reviewers, findings-as-files, always-run learnings, the compound flywheel) but rebuilds the reviewer skill bodies for data engineering. **This is what ADR-002 means in practice.**

5. **Anthropic ships review tooling we use directly:** `pr-review-toolkit` plugin (portable agent bodies — code-reviewer, code-simplifier, comment-analyzer, pr-test-analyzer, silent-failure-hunter, type-design-analyzer), `/security-review` slash command, and the open-source `anthropics/claude-code-security-review` GitHub Action. The Action specifically gives risk partners an **independent CI-side attestation** — that's leverage. Anthropic publishes a 90.2% multi-agent improvement number ([engineering blog, June 13, 2025](https://www.anthropic.com/engineering/multi-agent-research-system)) — quotable for the leadership deck. **Honest caveat for citation:** internal Anthropic eval (not external benchmark), specifically on breadth-first research queries, costs ~15× more tokens than chat. Real, but quote it accurately.

---

## Section 1 — Anthropic-native skills

### `anthropics/skills` (GitHub repo)

Official Anthropic open-source skills repo (active since Sep 2025; ships example skills + the Skill Spec + a template).

| Skill | What it does | ATC use |
|---|---|---|
| `skill-creator` | Meta — drafts new skills, runs evals, optimizes triggers | Author every new ATC skill at Level 3 maturity (per Skills 2.0 SHIP doc) |
| `mcp-builder` | Authoring guide for MCP servers | When ATC needs a custom MCP (e.g., evidence-package server) |
| `webapp-testing` | Playwright-driven UI testing | Microsite + any data-platform UI verification |
| `doc-coauthoring` | Structured doc co-authoring workflow | PRD authoring (Phase 2), spec authoring (Phase 3) |
| `internal-comms` | Format-accurate internal comms | Leadership exec summary + risk-partner comms |
| `docx` / `pdf` / `pptx` / `xlsx` | Deliverable file formats | **Critical** — used in evidence package and slide deck |
| `claude-api` | Anthropic API patterns | If ATC ever needs to call Claude programmatically outside Claude Code |
| `frontend-design` | Polished frontend output | The microsite |

**Verdict: REUSE.**

### `anthropics/claude-code` first-party plugins

| Plugin | Most useful for ATC | Verdict |
|---|---|---|
| `feature-dev` | Discovery → Exploration → Clarify → Architecture multi-phase command | **ADAPT** for ATC's authoring stage |
| `code-review` | Haiku+Sonnet+Opus parallel review with inline GitHub comments | **REUSE** for review phase (Team/Enterprise Anthropic plan) |
| `pr-review-toolkit` | Portable reviewer bodies (code-reviewer, code-simplifier, comment-analyzer, pr-test-analyzer, silent-failure-hunter, type-design-analyzer) | **REUSE** verbatim |
| `security-guidance` | PreToolUse hooks for safety-critical operations | **ADAPT** to enforce ATC's autonomy ladder + Azure deploy guardrails |
| `agent-sdk-dev` | Python+TS verifiers | **REUSE** if ATC needs SDK-level verification |
| `commit-commands` | Commit / push / PR helpers | **REUSE** during execute phase |
| `plugin-dev` | Skill / hook / MCP scaffolding | **REUSE** for ATC's own skills authoring |

### Anthropic CLI features

- **`/code-review`** (research preview, **March 9, 2026**) — agent-based PR reviewer dispatching parallel specialized subagents; verification step disproves findings ("fewer than 1% of findings marked incorrect by Anthropic engineers during internal use" — direct quote, not paraphrase). Customizable via `CLAUDE.md` + `REVIEW.md`. **Team/Enterprise only at launch; GitHub-only.** [announcement](https://claude.com/blog/code-review) | [docs](https://docs.claude.com/en/docs/claude-code/code-review)
- **`/security-review`** — pending-changes security analysis built into Claude Code CLI.
- **`anthropics/claude-code-security-review`** GitHub Action — open-source semantic security review on PR. **Layer in CI for independent attestation** — risk-partner-facing artifact.

---

## Section 2 — Microsoft / Azure

### What Microsoft publishes

| Item | Maturity | Verdict | Why |
|---|---|---|---|
| **Azure MCP Server** ([source: microsoft/mcp/servers/Azure.Mcp.Server](https://github.com/microsoft/mcp/tree/main/servers/Azure.Mcp.Server) — one of two production servers in Microsoft's MCP catalog, the other being Fabric.Mcp.Server) | GA. Dozens of Azure services covered via `Azure.Mcp.Tools.*` packages (Acr, Aks, AppConfig, AppService, AzureBackup, BicepSchema, CloudArchitect, Compute, ContainerApps, Communication, ConfidentialLedger, …). [Docs](https://learn.microsoft.com/azure/developer/azure-mcp-server/) | **REUSE** | First-party callable tool surface for storage / Foundry / Cosmos / Postgres / Redis / IaC (azd/Bicep/Terraform) and many more. Honors Entra/RBAC. |
| **Microsoft Fabric MCP** | Local GA / Remote Preview (Ignite 2025) | **REUSE** when ATC enters Fabric | Lakehouse / Notebook / Pipeline / Dataflow Gen2 / Warehouse / permissions CRUD |
| **Azure DevOps MCP** | Public Preview Remote, GA Local | **REUSE** | Direct fit for release/evidence-phase automation (work items, PRs, pipelines) |
| **GitHub Copilot for Azure** | GA, mainstream in VS 2026 | **IGNORE as primitive / REFERENCE as competitor** | IDE-bound. Position ATC against it: portable, Microsoft-supported MCPs underneath, agnostic on top. |
| **Microsoft Agent Framework** (`Microsoft.Agents.AI.Anthropic` NuGet) | Released | **IGNORE for skills** | .NET orchestration of Claude on Foundry. Not the SKILL.md path. |
| **Osmos acquisition** (announced **January 2026**) | Announced, no shipped artifacts | **WATCH** | Microsoft acquiring Osmos for "agentic data engineering" in Fabric. Osmos team joining Fabric engineering; technology being integrated into OneLake. Could become competition or fuel — track quarterly. (Reported by GeekWire, RedmondMag; no canonical Microsoft press release URL verified.) |

### Critical coverage gap

- **Azure MCP Server has NO first-party tools for ADF or Azure Databricks workspace operations.** Data plane is storage / Cosmos / Postgres / Redis / Foundry only. ATC composes Azure MCP for what it covers and uses Databricks's own Managed MCP + native CLI/SDK for Databricks ops.
- **No Microsoft-authored `SKILL.md` files** for ADF / Databricks / Unity Catalog / ADLS / Fabric / Synapse in `microsoft/`, `Azure-Samples/`, `microsoftgraph/`, or `MicrosoftLearning/` orgs as of 2026-04-25. **This is genuinely empty.**

---

## Section 3 — Databricks

### What Databricks publishes

| Item | Maturity | Verdict | Why |
|---|---|---|---|
| [`databricks/databricks-agent-skills`](https://github.com/databricks/databricks-agent-skills) | New, official, broader than first reports | **REUSE** | `SKILL.md` bundles covering: `databricks-apps`, `databricks-core`, **`databricks-dabs`** (Asset Bundles), `databricks-jobs`, `databricks-lakebase`, `databricks-model-serving`, `databricks-pipelines`, `databricks-serverless-migration`. Direct Skills 2.0 contract; also ships `.cursor-plugin/` for Cursor compatibility. ATC wraps these in execute phase. |
| **Skills CLI** (`npx skills add`) | Open-source, agent-agnostic | **REUSE** | Install/manage skills across Claude Code / Cursor / Copilot / Databricks Assistant. ATC adopts as install mechanism — keeps us multi-runner. |
| **Databricks Assistant Agent Mode** | Public Preview, UI-only | **IGNORE as runtime** | No programmatic prompt API. Useful as downstream consumer of ATC-authored skills, not as ATC's runner. |
| **Genie Code** | Replaces Databricks Assistant Mar 2026 | **MONITOR** | UC-aware agent mode. May expose programmatic API on GA. |
| **Genie Conversation API** | GA (April 2026; Public Preview was March 11, 2025). [Docs](https://docs.databricks.com/aws/en/genie/conversation-api/) | **REUSE** | Programmatic stateful Q&A against Genie spaces. REST + Databricks SDK. ATC uses for ad-hoc data Q during code review and evidence gathering. |
| **Databricks Managed MCP** (UC, Vector Search, Genie spaces, AI Gateway) | Documented, shipping | **REUSE** | Replaces "build a custom Databricks MCP" — already done. ATC composes via Databricks AI Gateway. |
| **Unity Catalog Functions as agent tools** (UCFunctionToolkit) | Documented | **REUSE** | UC-governed callable tools. **Important for evidence package** — UC permissions become the audit trail for tool access. |
| **Mosaic AI Agent Framework / Agent Bricks** | Released (DAIS 2025) | **IGNORE** | Different scope (in-product end-user agents, not SDLC orchestration). |
| **Custom MCP via Databricks App** | Documented | **ADAPT** | Wrap ATC Tower telemetry sink as a Databricks App MCP for in-platform observability. |

### Critical gap

- `databricks/databricks-agent-skills` covers **pipelines, apps, CLI** — not the broader data-engineering surface (DQ, lineage, schema-evolution, MERGE-safety, grant policy, performance).
- **`delta-io` ecosystem has zero `SKILL.md` artifacts.** No community Delta skills.

---

## Section 4 — Compound Engineering ecosystem

CE (Every Inc plugin) is already in Briggsy's harness, ships a substantial agent + skill library, and maps **1:1** onto ATC phases 1–6. (Specific version + exact catalog counts intentionally omitted from this body — they drift weekly. See [`ce-comparison.md`](ce-comparison.md) audit log for the version snapshot at the time of writing.)

**Steal verbatim:**

| CE skill / pattern | ATC phase | Why |
|---|---|---|
| `ce-brainstorm` | Phase 1 (Brief) | Collaborative requirements dialogue with stop gates |
| `ce-plan` (creation + deepen) | Phases 2–4 (PRD, Spec, Phased Plan) | Brainstorm-aware plan generator |
| `document-review` | Phases 2–3 (PRD, Spec) | Persona-based parallel review of plan/requirements docs |
| `ce-work` | Phase 6 (Execute) | Plan-driven execution with branch/worktree management |
| `ce-review` | Phase 7 (Review) | **Orchestrator-of-reviewers** — the heart of multi-angle review |
| `orchestrating-swarms` | Phase 6 (Execute) | Multi-agent swarm patterns |
| `learnings-researcher` (always-run) | All phases | Greps `docs/solutions/` for prior solutions — institutional memory |
| `compound` skill | Phase 9 (Evidence/Distill) | Distills solved problems into `docs/solutions/` — flywheel |
| `git-worktree` skill | Infrastructure | Worktree manager pattern |
| `agent-native-architecture` | Reference | Design philosophy |
| `file-todos` (rename → `atc-todos`) | All phases | File-backed todo tracking |

**Adapt (don't reuse verbatim):**

| Item | Why adapt | What changes |
|---|---|---|
| `compound-engineering.local.md` config | Different roster, different domain | Rename `atc.local.md`, add data-engineering reviewer slots |
| `ce-pr-description` | Reasonable starter | Rename `atc-pr-description`, add evidence-package linkage |
| Conditional reviewers triggered by file globs | Existing pattern is Rails-only (`db/migrate/*.rb`) | Map to `*.dlt`, `*.sql`, `pipelines/*.json`, `notebooks/*.py`, `bundle.yml`, `*.bicep`, `*.tf` |

**Don't inherit:**

| Item | Why not |
|---|---|
| `dhh-rails-reviewer`, `kieran-rails-reviewer`, `kieran-typescript-reviewer`, `kieran-python-reviewer`, `andrew-kane-gem-writer`, `julik-frontend-races-reviewer`, `ankane-readme-writer` | Rails-shop / web-app DNA. Irrelevant to Azure data engineering. |
| `xcode-test`, browser-test bias (mostly) | iOS / web-app testing. ATC tests data pipelines. (`test-browser` REUSED for the microsite only.) |
| Plugin-namespaced internal references in skill bodies | Breaks portability. ATC skills must be standalone. |

See [`reference/ce-comparison.md`](ce-comparison.md) for the full skill-by-skill comparison + migration path.

---

## Section 5 — Community (non-MS, non-Databricks)

### What exists (curated discovery, not dependencies)

- **agentskills.io ecosystem** — open SKILL.md spec ratified across runners (Claude Code, Codex `.agents/skills/`, Cursor 2.4+, Gemini CLI 0.24+ `.gemini/skills/`, GitHub Copilot `.github/skills/`, OpenClaw 100+ built-ins). Validator: `skills-ref validate`.
- **Curated lists:** `ComposioHQ/awesome-claude-skills`, `hesreallyhim/awesome-claude-code`, `mattpocock/skills`, `alirezarezvani/claude-skills`, `wshobson/agents`. **Use as discovery, not as dependencies — high churn, lots of farmed stars.**
- **Methodology-shaped community skills:**
  - `FrancyJGLisboa/agent-skill-creator` — cross-platform skill packager
  - `zhu1090093659/spec_driven_develop` — analyze→decompose→track→execute (similar to ATC's pipeline)
  - `agent-sh/agnix` — validates SKILL.md / CLAUDE.md / hooks / MCP. **ADAPT** as ATC orchestrator self-check.
  - `myl7/changelog-skill` — Keep-a-Changelog
  - `jovd83/release-manager-skill` — semver + changelog + CI
  - `Narwhal-Lab/MagicSkills` — composable cross-agent
  - `mxyhi/ok-skills` — cross-runner playbooks

### Data-engineering-specific community skills

**None mature.** Searches for `dbt`, `pyspark`, `great-expectations`, `OpenLineage`, `delta` on `topic:agent-skills` / `topic:claude-skills` / `topic:skill-md` return zero hits as of 2026-04-25. **Greenfield confirmed.**

---

## Section 6 — The BUILD-OWN list (ATC's net-new contribution)

These don't exist anywhere. ATC builds them. Each gets the Skills 2.0 commit bar (SKILL.md + README.md + DECISIONS.md + evals/, with pass-rate threshold).

### Authoring skills
- `atc-prd-author` — data-engineering-aware PRD authoring (RTM-driven, framework-coupling-aware, lineage-first)
- `atc-spec-author` — turns PRD into rebuild-ready spec
- `atc-phased-planner` — outputs paint-by-numbers phase plans

### Execution skills
- `databricks-bundle-deployer` — atomic Databricks Asset Bundle deploys with mutex
- `adf-pipeline-deployer` — ADF pipeline JSON deploys via REST API + IaC
- `unity-catalog-grants-applier` — UC grant policy application + diff
- `delta-migration-runner` — Delta MERGE / schema-evolution / VACUUM / OPTIMIZE-aware migrations

### Review skills (the data-platform reviewer fleet)
- `pyspark-performance-reviewer` — shuffle, partition, broadcast hint review
- `delta-migration-expert` — MERGE safety, schema-evolution risks, VACUUM retention
- `unity-catalog-grants-reviewer` — least-privilege checks, grant scope
- `adf-pipeline-reviewer` — ADF pipeline JSON anti-patterns, retry/error policy
- `pii-phi-scanner` — column-level PII/PHI detection in Delta tables + ADF outputs
- `lineage-attestation-reviewer` — lineage completeness vs. RTM
- `adlsg2-cost-reviewer` — partitioning + lifecycle policy review
- `bicep-reviewer`, `terraform-reviewer` — IaC for data infra
- `dbt-model-reviewer` — DEFERRED until dbt enters scope
- `sox-audit-trail-reviewer` — DEFERRED (gated by ADR-003 — no formal regulator yet)

### Evidence + observability skills
- `atc-evidence-assembler` — assembles evidence package from agent action logs, code review approvals, test results, lineage diffs
- `atc-tower-publisher` — pushes agent activity to the ATC Tower observability layer (file-based or Databricks App)
- `atc-rtm-curator` — keeps the Requirements Traceability Matrix green/current across rebuild commits (always-run, like CE's `learnings-researcher`)

### Risk-partner / governance skills
- ~~`atc-deploy-mutex`~~ — **deferred per ADR-011 (YAGNI).** Pilot ATC projects run sequentially; no parallel-deploy collision to solve yet. The flag is documented in [`agentic-execution-pattern.md`](agentic-execution-pattern.md); a project that introduces parallel deploys adds coordination at that point, against a real use case.
- `atc-secret-scanner` — pre-commit / pre-push secret scan tuned for Azure (service principals, SAS tokens, Databricks PATs, connection strings)

---

## Section 7 — Phase-by-phase composition map

Which existing skills plug into which ATC phase, and what we build.

| ATC Phase | Reuse | Adapt | Build-own |
|---|---|---|---|
| **1 — Brief** | `compound-engineering:ce-brainstorm`, `claude-code/feature-dev` Phase 1, `compound-engineering:learnings-researcher` (always-run) | — | — |
| **2 — PRD** | `compound-engineering:ce-plan`, `compound-engineering:document-review`, `anthropics/skills:doc-coauthoring`, `claude-code/feature-dev` Phases 1–3 | `compound-engineering.local.md` → `atc.local.md` | `atc-prd-author` (data-eng extension) |
| **3 — Spec** | `compound-engineering:document-review`, `anthropics/skills:doc-coauthoring` | — | `atc-spec-author` |
| **4 — Phased plan** | `compound-engineering:ce-plan` (creation mode) | — | `atc-phased-planner` |
| **5 — Deepen** | `compound-engineering:ce-plan` (deepen mode), `claude-code/feature-dev` Phase 2/4 | — | `atc-deepener` (data-engineering specialty) |
| **6 — Execute** | `compound-engineering:ce-work`, `compound-engineering:orchestrating-swarms`, `compound-engineering:git-worktree`, `databricks/databricks-agent-skills`, `commit-commands` | `claude-code/security-guidance` (PreToolUse hooks) | `databricks-bundle-deployer`, `adf-pipeline-deployer`, `unity-catalog-grants-applier`, `delta-migration-runner` |
| **7 — Review** | `claude-code/code-review`, `claude-code/pr-review-toolkit`, `compound-engineering:ce-review` (the orchestrator pattern), generic CE reviewers (`security-sentinel`, `performance-oracle`, `architecture-strategist`, `code-simplicity-reviewer`, `pattern-recognition-specialist`), `anthropics/claude-code-security-review` GitHub Action | — | `pyspark-performance-reviewer`, `delta-migration-expert`, `unity-catalog-grants-reviewer`, `adf-pipeline-reviewer`, `pii-phi-scanner`, `lineage-attestation-reviewer`, `adlsg2-cost-reviewer`, `bicep-reviewer`, `terraform-reviewer` |
| **8 — Documentation** | `anthropics/skills:doc-coauthoring`, `anthropics/skills:internal-comms`, `anthropics/skills:docx`/`pdf`/`xlsx`/`pptx`, `compound-engineering:onboarding` | — | — |
| **9 — Evidence** | `anthropics/skills:docx`/`pdf`/`xlsx`, `databricks/managed-mcp` (UC lineage), `compound-engineering:compound` (institutional memory) | `myl7/changelog-skill`, `jovd83/release-manager-skill` (thin starters) | `atc-evidence-assembler`, `atc-rtm-curator`, `atc-tower-publisher` |
| **10 — Release** | `compound-engineering:git-commit-push-pr`, `compound-engineering:ce-pr-description`, `azure-devops-mcp` | `atc-pr-description` (rename + extend) | — |

---

## Section 8 — MCP composition layer

ATC skills call MCP servers for tool access. The composition is:

| Domain | MCP server | Notes |
|---|---|---|
| Azure infra (storage, Foundry, Cosmos, IaC) | **Azure MCP Server** ([microsoft/mcp](https://github.com/microsoft/mcp)) | First-party, GA. **No** ADF or Databricks tools. |
| Microsoft Fabric (Lakehouse, Notebook, Pipeline) | **Microsoft Fabric MCP** | Local GA / Remote Preview. Use when ATC enters Fabric. |
| Azure DevOps (boards, PRs, pipelines) | **Azure DevOps MCP** | Use for release/evidence-phase work-item linkage. |
| Databricks (UC, Vector Search, Genie) | **Databricks Managed MCP** (via AI Gateway) | First-party, replaces custom Databricks MCP. |
| Unity Catalog functions as tools | **UCFunctionToolkit** | Tool registration via UC. Permissions = audit trail. |
| ADF / Azure Databricks workspace ops | **GAP — build via REST API + Azure CLI / Databricks CLI** | No first-party MCP. ATC's `databricks-bundle-deployer` and `adf-pipeline-deployer` skills bridge this. |
| Documentation references / library lookup | **Context7 MCP** (already in CE) | Library/version-accurate API docs. |
| Web research at agent-time | **Gemini Grounding MCP** | Already in Briggsy's setup. |

---

## Section 9 — Open questions (track for follow-up)

1. **Does the Fabric Remote MCP expose Unity Catalog (mirrored Databricks Catalog) operations**, or only Fabric-native items?
2. **When does Azure MCP add ADF/Databricks tools?** Watch [microsoft/mcp](https://github.com/microsoft/mcp) issues.
3. **Will the post-Osmos Fabric agent ship as `SKILL.md` bundles, MCP tools, or a closed Copilot Studio agent?** (Could become competition or fuel.)
4. **Does `Microsoft.Agents.AI.Anthropic` honor the `agentskills.io` SKILL.md spec end-to-end**, or only the Anthropic beta header?
5. ~~**Does `databricks-agent-skills` cover Asset Bundles (DABs) yet?**~~ ✅ **RESOLVED 2026-04-25** — yes, `databricks-dabs` skill exists in the official repo (verified directly via GitHub API).
6. **Will Genie Code expose a programmatic agent-mode API on GA?** Could replace some of ATC's execute-phase orchestration.
7. **Is the `agentskills.io` validator strict enough for ATC's evidence-package structural checks**, or do we need a superset linter?
8. **Licensing on `docx`/`pdf`/`pptx`/`xlsx`** — source-available; verify enterprise rights before depending in audit deliverables.
9. **Does `compound-engineering:ce-plan` deepen-mode survive enterprise change-control review**, or do we need an air-gapped fork?
10. **Will Anthropic's `pr-review-toolkit` agent definitions accept Azure-specific personas** (Unity-Catalog reviewer, Delta-table-design reviewer) without forking?
11. **Anthropic Agent Teams** — [`docs.claude.com/en/docs/claude-code/agent-teams`](https://docs.claude.com/en/docs/claude-code/agent-teams) documents multi-agent coordination (requires Claude Code v2.1.32+ and Opus 4.6+; gated by `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). Should ATC's Phase 6 use Agent Teams instead of manual subagent spawning? Phase 3 (SPEC) decides.

---

## Sources

(Consolidated from 5 parallel research agents, 2026-04-25.)

### Anthropic
- https://github.com/anthropics/skills
- https://github.com/anthropics/claude-code/tree/main/plugins (`feature-dev`, `code-review`, `pr-review-toolkit`, `security-guidance`, `agent-sdk-dev`, `commit-commands`, `plugin-dev`)
- https://claude.com/blog/code-review (Code Review research preview, March 9, 2026)
- https://docs.claude.com/en/docs/claude-code/code-review (Code Review canonical docs)
- https://www.anthropic.com/engineering/multi-agent-research-system (90.2% improvement claim, June 13, 2025 — internal eval, breadth-first research queries, ~15× tokens)
- https://docs.claude.com/en/docs/claude-code/agent-teams (Agent Teams docs)
- https://github.com/anthropics/claude-code-security-review (GitHub Action)
- https://docs.claude.com/en/docs/claude-code

### Microsoft / Azure
- https://github.com/microsoft/mcp (Azure MCP Server, consolidated)
- https://github.com/microsoft/azure-devops-mcp
- https://blog.fabric.microsoft.com/ (Ignite 2025 Fabric MCP announcements)
- https://github.com/microsoft/fabric-samples
- https://learn.microsoft.com/azure/developer/github-copilot-azure/
- https://learn.microsoft.com/azure/ai-foundry/ (Microsoft Agent Framework + Anthropic on Foundry)
- `Microsoft.Agents.AI.Anthropic` NuGet

### Databricks
- https://github.com/databricks/databricks-agent-skills (official skills repo, ships `.claude-plugin/` and `.cursor-plugin/`)
- https://docs.databricks.com/aws/en/genie/conversation-api/ (Genie Conversation API docs — GA April 2026)
- https://docs.databricks.com/en/generative-ai/mcp/ (Managed MCP)
- https://www.databricks.com/product/artificial-intelligence/agent-framework (Mosaic AI Agent Framework — verify before publication; Databricks reorganized docs in 2026)
- https://www.databricks.com/blog/introducing-agent-bricks (Agent Bricks announcement, June 11, 2025, DAIS 2025)
- For Databricks Assistant skills location (`.assistant/skills/<name>/SKILL.md`), see the canonical SKILL.md standard at [agentskills.io](https://agentskills.io) — Databricks-specific docs URL not verified at audit time

### Compound Engineering
- https://github.com/EveryInc/compound-engineering-plugin
- Local source: `~/.claude/plugins/marketplaces/compound-engineering-plugin/`
- (Detail in [`ce-comparison.md`](ce-comparison.md))

### Open standard + community
- https://agentskills.io / https://agentskills.io/specification / https://agentskills.io/clients
- https://github.com/agentskills/agentskills (validator)
- https://docs.cursor.com/en/agent/skills (Cursor 2.4+ agent skills support)
- https://github.com/google-gemini/gemini-cli (Gemini CLI 0.24+ skills support — official docs URL not located at audit time)
- https://developers.openai.com/codex/skills (OpenAI Codex skills support)
- https://code.visualstudio.com/docs/copilot/customization/agent-skills (GitHub Copilot in VS Code skills support)
- https://github.com/ComposioHQ/awesome-claude-skills (discovery only)
- https://github.com/hesreallyhim/awesome-claude-code (discovery only)
- https://github.com/agent-sh/agnix (SKILL.md / hooks / MCP linter)
- https://github.com/FrancyJGLisboa/agent-skill-creator
- https://github.com/zhu1090093659/spec_driven_develop
- https://github.com/myl7/changelog-skill
- https://github.com/jovd83/release-manager-skill

### Worktree / agentic-execution patterns
See [`agentic-execution-pattern.md`](agentic-execution-pattern.md) for the full citation set.

---

## Citation audit log

**2026-04-25** — Phase 1B-VERIFY pass. All ~30 cited URLs HEAD-checked; broken URLs replaced via gemini-grounding + manual confirmation. Local CE source inspected directly for version + skill counts. Anthropic worktree primitives grep-verified against `docs.claude.com/en/docs/claude-code/common-workflows`. Boris Cherny X status IDs removed (X.com returns 200 for any path; no login-free verification possible). Specific date claims (Genie API GA, Osmos acquisition, Code Review preview, multi-agent blog) checked and tightened. **Open questions #5 (DABs) resolved YES.** All "Q1 2026"-style fuzzy dates replaced with month-specific values where verifiable.

Pattern flagged for future research: **`anthropic.com/news/<slug>` URLs are unreliable** — Anthropic blog content is split across `claude.com/blog/`, `anthropic.com/engineering/`, and `anthropic.com/news/`. Always verify the canonical URL before citing.

This is a snapshot. URLs and versions move. Re-audit before any external publication.
