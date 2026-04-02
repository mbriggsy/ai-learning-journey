#!/bin/bash
# Stop hook: Block Claude from stopping if /distill hasn't run after ce:work.
# Marker is set by remind-distill-after-work.sh (PostToolUse side effect).
# /distill clears the marker via enforce-brief-before-work.sh PreToolUse.

MARKER="/tmp/.distill-needed"

if [ -f "$MARKER" ]; then
  rm -f "$MARKER"
  cat <<'EOF'
{"decision": "block", "reason": "Run /distill to capture any non-obvious findings from this work session. If nothing worth documenting surfaced, say so and move on."}
EOF
fi
