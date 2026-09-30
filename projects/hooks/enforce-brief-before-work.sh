#!/bin/bash
# PreToolUse hook: Block ce-work (compound-engineering:ce-work) until /brief has run.
#
# Flow:
#   1. Claude invokes ce-work → blocked, "run /brief first"
#   2. Claude invokes /brief → marker created, allowed through
#   3. Claude re-invokes ce-work → marker found, consumed, allowed through
#
# Gates the ce-work SKILL only, by design. Builds run through the Workflow or Agent
# tools are NOT hook-gated (a Workflow/Agent matcher would be a new cage); the
# /brief-before-a-unit law for those lives in skill and TODO text. Names are what
# the Skill tool passes in .tool_input.skill; check-config-liveness.mjs (session
# start) flags any that stop resolving — the dead distill-and-brief:* and ce:work
# aliases were pruned 2026-09-30 (no such plugin or skill is installed).

INPUT=$(cat)
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')

BRIEF_GATE="/tmp/.brief-gate"

case "$SKILL" in
  brief)
    touch "$BRIEF_GATE"
    exit 0
    ;;
  distill)
    # Clear the distill-needed marker so Stop hook allows through
    rm -f /tmp/.distill-needed
    exit 0
    ;;
  ce-work|compound-engineering:ce-work)
    if [ -f "$BRIEF_GATE" ]; then
      rm -f "$BRIEF_GATE"
      exit 0
    fi
    cat <<'EOF'
{"decision": "block", "reason": "HOLD — Run /brief first to surface documented gotchas and lessons from docs/insights/.\n\nThen re-run compound-engineering:ce-work."}
EOF
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
