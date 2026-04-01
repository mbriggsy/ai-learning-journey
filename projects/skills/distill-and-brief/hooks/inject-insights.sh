#!/bin/bash
# PreToolUse hook: Inject insight context before ce:work
# Matcher: "Skill" — fast-exits for non-matching skills (~5ms).
# STATUS: Hook fires but output doesn't reach Claude (platform bug).
# Kept ready for when Anthropic fixes non-blocking hook output.

INPUT=$(cat)
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')

case "$SKILL" in
  ce:work|ce-work|compound-engineering:ce-work) ;;
  *) exit 0 ;;
esac

INSIGHTS_DIR="docs/insights"
[ ! -d "$INSIGHTS_DIR" ] && exit 0

shopt -s nullglob
MD_FILES=("$INSIGHTS_DIR"/*.md)
[ ${#MD_FILES[@]} -eq 0 ] && exit 0

MSG="INSIGHTS — Known root causes and gotchas relevant to this project:\n\n"

for f in "${MD_FILES[@]}"; do
  TITLE=$(sed -n '/^---$/,/^---$/{ /^title:/{ s/^title: *//; p; q; } }' "$f")
  [ -z "$TITLE" ] && TITLE=$(basename "$f" .md)
  INSIGHT=$(awk '/^## Key Insight/{found=1; next} found && /^$/{exit} found{buf=buf sep $0; sep=" "} END{print buf}' "$f")
  MSG+="- ${TITLE}"
  [ -n "$INSIGHT" ] && MSG+=" — ${INSIGHT}"
  MSG+="\n"
done

MSG+="\nFull details in docs/insights/. Read any relevant to current work items."

JSON_MSG=$(printf '%b' "$MSG" | jq -Rs .)
echo "{\"systemMessage\":${JSON_MSG}}"
exit 0
