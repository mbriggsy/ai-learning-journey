#!/bin/bash
# PostToolUse hook: Remind to distill after work/review completes.
# Uses blocking output — the only format that reaches Claude from hooks.
# Proven: PostToolUse block delivers message WITHOUT undoing the tool result.

INPUT=$(cat)
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')

case "$SKILL" in
  ce:work|ce-work|compound-engineering:ce-work|\
  ce:review|ce-review|compound-engineering:ce-review)
    cat <<'EOF'
{"decision": "block", "reason": "Run /distill to capture any non-obvious findings from this work session. If nothing worth documenting surfaced, say so and move on."}
EOF
    ;;
  *) exit 0 ;;
esac
