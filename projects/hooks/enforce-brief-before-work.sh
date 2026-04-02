#!/bin/bash
# PreToolUse hook: Block /ce:work until /brief has run.
#
# Flow:
#   1. Claude invokes /ce:work → blocked, "run /brief first"
#   2. Claude invokes /brief → marker created, allowed through
#   3. Claude re-invokes /ce:work → marker found, consumed, allowed through

INPUT=$(cat)
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')

BRIEF_GATE="/tmp/.brief-gate"

case "$SKILL" in
  brief|distill-and-brief:brief)
    touch "$BRIEF_GATE"
    exit 0
    ;;
  distill|distill-and-brief:distill)
    # Clear the distill-needed marker so Stop hook allows through
    rm -f /tmp/.distill-needed
    exit 0
    ;;
  ce:work|ce-work|compound-engineering:ce-work)
    if [ -f "$BRIEF_GATE" ]; then
      rm -f "$BRIEF_GATE"
      exit 0
    fi
    cat <<'EOF'
{"decision": "block", "reason": "HOLD — Run /brief first to surface documented gotchas and lessons from docs/insights/.\n\nThen re-run /ce:work (or compound-engineering:ce-work)."}
EOF
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
