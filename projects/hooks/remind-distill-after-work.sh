#!/bin/bash
# PostToolUse hook: Mark that distill is needed after a build (ce-work) or a code
# review (ce-code-review / ultramode-code-review).
# Side effect only — drops a marker file. No output (would fire too early).
# The Stop hook (stop-distill-gate.sh) checks the marker at the right moment.
#
# The names are what the Skill tool passes in .tool_input.skill: a plugin skill as
# '<plugin>:<skill>' (bare kept too), a ~/.claude/skills skill bare. They must match
# the INSTALLED roster — the ce:review|ce-review arm this replaced (2026-09-30) named
# a skill CE 3.14.3 does not ship, so it never fired. check-config-liveness.mjs
# (run at session start) flags any name here that stops resolving.

INPUT=$(cat)
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')

case "$SKILL" in
  ce-work|compound-engineering:ce-work)
    touch /tmp/.distill-needed
    ;;
  ce-code-review|compound-engineering:ce-code-review|ultramode-code-review)
    touch /tmp/.distill-needed
    ;;
esac
exit 0
