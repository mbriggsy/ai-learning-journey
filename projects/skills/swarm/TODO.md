# swarm — TODO

Fire-and-forget mass-delegation skill (Workflow spine). `SKILL.md` + `references/` authored 2026-06-19 from the spawn-path capability probes. Sibling to `loop-engineer` (which is the live-coordinated Agent-Teams variant). Priority order.

## Activate
- [ ] **Junction-install:** `~/.claude/skills/swarm` → this dir (PowerShell junction, no elevation — same pattern as distill/brief/window; edits propagate live). Do NOT `ln -s` (Windows silently copies → stale).
- [ ] **First live swarm** on a real task to prove the harness end-to-end: confirm the Briggsy-kit inject actually lands (a worker reads the manifesto), `effort: xhigh` takes, only final answers return, adversarial-verify gates. Capture what breaks → `/distill` back in.
- [ ] **Cold-test the `description` triggers** — fires on "swarm X / fan this out / launch workers / fire-and-forget batch / keep this window light", does NOT over-trigger (inline work; or live-coordination tasks that belong to loop-engineer). Use the distill/brief output-eval loop.

## Later
- [ ] If a clean re-test ever settles the manifesto-auto-load contradiction on the teammate path (`mechanics-and-proof.md` flag), fold the verdict in.
- [ ] Promote to a sibling `projects/` project ONLY if it accretes real standalone scripts (reusable workflow templates, a launcher) beyond `SKILL.md` + `references/`.

## Landmine
- Workers do **not** auto-inherit the manifesto — the kit's manifesto-read is load-bearing, not optional. If a worker isn't operating at the bar, check the kit reached its prompt.
- Workers **cannot nest** (no Agent/Workflow tool in a Workflow worker). Sub-fan-outs run from the coordinator.
- Built on the Workflow tool (paid plan, CLI ≥ v2.1.154, Dynamic-workflows toggle) over an experimental substrate — mechanics may shift; keep `references/mechanics-and-proof.md` current.
