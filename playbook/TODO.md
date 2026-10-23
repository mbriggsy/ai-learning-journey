# Our Setup: TODO

The queue for our-setup work. Sessions for it start in this folder. The full flight plan, with every unit, the security items and the research behind them, is private: it lives in the config repo at `~/.claude/docs/plans/our-setup/2026-10-19-001-refactor-our-setup-flight-plan.md`, because it names security work that isn't finished. This file holds only the part that is safe to publish. When the two disagree, the plan wins and this file gets fixed.

## ▶ START HERE

**U3 step 8c, the Q14 hook. It's under way: round 1's review is done and its fixes are being built.** The full steps are in the plan's U3 section, NEXT #3; the record (triage, patches, review digests) is in the private backup folder `~/.claude/flow/backup/step8c-2026-10-22/`. **Step 8c records Q14's live data. It does not settle Q14:** Q14's `decide()` can't return VERIFIED, and nothing reads the recorder's captures yet, so that is its own follow-up (Next #4 below).

In this order:

1. **The monorepo edits, through the review cadence.** The path change (`projects/` to `playbook/`) in `projects/hooks/probes/defs/q14-prompt-origin.mjs` (lines 26 and 145), `probes/live/q14-recorder.mjs` (line 3) and `projects/hooks/README.md` (lines 68 and 223), plus round 1's fixes: the recorder notes a peer message's fixed wrapper and stamps every line with a hash of its own bytes, and the probe's summary and census cover peer messages and /loop ticks. Commit by path.
2. **Patch 01, through the settings writer:** rewrite C29's Q14 entry in `~/.claude/settings.json` `autoMode.allow` as a whole (a test, then a set). A find-and-replace can't do it: the path appears twice, once inside Briggsy's own quoted words, so it would either be refused or change his words. The new entry keeps his 2026-10-20 quote and adds his typed 2026-10-22 approval.
3. **Patch 02, through the writer:** add the recorder to `playbook/.claude/settings.local.json` as a `UserPromptSubmit` hook in exec form (`command: "node"` plus `args`), the form the probes' own hooks fire through.
4. **`--only Q14`**, then `report.mjs` and `--cleanup`. It files PARTIAL again, with the new summary.
5. **Live, with Briggsy.** First, his next typed prompt must leave a line tagged with this session; with none, check `/hooks` or start a fresh session in `playbook/`. Then: typed prompts, two Remote Control prompts (he says which), a task notification, two `/loop` ticks and one peer message. Every `polling: true` line needs its `afterReturn` line, and zero polling lines means that question is untested, not passed. Then check that the captures file holds only fixed tokens, times and tags. The large-transcript timing is already done (12.9 ms against 9.0 ms on a 63.7 MB transcript).

The hook stays until Q14's verdict arm settles Q14. It comes out through the writer, with Briggsy's words if the safety check blocks it. Step 1's code goes through the review cadence before it lands.

## Current state

- **U3 is landed and live:** the one settings writer, versioned hook deploys, the status line and the pre-push leak gate.
- **Step 8b is done** (2026-10-23): probe Q8's background-session arm runs in a fresh folder inside one trusted folder, and Q8 is VERIFIED on CLI 2.1.309.
- **Probes on 2.1.309:** the load-bearing set waits only on Q13 (unit U10) and Q14 (step 8c records its live data; Next #4 turns that data into a verdict).
- **Lessons** live in [docs/insights/](docs/insights/), 001 to 007.
- **Gates:** the hooks suite (`cd projects/hooks && node --test "tests/*.test.mjs"`) exits 0 locally. CI's "Hooks tests" passed on `0c762cfa` (run `39883908135`).

## Next, in order

1. Step 8c (above).
2. **`playbook` in the leak gate's scope.** Add `'playbook'` to `SCOPE` in `projects/hooks/tests/leak.mjs`, and add a test that pins the list. It's a hooks code change, so it goes through the review cadence. Until it lands, run the gate's rules over this folder by hand before every push: `scan(repo, ['playbook'])` from that file.
3. **U4**, per the plan's U4 section.
4. **Q14's verdict arm**, its own flow (plan, deepen, check, build, review): the probe reads the recorder's captures for the run's CLI version and the recorder's bytes (a prompt's two lines stamped with different bytes straddle an edit and count under neither), and returns VERIFIED or CONTRADICTED on whether a hook can tell Briggsy's prompts from the rest. That plan settles its framing and the per-version cost (a Remote Control prompt for every CLI version would be a chore for Briggsy). The plan's U3 NEXT #3 (f) has the detail.
5. **Q6's prompt.** On 2.1.309 the model declines to repeat an identical read, so Q6 reads INCONCLUSIVE. Rework `projects/hooks/probes/defs/q06-once.mjs` so each read has its own reason (for example, a different file each time), then rerun with `--only Q6`. It goes through the review cadence. Q6 isn't load-bearing.
6. **Dead project entries in `~/.claude.json`**, one per probe workspace. Remove them through the settings writer (`--target claude-json`), with Briggsy's approval in his own words for that write.
7. **The exit-4 advice simplification** in `projects/hooks/deploy.mjs` (insight 004): advice that states facts instead of guessing the next command. Who does it, and when, is Briggsy's call.

## Landmines

- **Writes to Claude Code's own config get blocked.** Auto mode's safety check stops any write to `~/.claude.json` or `~/.claude/settings.json` as self-modification unless a standing rule names it. Ask Briggsy for the exact write in his own words, then run the same write again.
- **Every CLI version starts with no passed probes.** Briggsy updates the CLI before each session, so rerun the full probe suite on each new version, from a Bash tool in this session: `cd "$TEMP" && node <repo>/projects/hooks/probes/run.mjs`, then `report.mjs`, then `--cleanup <run dir>`.
- **Read a surprising probe run's own record before blaming the CLI** (`modelUsage`, `permission_denials`). Probe sessions can switch models mid-run (insight 003).
- **Tests never build fixture paths with the code under test.** Mutation runs go on a copy and compare the real temp folder before and after (insight 006).
- **A new laptop needs per-machine setup again,** including the probes' one-time trusted-folder approval (the steps are in the private backup folder for step 8b).
