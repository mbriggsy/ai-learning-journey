---
name: brief
description: "Invoke to surface documented gotchas, root causes, and lessons
  from docs/insights/ before starting any work — including when the user is
  targeting a specific component, phase, or subsystem. Triggers when the user
  pauses to gather institutional knowledge BEFORE acting: 'brief me on X',
  'what should I know before I start/debug/work on X', 'any gotchas with X',
  'any known issues with X before I dig in', 'what do we know about X'. The
  defining signal: context-gathering BEFORE work, not performing work. Does
  NOT trigger when the user is asking you to actually perform the task (write
  code, build a feature, fix a bug, create docs) rather than first gathering
  context."
---

# Brief: Insight Context

## Known Insights

!`if [ -d "docs/insights" ] && ls docs/insights/*.md >/dev/null 2>&1; then for f in docs/insights/*.md; do echo "---"; echo "### $(basename "$f")"; echo ""; cat "$f" | sed -n '/^---$/,/^---$/!p' | head -40; echo ""; done; else echo "No insights documented yet. Use /distill after debugging a non-obvious issue to start building the knowledge base."; fi`

Review the insights above. Read any in full (`docs/insights/<filename>`) if relevant to your current task.
