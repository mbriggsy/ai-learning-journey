#!/usr/bin/env bash
# SessionStart hook — inject the Elite Engineer Protocol into the assistant's
# context at the start of every session. Source of truth:
#   ~/.claude/manifesto/elite-engineer.md
#
# The hook's stdout is delivered to Claude as an additionalContext payload
# (per Claude Code SessionStart hook spec), so Claude sees the manifesto
# before the first user turn is processed. This is the mechanism Briggsy
# asked for after the 2026-04-22 sloppy session: "Figure out a way to NEVER
# forget that with me. Build software around it."

MANIFESTO="$HOME/.claude/manifesto/elite-engineer.md"

if [ ! -f "$MANIFESTO" ]; then
  # Fail loud but don't block the session. Claude should see this.
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "WARNING: Elite Engineer Protocol manifesto missing at $MANIFESTO — the session-start reminder was not delivered. Restore it before claiming any work is done."
  }
}
EOF
  exit 0
fi

# Emit the manifesto as additionalContext in the JSON envelope Claude Code
# expects for SessionStart hooks.
python3 <<PYEOF
import json, os, sys
path = os.path.expanduser("~/.claude/manifesto/elite-engineer.md")
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
payload = {
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": content,
    }
}
print(json.dumps(payload))
PYEOF
