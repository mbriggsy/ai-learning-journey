---
name: window
description: "Report current context-window usage as one phone-friendly line.
  Triggers on /window, or when the user asks how much context is left, how full
  the window is, or whether there's room to keep going (e.g. 'how's the window?',
  'how much context left?', 'are we running low?'). Runs a local JSONL parser and
  returns a single line — it does NOT fire /context, which dumps an unscrollable
  table to the phone."
user-invocable: true
---

# Context Window Check

!`node "$HOME/.claude/skills/window/window.mjs"`

The line above is the answer. Relay it as your reply — on the phone, that one line is the whole point.

- **Never fire `/context`.** It blasts an unscrollable table to his phone; this parser one-liner is the deliberate substitute. The script reads the active session's transcript directly and sums input + cache tokens against the 1M window.
- **Add at most one sentence** of interpretation, and only if it's warranted (e.g. past the 70% wrap line → suggest a fresh terminal). No padding, no marketing voice. Match his energy.
- **Category breakdown is the one exception.** If he asks "what's eating it?" or wants the per-tool/per-category split, that's the single case where `/context` earns its dump — tell him to type it himself, since the parser is total-only.
