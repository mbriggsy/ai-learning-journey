# HANDOVER — Overdrive v0.3.0

*Date: March 7, 2026*
*Project: Overdrive (Autonomous Software Development Lifecycle)*

---

## What This Is

A Node.js CLI that sits OUTSIDE Claude Code and drives projects from spec to shipped product with a full evidence trail. Each pipeline step = fresh `claude` subprocess = fresh 200K context window. No context rot. Ever.

**The full pipeline is BUILT and TESTED:**

```
plan -> strengthen -> gate check -> code -> verify -> IV&V -> evidence -> RTM -> evidence package
```

All 9 stages implemented. All 3 code-enforced gates working. 32/32 integration tests passing.

---

## Current State: CLEAN — Ready for Live Testing

The codebase just went through a fine-tooth review and cleanup session. Everything is ship-shape:

- 28 files, ~6,200 lines
- 10 source modules, 12 prompt templates, 1 CLI, 1 test suite
- Zero empty directories, zero stale artifacts
- README fully updated to v0.3.0
- All integration tests passing (32/32)

---

## File Inventory

```
overdrive/
  .gitignore
  package.json                     v0.3.0, deps: js-yaml, chalk, commander
  README.md                        Full v0.3.0 docs
  HANDOVER.md                      THIS FILE

  agents/
    AGENT-REGISTRY.md              233 lines — 24-agent indexed catalog

  bin/
    overdrive.js                   129 lines — CLI entry point

  src/
    orchestrator.js                944 lines — phase loop engine
    rtm-builder.js                 698 lines — Requirements Traceability Matrix
    state-manager.js               409 lines — BUILD-STATE.md read/write
    mcp-detector.js                383 lines — auto-detects Context7, Sequential Thinking, Serena
    claude-runner.js               268 lines — wraps `claude` CLI subprocess
    ivv-runner.js                  254 lines — Independent Verification & Validation
    plan-parser.js                 216 lines — plan file read/parse/write
    gate-evaluator.js              150 lines — human gate detection
    dependency-analyzer.js         140 lines — skip-ahead evaluation
    logger.js                      137 lines — append-only execution log

  prompts/
    strengthen-plan.md             596 lines — THE GAUNTLET (24-agent Strike Team)
    build-rtm.md                   174 lines — per-phase RTM building
    evidence-package.md            175 lines — final deliverable (includes IV&V + RTM sections)
    collect-evidence.md            152 lines — phase proof record
    ivv-verify.md                  150 lines — independent verification (no spec, no plan)
    extract-requirements.md        97 lines  — R-XXX extraction from spec
    verify-phase.md                73 lines  — acceptance criteria verification
    plan-phase.md                  69 lines  — atomic plan creation
    code-plan.md                   57 lines  — mechanical transcription from Implementation Spec
    create-roadmap.md              55 lines  — phased roadmap from spec
    dependency-analysis.md         55 lines  — skip-ahead analysis
    gate-check.md                  51 lines  — human gate evaluation

  test/
    integration.test.js            32 tests — modules, state machine, gates, RTM, prompts, CLI
```

---

## The Three Code-Enforced Gates

| Gate | Method | Blocks | Until |
|------|--------|--------|-------|
| Gate 1 | `canCode()` | Coding | All plans strengthened |
| Gate 2 | `canCollectEvidence()` | Evidence collection | IV&V passes |
| Gate 3 | `canBuildRTM()` | RTM building | Evidence collected |

No flags. No overrides. No config option can bypass them.

---

## What Needs to Happen Next

**Priority 1: Test on a toy project**
- Create a trivial 2-phase spec
- Run `overdrive init spec.md` and `overdrive run`
- Verify: fresh contexts spawn, strengthening runs, requirements get extracted, state survives crashes, IV&V runs independently, RTM traces correctly, the whole loop completes
- This is the real test. Everything until now has been unit/integration. Time for end-to-end.

**Priority 2: Verify Claude CLI integration**
- The `claude -p` invocation model needs a real smoke test
- Validate `--context`, `--allowedTools`, `--mcp`, `--output-format` flags against the actual current CLI
- The `runExecution()` spawn-based approach needs verification under real conditions

**Priority 3: Update README if anything breaks during testing**

**Future consideration: RTM feedback loop**
- When RTM finds gaps, the orchestrator currently creates gates
- Auto-remediation (re-plan/re-strengthen to close gaps) would be the next level

---

## Locked Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Language | Node.js | Same ecosystem as target projects |
| Execution model | External CLI calling `claude` subprocess | Orchestrator lives OUTSIDE Claude Code |
| State persistence | Markdown + YAML in `.planning/` | Git-trackable, human-readable, crash-safe |
| Strengthening | Mandatory, code-enforced | v02 proved 15/15 bug catches |
| IV&V model | Independent — no spec, no plan given | NASA-grade independence |
| RTM model | Machine-checkable R-XXX chain | Every empty cell is a gap finding |
| Plan size | ~50% of context window | Prevents context rot |
| Git integration | Atomic commit per plan | Bisectable history |
| Agent count | 24 in 3 tiers | Audited against world-class SDLC |
| Complexity levels | standard/high/maximum | Defaults to high |
| Dependencies on GSD/CE | NONE | Standalone tool |

---

## Briggsy's Preferences

- Quick and clever humor, cursing more than acceptable
- Tell it like it is, no sugar-coating
- Strong opinions, playful and goofy
- Call him Briggsy

---

*-- End of Handover --*
