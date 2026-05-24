# Welcome to BURNED

## How We Use Claude

Based on mbriggsy's usage over the last 30 days:

Work Type Breakdown:
  Build Feature    ██████████░░░░░░░░░░  50%
  Debug Fix        ████░░░░░░░░░░░░░░░░  20%
  Improve Quality  ███░░░░░░░░░░░░░░░░░  15%
  Plan Design      ██░░░░░░░░░░░░░░░░░░  10%
  Write Docs       █░░░░░░░░░░░░░░░░░░░   5%

Top Skills & Commands:
  /effort           ████████████████████  41x/month
  /squeaky-clean    █████████████░░░░░░░  27x/month
  /remote-control   ██████████░░░░░░░░░░  21x/month
  /status           █████░░░░░░░░░░░░░░░  10x/month
  /focus            ██░░░░░░░░░░░░░░░░░░   4x/month
  /doctor           ██░░░░░░░░░░░░░░░░░░   4x/month
  /context          █░░░░░░░░░░░░░░░░░░░   3x/month
  /distill          █░░░░░░░░░░░░░░░░░░░   3x/month

Top MCP Servers:
  playwright          ████████████████████  1257 calls
  chrome-devtools     ████████░░░░░░░░░░░░   473 calls
  sequential-thinking ████░░░░░░░░░░░░░░░░   243 calls
  playwright-seat-1   █░░░░░░░░░░░░░░░░░░░    42 calls
  playwright-seat-2   ░░░░░░░░░░░░░░░░░░░░    25 calls
  playwright-seat-3   ░░░░░░░░░░░░░░░░░░░░    23 calls
  gemini-grounding    ░░░░░░░░░░░░░░░░░░░░    15 calls
  context7            ░░░░░░░░░░░░░░░░░░░░    13 calls

## Your Setup Checklist

### Codebases
- [ ] ai-learning-journey — https://github.com/mbriggsy/ai-learning-journey (contains the BURNED project under `projects/burned/`)

### MCP Servers to Activate
- [ ] playwright — Browser automation for UI verification and end-to-end testing. Install via `claude mcp add playwright`.
- [ ] chrome-devtools — DevTools protocol access for inspecting live pages, network, and console. Install via `claude mcp add chrome-devtools`.
- [ ] sequential-thinking — Structured multi-step reasoning for debugging chains and synthesis after research. Install via `claude mcp add sequential-thinking`.
- [ ] playwright-seat-1..10 — Multi-seat Playwright servers for BURNED playtest harness (simulating multiple phone controllers at once). Install via `claude mcp add` per seat. Only needed if you're running `/playtest-run`.
- [ ] gemini-grounding — Web search with citations. Replaces WebFetch (which hangs). Install via `claude mcp add gemini-grounding`.
- [ ] context7 — Up-to-date library/framework docs. Prefer this over guessing API behavior. Install via `claude mcp add context7`.

### Skills to Know About
- `/squeaky-clean` — End-of-session cleanup: TODO update, typechecks, git verify, temp cleanup, commit, push, kill orphan dev processes. Run when wrapping up.
- `/effort` — Adjust how much reasoning Claude does on the next turn (low/medium/high/ultrathink).
- `/remote-control` — Drive a Claude session from your phone.
- `/status` — Project status snapshot.
- `/focus` — Narrow Claude's attention to a specific file/dir/topic.
- `/doctor` — Diagnose Claude Code config issues (MCP, hooks, settings).
- `/context` — Show current context window usage.
- `/distill` — Capture a hard-won insight to `docs/insights/` so future sessions don't rediscover it.
- `/brief` — Load documented gotchas/lessons before starting work on a subsystem.
- `/playtest-run` — (BURNED-specific) Spin up 10 Chromium seats + board to playtest the game end-to-end. Has heavy side effects — never auto-trigger.

## Team Tips

_TODO_

## Get Started

_TODO_

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy — warm, conversational,
not lecture-y.

Open with a warm welcome — include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes — [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections — offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data — don't extrapolate them into a "team
workflow" narrative. -->
