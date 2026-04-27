# Skills

ATC isn't a tool — it's a flight pattern. The skills below are suggestions for *which engines* to bolt on. Fork what works, build only the gaps, modify everything to fit your stack. None of these are required; the methodology survives substitutions. The point is to start from somewhere instead of reinventing the wheel.

## Where skills come from

Skills are instruction-set artifacts — they follow a spec (Anthropic's progressive-disclosure model is the reference), and they're first-class citizens in modern agent stacks. They live as text on disk in `~/.claude/skills/` or the equivalent for your stack: forkable, version-controllable, modifiable. That's what makes "fork what works" a real strategy and not a slogan.

Anyone authors them — Anthropic, Microsoft, Databricks, Compound Engineering, you. Three external sources matter for an Azure data-engineering build:

- **Compound Engineering (CE).** Authored by Every. Strong opinionated skills for brainstorming, planning, execution, code review. Battle-tested in product engineering and generalizes well to data engineering. Default starting point for the build loop.
- **Microsoft / Databricks.** First-party skills published for ADF, ADLS, Delta, Databricks, Unity Catalog. Lean on these for stack-specific work — schema authoring, Delta operations, framework-specific patterns. Currency varies; check publish dates before adopting.
- **Anthropic.** Reference patterns and primitive skills (code review, document review, security review). Good baselines when you don't have a fork to start from.

And one local source:

- **Yours.** The team's own skills live alongside the build repo. The reverse-engineering skill at `../etl-reverse-engineering/` is the canonical "ours." Fork it, version it, distill into it.

## Skills by phase

Suggestions only. Pick one per role; don't run three.

### Contract — Chapter 1 (PRD lands from reverse-engineering)

- **Reverse-engineering skill** (ours). Reads legacy code, emits the PRD.
- **RTM-extraction skill** (selection notes below). Reads the PRD, emits the RTM.

### Contract — Chapter 2 (PRD authored fresh)

- `ce:brainstorm`, `ce:ideate`, or `gsd:new-project` for raw requirements gathering.
- A PRD-authoring skill or agent-guided process for organizing the brainstorm output into the PRD. (Open gap — no first-party skill yet.)
- The same RTM-extraction skill from Ch1 reads the PRD and emits the RTM.

### Plans

- `ce:plan` or `gsd:plan-phase` to draft the phased plan series.
- `compound-engineering:document-review` or `ce:plan`'s built-in challenger panel for the deepening pass.

### Execute

- `gsd-executor` or `ce:work` to drive the per-phase build loop.
- `/brief` (yours) at the start of each phase to load institutional memory.

### Review

- `/code-review`, `/pr-review-toolkit:review-pr`, or `compound-engineering:ce-review` for the panel.
- `/security-review` if the build touches sensitive data, auth, or external surfaces.
- `/distill` (yours) at session end to capture lessons into the brief.

### Evidence

Open gap. Evidence assembly is per-stack work. Likely candidates to fork or build: an RTM-closer that walks rows and verifies `rebuild_anchor` + `test_case` are populated and passing; a parity-report skill (Ch1) that runs reconciliation against legacy goldens. Until those exist, the agent assembles the package by hand against the chapter doc's contents list.

## Selecting the RTM-extraction skill

Multiple candidates exist on mcpmarket and elsewhere. Selection criteria, in order:

1. **Outputs the right column shape.** RTM rows need `req_id`, `type`, `description`, `legacy_anchor` (Ch1) or empty (Ch2), `rebuild_anchor`, `test_case`, `status`, `correctness_flag`, `divergence`. A skill that emits a different shape will fight every downstream phase.
2. **Reads PRDs as narrative, not structured forms.** ATC PRDs are prose. A skill that needs structured input is the wrong tool.
3. **Surfaces correctness flags during extraction.** Suspected legacy bugs in Ch1 need a flag for human resolution before lock — not silently inherited as "behavior."
4. **Forkable.** The column shape will evolve. A closed-source SaaS skill that won't let you change the schema is a future hostage.

If no off-the-shelf skill clears all four, fork the closest one and modify. Don't build from scratch unless the gap is real.

## /brief and /distill — the loop

Both authored locally, live at `~/.claude/skills/`. They wrap every build:

- `/brief` runs at the top of every execute-phase. Loads gotchas, framework quirks, patterns and anti-patterns from prior builds.
- `/distill` runs at session end after review. Writes new lessons into the brief.

The pair is what makes the brief *grow*. Without `/distill`, the brief is a static doc that decays. Without `/brief`, every build rediscovers the same potholes.

Don't seed the brief manually. It fills via `/distill`. An empty brief on a new team is fine — the loop populates it.

## When to fork, when to build new

Fork when:

- A skill exists that does ~70% of what you need.
- You can extend its outputs or sharpen its prompt without breaking its assumptions.

Build new when:

- The job is stack-specific (ETL Framework 2.0 patterns, your team's deployment ritual) and no public skill knows your stack.
- You've forked the same skill three times for different jobs — that's a signal the abstraction belongs to you.

Don't build new because the existing skill's voice is wrong. Voice is the cheapest thing to fork.
