# Our Setup: TODO

The queue for our-setup work. Sessions for it start in this folder. The full flight plan, with every unit, the security items and the research behind them, is private: it lives in the config repo at `~/.claude/docs/plans/our-setup/2026-10-19-001-refactor-our-setup-flight-plan.md`, because it names security work that isn't finished. This file holds only the part that is safe to publish. When the two disagree, the plan wins and this file gets fixed.

## ▶ START HERE

**U3 step 8c, the Q14 hook. Briggsy needs to be at the keyboard:** his typed and Remote Control prompts are the data. The full steps are in the plan's U3 section, NEXT #3. The five places to change, in this order:

1. In `~/.claude/settings.json`, `autoMode.allow` (line 152 today, the "Adding the Q14 probe hook ..." entry): run the settings writer's `replaceInStrings` from `projects/.claude/settings.local.json` to `playbook/.claude/settings.local.json`, with `expectCount: 1`. The commit quotes his 2026-10-22 ruling that our-setup sessions start in `playbook/`.
2. `projects/hooks/probes/defs/q14-prompt-origin.mjs`, lines 26 and 145: the same path change. It voids Q14's hash, so Q14 reruns.
3. `projects/hooks/probes/live/q14-recorder.mjs`, line 3: the same.
4. `projects/hooks/README.md`, line 68 (Q14's live recorder) and line 223 (the writer paragraph): the same.
5. The writer adds the hook to `playbook/.claude/settings.local.json`. Then measure: every `polling: true` atHook line should get an afterReturn line, and time the hook on a large transcript.

Steps 2 to 4 are hooks code, so they go through the review cadence before they land.

## Current state

- **U3 is landed and live:** the one settings writer, versioned hook deploys, the status line and the pre-push leak gate.
- **Step 8b is done** (2026-10-23): probe Q8's background-session arm runs in a fresh folder inside one trusted folder, and Q8 is VERIFIED on CLI 2.1.309.
- **Probes on 2.1.309:** the load-bearing set waits only on Q13 (unit U10) and Q14 (step 8c).
- **Lessons** live in [docs/insights/](docs/insights/), 001 to 007.
- **Gates:** the hooks suite (`cd projects/hooks && node --test "tests/*.test.mjs"`) exits 0 locally. CI's "Hooks tests" passed on `0c762cfa` (run `39883908135`).

## Next, in order

1. Step 8c (above).
2. **`playbook` in the leak gate's scope.** Add `'playbook'` to `SCOPE` in `projects/hooks/tests/leak.mjs`, and add a test that pins the list. It's a hooks code change, so it goes through the review cadence. Until it lands, run the gate's rules over this folder by hand before every push: `scan(repo, ['playbook'])` from that file.
3. **U4**, per the plan's U4 section.
4. **Q6's prompt.** On 2.1.309 the model declines to repeat an identical read, so Q6 reads INCONCLUSIVE. Rework `projects/hooks/probes/defs/q06-once.mjs` so each read has its own reason (for example, a different file each time), then rerun with `--only Q6`. It goes through the review cadence. Q6 isn't load-bearing.
5. **Dead project entries in `~/.claude.json`**, one per probe workspace. Remove them through the settings writer (`--target claude-json`), with Briggsy's approval in his own words for that write.
6. **The exit-4 advice simplification** in `projects/hooks/deploy.mjs` (insight 004): advice that states facts instead of guessing the next command. Who does it, and when, is Briggsy's call.

## Landmines

- **Writes to Claude Code's own config get blocked.** Auto mode's safety check stops any write to `~/.claude.json` or `~/.claude/settings.json` as self-modification unless a standing rule names it. Ask Briggsy for the exact write in his own words, then run the same write again.
- **Every CLI version starts with no passed probes.** Briggsy updates the CLI before each session, so rerun the full probe suite on each new version, from a Bash tool in this session: `cd "$TEMP" && node <repo>/projects/hooks/probes/run.mjs`, then `report.mjs`, then `--cleanup <run dir>`.
- **Read a surprising probe run's own record before blaming the CLI** (`modelUsage`, `permission_denials`). Probe sessions can switch models mid-run (insight 003).
- **Tests never build fixture paths with the code under test.** Mutation runs go on a copy and compare the real temp folder before and after (insight 006).
- **A new laptop needs per-machine setup again,** including the probes' one-time trusted-folder approval (the steps are in the private backup folder for step 8b).
