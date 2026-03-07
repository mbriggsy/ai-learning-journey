# HANDOVER — Overdrive Dual-Mode Architecture Complete

*Date: March 7, 2026*
*Sessions: 2 (Phase 1 in Session 1, Phases 2-3 in Session 2)*

---

## What Was Done

The dual-mode architecture refactor is complete. Overdrive now supports two execution modes that share a common core — CLI mode (fully autonomous) and Interactive mode (human-in-the-loop via Claude Code slash command). All three build phases shipped across two sessions.

### Phase 1: Shared Core Extraction (Session 1)

Split the monolithic `orchestrator.js` (944 lines) into a shared pipeline core + CLI driver.

- `src/core/pipeline.js` (~290 lines) — Step definitions for all 9 pipeline stages. Describes WHAT each step does. Zero knowledge of HOW.
- `src/drivers/cli-driver.js` (~530 lines) — CLI mode execution. Calls `claude` subprocess for each step.
- 5 shared modules moved to `src/core/` with re-export stubs at old `src/` paths for backward compat.
- `src/orchestrator.js` → thin facade re-exporting `cli-driver.js`.
- `briggsy-build` hidden alias in `package.json` bin entry.
- `--upto` flag wired on `run` and `resume` commands.

### Phase 2: CLI Driver Polish (Session 2)

Hardened the `--upto` flag and fixed an edge case where gate-check and code were coupled.

- **Split `_gateCheckAndCode` into `_gateCheck`** — Gate evaluation now sets status to `coding` without executing code. The phase loop picks up `coding` on the next iteration. This fixes `--upto gate-check` actually stopping before coding starts.
- **Added `pause_reason` field** to project state (e.g., `upto:plan`). Auto-clears when project status goes to `running`.
- **Extracted `_pauseAtUpto` helper** — Consistent pause behavior across pre-check and post-check in the phase loop.

### Phase 3: Interactive Driver (Session 2)

Built the interactive driver as a Claude Code slash command.

- **`.claude/commands/overdrive.md`** — Comprehensive orchestration prompt that drives the full pipeline via Task tool subagents.
- **Spec evaluation** — Reads spec, identifies gaps/ambiguities, asks 3-5 clarifying questions, writes enriched spec to `.planning/enriched-spec.md`.
- **Subagent dispatch** — Task tool templates for all 9 pipeline stages. Each subagent gets the relevant prompt template, spec path, and output location.
- **Context self-management** — Prune after each subagent (summarize in 2-3 sentences, drop full output). Checkpoint after ~15 cycles.
- **Mode mixing** — Same state format as CLI mode. `last_driver` field tracks which driver last touched state. Either mode can resume from either mode's state.
- **`--upto` and `--resume`** — Same semantics as CLI mode.

---

## File Structure

```
overdrive/
  .claude/
    commands/
      overdrive.md                 Slash command — Interactive driver
  .gitignore
  package.json                     v0.3.0, briggsy-build alias in bin
  README.md                        Full v0.3.0 docs

  agents/
    AGENT-REGISTRY.md              24-agent indexed catalog

  bin/
    overdrive.js                   CLI entry point (--upto on run + resume)

  prompts/                         12 prompt templates (shared by both modes)
    create-roadmap.md
    plan-phase.md
    strengthen-plan.md
    code-plan.md
    verify-phase.md
    gate-check.md
    ivv-verify.md
    collect-evidence.md
    extract-requirements.md
    build-rtm.md
    evidence-package.md
    dependency-analysis.md

  src/
    core/
      pipeline.js                  Step definitions (WHAT) — 9 stages
      state-manager.js             BUILD-STATE.md read/write + pause_reason
      gate-evaluator.js            Human gate detection
      dependency-analyzer.js       Skip-ahead evaluation
      plan-parser.js               Plan file read/parse/write
      logger.js                    Append-only execution log
    drivers/
      cli-driver.js                CLI mode: subprocess execution (HOW)
      interactive/
        README.md                  Interactive driver architecture docs
    orchestrator.js                Facade -> cli-driver (backward compat)
    claude-runner.js               Wraps claude CLI invocations
    mcp-detector.js                Auto-detects MCP servers
    ivv-runner.js                  Independent Verification & Validation
    rtm-builder.js                 Requirements Traceability Matrix
    banner.js                      Happy Toyz + OVERDRIVE banner

    # Re-export stubs (backward compat — point to core/)
    state-manager.js
    gate-evaluator.js
    dependency-analyzer.js
    plan-parser.js
    logger.js

  test/
    integration.test.js            65 tests across 9 suites
```

---

## Architecture

```
                    SHARED CORE
  prompts/ + core/pipeline.js + state-manager + agents
                 |                |
      +----------+-----+  +------+-----------------+
      |   CLI DRIVER    |  |  INTERACTIVE DRIVER    |
      |   (Node.js)     |  |  (Slash Command)       |
      |                 |  |                         |
      | Fully autonomous|  | Human in loop           |
      | claude subprocess| | Clarifying Qs           |
      | --upto gates    |  | --upto gates            |
      | Long-running    |  | Task tool subagents     |
      +-----------------+  | Context self-mgmt       |
                           +-------------------------+
                 |                |
      +----------+----------------+------------------+
      |         .planning/BUILD-STATE.md              |
      |    Shared state — either mode can             |
      |    read, write, pick up, hand off             |
      +----------------------------------------------+
```

**Key interface:** `pipeline.js` exports `getStepDescriptor(stage, params)` which returns `{ prompt, templateVars, executionType, ... }`. The CLI driver calls these and executes via `claude-runner.js` subprocess. The interactive driver reads prompt templates directly and dispatches via Task tool.

**Mode mixing:** Start interactive to nail the spec. Switch to CLI overnight. Come back to interactive for review. The state file is the handshake.

---

## Test Status

**65/65 passing** across 9 suites:

| Suite | Tests | Coverage |
|---|---|---|
| Module loading | 10 | All 10 modules load cleanly |
| StateManager | 10 | Gates, RTM fields, phase lifecycle |
| RTMBuilder | 6 | Pattern matching, gap extraction |
| Prompt inventory | 4 | All 12 prompts present + placeholders |
| CLI | 4 | Version, steps, --upto, briggsy-build |
| Shared Core | 9 | Pipeline exports, descriptors, facade |
| --upto edge cases | 7 | _isPastUpto, gate/code separation |
| State pause_reason | 3 | Set, clear on resume, disk persistence |
| Interactive Driver | 12 | Slash command structure, templates, rules |

---

## Commits

| Hash | Message |
|---|---|
| `f65ea59a` | feat: Overdrive v0.3.0 — shared core extraction + dual-mode architecture |
| `1d3499aa` | fix: harden --upto flag — split gate-check from code, add pause_reason |
| `1b294b57` | feat: interactive driver — slash command + Task tool subagent orchestration |

---

## Locked Decisions (All Phases)

| Decision | Choice |
|---|---|
| Architecture | pipeline.js (WHAT) + drivers (HOW) + shared state |
| CLI driver | Node.js process, `claude` subprocess per step |
| Interactive driver | Claude Code slash command + Task tool subagents |
| Context management | Prune aggressively + checkpoint at ~15 cycles |
| `--upto` | Both modes, controllable ratchet, stops cleanly |
| Gate-check / code | Separate steps — gate-check sets `coding`, loop picks up code next |
| State format | YAML in `.planning/BUILD-STATE.md`, same for both modes |
| Mode mixing | Fully supported, `last_driver` field is informational |
| `pause_reason` | Stored in state, auto-clears on resume |
| `briggsy-build` | Hidden alias, package.json bin entry, no docs |
| Spec evaluation | Interactive only, clarifying Qs, enriched spec to disk |
| Re-export stubs | Old `src/` paths re-export from `src/core/` |
| Facade | `orchestrator.js` re-exports `cli-driver.js` |

---

## What's Next

**Priority 1: End-to-end test on a real project**
- Create a trivial 2-phase spec
- Run `overdrive init spec.md` and `overdrive run` (CLI mode)
- Verify: fresh contexts spawn, strengthening runs, IV&V is independent, RTM traces, full loop completes
- Then test `/overdrive spec.md --upto plan` (interactive mode)
- Then test mode mixing: `/overdrive --resume` after CLI run

**Priority 2: Verify Claude CLI integration**
- Smoke test `claude -p` invocation model under real conditions
- Validate `--context`, `--allowedTools`, `--mcp`, `--output-format` flags

**Priority 3: Polish**
- Slash command may need tuning after real-world usage
- Context self-management cycle count may need adjustment
- Subagent prompt templates may need refinement

---

## Briggsy's Preferences

- Quick and clever humor, cursing more than acceptable
- Tell it like it is, no sugar-coating
- Strong opinions, playful and goofy
- Call him Briggsy
- Screenshots and temp files go in system temp dir, NOT project root

---

*-- End of Handover --*
