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

# Config-liveness check (check-config-liveness.mjs, this dir): a hook-matched skill
# name that is not installed, a settings.json hook script that is missing, a broken
# ~/.claude/skills junction. It prints NOTHING when all green. Every failure mode
# (node or GNU timeout missing, a crash, a hang past 3 s) leaves the string empty,
# so the manifesto payload below is never at risk.
# GNU timeout by ABSOLUTE path: a bare `timeout` can resolve to Windows'
# system32\timeout.exe (a "wait N seconds" tool that rejects `3 node ...` and exits
# non-zero), which silently skipped the check. A PATH timeout is used only if it
# identifies itself as GNU coreutils.
LIVENESS="$HOME/.claude/hooks/check-config-liveness.mjs"
CONFIG_LIVENESS_WARNINGS=""
TIMEOUT_BIN=""
if [ -x /usr/bin/timeout ]; then
  TIMEOUT_BIN=/usr/bin/timeout
elif TIMEOUT_CAND=$(command -v timeout 2>/dev/null) && [[ $("$TIMEOUT_CAND" --version 2>/dev/null </dev/null) == *"GNU coreutils"* ]]; then
  TIMEOUT_BIN=$TIMEOUT_CAND
fi
if [ -f "$LIVENESS" ] && [ -n "$TIMEOUT_BIN" ] && command -v node >/dev/null 2>&1; then
  CONFIG_LIVENESS_WARNINGS=$("$TIMEOUT_BIN" 3 node "$LIVENESS" 2>/dev/null </dev/null) || CONFIG_LIVENESS_WARNINGS=""
fi
export CONFIG_LIVENESS_WARNINGS

# Emit the manifesto as additionalContext in the JSON envelope Claude Code
# expects for SessionStart hooks (+ the liveness block, only when non-empty).
python3 <<'PYEOF'
import json, os, sys
path = os.path.expanduser("~/.claude/manifesto/elite-engineer.md")
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
warnings = os.environ.get("CONFIG_LIVENESS_WARNINGS", "").strip()
if warnings:
    content = content.rstrip("\n") + "\n\n---\n\n" + warnings + "\n"
payload = {
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": content,
    }
}
print(json.dumps(payload))
PYEOF
