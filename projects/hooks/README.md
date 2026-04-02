# Hooks
### Claude Code PreToolUse, PostToolUse & Stop Hooks

---

Blocking hooks that enforce the distill-and-brief knowledge loop. Deployed at `~/.claude/hooks/`, configured in `~/.claude/settings.json`.

---

## Platform Findings

Discovered through empirical testing. Filed as [anthropics/claude-code#42250](https://github.com/anthropics/claude-code/issues/42250).

1. **Only error-path output reaches the model** — `{"decision":"block"}` and stderr (exit 2) deliver. All non-blocking formats silently discarded.
2. **PostToolUse block delivers without undoing the tool result** — useful for reminders after skill completion.
3. **PreToolUse hooks don't fire on user slash commands** — only on Claude's programmatic Skill invocations. PostToolUse and Stop hooks fire in both cases.

---

## The Hooks

### enforce-brief-before-work.sh

| | |
|---|---|
| **Type** | PreToolUse |
| **Matcher** | Skill |
| **Blocks** | `/ce:work` (Claude invocations only) |
| **Until** | `/brief` runs |

Gates `/ce:work` behind `/brief` so the agent loads documented gotchas from `docs/insights/` before starting work. Uses a marker file (`/tmp/.brief-gate`). Also clears the distill marker when `/distill` runs.

### remind-distill-after-work.sh

| | |
|---|---|
| **Type** | PostToolUse |
| **Matcher** | Skill |
| **Fires after** | `/ce:work`, `/ce:review` |

Drops a marker file (`/tmp/.distill-needed`) as a silent side effect. No output — the Stop hook handles delivery at the right moment.

### stop-distill-gate.sh

| | |
|---|---|
| **Type** | Stop |
| **Matcher** | (all) |
| **Blocks** | Claude from stopping if `.distill-needed` exists |

Fires when Claude tries to finish responding. If the distill marker exists (set by PostToolUse after ce:work), blocks with a reminder to run `/distill`. Clears the marker on block so the agent isn't stuck in a loop.

This is the key timing innovation — Stop hooks fire when work is actually DONE, not when the skill loads.

### block-webfetch.sh

| | |
|---|---|
| **Type** | PreToolUse |
| **Matcher** | WebFetch |
| **Blocks** | `WebFetch` tool |
| **Redirects to** | `gemini-grounding` MCP or `curl --max-time 15` |

Unrelated to the knowledge loop. `WebFetch` has no timeout — agents hang indefinitely.

---

## The Full Chain

```
User: "run /ce:work on Phase X plan"

1. Claude invokes /ce:work
   → PreToolUse BLOCKS: "run /brief first"

2. Claude invokes /brief
   → PreToolUse: marker created, allowed through
   → /brief loads insights into conversation

3. Claude re-invokes /ce:work
   → PreToolUse: marker consumed, allowed through
   → PostToolUse: drops /tmp/.distill-needed (silent)
   → ce:work loads, agent follows instructions

4. ... work happens ...

5. Claude tries to stop
   → Stop hook: marker exists → BLOCK: "run /distill"

6. Claude invokes /distill
   → PreToolUse: clears marker, allowed through
   → Agent captures insights (or confirms nothing to capture)

7. Claude tries to stop again
   → Stop hook: no marker → allowed through
```

---

## Deployment

Scripts deployed at `~/.claude/hooks/`. Configuration in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "WebFetch", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/block-webfetch.sh" }] },
      { "matcher": "Skill", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/enforce-brief-before-work.sh" }] }
    ],
    "PostToolUse": [
      { "matcher": "Skill", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/remind-distill-after-work.sh" }] }
    ],
    "Stop": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/stop-distill-gate.sh" }] }
    ]
  }
}
```

This project folder is source control. The deployed copies at `~/.claude/hooks/` are the live versions.
