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

!`node "$HOME/.claude/skills/window/window.mjs" "${CLAUDE_SESSION_ID}"`

The line above is the answer. Relay it as your reply — on the phone, that one line is the whole point. Three lines are NOT this session's number, and you say so instead of relaying a figure:
- `Context (TEST` — `WINDOW_TEST_TOKENS` is set and must be unset for a live read.
- `Context (GUESS` — the script got no session id and read the newest log in the folder, which a concurrent session can own.
- `two session ids disagree` — the skill's id and the shell's `CLAUDE_CODE_SESSION_ID` name different sessions; relay it verbatim, it is a fault to fix, not a reading.

- **Never fire `/context`.** It blasts an unscrollable table to his phone; this parser one-liner is the deliberate substitute. The script reads the active session's transcript directly and sums input + cache tokens against the 1M window.
- **Add at most one sentence** of interpretation, and only if the tier warrants it. The line's tail already names the tier and its action: warn line → steer toward a clean milestone; no-fan-out line → start no fan-out that can't finish in the remaining room; wrap line → wrap up and suggest a fresh terminal. The three thresholds live ONLY in `window.mjs` (`WARN` / `NO_FANOUT` / `WRAP`) — quote the line's own numbers, never numbers from memory. No padding, no marketing voice. Match his energy.
- **Category breakdown is the one exception.** If he asks "what's eating it?" or wants the per-tool/per-category split, that's the single case where `/context` earns its dump — tell him to type it himself, since the parser is total-only.
