# How We Work: TODO

The queue for work on how we work. Sessions for it start in this folder.

**The direction (Briggsy, 2026-10-27):** "we still haven't got to the dev process - the actual thing I wanted us to focus on - ce-plan, ce-plan:deepen, ce-docreview, ce-work, ultramode, brief, distill - or functional equivalents that allow Claude to upgrade and not be confined." Every item is judged by one test: does this ever happen to us, or does it change his day? Nothing gets frozen: "We want updates."

## ▶ START HERE

1. **Owed from the 2026-10-29 flush, finish first:**
   - Squeaky shrinks to short rules: `projects/skills/squeaky-clean/scripts/` and `tests/` go, `SKILL.md` keeps the one-line rules and a trimmed step 10, and `how-to/session-chains.md` follows it. Do it when no Back Nine or Feud session is mid-close: the skill folder is a junction, so a saved edit is live at once.
   - A fresh session proves the flush: the manifesto loads, the status bar shows, a skill runs, a push goes through.
   - Then, with Briggsy's words already given: delete `~/.claude/hooks/v-84b0dfbb922a` and `~/.claude/hooks/v-9ff5496bba84` once every session running before the flush has restarted (a deleted folder under a live session's old settings would refuse its skill calls); remove the 17 probe entries from `~/.claude.json`; delete `~/.claude/flow`.
2. **The dev process, in a fresh session (the real goal).** One capability at a time: plan, deepen, the plan check (doc review), build, ultramode review, brief, distill. For each, what native Claude Code does now, what compound-engineering (CE) does, and what ours does; keep the thinnest version that works and gets better as Claude Code gets better, never a wrapper that locks in today's behavior. Bring Briggsy a short list with one recommendation.
   - **What the 2026-10-29 audit found:** nothing crashed. Plan, deepen and doc review stopped being used from the summer (the last Back Nine deepen was 06-17, the last anywhere 08-07), before the our-setup program and untouched by it. They ran well from 10-19 to 10-21 and lapsed again by 10-23. A written rule has failed twice to keep them going ("deepen ALL plans first" in the summer, "sizable work MUST run the full flow" in October). The open question is how the flow sticks without building machinery.
   - **CE is at 3.14.3** (since 2026-06-24, 40 releases behind): Claude Code never auto-updates a third-party marketplace. Updating it belongs here, because CE 3.15+ adds a review pass by another vendor's model, Codex first, on by default, and Briggsy said "No Codex".
   - **brief and distill nudges key on skill names** (`ce-work` and the review skills), so a build done by a Workflow passes no gate. ultramode works and reads CE's reviewer persona files fresh on each run.
   - The research half exists: the 2026-10-17 preflight page (memory `reference-our-setup-preflight`).

## Current state

- **The our-setup program (2026-10-19 to 10-27) is flushed** (monorepo `bd5ee4a2`, config repo `5fda78b`): `projects/hooks` matches its pre-program state, the live hooks run from `~/.claude/hooks/*.sh`, the status line from `~/.claude/statusline.py`, and nothing freezes updates.
- **Kept from it:** ultracode on by default, the status bar's live effort level, the `/window` fix after compaction, and squeaky's hand-off to a named successor.
- **Lessons** live in [docs/insights/](docs/insights/): 002, 003, 005 and 008.

## Landmines

- **Auto mode blocks removing a safety check, and writes to Claude Code's own config, without Briggsy's own words.** Write the exact sentence for him, paste-ready, and bundle every such step into one ask.
- **Never restore `~/.claude/settings.json` whole from an old commit.** The 10-19 snapshot has garbled dashes, no ultracode and a status-line path that no longer exists. Edit it key by key.
- **The hooks are copies.** `~/.claude/hooks/*.sh` must match `projects/hooks/*.sh` byte for byte: a change edits both, then compares them.
- **A peer's unpushed commit under yours:** pushing `main` publishes it too. Commit path-scoped (`git commit -- <paths>`) and check `git log origin/main..HEAD` before a push.
- **Never freeze or pin a version** (memory `feedback-upgrades-always-approved`).
- **This folder is public.** Write paths as `~/...`, a project folder as `<slug>` and ids as `<id>`; screenshots go in the ignored `playbook/temp/`.
