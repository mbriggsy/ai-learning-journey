# loop-engineer — TODO

> **BENCHED 2026-06-20.** `swarm` is the daily driver for delegated build work; loop-engineer is the live-steer specialist (see the SKILL.md banner). Kept (not deleted) for the rare live-coordination case; the items below are paused, not active.

`SKILL.md` + `references/` authored 2026-06-19 (R40 U3 loop run); mechanics verified against CLI 2.1.183 + live docs the same day. **Committed (`0ef5fa70`); never dogfooded as a skill.** Priority order (paused).

## Refine the draft
- [ ] **Cold-test the `description` triggers** — confirm it fires on "run the loop / loop-engineer X / spawn a team to build+verify / keep this window dark" and does NOT over-trigger (e.g. a plain inline edit, or a fire-and-forget fan-out that should be the Workflow tool). Use the distill/brief output-eval loop (the trigger optimizer is billing-blocked + unvalidated).

## Activate
- [ ] **Junction-install** when ready to test: `~/.claude/skills/loop-engineer` → this dir (PowerShell junction, no elevation — same as distill/brief/window; edits propagate live).
- [ ] **First live dogfood run** on a real, decided unit. This is the only mechanism still unproven end-to-end as a skill: the SendMessage relay, idle≠done pull, and the independent-verify handoff. Capture what breaks → `/distill` back into the skill (the distill commits its own findings).

## Later
- [ ] Promote to a sibling `projects/` project ONLY if it accretes real standalone scripts (launcher `.ps1`, task-list templates, gate scripts) beyond `SKILL.md` + `references/`.

## Landmine
- EXPERIMENTAL flag (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`); `/resume` + `/rewind` do NOT restore in-process teammates (recover from the on-disk task list).
- **Teammates CANNOT spawn teammates** (docs: "only the lead can manage the team"). Keep all team composition at the lead.
- One implicit team per session (v2.1.178+); `team_name` is ignored. Mechanics may shift on this experimental flag — keep `references/mechanism-and-caveats.md` current.
