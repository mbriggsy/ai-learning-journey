# DE Capability Skills — Rebuild-Phase Inventory

> **Status:** Research memo. Captured 2026-04-17.
> **Purpose:** Inventory of wow-grade, already-published Agent Skills 2.0 capability skills we can consume in the **post-RE rebuild loop**. Opinionated. Every entry earns its spot.
> **Scope:** Specialized DE capability skills (Delta, Unity Catalog, PySpark, DLT, ADLS, governance, perf). Workflow / orchestration / SKILL-shape patterns noted only in passing.
> **Sources:** Deep scans of `microsoft/skills`, `microsoft/skills-for-fabric`, and the wider Agent Skills 2.0 ecosystem (Databricks / databricks-solutions / dbt-labs / community). Findings spot-checked against live GitHub and Databricks docs.

---

## 1. TL;DR

| Rank | Skill | Tier | Role in the rebuild loop |
|---|---|---|---|
| 1 | [`databricks-solutions/ai-dev-kit`](https://github.com/databricks-solutions/ai-dev-kit) | **ADOPT** | Native Spark / DLT / Iceberg / CDC rebuild playbook |
| 2 | [`databricks-solutions/vibe-coding-workshop-template`](https://github.com/databricks-solutions/vibe-coding-workshop-template) | **ADOPT** | 55-skill medallion library — Bronze / Silver / Gold / Semantic / Monitoring |
| 3 | [`databricks/databricks-agent-skills`](https://github.com/databricks/databricks-agent-skills) | **ADOPT** | Official Databricks plumbing — 7 skills (Apps, Core, DABs, Jobs, Lakebase, Model Serving, Pipelines) |
| 4 | `microsoft/skills-for-fabric/spark-authoring-cli` | **ADOPT** | Job orchestration + dedup discipline, ~95% transferable |
| 5 | `microsoft/skills-for-fabric/e2e-medallion-architecture` | **FORK** | Medallion workflow + anti-patterns, drop OneLake, keep the shape |

Top-shelf finding: **Databricks owns a surprisingly rich skill ecosystem already.** We are not walking into a desert on the rebuild side. The frontier is still the RE → PRD skill itself — no prior art exists for that.

---

## 2. Landscape, honestly

- **Expected:** sparse. Assumption was "Microsoft ships 200+ skills, Databricks ships zero."
- **Found:** flipped. Between `databricks/databricks-agent-skills` (7 skills), `databricks-solutions/ai-dev-kit` (~20 skills), and `databricks-solutions/vibe-coding-workshop-template` (55 skills), the Databricks ecosystem ships **80+ consumable DE skills** today.
- **Microsoft's corpus** (`microsoft/skills` = 201 skills, `microsoft/skills-for-fabric` = 10 skills) is Azure-ops-heavy and Fabric-specific. Most of it is SDK-wrappers; the gems are storage, eventing, and one solid medallion playbook.
- **Databricks Assistant natively consumes Agent Skills 2.0.** Skills live at `/Users/{username}/.assistant/skills/<skill-name>/SKILL.md`, auto-discovered, `@mention`-invocable. Anything we author runs unchanged inside the Databricks workspace — same spec as Claude Code, Cursor, and VS Code.
- **Frontier is NOT capability.** Frontier is **specification** — RE → PRD → RTM is genuinely absent from the ecosystem. Nobody has published a skill that reverse-engineers a legacy ETL job into a rebuild-ready spec.

So: on the rebuild side, we stand on shoulders. On the RE side, we build.

---

## 3. Tier 1 — ADOPT (the wow-grade base)

### 3.1 `databricks-solutions/ai-dev-kit`

**What it ships:** ~20 Databricks skills plus an MCP server with 50+ tools and a builder app. Relevant skills include `databricks-spark-declarative-pipelines` (DLT in SQL/Python), `databricks-iceberg` (Iceberg + UniForm + REST Catalog), `databricks-python-sdk`, `databricks-jobs`, plus streaming/CDC guidance. Field Engineering authored.

**Wow factor:** Treats DLT as a first-class skill domain. CDC operations, table transformation, and streaming patterns are skill-documented rather than buried in docs. Pairs cleanly with the MCP server for tool-backed workflows.

**Rebuild-phase role:**
- During rebuild authoring: consume for Spark / DLT / Iceberg / job-cluster patterns.
- During RE: optionally surface in the generated PRD's "framework coupling" section so the rebuild knows which upstream skills to call.

**Verdict:** **ADOPT.** This is the baseline. Install it early; the rebuild loop calls into it for every Spark/DLT decision.

---

### 3.2 `databricks-solutions/vibe-coding-workshop-template`

**What it ships:** 55 skills across 12 domains inside `data_product_accelerator/`:

| Domain | Count | Headline |
|---|---|---|
| Gold | 14 | Dimensional modeling, MERGE scripts, ERDs, FK design |
| GenAI Agents | 10 | ResponsesAgent, eval, deployment |
| Common | 8 | Asset bundles, naming, constraints |
| Semantic Layer | 5 | Metric Views, TVFs, Genie Spaces |
| Monitoring | 5 | Lakehouse Monitors, dashboards, SQL alerts |
| Admin | 4 | Skill creation, auditing |
| Silver | 3 | DLT pipelines, data quality expectations |
| Bronze | 2 | Raw tables, Faker test-data generation |
| ML / Planning / Exploration / Navigator | 1 each | Supporting |

AppKit workshop adds 7 more for full-stack app dev.

**Wow factor:** The **Gold layer gets 14 skills** — dimensional modeling, MERGE script patterns, ERD design, FK relationships. This is where most teams ship mud. Having it encoded as callable skills is how you close the "rebuild looks like the shit-show" gap. Silver ships DLT + expectation skills. Monitoring ships Lakehouse Monitors + alert templates.

**Rebuild-phase role:**
- Phase 3 (synthesis): Gold-layer PRD sections map to these skills for the rebuild to call.
- Phase 5 (deliverable assembly): test-spec and QA-plan templates crib from Bronze/Silver/Gold constraint patterns.
- Rebuild execution: every medallion layer has a skill-backed authoring path.

**Verdict:** **ADOPT.** Biggest single-repo IP transfer available. We do not reinvent medallion architecture — we reference this.

---

### 3.3 `databricks/databricks-agent-skills` (official)

**What it ships:** 7 skills, installed via `databricks experimental aitools install`:

- `databricks-apps`
- `databricks-core`
- `databricks-dabs`
- `databricks-jobs`
- `databricks-lakebase`
- `databricks-model-serving`
- `databricks-pipelines`

**Wow factor:** Official Databricks-signed skill bundle. Governance is meaningful — code-owner approval, security protocols. The `databricks-core` and `databricks-jobs` skills are the closest we get to "Databricks-shaped defaults" that senior engineers won't argue with in review.

**Rebuild-phase role:**
- Baseline Databricks plumbing — every rebuild loop will call `databricks-core` and `databricks-jobs` for workspace/job operations.
- `databricks-dabs` + `databricks-pipelines` for IaC-flavored DLT deployment.

**Verdict:** **ADOPT.** Install as a floor. Thin compared to `ai-dev-kit` but official signals matter for enterprise rollout.

---

### 3.4 `microsoft/skills-for-fabric/spark-authoring-cli`

**What it ships:** Remote Spark / notebook authoring via Fabric's Livy endpoints — base64-encoded notebook round-trips, 5-minute active-job deduplication, starter-pool tuning, status polling.

**Wow factor:** Encodes constraints senior engineers discover the painful way:
> *"Each source line must end with `\n` to prevent code merging."*
> *"Check for active jobs from the last 5 minutes before submission to prevent duplicate runs."*

These aren't textbook — they're scars.

**Rebuild-phase role:** Job-cluster orchestration + idempotency guardrails for the rebuild loop itself. If our loop programmatically deploys notebooks, these heuristics save us from self-inflicted wounds.

**Verdict:** **ADOPT** — lightest fork in the whole inventory. Swap Livy for Databricks Jobs API, keep every heuristic.

---

## 4. Tier 2 — FORK (IP is gold, syntax needs swapping)

### 4.1 `microsoft/skills-for-fabric/e2e-medallion-architecture`

End-to-end Bronze/Silver/Gold guide with explicit must/avoid anti-patterns, schema evolution, partitioning strategies, ZORDER hints, and failure-mode taxonomy. Prescriptive, not descriptive. **Fork:** drop OneLake shortcuts + Fabric REST APIs; keep the workflow shape, anti-patterns, and schema-evolution decision tree. Pair with `vibe-coding-workshop-template` Gold/Silver/Bronze skills for Databricks-native execution.

### 4.2 `microsoft/skills-for-fabric/sqldw-authoring-cli`

23 failure modes mapped to remediation steps — write-write conflict detection under snapshot isolation, unsupported `ALTER COLUMN` workarounds via CTAS+rename, credential-aware COPY INTO / OPENROWSET patterns. **Fork:** T-SQL → Spark SQL, preserve the decision tree. The conflict-resolution logic maps directly onto Delta MVCC.

### 4.3 `microsoft/skills-for-fabric/eventhouse-authoring-cli`

Idempotent schema creation via `.create-merge` (not destructive alternatives), update-policy composition via stored functions, permission-first validation. Quote:
> *"Use `.create-merge table` rather than destructive alternatives, enabling safe schema drift."*

**Fork:** KQL → SQL, Kusto tokens → Databricks tokens, but preserve the idempotency discipline and policy-composition pattern. This is how DLT expectations + UC schema evolution should feel.

### 4.4 `microsoft/skills/azure-storage-file-datalake-py`

ADLS Gen2 hierarchical file-system ops with **ACL inheritance**: set permissions at the directory level, inherit to children. **Fork:** lift the inheritance-by-hierarchy pattern into Unity Catalog namespace governance — Bronze/Silver/Gold containers get matching UC grants on the parent, children inherit. Closes the "why is Gold writable by the streaming service account" gap most teams find in audit.

### 4.5 `microsoft/skills/azure-eventhub-py`

Blob-backed checkpoint store for Event Hubs consumer groups — durable consumer progress, resumption after failure, distributed multi-instance deployments. **Fork:** the checkpoint-durability discipline transfers directly to Delta Structured Streaming (Kafka/EH consumers with `checkpointLocation`). This is the Bronze-ingest blueprint we want referenced in every streaming PRD row.

---

## 5. Tier 3 — INSPIRE (concepts, not the skill itself)

### 5.1 `dbt-labs/dbt-agent-skills`

6+ analytics skills: `adding-dbt-unit-test`, `building-dbt-semantic-layer`, `working-with-dbt-mesh`, `troubleshooting-dbt-job-errors`, others. **Inspire:** steal the test-spec shape and error-taxonomy structure for our PRD's §13 (test specification) and §14 (QA / reconciliation plan). We are not dbt; we are Databricks + framework. Skill itself is not adoptable. The test-spec rigor is.

### 5.2 `microsoft/skills/azure-kusto`

KQL query performance heuristics — filter-early, indexed-column-first, `summarize` / `bin()` discipline, avoid large transfers. Quote:
> *"filter early, limit result size, and use indexed columns first; avoid costly operations like large result transfers."*

**Inspire:** these heuristics are query-shape, not KQL-specific. Apply verbatim to Databricks SQL optimization and Delta partition pruning. Bake into the rebuild loop's perf-review gate.

### 5.3 `microsoft/skills/microsoft-foundry`

Trace-to-dataset lineage for AI agents — harvest production traces into eval datasets, version metadata in Git, detect regressions. **Inspire:** transpose to data engineering: capture Bronze→Silver→Gold lineage edges, Git-version schema expectations + row-count fingerprints, flag regressions automatically. This is the observability backbone our RTM needs at Phase 4 (audit).

### 5.4 `microsoft/skills/azure-rbac`

Least-privilege role-assignment framework with explicit separation between *doing work* and *granting access*, plus Bicep IaC generation. **Inspire:** apply the role-tier separation to Unity Catalog grants. Writers, readers, and administrators don't share roles. Audit-worthy by default, not by exception.

### 5.5 `microsoft/skills-for-fabric/sqldw-consumption-cli`

Structured "discover → sample → formulate → execute → iterate → present" workflow for data exploration, with Query Insights integration. **Inspire:** the state-machine shape is valuable for our Phase 4 audit — treat coverage-checking as a reusable exploration loop, not ad-hoc scripting.

### 5.6 `microsoft/skills-for-fabric/spark-consumption-cli`

Spark session reuse, three-part naming, Delta time-travel. ~90% concept transfer. **Inspire** rather than adopt because it's thin — the ideas (session reuse, time-travel validation) are better captured in our own `reference/` content than imported whole.

---

## 6. Tier 4 — SKIP (audit trail for the triage)

| Skill / plugin | Why skipped |
|---|---|
| `microsoft/skills-for-fabric/powerbi-authoring-cli` | BI layer; no Databricks analog |
| `microsoft/skills-for-fabric/powerbi-consumption-cli` | BI layer; no Databricks analog |
| `microsoft/skills-for-fabric/eventhouse-consumption-cli` | KQL-specific; syntax unmappable to Spark SQL |
| `microsoft/skills-for-fabric/check-updates` | Infra / DevOps, not DE |
| `microsoft/skills/azure-sdk-{dotnet,java,rust,typescript}` | Language-surface SDKs; no standout patterns beyond Python parity |
| `microsoft/skills/deep-wiki` | Documentation generator; off-domain |
| `microsoft/skills/azure-cost`, `azure-compliance` | Useful Azure-ops, but generic — not DE-specialized enough to earn a slot |

---

## 7. Databricks Assistant extensibility — locked

Per Databricks docs, the Assistant (and Genie Code Agent mode) natively consumes Agent Skills 2.0:

- Skills live at `/Users/{username}/.assistant/skills/<skill-name>/SKILL.md`.
- Auto-discovered at session start; `@mention` invocable.
- Workspace admins deploy shared skills across teams.
- Same Agent Skills open standard as Claude Code, Cursor, VS Code.

**Implication:** any capability skill we author — RE skill or rebuild-loop skill — runs unchanged inside Databricks workspaces. Portability we already bet on. The IP is not locked to our local toolchain.

---

## 8. Capability gaps nobody has filled

The ecosystem is rich but not complete. These are published nowhere as Agent Skills today:

- **Unity Catalog governance skill** — mentioned in docs, not skill-documented end-to-end. Biggest surprising gap.
- **Schema evolution specialist** — Great Expectations / Soda ship frameworks, not skills.
- **Databricks cost-tuning skill** — lakehouse-aware cost work (DBU-by-workload, photon decisions, job-cluster sizing). Generic cost skills exist; lakehouse-specific do not.
- **CDC specialist** — covered in `ai-dev-kit` as guidance, not as a standalone deep skill.
- **Data quality contracts** — modern best practice, not yet in circulation.

These are either future skills we author *after* the ETL-RE skill ships, or gaps the rebuild loop solves manually for now.

---

## 9. Implications for `etl-reverse-engineering/BRIEF.md`

1. **RE skill is still frontier IP.** Our Phase 1–5 architecture has no prior art. Nobody ships ETL reverse-engineering-to-PRD as a skill. Design with confidence — we are not behind.

2. **The rebuild loop has real upstream inputs.** Section 1 of the BRIEF says "a downstream skills-based rebuild workflow picks up the PRD and builds the world-class version." That workflow now has a concrete skill inventory to consume: `ai-dev-kit` + `vibe-coding-workshop-template` + `databricks-agent-skills` cover ~80 skills spanning Bronze/Silver/Gold/Semantic/Monitoring/Plumbing.

3. **The PRD should name the skills the rebuild will call.** §10 "Framework coupling" and §13 "Test specification" should list the specific capability skills each RTM row expects the rebuild to consume. This closes the loop — RE outputs a spec that points at execution skills that already exist.

4. **Fork `microsoft/skills-for-fabric/e2e-medallion-architecture`** into our project as `reference/medallion-playbook.md` (or equivalent). It's the fastest path to a Databricks-native medallion reference that pairs cleanly with `vibe-coding-workshop-template`.

5. **Decide at plan time:** does the RE skill embed a "rebuild-call-graph" in its PRD output? (i.e. "this RTM row is rebuilt by calling `databricks-spark-declarative-pipelines` + `vibe-coding-workshop/silver/quality-expectations`"). Strong bias to yes — it makes the PRD directly executable by the rebuild loop.

---

## 10. Workflow-skill sightings (bonus, not the target)

Out-of-scope hunts surfaced a few workflow patterns worth noting briefly:

- **Fabric `azure-prepare → azure-validate → azure-deploy`** is a solid IaC stage-gating model. Matches our Phase-gate architecture. Consider mirroring naming for team intuition.
- **`spark-authoring-cli` 5-minute dedup** is a job-orchestration pattern we'll reuse in our rebuild loop's idempotency layer.
- **`dbt-skillz` (atlasfutures)** auto-generates Agent Skills from dbt projects. Procedural-skill-generation is viable — possible inspiration for generating RTM-row-scoped skills from our PRD output in a later phase.
- **Vibe-workshop's Skill Navigator** — a master routing skill that directs to the right sub-skill. If we later publish our RE + rebuild bundle, a navigator skill is the clean entry point.

---

## Appendix — Verification trail

Findings were spot-checked against live sources on 2026-04-17:

- `databricks-solutions/ai-dev-kit`: tree confirmed (`.claude-plugin/`, `.claude/skills/`, `databricks-skills/`, `databricks-mcp-server/`, `databricks-tools-core/`, `databricks-builder-app/`, `hooks/`). ~20 skills + 50-tool MCP server per README.
- `databricks-solutions/vibe-coding-workshop-template`: tree confirmed; 55 skills across 12 domains enumerated from `data_product_accelerator/` README.
- `databricks/databricks-agent-skills`: tree confirmed; 7 skills enumerated in `skills/` — `databricks-apps`, `databricks-core`, `databricks-dabs`, `databricks-jobs`, `databricks-lakebase`, `databricks-model-serving`, `databricks-pipelines`.
- Databricks Assistant Agent-Skills extensibility confirmed via `docs.databricks.com/aws/en/assistant/skills` (search-verified; direct fetch 403'd, likely WebFetch-specific).
- Microsoft-side findings drawn from `microsoft/skills` and `microsoft/skills-for-fabric` deep scans. See sibling research docs.

Freshness: all repos show recent activity as of April 2026. No stale-corpus risk.
