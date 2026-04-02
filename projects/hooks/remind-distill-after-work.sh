#!/bin/bash
# PostToolUse hook: Mark that distill is needed after ce:work or ce:review.
# Side effect only — drops a marker file. No output (would fire too early).
# The Stop hook (stop-distill-gate.sh) checks the marker at the right moment.

INPUT=$(cat)
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')

case "$SKILL" in
  ce:work|ce-work|compound-engineering:ce-work|\
  ce:review|ce-review|compound-engineering:ce-review)
    touch /tmp/.distill-needed
    ;;
esac
exit 0
