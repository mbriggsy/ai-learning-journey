# Interactive Driver

The interactive driver is a Claude Code slash command at `.claude/commands/overdrive.md`.

## How It Works

Unlike the CLI driver (Node.js process), the interactive driver runs INSIDE Claude Code.
The slash command prompt instructs Claude to orchestrate the pipeline using Task tool subagents.

- **Same pipeline stages** as CLI mode (plan, strengthen, gate-check, code, verify, IV&V, evidence, RTM, evidence-package)
- **Same state format** — `.planning/BUILD-STATE.md` is the handshake between modes
- **Same prompt templates** — subagents read from `prompts/` directory
- **Human in the loop** — clarifying questions before pipeline starts, visible progress throughout

## Mode Mixing

You can freely switch between CLI and interactive mode mid-project:

```bash
# Start interactive to nail down the spec
/overdrive spec.md --upto plan

# Switch to CLI to let it rip overnight
overdrive resume --upto code

# Back to interactive for review
/overdrive --resume
```

The state file records `last_driver` (cli/interactive) for informational purposes, but either mode can always resume from either mode's state.

## Architecture

```
.claude/commands/overdrive.md    <- Slash command (the orchestrator prompt)
prompts/                         <- Shared prompt templates (read by subagents)
.planning/BUILD-STATE.md         <- Shared state (read/written by both modes)
src/core/pipeline.js             <- Stage definitions (referenced conceptually)
```

The slash command is intentionally a prompt, not a JavaScript module. It orchestrates by:
1. Reading state and spec from disk
2. Dispatching Task tool subagents with filled prompt instructions
3. Reading subagent results from disk
4. Updating state

This keeps the orchestrator thin and gives each subagent a fresh context window.
