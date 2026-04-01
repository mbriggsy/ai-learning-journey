# Hooks
### Claude Code PreToolUse & PostToolUse Hooks

---

Blocking hooks that enforce workflow guardrails in Claude Code. Deployed at `~/.claude/hooks/`, configured in `~/.claude/settings.json`.

---

## Why Blocking?

Non-blocking hook output (`exit 0` + stdout) is silently discarded by Claude Code — confirmed platform bug (7+ GitHub issues). **Blocking hooks** (`{"decision": "block"}`) are the only format that delivers messages to the model.

Key discovery: **PostToolUse blocking delivers the message without undoing the tool result.** This lets us remind the agent to take action after a skill completes, not just before.

---

## The Hooks

### enforce-brief-before-work.sh

| | |
|---|---|
| **Type** | PreToolUse |
| **Matcher** | Skill |
| **Blocks** | `/ce:work` |
| **Until** | `/brief` runs |

Gates `/ce:work` behind `/brief` so the agent always loads documented gotchas and lessons from `docs/insights/` before starting work. Uses a marker file (`/tmp/.brief-gate`) — `/brief` creates it, `/ce:work` consumes it.

Part of the [Distill & Brief](../skills/distill-and-brief/) knowledge loop.

### remind-distill-after-work.sh

| | |
|---|---|
| **Type** | PostToolUse |
| **Matcher** | Skill |
| **Fires after** | `/ce:work`, `/ce:review` |

Reminds the agent to run `/distill` after work or review completes. No markers — the blocking message is delivered directly with the full work context still in the conversation.

Part of the [Distill & Brief](../skills/distill-and-brief/) knowledge loop.

### block-webfetch.sh

| | |
|---|---|
| **Type** | PreToolUse |
| **Matcher** | WebFetch |
| **Blocks** | `WebFetch` tool |
| **Redirects to** | `gemini-grounding` MCP or `curl --max-time 15` |

`WebFetch` has no timeout parameter — agents hang indefinitely on slow URLs. This hook blocks it and redirects to alternatives that have timeouts.

---

## Deployment

Scripts are deployed at `~/.claude/hooks/` and referenced by `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "WebFetch", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/block-webfetch.sh" }] },
      { "matcher": "Skill", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/enforce-brief-before-work.sh" }] }
    ],
    "PostToolUse": [
      { "matcher": "Skill", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/remind-distill-after-work.sh" }] }
    ]
  }
}
```

This project folder is source control. The deployed copies at `~/.claude/hooks/` are the live versions.
