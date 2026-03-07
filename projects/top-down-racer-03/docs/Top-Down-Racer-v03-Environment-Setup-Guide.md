# TOP-DOWN RACER v03
## Environment Setup & Configuration Guide

*Prepared for Harry — March 2026*
*Updated from the v02 setup guide. Same stack, new project, one new tool.*

---

## What's Different from v02

If you've already done the v02 setup, most of your tools are still installed globally.
Here's what's new:

| Change | What to Do |
|--------|-----------|
| New project directory | Create `top-down-racer-03` (v02 stays untouched) |
| gsd-autopilot (NEW) | Copy 6 markdown files into `.claude/` — automates the GSD workflow |
| GSD | Already installed globally — just verify it works |
| MCP servers | Already installed globally — just verify and re-activate Serena for the new project |
| Compound Engineering | Already installed — just verify |
| v02 reference | Keep v02 repo accessible — we'll reference it but never modify it |

**If this is a fresh machine** (no v02 setup), follow every step below.
**If you already did v02**, skip to Phase C and just verify the tools in Phases A/B/D/E/F still work.

---

## Master Checklist

### PHASE A: Prerequisites
- [ ] Windows 11 laptop
- [ ] Git for Windows installed and on PATH
- [ ] Node.js 18+ installed
- [ ] Claude Code installed (`winget install Anthropic.ClaudeCode`)
- [ ] Claude Code authenticated (OAuth sign-in complete)
- [ ] Git Bash terminal working

### PHASE B: Core Development Tools
- [ ] Python 3.11+ installed (for AI training in Phase 5)
- [ ] pnpm package manager installed
- [ ] uv (Python package manager) installed
- [ ] VS Code installed (optional but recommended)

### PHASE C: Project Scaffolding
- [ ] Create project directory: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-03`
- [ ] Initialize Git repository
- [ ] Initialize Node.js project (package.json)
- [ ] Install TypeScript, Vite, PixiJS, Vitest
- [ ] Create folder structure
- [ ] Create root CLAUDE.md file

### PHASE D: GSD (Get Shit Done) Framework
- [ ] Verify GSD is installed (or install fresh)
- [ ] Configure permissions in Claude Code settings
- [ ] Verify with `/gsd:help`

### PHASE E: MCP Servers
- [ ] Context7 — live library documentation
- [ ] Serena — semantic code navigation (activate for new project)
- [ ] Sequential Thinking — structured reasoning
- [ ] Verify all 3 show as connected in Claude Code

### PHASE F: Compound Engineering
- [ ] Verify plugin is installed (or install fresh)
- [ ] Verify `/deepen-plan` is available

### PHASE G: gsd-autopilot (NEW for v03)
- [ ] Copy `gsd-autopilot.md` to `.claude/commands/`
- [ ] Copy `gsd-autopilot/` folder to `.claude/`
- [ ] Verify with `/gsd-autopilot status`

### PHASE H: Bonus Tools
- [ ] Visual Explainer skill installed
- [ ] GitHub MCP server configured (optional)

### PHASE I: Verification & First Run
- [ ] Run `claude doctor` — all green
- [ ] Run `/gsd:help` — shows GSD commands
- [ ] Run `/gsd-autopilot status` — responds (no active session yet)
- [ ] Test Context7: ask about PixiJS docs
- [ ] Test Serena: activate project
- [ ] Test Sequential Thinking: ask for architecture analysis
- [ ] Run `/gsd:new-project` with the v03 spec

---

## What We're Building

v03 is a **visual upgrade + track evolution** of v02. The simulation engine is frozen
and untouched. We're upgrading the graphics pipeline, redesigning tracks 2 and 3, and
retraining the AI on the new geometry.

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Simulation Engine | TypeScript (pure logic) | FROZEN from v02. Physics, collision, track geometry, car dynamics. |
| Renderer | PixiJS v8 (WebGL 2D) | Visual layer — getting upgraded with post-processing, new sprites, track art. |
| AI Training Bridge | Python (WebSocket) | Gymnasium-compatible wrapper. Same as v02. |
| ML Framework | stable-baselines3 + PyTorch | PPO reinforcement learning. Retraining on new track geometry. |
| Asset Pipeline (NEW) | Sharp + Node.js scripts | Processes AI-generated art into game-ready assets. |

**v03 Phases:**

| Phase | What Gets Built |
|-------|----------------|
| 1 | Asset Pipeline + Track Redesign |
| 2 | Core Visual Upgrade (car sprites, track art, textures) |
| 3 | Post-Processing & Effects (bloom, motion blur, shadows) |
| 4 | Commercial UI & Audio (HUD, menus, engine sounds) |
| 5 | AI Retraining & Validation |

---

## Detailed Setup Steps

### Phase A: Verify Prerequisites

You should already have these from v02. Quick verification:

**STEP A1: Verify Git**
```bash
git --version
```
Expected: something like `git version 2.47.0.windows.1`

**STEP A2: Verify Node.js**
```bash
node --version
npm --version
```
Node should be 18+.

**STEP A3: Verify Claude Code**
```bash
claude --version
claude doctor
```
If `claude` isn't found, install with:
```bash
winget install Anthropic.ClaudeCode
```

**STEP A4: Verify Authentication**
```bash
claude
```
If it drops you into an interactive session, you're authenticated. Type `/exit` to leave.

---

### Phase B: Install Core Development Tools

Skip any you already have from v02. Just verify they're still working.

**STEP B1: Verify/Install Python 3.11+**
```bash
python --version
pip --version
```
If not installed: go to python.org/downloads. **CRITICAL: Check "Add Python to PATH" during install.**

**STEP B2: Verify/Install pnpm**
```bash
pnpm --version
```
If not installed:
```bash
npm install -g pnpm
```

**STEP B3: Verify/Install uv**
```bash
uv --version
```
If not installed:
```bash
pip install uv
```

**STEP B4: VS Code (Optional)**
```bash
winget install Microsoft.VisualStudioCode
```

---

### Phase C: Create Project Scaffolding

**This is the main thing that's different from v02. New project, new directory.**

**STEP C1: Create the Project Directory**
```bash
mkdir -p "/c/Users/brigg/ai-learning-journey/projects/top-down-racer-03"
cd "/c/Users/brigg/ai-learning-journey/projects/top-down-racer-03"
```

> **IMPORTANT:** v03 starts from a fresh scaffold. Do NOT copy v02's `src/` wholesale.
> The v02 repo stays at `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02`
> as a reference — we never modify it.

**STEP C2: Initialize Git**
```bash
git init
git branch -M main
```

Create `.gitignore`:
```bash
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
*.log
.DS_Store
.planning/
__pycache__/
*.pyc
assets/raw/
EOF
```

> Note: `assets/raw/` is gitignored because those are the unprocessed AI-generated images.
> The processed game-ready assets in `public/assets/` ARE tracked.

**STEP C3: Initialize the Node.js Project**
```bash
pnpm init
```

Install core dependencies:
```bash
pnpm add pixi.js
pnpm add -D typescript vite vitest @types/node
```

**STEP C4: Create the Folder Structure**
```bash
mkdir -p src/{engine,renderer,ai,types,utils,tracks}
mkdir -p src/renderer/{filters,hud,menu}
mkdir -p tests/{engine,renderer,ai}
mkdir -p public/assets/{sprites,audio,tracks,textures}
mkdir -p assets/raw/{cars,tracks,textures,ui,audio}
mkdir -p tools
```

| Directory | Purpose |
|-----------|---------|
| `src/engine/` | FROZEN — simulation logic copied from v02 once GSD sets up |
| `src/renderer/` | PixiJS visual layer — major upgrade target for v03 |
| `src/renderer/filters/` | NEW — post-processing shaders (bloom, motion blur) |
| `src/renderer/hud/` | NEW — commercial racing HUD (speedometer, mini-map) |
| `src/renderer/menu/` | NEW — redesigned menus |
| `src/ai/` | AI observation generation, reward functions |
| `src/tracks/` | Track definitions — Tracks 2 & 3 get redesigned geometry |
| `assets/raw/` | Where you put Nano Banana / Ludo.ai outputs (not tracked in git) |
| `public/assets/` | Processed, game-ready assets (tracked in git) |
| `tools/` | Asset processor scripts, training scripts |

**STEP C5: Create TypeScript Config**
```bash
cat > tsconfig.json << 'TSEOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
TSEOF
```

**STEP C6: Create the Root CLAUDE.md**

Create a starter CLAUDE.md at the project root. GSD will expand this during the spec phase:

```bash
cat > CLAUDE.md << 'EOF'
# Top-Down Racer v03

## Project Overview
Visual upgrade + track evolution of v02. Simulation engine is FROZEN and untouched.
Focus: commercial-quality graphics, redesigned tracks, AI retraining.

## Architecture (SACRED — do not violate)
- Simulation engine (src/engine/) is COMPLETELY FROZEN. Zero modifications.
- Engine/renderer boundary: renderer reads engine state, never mutates game logic.
- Track geometry files (src/tracks/) are DATA, not engine code. Safe to modify.

## Key Constraints
- PixiJS v8 — no renderer change
- Static deployment — no server infrastructure
- v02 ONNX model is RETIRED — full retrain required on new track geometry
- Track 1 (oval) geometry is FROZEN — it's the AI training sanity check

## Reference
- v02 repo: C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02
- v03 spec: Top-Down-Racer-v03-GSD-Spec.md
EOF
```

**STEP C7: Initial Commit**
```bash
git add .
git commit -m "Initial v03 project scaffolding"
```

---

### Phase D: Install GSD (Get Shit Done)

**If you already have GSD from v02**, just verify it works. GSD installs globally.

**STEP D1: Verify or Install GSD**

Check if GSD is already installed:
```bash
ls ~/.claude/commands/gsd/
```

If that directory exists with files in it, GSD is installed. If not, install:
```bash
npx get-shit-done-cc
```

**STEP D2: Verify Permissions**

Open settings:
```bash
notepad ~/.claude/settings.json
```

Make sure the permissions section includes:
```json
"permissions": {
  "allow": [
    "Bash(~/.claude/commands/gsd/**)",
    "Bash(git status*)",
    "Bash(git add*)",
    "Bash(git commit*)",
    "Bash(git log*)",
    "Bash(git diff*)",
    "Bash(git rev-parse*)",
    "Read(~/.claude/planning/**)",
    "Write(~/.claude/planning/**)"
  ]
}
```

**STEP D3: Verify**
```bash
cd "/c/Users/brigg/ai-learning-journey/projects/top-down-racer-03"
claude
```
Then type:
```
/gsd:help
```
You should see the full list of GSD commands.

---

### Phase E: Install MCP Servers

**If you already have these from v02**, they're installed globally. Just verify and
re-activate Serena for the new project directory.

**STEP E1: Context7**

Verify it's installed:
```
/mcp
```
Look for `context7` in the list. If missing:
```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp
```

**STEP E2: Serena**

Serena is project-specific — even if installed globally, it needs to be pointed at the new project:
```bash
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context claude-code --project "$(pwd)"
```

> Run this from inside the v03 project directory.
> The `--context claude-code` flag prevents tool conflicts with Claude Code's built-in tools.

**STEP E3: Sequential Thinking**

Verify it's installed:
```
/mcp
```
If missing:
```bash
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
```

**STEP E4: Verify All MCP Servers**

In Claude Code:
```
/mcp
```
All three (context7, serena, sequential-thinking) should show as connected.

> If any show "not connected": restart Claude Code first. If still broken, check that
> `npx` and `uvx` are on your PATH.

---

### Phase F: Install Compound Engineering

**If already installed from v02**, just verify `/deepen-plan` works.

**STEP F1: Verify or Install**

In Claude Code, try:
```
/deepen-plan
```

If it responds (even with "no plan found" or similar), it's installed.

If not installed:
```
/plugin marketplace add everyinc/compound-engineering-plugin
/plugin install compound-engineering@every-marketplace
```

**STEP F2: What We Use from Compound Engineering**

| Component | Name | Use It? |
|-----------|------|---------|
| Command | `/deepen-plan` | **YES** — the autopilot calls this automatically |
| Agent | architecture-strategist | YES |
| Agent | performance-oracle | YES |
| Agent | code-simplicity-reviewer | YES |
| Skill | brainstorming | YES |
| Skill | frontend-design | YES |
| Command | `/lfg`, `/plan`, `/work` | **NO** — conflicts with GSD orchestration |

---

### Phase G: Install gsd-autopilot (NEW for v03)

This is the meta-orchestrator we built for v03. It automates the entire GSD lifecycle —
plan, deepen, execute, verify — across all phases. When it needs you (like generating
art assets), it pauses, tells you what it needs, skips ahead to work it CAN do, and
waits for you to come back.

**STEP G1: Copy the Files**

Briggsy will provide the gsd-autopilot files. Copy them into the project's `.claude/` directory:

```bash
# From wherever Briggsy has stored them:
cd "/c/Users/brigg/ai-learning-journey/projects/top-down-racer-03"

# Copy the slash command
cp [source]/gsd-autopilot.md .claude/commands/

# Copy the autopilot internals
cp -r [source]/gsd-autopilot/ .claude/gsd-autopilot/
```

Your `.claude/` directory should now look like:

```
.claude/
  ├── commands/
  │   └── gsd-autopilot.md
  └── gsd-autopilot/
      ├── gsd-autopilot-workflow.md
      ├── gsd-autopilot-gate-evaluator.md
      ├── gsd-autopilot-dependency-analyzer.md
      └── templates/
          ├── gsd-autopilot-state-template.md
          └── gsd-autopilot-human-gates-template.md
```

**STEP G2: Verify**

In Claude Code:
```
/gsd-autopilot status
```
It should respond with "No autopilot session active" (which is correct — we haven't started one yet).

**STEP G3: Commit**
```bash
git add .claude/
git commit -m "Add gsd-autopilot meta-orchestrator"
```

---

### Phase H: Bonus Tools

**STEP H1: Visual Explainer**

Verify or install:
```bash
ls ~/.claude/skills/visual-explainer/
```
If missing:
```bash
git clone https://github.com/nicobailon/visual-explainer.git ~/.claude/skills/visual-explainer
```

**STEP H2: GitHub MCP Server (Optional)**

If not already configured:
```bash
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here -- npx -y @modelcontextprotocol/server-github
```

---

### Phase I: Verification & First Run

**STEP I1: Health Check**
```bash
cd "/c/Users/brigg/ai-learning-journey/projects/top-down-racer-03"
claude doctor
```
Everything should be green.

**STEP I2: Verify GSD**
```
/gsd:help
```

**STEP I3: Verify gsd-autopilot**
```
/gsd-autopilot status
```

**STEP I4: Verify MCP Servers**
```
/mcp
```
Context7, Serena, Sequential Thinking — all connected.

**STEP I5: Test Context7**

Ask Claude: "Use context7 to show me the PixiJS v8 filter documentation"

**STEP I6: Test Serena**

Ask Claude: "Activate the current directory as a project using serena"

**STEP I7: Copy the v03 Spec**

Copy the v03 GSD spec into the project:
```bash
cp "[path to spec]/Top-Down-Racer-v03-GSD-Spec.md" .
```

**STEP I8: Initialize the Project with GSD**
```
/gsd:new-project
```
Point it at the v03 spec. GSD will create the ROADMAP.md.

**STEP I9: Launch the Autopilot**
```
/gsd-autopilot start
```
It reads the spec + ROADMAP.md and begins autonomous execution. Walk away.

When it pauses for human input, check `.planning/HUMAN-GATES.md` for instructions.
After completing what it asked, run:
```
/gsd-autopilot resume
```

---

## Quick Reference Card

### Commands You'll Actually Use

| Command | What It Does |
|---------|-------------|
| `/gsd-autopilot start` | Begin autonomous build from spec |
| `/gsd-autopilot status` | Check progress (read-only) |
| `/gsd-autopilot resume` | Continue after completing a human gate |
| `/gsd:help` | Show all GSD commands |
| `/gsd:new-project` | Initialize project from spec (run once at start) |

### Key Concepts

| Concept | What It Means |
|---------|--------------|
| **Context Rot** | Quality degrades as Claude's context fills. 50%+ = rushing, 70%+ = hallucinating. The autopilot prevents this by spawning fresh subagents. |
| **Subagents** | Fresh Claude instances with clean 200K context. Task 50 is as sharp as Task 1. |
| **Human Gates** | Points where the autopilot can't proceed without you. It pauses, tells you what it needs, and skips ahead to other work. |
| **Skip-Ahead** | When blocked on one phase, the autopilot evaluates what other phases can proceed independently and keeps working. |
| **AUTOPILOT-STATE.md** | The autopilot's brain. Lives in `.planning/`. Shows exactly where every phase stands. |
| **HUMAN-GATES.md** | What you read when the autopilot pauses. Clear instructions on what it needs from you. |

### Troubleshooting

| Problem | Fix |
|---------|-----|
| MCP server shows "not connected" | Restart Claude Code. Check `npx`/`uvx` are on PATH. |
| `npx: command not found` | Node.js isn't on PATH. Restart Git Bash after installing Node. |
| `uvx: command not found` | uv not installed. Run: `pip install uv` |
| GSD commands not showing | Check GSD is installed: `ls ~/.claude/commands/gsd/` |
| `/gsd-autopilot` not recognized | Check file exists: `ls .claude/commands/gsd-autopilot.md` |
| Permission denied errors | Check `settings.json` permissions block (Phase D, Step 2). |
| Python not found | Check "Add to PATH" during install. Reinstall if missed. |
| Autopilot stuck on a gate | Check `.planning/HUMAN-GATES.md` for what it needs. |

---

*Zero hand-written game code. The human makes decisions. The agent builds.*
