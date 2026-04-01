#!/bin/bash
# PostToolUse hook: After ce:review or ce:work, remind to distill.
# Matcher: "Skill" — fast-exits for non-matching skills.
# STATUS: Hook fires but output doesn't reach Claude (platform bug).
# Kept ready for when Anthropic fixes non-blocking hook output.

INPUT=$(cat)
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')

case "$SKILL" in
  ce:review|ce-review|compound-engineering:ce-review|code-review:code-review|\
  ce:work|ce-work|compound-engineering:ce-work) ;;
  *) exit 0 ;;
esac

[ ! -d "docs" ] && exit 0

echo '{"systemMessage":"DISTILL CHECK — Did anything non-obvious come up during this work? If a future session would waste 20+ minutes rediscovering the same issue, run /distill to capture the insight."}'
exit 0
