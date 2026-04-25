# Agentic Execution Pattern — Worktrees + Orchestrator

> 🚧 **DRAFT — Phase 1B output, citation-audited 2026-04-25.** The pattern is locked via ADR-009; this doc may revise as Phase 3 SPEC resolves the open questions.
> **Companion:** This doc + [`data-engineering-skills-landscape.md`](data-engineering-skills-landscape.md) are the inputs to Phase 3 (`SPEC.md`).

---

## Decision

ATC executes work in **per-phase git worktrees**, with **one PR per phase**. The orchestrator skill owns commit/push authority; subagents commit-only inside their assigned worktree. During Phase 6 (Execute) — the only fan-out phase — subagents are spawned with Anthropic's native `isolation: worktree` frontmatter, which Anthropic auto-cleans on no-change exit.

This combines:
- **Boris Cherny's 3–5-worktrees-in-parallel productivity unlock** (Boris is the Claude Code product lead at Anthropic; pattern advocated via `@bcherny` on X around the v2.1.49–v2.1.50 release window, Feb 19–20, 2026 — see Anthropic's [Claude Code release notes](https://docs.claude.com/en/release-notes/claude-code) for v2.1.49 (`--worktree` flag) and v2.1.50 (worktree hooks). Specific X status IDs not citation-verified.)
- **Anthropic's first-class worktree primitives** (`claude --worktree`, subagent `isolation: worktree`, `.worktreeinclude`, `WorktreeCreate` hook, auto-cleanup contract — verified in Anthropic docs at `docs.claude.com/en/docs/claude-code/common-workflows`)
- **CE's KISS rule** (one branch = one worktree, always from `main`, never call `git worktree add` directly — verified in local source `~/.claude/plugins/marketplaces/compound-engineering-plugin/plugins/compound-engineering/skills/git-worktree/SKILL.md`)
- **Data-engineering-specific failure modes** that no published guidance covers (deployed-state collisions, port collisions for Databricks Connect / ADF integration runtime, secrets propagation)

> **Honest caveat on sources:** Boris Cherny has *no formal blog post* on this — only X threads. `howborisusesclaudecode.com` is a fan-curated aggregate by `@CarolinaCherry`, NOT Boris's own publication. We treat its formulations as paraphrase of Boris's tweets, not as direct quotes. Anthropic's `docs.claude.com` is the load-bearing source.

---

## Topology

```
Project root (main branch)
│
├── .claude/
│   └── worktrees/                          ← Anthropic's native location
│       ├── 02-prd-<ticket>/                ← Phase 2: PRD authoring
│       │   ├── docs/prd/PRD.md
│       │   └── (.worktreeinclude copies .env, databricks.cfg, etc.)
│       ├── 06-execute-<ticket>/            ← Phase 6: Execute
│       │   ├── (code mutations)
│       │   └── subagent-spawns:           
│       │       ├── (each isolation: worktree)
│       │       └── ↳ auto-cleaned by Anthropic on no-change exit
│       ├── 07-review-<ticket>/             ← Phase 7: Review (read-only mostly)
│       └── ... (one per active phase per ticket)
│
└── (working tree on main — read-only during agentic execution)
```

### Authority

| Action | Who has it |
|---|---|
| Spawn worktree | Orchestrator skill (`atc-orchestrator`) — never a subagent direct |
| Commit | Subagents (in their assigned worktree) |
| **Push** | **Orchestrator only** — no subagent has push authority |
| Open PR | Orchestrator |
| **Merge PR** | **Human** — at the autonomy-ladder gate |
| Delete worktree | Orchestrator (post-merge hook) — or Anthropic auto-cleanup for `isolation: worktree` subagents |

**The rule:** subagents commit, orchestrator pushes. This serializes pushes → no multi-agent push collisions on the remote.

---

## Anthropic native primitives ATC uses

### `claude --worktree <name>` (announced Feb 20, 2026)
Native flag spawns a worktree at `<repo>/.claude/worktrees/<name>/`, branch `worktree-<name>`, branched from `origin/HEAD`. ATC orchestrator wraps this with phase-aware naming: `<phase-id>-<phase-name>-<ticket>`.

### Subagent `isolation: worktree` frontmatter
A subagent definition with this frontmatter spawns into its own worktree. Anthropic auto-cleans the worktree on no-change exit. Boris's prototype example: *"Migrate all sync io to async. Batch up the changes, and launch 10 parallel agents with worktree isolation. Make sure each agent tests its changes end to end, then have it put up a PR."* Maps onto ATC's Phase 6 fan-out cleanly.

### `.worktreeinclude` (gitignore syntax)
ATC commits a `.worktreeinclude` at the repo root listing files that should auto-copy into every new worktree:

```
.env
.env.local
databricks.cfg
.azure/
.databrickscfg
*.pem
azure-credentials.json
```

This solves the secrets-leak problem cleanly — agents in worktrees have the secrets they need to run, but the secrets stay in `.gitignore` and never enter the repo.

### `WorktreeCreate` hook
ATC uses this hook on every worktree creation to:
1. Allocate a port range for the worktree (`BASE_PORT + worktree_index * 10` — see "Port collisions" below)
2. (For projects that hit the deployed-state collision flag below — see Failure Mode 3) optionally allocate a per-worktree Databricks deploy target. **Pilot ATC projects skip this** — sequential execution means no collision.
3. Write the activity-start record into the ATC Tower telemetry log (file-based, NDJSON)

### Auto-cleanup contract
Anthropic's contract: no changes → worktree + branch removed automatically. Changes/commits exist → user prompted to keep or remove. Subagent worktrees orphaned by crashes are swept at startup once older than `cleanupPeriodDays` (only if no uncommitted/untracked/unpushed work).

ATC layers a **post-merge hook** on top: when a phase PR merges, the orchestrator calls `git worktree remove <phase-worktree>` and `git branch -d <phase-branch>`. Belt-and-suspenders cleanup.

---

## Failure modes ATC designs around

### 1. `.git/index.lock` contention
Agents in different worktrees still share the parent repo's `.git/`. Concurrent commits race on `index.lock`. **Solution:** orchestrator serializes commits via a lock file (`.claude/atc-commit.lock`), or — better — subagents emit pending-commit records that the orchestrator commits in batch.

### 2. Port collisions
Databricks Connect, ADF integration runtime emulators, sql-server containers, REST mock servers all bind to fixed ports. Two parallel worktrees both running `databricks connect` on port 15001 → collision. **Solution:** `BASE_PORT + worktree_index * 10`. ATC's `WorktreeCreate` hook computes the index and exports `ATC_PORT_BASE` into the worktree's environment.

### 3. **Deployed-state collisions** (flag for the future, not solved today — per YAGNI)
Two parallel agents both running `databricks bundle deploy --target dev` against the same Databricks workspace will race. Same for `az datafactory pipeline create-or-update`. The git layer is fine — the **deployed-state layer is shared infrastructure outside git**. No published guidance covers this for agentic Databricks/ADF work.

**ATC's pilot use cases run sequentially: one phase at a time, one deploy at a time.** This collision only matters when Phase 6 (Execute) fans out to subagents that *each* perform deploys against shared infrastructure — which is not the pilot use case.

**Per ADR-011, we defer the solution.** Two solutions remain available when a project actually needs parallel deploys:
- **(a) Per-worktree deploy targets** — each worktree gets its own Databricks bundle target (`dev-worktree-02`, etc.). Faster parallel execution, more dev infrastructure.
- **(b) Orchestrator-held mutex** — subagents request "deploy clearance" before deploying; orchestrator serializes. Simpler, no extra infrastructure.

**When the first project that hits this lands, ATC adds coordination at that point — against a real use case.** Until then: don't build the mutex, don't build the per-worktree targets, just keep this flag on the failure-modes list so engineers see the warning if their project drifts toward parallel deploys.

### 4. Secrets propagation
Solved by `.worktreeinclude`. Verify the file is committed to the repo root and lists every secret file an agent needs.

### 5. Stale `origin/HEAD`
Anthropic branches new worktrees from `origin/HEAD`. If the local `origin/HEAD` cache is stale (no recent `git fetch`), worktrees branch from yesterday's main. **Solution:** orchestrator runs `git fetch origin && git remote set-head origin main` before any worktree creation.

### 6. Dependency duplication
`.venv`, `node_modules`, etc. duplicated per worktree wastes disk. **Solution:** use `pnpm` / `uv` / shared caches. Orchestrator can also link to a shared `.venv` if isolation guarantees aren't violated.

---

## Worktree-per-phase, not per-agent

ATC has 9 phases that are **mostly sequential**. Only Phase 6 (Execute) and Phase 7 (Review) fan out to multiple agents — and Phase 7's reviewers are read-only, so they don't need worktrees.

The pattern:

| Phase | Worktree | Agents |
|---|---|---|
| 1 — Brief | `01-brief-<ticket>/` | 1 |
| 2 — PRD | `02-prd-<ticket>/` | 1 (with parallel reviewer fan-out — reviewers don't mutate) |
| 3 — Spec | `03-spec-<ticket>/` | 1 |
| 4 — Phased plan | `04-plan-<ticket>/` | 1 |
| 5 — Deepen | `05-deepen-<ticket>/` | 1 |
| **6 — Execute** | `06-execute-<ticket>/` | **1 orchestrator + N subagents w/ `isolation: worktree`** |
| 7 — Review | `07-review-<ticket>/` | 1 orchestrator + 5–10 reviewer subagents (read-only) |
| 8 — Docs | `08-docs-<ticket>/` | 1 |
| 9 — Evidence | `09-evidence-<ticket>/` | 1 |
| 10 — Release | (no worktree — release happens on main after merge) | — |

Each phase opens **one PR** to main. PRs gated by the autonomy ladder (PRD-lock = first PR threshold; evidence-lock = release-PR threshold).

### Why not worktree-per-agent in non-execute phases?

Phases 1–5 and 8–9 are mostly authoring (markdown, plans, evidence files). One worktree per phase is cleaner audit-trail-wise. We'd be paying worktree-spawn cost for no parallelism gain.

### Why not worktree-per-PR-author in execute?

Boris's pattern — N agents, each in its own worktree, each opens a PR — works for batched migrations where each migration is genuinely independent. ATC's execute phase usually has tightly coupled changes (e.g., a Delta table schema change, the pipeline that writes to it, and the consumer that reads from it must merge together). **One PR per phase** keeps that coupling visible.

We **do** spawn `isolation: worktree` subagents *within* the phase-6 worktree for parallel work units that are independent — the subagents commit back to the phase-6 branch, not to N separate branches.

---

## Open questions

1. **Anthropic Agent Teams** (`docs.claude.com/en/agent-teams`) document multi-agent coordination as a higher-level primitive. Should ATC's Phase 6 use Agent Teams instead of manual subagent spawning? Worth a Phase 4 spec-time decision.
2. **Whether all phases need worktrees** — Phases 1–5 are mostly markdown authoring. Could share a single worktree. Trade-off: fewer worktrees vs. cleaner per-phase audit trail. Phase 4 finalizes.
3. **Cleanup if a phase fails to merge** — what's the orchestrator's behavior when human rejects a phase PR? Probably: human shapes feedback in the PR, orchestrator updates worktree in place, re-pushes. Phase 4 finalizes.
4. **Deploy mutex protocol details** — file-based lock? Database row? Orchestrator-process-singleton? Phase 3 SPEC finalizes.

---

## Sources

- **Anthropic official:** https://docs.claude.com/en/docs/claude-code/common-workflows (worktree section, `.worktreeinclude`, auto-cleanup, `WorktreeCreate` hook, subagent `isolation: worktree`)
- **Anthropic agent teams:** https://docs.claude.com/en/agent-teams
- **Anthropic Claude Code release notes:** https://docs.claude.com/en/release-notes/claude-code — v2.1.49 (Feb 19, 2026) introduced the `--worktree` flag; v2.1.50 (Feb 20, 2026) added worktree hooks
- **Boris Cherny on X (`@bcherny`)**: Claude Code product lead at Anthropic, advocates the 3–5-parallel-worktrees pattern. **Specific tweet IDs not citation-verified** at audit time — X.com returns HTTP 200 for any status path regardless of post existence, so the tweet IDs in initial research are removed pending direct verification.
- **Fan-aggregate site:** https://howborisusesclaudecode.com — `@CarolinaCherry`'s curation of Boris's X commentary. Useful as discovery, NOT authoritative.
- **Boris's actual blog:** https://borischerny.com/ (verified — no worktree post exists; X-only sourcing)
- **CE git-worktree skill (local source):** `~/.claude/plugins/marketplaces/compound-engineering-plugin/plugins/compound-engineering/skills/git-worktree/SKILL.md`
- **Practitioner write-ups:**
  - incident.io blog (URL 404'd at audit time — search "incident.io claude code worktrees" if needed)
  - augmentcode.com, dandoescode.com, mindstudio.ai, zylos.ai
  - Reddit `r/ClaudeAI` and `r/ClaudeCode`: Citadel "Fleet Mode", Archon, sudo-code, GitButler alternative, port-collision patterns

---

## Citation audit log

**2026-04-25** — Phase 1B-VERIFY pass. All Anthropic worktree primitives (`claude --worktree`, `WorktreeCreate`, `cleanupPeriodDays`, `isolation: worktree`, `.worktreeinclude`, `.claude/worktrees`) verified by direct grep against `docs.claude.com/en/docs/claude-code/common-workflows`. Specific Boris Cherny X status IDs **removed** — X.com returns HTTP 200 for any status path so non-login verification is impossible. Replaced with citation to Claude Code release notes (v2.1.49 Feb 19 2026 introduced `--worktree`; v2.1.50 Feb 20 2026 added worktree hooks). incident.io URL 404'd; left noted for future reference.

CE git-worktree skill verified at `~/.claude/plugins/marketplaces/compound-engineering-plugin/plugins/compound-engineering/skills/git-worktree/SKILL.md`.
