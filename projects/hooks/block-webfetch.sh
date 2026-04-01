#!/bin/bash
# PreToolUse hook: Block WebFetch and redirect to alternatives
# WebFetch has no timeout parameter — agents hang indefinitely on slow URLs.
# This hook blocks WebFetch and redirects to:
#   1. gemini-grounding MCP tools (search + summarize with citations)
#   2. curl --max-time as fallback

INPUT=$(cat)
URL=$(echo "$INPUT" | jq -r '.tool_input.url // empty')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // empty')

cat <<EOF
{"decision": "block", "reason": "WebFetch is blocked (no timeout — causes agent hangs). Use these alternatives instead:\n\n**Option 1 (preferred): Gemini Grounding MCP tools**\nUse mcp__gemini-grounding__web_search with your query. It searches, reads, and summarizes with citations — better than WebFetch.\n\n**Option 2 (fallback): curl with timeout**\ncurl -sL --max-time 15 '${URL}' | head -c 50000\n\nUse the Bash tool with the curl command above. If it times out after 15s, skip this URL and move on."}
EOF
