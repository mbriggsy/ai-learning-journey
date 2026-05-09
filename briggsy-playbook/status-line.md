---
aliases: [status-line, statusline, status-bar]
tags: [playbook]
---

# Claude Code Custom Status Line — Setup Guide

How to replace the default Claude Code status bar with a custom one that shows you what actually matters: model, context usage, cost, session duration, git branch, and effort level — all at a glance.

**Contents:**
- [How it works](#how-it-works)
- [Step 1: Create the status line script](#step-1-create-the-status-line-script)
- [Step 2: Tell Claude Code to use it](#step-2-tell-claude-code-to-use-it)
- [Step 3: Restart Claude Code](#step-3-restart-claude-code)
- [What each piece of the status line shows](#what-each-piece-of-the-status-line-shows)
- [Available data fields](#available-data-fields)
- [Customization ideas](#customization-ideas)
- [Troubleshooting](#troubleshooting)
- [The full settings.json reference](#the-full-settingsjson-reference-just-the-statusline-part)

**What you'll end up with:**
```
[Opus 4.7 (1M context)] burned  🌿 main | █░░░░░░░░░ 19% | $14.65 | 2210m53s | high
```

**Time to set up:** ~5 minutes.

---

## How it works

Claude Code can run any command to generate the status line. Every few seconds, it pipes a JSON blob of session data into your command via stdin, and whatever your command prints to stdout becomes the status bar. That's it — one config key, one script, full control.

```
Claude Code session data (JSON) → stdin → your script → stdout → status bar
```

---

## Step 1: Create the status line script

Create a file at `~/.claude/statusline.py` (that's your home directory, inside the `.claude` folder that Claude Code already created).

**On Mac/Linux:**
```bash
touch ~/.claude/statusline.py
```

**On Windows (Git Bash or PowerShell):**
```bash
touch ~/.claude/statusline.py
# or in PowerShell:
New-Item -Path "$env:USERPROFILE\.claude\statusline.py" -ItemType File
```

Paste this into the file:

```python
#!/usr/bin/env python3
import json, sys, subprocess, os, io

# Handle encoding (important on Windows)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')

# Read the session data JSON that Claude Code pipes in
data = json.load(sys.stdin)

# ── Pull out the fields we care about ──────────────────────────
model_name = data.get('model', {}).get('display_name', '?')
directory   = os.path.basename(
    data.get('workspace', {}).get('current_dir', '') or data.get('cwd', '')
)
cost        = data.get('cost', {}).get('total_cost_usd', 0) or 0
ctx         = data.get('context_window', {})
pct         = int(ctx.get('used_percentage', 0) or 0)
ctx_size    = ctx.get('context_window_size', 0) or 0
duration_ms = data.get('cost', {}).get('total_duration_ms', 0) or 0

# ── Terminal colors (ANSI escape codes) ────────────────────────
CYAN    = '\033[36m'
GREEN   = '\033[32m'
YELLOW  = '\033[33m'
RED     = '\033[31m'
MAGENTA = '\033[35m'
RESET   = '\033[0m'

# ── Format context window size: 200000 → "200K", 1000000 → "1M"
def fmt_ctx(n):
    if n >= 1_000_000:
        v = n / 1_000_000
        return f'{v:.0f}M' if v == int(v) else f'{v:.1f}M'
    if n >= 1_000:
        v = n / 1_000
        return f'{v:.0f}K' if v == int(v) else f'{v:.1f}K'
    return str(n) if n else ''

ctx_label = fmt_ctx(ctx_size)
model = f'{model_name} ({ctx_label} context)' if ctx_label else model_name

# ── Color-coded context usage bar ──────────────────────────────
#    Green under 70%, yellow 70-89%, red 90%+
bar_color = RED if pct >= 90 else YELLOW if pct >= 70 else GREEN
filled = pct * 10 // 100
bar = '\u2588' * filled + '\u2591' * (10 - filled)

# ── Session duration ───────────────────────────────────────────
mins = duration_ms // 60000
secs = (duration_ms % 60000) // 1000

# ── Git branch (safe — silently skips if not in a repo) ───────
branch = ''
try:
    result = subprocess.run(
        ['git', 'branch', '--show-current'],
        capture_output=True, text=True, timeout=2
    )
    if result.returncode == 0 and result.stdout.strip():
        branch = f'  \U0001f33f {result.stdout.strip()}'
except Exception:
    pass

# ── Effort level from Claude Code settings ─────────────────────
effort = '?'
try:
    settings_path = os.path.join(os.path.expanduser('~'), '.claude', 'settings.json')
    with open(settings_path, 'r') as f:
        effort = json.load(f).get('effortLevel', 'default')
except Exception:
    pass

# ── Print the status line ──────────────────────────────────────
print(
    f'{CYAN}[{model}]{RESET} '
    f'{directory}{branch} | '
    f'{bar_color}{bar}{RESET} {pct}% | '
    f'{YELLOW}${cost:.2f}{RESET} | '
    f'{mins}m{secs}s | '
    f'{MAGENTA}{effort}{RESET}'
)
```

## Step 2: Tell Claude Code to use it

Open your Claude Code settings file at `~/.claude/settings.json`. If it doesn't exist yet, create it.

Add the `statusLine` key:

```json
{
  "statusLine": {
    "type": "command",
    "command": "python ~/.claude/statusline.py"
  }
}
```

If you already have a `settings.json` with other stuff in it, just add the `statusLine` block alongside your existing keys. Example with other settings present:

```json
{
  "permissions": {
    "allow": ["Bash(*)", "Read(*)", "Write(*)"]
  },
  "statusLine": {
    "type": "command",
    "command": "python ~/.claude/statusline.py"
  }
}
```

## Step 3: Restart Claude Code

The status line loads when a session starts. Close your current terminal and open a new Claude Code session. You should see the custom status bar immediately.

If it doesn't appear, check:
- `python` is on your PATH (try `python --version` in your terminal)
- The file is at `~/.claude/statusline.py` (not `statusLine.py` or somewhere else)
- The JSON in `settings.json` is valid (no trailing commas, matching braces)

---

## What each piece of the status line shows

```
[Opus 4.7 (1M context)] burned  🌿 main | █░░░░░░░░░ 19% | $14.65 | 2210m53s | high
 ─────────────────────  ──────  ────────   ─────────────   ──────   ────────   ────
 Model + context size   Project Git branch Context usage    Cost    Duration  Effort
```

| Segment | Source | What it tells you |
|---|---|---|
| `[Opus 4.7 (1M context)]` | `model.display_name` + `context_window.context_window_size` | Which model and how big the context window is |
| `burned` | `workspace.current_dir` | Which project folder you're in |
| `🌿 main` | `git branch --show-current` | Current git branch |
| `█░░░░░░░░░ 19%` | `context_window.used_percentage` | How much of your context window is used (green/yellow/red) |
| `$14.65` | `cost.total_cost_usd` | How much this session has cost so far |
| `2210m53s` | `cost.total_duration_ms` | How long the session has been running |
| `high` | `effortLevel` from `settings.json` | Current reasoning effort level |

---

## Available data fields

Claude Code pipes a JSON object into your script on stdin. Here are the fields you can use:

```
model.display_name          "Opus 4.7"
model.id                    "claude-opus-4-7"

context_window
  .context_window_size      1000000
  .used_percentage          19

cost
  .total_cost_usd           14.65
  .total_duration_ms        132653000

workspace
  .current_dir              "/Users/you/your-project"

cwd                         "/Users/you/your-project"  (fallback)
```

You can add anything else you can compute — the script is just Python. Git branch, disk space, time of day, weather, whatever. If you can `print()` it, it's on the status bar.

---

## Customization ideas

**Strip segments you don't care about.** Don't want duration? Delete the `{mins}m{secs}s` part from the print statement. Don't want effort level? Remove that block entirely. It's just a print statement — keep what's useful, cut what's not.

**Change the context bar thresholds.** The color changes at 70% (green → yellow) and 90% (yellow → red). Adjust the numbers in this line:
```python
bar_color = RED if pct >= 90 else YELLOW if pct >= 70 else GREEN
```

**Add a cost warning.** Want the cost to turn red above $20?
```python
cost_color = RED if cost > 20 else YELLOW if cost > 10 else GREEN
# Then use {cost_color}${cost:.2f}{RESET} in the print statement
```

**Use any language.** The script doesn't have to be Python. Bash, Node, Ruby — anything that reads JSON from stdin and prints to stdout works. Python is convenient because it's on most machines and `json.load(sys.stdin)` is one line.

**Bash example (minimal):**
```bash
#!/bin/bash
# Save as ~/.claude/statusline.sh
read -r input
model=$(echo "$input" | python3 -c "import sys,json; print(json.load(sys.stdin).get('model',{}).get('display_name','?'))")
pct=$(echo "$input" | python3 -c "import sys,json; print(int(json.load(sys.stdin).get('context_window',{}).get('used_percentage',0)))")
echo "[$model] ctx: ${pct}%"
```
```json
{ "statusLine": { "type": "command", "command": "bash ~/.claude/statusline.sh" } }
```

---

## Troubleshooting

**Status bar is blank or shows an error:**
- Run `python ~/.claude/statusline.py < /dev/null` — if it crashes, the error message tells you what's wrong. Most common: missing Python, bad JSON in settings.json, or a typo in the script.

**Status bar shows `?` for model or `0%` for everything:**
- The session data hasn't loaded yet. Give it a few seconds after starting a conversation. The status bar updates periodically, not instantly.

**Colors don't show:**
- Your terminal might not support ANSI escape codes. Most modern terminals (iTerm2, Windows Terminal, VS Code integrated terminal) do. The default macOS Terminal.app does too. If you're using something exotic, you might need to strip the color codes.

**Git branch shows blank:**
- You're not in a git repository, or `git` isn't on your PATH in the Claude Code environment. The script silently skips the branch if anything goes wrong — by design, so the rest of the status line still works.

---

## The full settings.json reference (just the statusLine part)

```json
{
  "statusLine": {
    "type": "command",
    "command": "python ~/.claude/statusline.py"
  }
}
```

That's the w