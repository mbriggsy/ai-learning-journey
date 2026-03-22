# Undercover Mob Boss — Environment Setup
*First-time setup guide for the UMB build*

---

## Prerequisites

- Node.js ≥ 20.6.0 (22+ recommended)
- Git
- pnpm (`npm install -g pnpm`)
- Python 3.12 (for any AI/scripting work)

---

## 1. Build Engine

**Compound Engineering (CE)** via Claude Code — same proven stack as racer-04.

CE is already installed as a Claude Code plugin. Verify inside Claude Code:
```
/mcp
```
Context7, Serena, and Sequential Thinking should all show as connected.

**Key commands:**
- `/workflows:plan` — plan the current phase
- `/deepen-plan` — run strike team against the plan before executing
- `/workflows:work` — execute the plan
- `/workflows:review` — review completed work

---

## 2. MCP Servers

Already configured in `~/.claude.json`. All user-scoped.

| MCP | Purpose |
| --- | --- |
| `context7` | Live framework documentation |
| `serena` | Semantic code navigation |
| `sequential-thinking` | Structured multi-step reasoning |

**Context7 API key** is set as Windows user environment variable AND in `~/.claude.json`. No extra config needed.

---

## 3. CE Deepen-Plan (Strike Team)

CE plugin installed globally (`compound-engineering@every-marketplace` v2.40.0).

- `/deepen-plan` — runs 10+ specialist agents against the plan, hardens it before execution
- Proven across racer-02 and racer-04
- After deepen runs, add `deepened: true` to plan frontmatter before executing

---

## 4. Gemini Imagen 4 (Asset Generation)

All visual assets generated via API.

**Key in `.env`:**
```
GEMINI_API_KEY=...
```

**Model:** `imagen-4.0-generate-001`
**Cost:** ~$0.06/image — 11 assets ≈ $0.66 total
**Reference pipeline:** `projects/top-down-racer-04/scripts/generate-assets.ts`

---

## 5. Gemini TTS (Narrator Voice)

Pre-generate all narrator audio lines before build starts. Uses same `GEMINI_API_KEY` as Imagen 4.

**Model:** `gemini-2.5-flash-preview-tts` (free tier eligible)
**Voice:** Charon (deep, dramatic) + noir style prompting
**Output:** WAV files (24kHz, 16-bit, mono)

38 narrator lines (15 round-start variants + 23 unique event lines). One-time generation, served as static audio files.

---

## 6. Claude Code Plugins (already installed globally)

| Plugin | Purpose |
| --- | --- |
| `document-skills` (Anthropic) | docx, pptx, xlsx, pdf |
| `frontend-design` (Anthropic) | Production-grade mobile-first UI |
| `code-review` | Multi-agent PR review |
| `security-guidance` | Security audit |
| `commit-commands` | Git workflow |
| `claude-md-management` | CLAUDE.md maintenance |
| `typescript-lsp` | TypeScript language server |
| `pyright-lsp` | Python type checking |

---

## 7. Diagramming Conventions (no install required)

**Mermaid** — in-repo technical diagrams
- Claude generates natively, renders in GitHub
- Enforced in CLAUDE.md

**draw.io XML** — stakeholder artifacts, evidence package
- Claude generates XML, open at app.diagrams.net, export PNG/SVG

---

## 8. PartyKit (Real-time Multiplayer)

Added as npm dep during build:
```powershell
pnpm add partykit
```

Account at partykit.io — free tier sufficient for dev and small-scale play.

---

## Environment Checklist

Before starting the build session:

- [ ] CE plugin installed — `/deepen-plan` available in Claude Code
- [ ] Run `/mcp` — context7, serena, sequential-thinking all connected
- [ ] Gemini API key in `.env` with billing enabled (used for both Imagen 4 and TTS)
- [ ] `SPEC.md` reviewed and locked

---

## Project Structure (target)

```
undercover-mob-boss/
  .env               ← API keys (gitignored)
  src/
    client/          ← Browser frontend
    server/          ← PartyKit room logic
    shared/          ← Shared types
  public/
    assets/          ← AI-generated images
    audio/           ← Pre-generated narrator lines
  scripts/
    generate-assets.ts
    generate-narrator.ts
  tests/
  docs/
    spec/SPEC.md
    user/HOW-TO-PLAY.md
    ideation/
    env-setup/
  CLAUDE.md
  package.json
```

---

*The SDLC is the product.*
