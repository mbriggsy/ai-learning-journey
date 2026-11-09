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

The line above is the answer. Relay it as your reply — on the phone, that one line is the whole point. Four lines are NOT this session's number, and you say so instead of relaying a figure:
- `Context (TEST` — `WINDOW_TEST_TOKENS` is set and must be unset for a live read.
- `Context (GUESS` — the script got no session id and read the newest log in the folder, which a concurrent session can own.
- `two session ids disagree` — the skill's id and the shell's `CLAUDE_CODE_SESSION_ID` name different sessions; relay it verbatim, it is a fault to fix, not a reading.
- `Context: compacted` — the session was compacted since its last measured turn, so the log holds no live number yet; relay it, and when a number is needed, run the script again after one more tool call.

- **Never fire `/context`.** It blasts an unscrollable table to his phone; this parser one-liner is the deliberate substitute. The script reads the active session's transcript directly and sums input + cache tokens against the 1M window.
- **Add at most one sentence** of interpretation, and only if the tier warrants it. The line's tail already names the tier and its action: warn line → steer toward a clean milestone; no-fan-out line → start no fan-out that can't finish in the remaining room; wrap line → wrap up and suggest a fresh terminal. The three thresholds live ONLY in `window.mjs` (`WARN` / `NO_FANOUT` / `WRAP`) — quote the line's own numbers, never numbers from memory. No padding, no marketing voice. Match his energy.
- **Category breakdown is the one exception.** If he asks "what's eating it?" or wants the per-tool/per-category split, that's the single case where `/context` earns its dump — tell him to type it himself, since the parser is total-only.
- **Handoff mode** (Briggsy, 2026-11-09: number the sessions and the chain runs itself). When this session's name ends in a number (`playbook-6`, `b9-1`, `family-feud-10`; `ListAgents`' header names it: "This session is <name>"), run `ListAgents` after relaying the line (load it with ToolSearch if it is deferred). The successor's name is this one's with the number plus one (`playbook-7`). Count only live local rows: not `offline`, not `Remote Control`, not `cloud`. Handoff mode is on when exactly one such row is named the successor (capital letters aside) and it is `idle`. Higher numbers live beside it are fine when they form an unbroken idle run: `b9-2` … `b9-7` all live and idle, no number skipped, is a chain opened ahead of time (Briggsy, 2026-11-08: "consecutive idle sessions count as a chain"), and each waits its turn. It stays off (parallel lanes) when any row in that run is `busy`, when a number in the run is missing (`b9-2` and `b9-4` live, no `b9-3`), or when two live rows share one number above this session's. The first time it turns on, add one line, the one exception to the one-sentence rule: "Handoff mode: <successor> is live, so I own the squeaky call and hand it off at the wrap line." From then the named-successor rules hold: run squeaky by the window's lines (the wrap line, at the next clean milestone), never because a task finished, and squeaky's step 10 hands off to it. A row whose name is a character or two off the successor's (`playboook-7`) never counts: say so once ("<row> looks like my successor but isn't named <successor>"), so he can rename it. And the other side of the chain: a session whose predecessor (its number minus one) is live and has not handed off yet waits for that handoff before starting START HERE's item, unless Briggsy gives it work.
