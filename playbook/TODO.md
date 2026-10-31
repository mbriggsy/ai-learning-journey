# How We Work: TODO

The queue for work on how we work. Sessions for it start in this folder.

**The direction (Briggsy, 2026-10-27):** "we still haven't got to the dev process -the actually thing I wanted us to focus on -ce-plan, ce-plan:deepen, ce-docreview, ce-work, ultramode, brief, distill - or functional equivalents that allow Claude to upgrade and not be confined." Every item is judged by one test: does this ever happen to us, or does it change his day? Nothing gets frozen: "We want updates."

## ▶ START HERE

1. **The dev process, in a fresh session (the real goal).** One capability at a time: plan, deepen, the plan check (doc review), build, ultramode review, brief, distill. For each, what native Claude Code does now, what compound-engineering (CE) does, and what ours does; keep the thinnest version that works and gets better as Claude Code gets better, never a wrapper that locks in today's behavior. Bring Briggsy a short list with one recommendation.
   - **What the 2026-10-29 audit found:** nothing crashed. Plan, deepen and doc review stopped being used from the summer (the last Back Nine deepen was 06-17, the last anywhere 08-07), before the our-setup program and untouched by it. They ran again from 10-19 to 10-23 (the last full deepen and whole-plan check was U4's, on 10-23), and a Feud build skipped its deepen that same day. A written rule has failed twice to keep them going ("deepen ALL plans first" in the summer, "sizable work MUST run the full flow" in October). The open question is how the flow sticks without building machinery.
   - **CE is at 3.14.3** (since 2026-06-24; the latest is 3.34.0, released 2026-10-31): Claude Code doesn't auto-update a third-party marketplace by default. Updating it belongs here. CE 3.15+ adds a review pass by another vendor's model, Codex first, on by default, and Briggsy said "I don't want to introduce codex (not a fan)". Turning that mode off isn't enough on its own: CE's bakeoff step and its model elevation are two more ways out (memory `feedback-upgrades-always-approved`).
   - **brief and distill nudges key on skill names** (`ce-work` and the review skills), so a build done by a Workflow passes no gate. ultramode works and reads CE's reviewer persona files fresh on each run.
   - The research half exists: the 2026-10-17 preflight page (memory `reference-our-setup-preflight`). Its freeze advice is overruled by "We want updates".

## Current state

- **The our-setup program (2026-10-19 to 10-27) is flushed** (monorepo `bd5ee4a2`, `02127262`, `364b48fe` and the review-fix commit; config repo `5fda78b`, `7689c1e`, `e6066fc`): `projects/hooks` matches its pre-program state, the live hooks run from `~/.claude/hooks/*.sh`, the status line from `~/.claude/statusline.py`, the update freeze is gone, the probe entries are out of `~/.claude.json`, squeaky is down to its `SKILL.md` (its old scripts and tests are deleted), and `~/.claude/flow`, the four probe leftovers (two folders, the old status-line cache, a stray temp file) and the two numbered hook folders (2026-10-31, his words) are deleted.
- **Proven in a fresh session (2026-10-29):** the manifesto loads, a skill runs through the Skill guard with no denials, and the update freeze is unset (with the parent shell's copy stripped; a shell started inside a pre-flush session inherits the old value).
- **Kept from the program:** ultracode on by default, the status bar's live effort level, the `/window` fix after compaction, and squeaky's hand-off to a named successor (now found with `ListAgents`; the `<name> [ref]` send for a name clash is untested end to end).
- **Lessons** live in [docs/insights/](docs/insights/): 002, 003, 005 and 008.

## Landmines

- **Auto mode blocks removing a safety check, an irreversible delete, and writes to Claude Code's own config, without Briggsy's own words.** Name every path in the sentence you draft for him: a delete command that bundles a path he didn't name gets refused.
- **Never restore `~/.claude/settings.json` whole from an old commit.** The 10-19 snapshot (config repo `22015c5`) has 15 garbled dashes and no ultracode. Edit it key by key.
- **The hooks are copies.** `~/.claude/hooks/*.sh` must match `projects/hooks/*.sh` byte for byte: a change edits both, then compares them.
- **A test session started from a Claude session's shell inherits that session's environment.** Strip a variable (`env -u NAME claude -p ...`) before claiming a fresh session lacks it.
- **A peer's unpushed commit under yours:** pushing `main` publishes it too. Commit path-scoped (`git commit -- <paths>`) and check `git log origin/main..HEAD` before a push.
- **Never freeze or pin a version** (memory `feedback-upgrades-always-approved`).
- **This folder is public.** Write paths as `~/...`, a project folder as `<slug>` and ids as `<id>`; screenshots go in the ignored `playbook/temp/`.
