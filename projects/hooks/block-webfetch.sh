#!/bin/bash
# PreToolUse hook: Block WebFetch and redirect to alternatives
# WebFetch has no timeout parameter — agents hang indefinitely on slow URLs.
# This hook blocks WebFetch and redirects to:
#   1. gemini-grounding MCP tools (search + summarize with citations)
#   2. curl --max-time as fallback
#
# jq builds the whole payload, reading the URL straight from the hook's stdin. Never
# paste the URL into a JSON template: a URL carrying a " or \ made invalid JSON, and
# an unparseable payload let the WebFetch through (fail OPEN). Never pass it as a jq
# --arg either: Git Bash rewrites \ to / in a native .exe's argv. ($url | @sh)
# shell-quotes the suggested curl (a ' becomes '\''). The program text is ASCII-only
# (the em dash is codepoint 8212) so no argv encoding can touch it. If jq fails, a
# static block prints.

INPUT=$(cat)

if ! PAYLOAD=$(printf '%s' "$INPUT" | jq -c '(.tool_input.url // "") as $url | ([8212] | implode) as $dash | {decision: "block", reason: "WebFetch is blocked (no timeout \($dash) causes agent hangs). Use these alternatives instead:\n\n**Option 1 (preferred): Gemini Grounding MCP tools**\nUse mcp__gemini-grounding__search_with_grounding with your query (if it is listed as a deferred tool, load it first: ToolSearch select:mcp__gemini-grounding__search_with_grounding). It searches, reads, and summarizes with citations \($dash) better than WebFetch.\n\n**Option 2 (fallback): curl with timeout**\ncurl -sL --max-time 15 \($url | @sh) | head -c 50000\n\nUse the Bash tool with the curl command above. If it times out after 15s, skip this URL and move on."}' 2>/dev/null) || [ -z "$PAYLOAD" ]; then
  PAYLOAD='{"decision": "block", "reason": "WebFetch is blocked (no timeout, causes agent hangs). Use mcp__gemini-grounding__search_with_grounding (if it is listed as a deferred tool, load it first: ToolSearch select:mcp__gemini-grounding__search_with_grounding), or curl -sL --max-time 15 <url> | head -c 50000 via the Bash tool."}'
fi
printf '%s\n' "$PAYLOAD"
