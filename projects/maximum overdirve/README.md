# Overdrive

**Autonomous Software Development Lifecycle** — Drives projects from spec to shipped product with a complete evidence trail.

```
plan → strengthen → code → verify → IV&V → evidence → RTM → evidence package
       ^^^^^^^^^^                    ^^^^               ^^^
       THE GAUNTLET.              INDEPENDENT EYES.  EVERY REQUIREMENT TRACED.
       MANDATORY. ALWAYS.            NO SPEC. NO PLAN.  EVERY EMPTY CELL = GAP.
```

## Why This Exists

You can't orchestrate from inside the thing you're orchestrating. A Claude Code slash command cannot spawn fresh context windows, enforce workflow steps, or persist state across crashes. This tool sits **outside** Claude Code and calls `claude` as a subprocess — each invocation gets a fresh 200K context window. No context rot. Ever.

The **Strengthen** step (pre-coding Strike Team review by a 24-agent panel) is non-negotiable. The code literally won't let you skip it — `canCode()` blocks until every plan has been through the gauntlet.

## The Pipeline

| Stage | What Happens | Why It Matters |
|-------|-------------|----------------|
| **Plan** | Claude breaks each phase into atomic plans (~50% context each), organized into parallel waves | Right-sized work units prevent context rot |
| **Strengthen** | Each plan faces a 24-agent Strike Team who tear it apart looking for bugs | Bugs caught here cost 10x less than bugs caught in code |
| **Gate Check** | Script checks for missing assets, spec-declared gates, blockers | Humans do human things, machines keep working |
| **Code** | Each strengthened plan is coded in a fresh context window, producing an atomic git commit | The coder follows the battle-tested plan, not their own instincts |
| **Verify** | Tests run, acceptance criteria checked, architecture boundaries verified | Trust but verify. Objectively. |
| **IV&V** | Independent Verification — receives ONLY acceptance criteria + code, no spec or plan. At `maximum`, includes cold code read | NASA-grade independence. Catches blind spots the whole pipeline shares. |
| **Evidence** | Proof record built for the phase — test output, metrics, bug resolution, architecture compliance | Accountability. Reproducibility. |
| **RTM** | Machine-checkable traceability: R-XXX -> Plan -> Test -> Code -> Evidence. Every empty cell is a gap finding. | No requirement left behind. No test without justification. |
| **Evidence Package** | Final deliverable assembling all evidence, IV&V reports, and RTM summary into one authoritative document | The answer to "how do we know this works?" |

## The Three Code-Enforced Gates

These are the architectural backbone. No flags. No overrides. No "just this once."

| Gate | Method | Blocks | Until |
|------|--------|--------|-------|
| **Gate 1** | `canCode()` | Coding | All plans strengthened |
| **Gate 2** | `canCollectEvidence()` | Evidence collection | IV&V passes |
| **Gate 3** | `canBuildRTM()` | RTM building | Evidence collected |

Every gate is a function that returns `{ allowed, reason }`. The orchestrator checks the gate before executing the step. Enforced in code, not in prompts. No configuration option can bypass it.

## Quick Start

```bash
# Install
npm install -g .

# Initialize a project from a spec
overdrive init my-project-spec.md

# Run autonomous execution
overdrive run

# Check status
overdrive status

# Resume after resolving human gates
overdrive resume

# Manual step (escape hatch)
overdrive step 2 strengthen
overdrive step 1 rtm
overdrive step 0 extract-requirements
```

## The Agent Registry (Strengthen Stage)

The strengthen prompt assembles a **Strike Team** from a registry of **24 specialist agents** organized into three tiers, activated based on a configurable complexity level.

**Full registry:** See [`agents/AGENT-REGISTRY.md`](agents/AGENT-REGISTRY.md) for complete documentation including agent detail cards, mandates, MCP integration notes, and the coverage matrix.

### Complexity Levels

```yaml
# In .overdrive.yaml
complexity: high  # standard | high | maximum
```

| Level | Agents | Use When |
|-------|--------|----------|
| `standard` | 10 Core only | Prototypes, internal tools, weekend projects |
| `high` (default) | 10 Core + relevant Tier 2 | Production software, anything that ships to users |
| `maximum` | All 24, every plan | Regulated industries, financial systems, safety-critical |

### Tier 1: Core Agents (Always Active)

| # | Agent | Domain |
|---|-------|--------|
| 01 | The Surgeon | API correctness — checks every call character by character |
| 02 | The Architect | Structural integrity — boundaries, coupling, separation of concerns |
| 03 | The Profiler | Performance — O(n^2), memory leaks, resource exhaustion |
| 04 | The Saboteur | Edge cases — empty/null/enormous/adversarial inputs |
| 05 | The Sentinel | Security — adversarial input at every trust boundary |
| 06 | The Skeptic | Test adequacy — tests that catch bugs, not exercise happy paths |
| 07 | The Accountant | Consistency — naming, units, contract mismatches |
| 08 | The Oracle | Integration impact — how today constrains tomorrow |
| 09 | The Simplifier | Overengineering — premature abstraction, YAGNI violations |
| 10 | The Researcher | Best practices — validates against current official docs |

### Tier 2: Context-Activated Specialists (at `high` and `maximum`)

| # | Agent | Activates When |
|---|-------|---------------|
| 11 | The Guardian | Databases, migrations, persistent state |
| 12 | The Timekeeper | Async, concurrency, shared state, race conditions |
| 13 | The Cartographer | API design — REST, GraphQL, contracts |
| 14 | The Janitor | Error handling, retries, recovery |
| 15 | The Deployer | Environment config, deployment, rollbacks |
| 16 | The Advocate | Accessibility, i18n, user-facing output |
| 17 | The Librarian | Client-side state, caches, synchronization |
| 18 | The Weaver | Logging, metrics, tracing, observability |
| 19 | The Enforcer | Coding standards, style guides, conventions |
| 20 | The Purist | Design principles — SOLID, DRY, Law of Demeter |
| 21 | The Scribe | Documentation, API docs, decision rationale |
| 22 | The Lab Tech | Testability — DI, pure functions, seams for mocking |
| 23 | The Castellan | Resilience — circuit breakers, bulkheads, chaos readiness |

### Tier 3: Governance (at `maximum` or when spec declares regulatory requirements)

| # | Agent | Domain |
|---|-------|--------|
| 24 | The Magistrate | Compliance — licenses, GDPR, HIPAA, SOX, audit trails |

A typical `high` review activates **14-18 agents**. At `maximum`, all 24 fire on every plan.

## Requirements Traceability Matrix (RTM)

The RTM is the final piece of the accountability chain. It creates a machine-checkable matrix: **R-XXX -> Plan -> Test -> Code -> Evidence**. Every empty cell is a gap finding.

### How It Works

1. **During `init`**: Claude extracts every verifiable requirement from the spec, assigns R-XXX IDs, classifies by type (functional/non-functional/constraint/interface/data), and writes `requirements.yaml` + `REQUIREMENTS.md` to `.planning/`.

2. **Per phase (after evidence collection)**: Claude traces each requirement through four links — plan, test, code, evidence.

### Gap Severity Model

| Severity | Condition | Action |
|----------|-----------|--------|
| **High** | Requirement has no plan OR no test | Creates a decision gate for human review |
| **Medium** | Requirement has no code trace or no evidence | Noted but doesn't block |
| **Low** | Coverage exists but R-XXX tag is missing | Needs tagging |

### Project-Level RTM

When all phases complete, the evidence package includes a project-level RTM summary that aggregates all phase RTMs and identifies orphaned requirements (in the registry but never traced in any phase).

## MCP Research Integration

overdrive automatically detects available MCP servers and injects their capabilities into the strengthen phase. When Context7, Sequential Thinking, and Serena are available, the Strike Team agents are explicitly instructed on which tools to use and when.

| Server | What It Does | Which Agents Use It |
|--------|-------------|-------------------|
| **Context7** | Live, version-specific framework docs | The Surgeon (API verification), The Researcher (best practices), The Accountant (contract validation), The Guardian (ORM docs), The Cartographer (framework patterns) |
| **Sequential Thinking** | Structured step-by-step reasoning chains | The Architect (dependency chains), The Saboteur (failure propagation), The Timekeeper (race conditions), The Oracle (integration impact), The Janitor (error path tracing) |
| **Serena** | Semantic code navigation — ground truth | The Architect (actual import tracing), The Accountant (real naming consistency), The Oracle (actual dependency graph), The Guardian (data model references), The Profiler (call site analysis), The Sentinel (data flow tracing) |

Serena's value **scales with codebase size** — low for Phase 1 greenfield, critical by Phase 2+ when plans modify existing code and agents need to verify assumptions against what actually exists.

Run `overdrive status` to see which MCP servers are detected. Install all three:

```bash
claude mcp add context7 --type http --url https://mcp.context7.com/mcp
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
claude mcp add serena -- npx -y @anthropic/serena
```

| Tool | Reviews Against | Critical Rule |
|------|----------------|---------------|
| **Context7** | External truth (live docs) | If docs contradict the plan's API usage, docs win |
| **Sequential Thinking** | Logical truth (structured reasoning) | If analysis exceeds 3 logical steps, use structured chains |
| **Serena** | Internal truth (actual codebase) | If Serena contradicts the plan's assumptions about existing code, Serena wins |

## Configuration

Optional `.overdrive.yaml` in your project root:

```yaml
spec_file: ./my-spec.md

# Complexity level — controls how many agents activate during strengthen
# standard: 10 core agents | high: core + relevant specialists | maximum: all 24 agents
complexity: high

models:
  plan: claude-sonnet-4-20250514
  strengthen: claude-sonnet-4-20250514
  code: claude-sonnet-4-20250514
  verify: claude-sonnet-4-20250514

mcp_servers:
  - context7
  - serena

timeouts:
  plan: 300000           # 5 min
  strengthen: 600000     # 10 min (thoroughness > speed)
  code: 600000           # 10 min
  verify: 300000         # 5 min
  ivv: 600000            # 10 min (independence takes time)
  rtm: 600000            # 10 min (tracing takes time)
  evidence: 300000       # 5 min
  evidence_package: 600000  # 10 min
```

## Project Structure

```
overdrive/
  bin/overdrive.js              -- CLI entry point (v0.3.0)
  agents/
    AGENT-REGISTRY.md          -- Indexed catalog of all 24 agents
  src/
    orchestrator.js             -- Phase loop engine
    claude-runner.js            -- Wraps claude CLI invocations
    state-manager.js            -- Reads/writes BUILD-STATE.md
    rtm-builder.js              -- Requirements Traceability Matrix engine
    ivv-runner.js               -- Independent Verification & Validation
    mcp-detector.js             -- Detects Context7, Sequential Thinking, Serena
    gate-evaluator.js           -- Detects human gates
    dependency-analyzer.js      -- Maps phase dependencies
    plan-parser.js              -- Reads/parses plan files
    logger.js                   -- Append-only execution log
  prompts/                      -- THE PRODUCT (methodology encoded)
    create-roadmap.md           -- "Create a phased roadmap..."
    plan-phase.md               -- "Break this phase into atomic plans..."
    strengthen-plan.md          -- "Assemble the Strike Team..." (596 lines)
    code-plan.md                -- "Write the code. Follow the plan."
    verify-phase.md             -- "Does it actually work?"
    ivv-verify.md               -- "Fresh eyes. No spec. No plan."
    collect-evidence.md         -- "Build the proof record..."
    extract-requirements.md     -- "Extract every verifiable requirement..."
    build-rtm.md                -- "Trace R-XXX through plan/test/code/evidence..."
    evidence-package.md         -- "Assemble the Evidence Package..."
    gate-check.md               -- "Does this need a human?"
    dependency-analysis.md      -- "What can proceed independently?"
  test/
    integration.test.js         -- Module loading, state machine, gates, prompts
```

## Design Principles

1. **Orchestrator lives OUTSIDE Claude Code** — Node.js CLI, calls `claude` as subprocess
2. **Every step is a fresh context** — no context rot, ever
3. **Strengthening is mandatory and code-enforced** — `canCode()` blocks until all plans are strengthened
4. **IV&V is independent and code-enforced** — no spec, no plan given to the verifier. `canCollectEvidence()` blocks until IV&V passes
5. **RTM is mandatory and code-enforced** — `canBuildRTM()` blocks until evidence is collected. Every requirement traced or flagged as a gap
6. **State on disk, always** — survives crashes, human-readable, git-trackable
7. **Skip-ahead on gates** — maximize autonomous progress when blocked
8. **Prompts are the product** — invest in them, version them, improve them
9. **Evidence is not optional** — every phase produces proof, every build produces a package
10. **MCP servers are force multipliers** — auto-detect and leverage Context7, Sequential Thinking, Serena
11. **One tool, not layers of duct tape** — self-contained, no plugin dependencies

## Prerequisites

- Node.js 18+
- `claude` CLI installed and authenticated
- Git (for atomic commits and state tracking)

## License

MIT
