# loop-engineer — TODO

> **BENCHED 2026-06-20 · DOGFOOD-PROVEN 2026-06-24.** `swarm` is the daily driver for delegated build work; loop-engineer is the live-steer / eye-oracle specialist. The **first live dogfood is DONE** — the full cadence flew end-to-end on The Back Nine U6-render `ConfidenceBand` (the independent-verify loop caught a real cardinal-sin bug the green gates missed; coordinator stayed context-light throughout). Findings → `references/mechanism-and-caveats.md` (*First-dogfood field notes*). Refinement items are now in the **Refine from the first dogfood** section below.

`SKILL.md` + `references/` authored 2026-06-19 (R40 U3 loop run); mechanics verified against CLI 2.1.183 + live docs the same day. **Committed (`0ef5fa70`); never dogfooded as a skill.** Priority order (paused).

## Next experiment — QUEUED 2026-06-20
> Briggsy: *"make a note in the loop engineering folder and we'll try some loop experiments from there when I get back to the laptop."* This is the live counterpart to the swarm we just flew.

On 2026-06-20 the **first real build-swarm** landed The Back Nine's R40 U4 (`d58b26d3`): fire-and-forget, the 6-lens panel caught a **live cardinal-sin bug**, and the coordinator **closed the loop by hand** (re-gate + eyeball — the swarm is single-pass and doesn't converge itself; it even has a real-pixel blind spot the COLA nit exposed). loop-engineer is the **live-steer sibling** for the units where that manual close should instead be **Briggsy's eye, continuously, mid-build**.

- **Target unit (Briggsy picks):** The Back Nine's **answer surfaces** — **U6-render** (the colorblind-safe confidence-band / projection-fan) or **U7** (the plain-language confidence statement). These are **eye-oracle** units (taste / tone / colorblind-safe viz): no test catches "calm-but-casino", so live-steer beats fire-and-forget. The split to remember: **test-oracle → `swarm`**, **eye-oracle → `loop-engineer`**.
- **Why the laptop:** the answer surfaces are laptop-primary (Briggsy's showcase screen) — he needs to *see and steer* each beat, not review a finished worktree.
- **Before flying:** junction-install (below) → re-read `SKILL.md` + `references/` (the SendMessage relay, idle≠done pull, and independent-verify handoff are all still unproven end-to-end as a skill) → load the four-skill UI loadout → stand up the team (coordinator owns decomposition; teammates can't nest; Briggsy steers).
- **Capture:** what breaks in the live relay → `/distill` back into the skill. This run is the dogfood that proves it (or breaks it).

## Refine the draft
- [ ] **Cold-test the `description` triggers** — confirm it fires on "run the loop / loop-engineer X / spawn a team to build+verify / keep this window dark" and does NOT over-trigger (e.g. a plain inline edit, or a fire-and-forget fan-out that should be the Workflow tool). Use the distill/brief output-eval loop (the trigger optimizer is billing-blocked + unvalidated).

## Activate — DONE (2026-06-24)
- [x] **Junction-install** — `~/.claude/skills/loop-engineer` → repo dir (PowerShell junction).
- [x] **First live dogfood run** — The Back Nine U6-render `ConfidenceBand` (direction B + click-to-enlarge). The SendMessage relay, idle≠done pull, independent-verify handoff, fix-loop (×2), and live-steer **all proven end-to-end**. Findings distilled into `references/mechanism-and-caveats.md`.

## Refine from the first dogfood
- [ ] **Bake "coordinator restraint" into the cadence** — once a teammate is confirmed idle/done, stop pinging; read the task list before pulling; only pull if a verdict isn't plausibly already in-flight; don't narrate stale idle-echoes to the user. (Over-pulling caused a chatter loop.)
- [ ] **State the mutator-serialization rule explicitly** — teammates share ONE working tree; never run two committing teammates concurrently (serialize, or `git worktree`-isolate). Add to the cadence + the security/boundary section.
- [ ] **`temp/` is not durable scratch** — instruct teammates to use isolated dirs / heredoc-persisted files; project `temp/` is async-swept. (Open: trace the sweeper — possibly a hook.)
- [ ] **"Coordinator reconciles task status"** — a teammate relays a verdict but may not flip its task; the lead closes it off the relay. Encode as part of "pull the verdict".
- [ ] **Promote "the task list is canonical, chat is lossy" to a first-class law** — teammates verify state before acting; treat echoes/backlog flushes as no-ops. This is what made the run robust.
- [ ] **"Test a verifier's 'can't trigger' note before locking"** — a forward-looking note is an unverified claim; the dogfood's real bug hid behind exactly such a note.

## Later
- [ ] Promote to a sibling `projects/` project ONLY if it accretes real standalone scripts (launcher `.ps1`, task-list templates, gate scripts) beyond `SKILL.md` + `references/`.

## Landmine
- EXPERIMENTAL flag (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`); `/resume` + `/rewind` do NOT restore in-process teammates (recover from the on-disk task list).
- **Teammates CANNOT spawn teammates** (docs: "only the lead can manage the team"). Keep all team composition at the lead.
- One implicit team per session (v2.1.178+); `team_name` is ignored. Mechanics may shift on this experimental flag — keep `references/mechanism-and-caveats.md` current.
