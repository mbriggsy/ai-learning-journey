# Our Setup: TODO

The queue for our-setup work. Sessions for it start in this folder. The full flight plan, with every unit, the security items and the research behind them, is private: it lives in the config repo at `~/.claude/docs/plans/our-setup/2026-10-19-001-refactor-our-setup-flight-plan.md`, because it names security work that isn't finished. This file holds only the part that is safe to publish. When the two disagree, the plan wins and this file gets fixed.

## ▶ START HERE

**U3 step 8c, the Q14 hook: it's LIVE and recording. Three arms and the end checks are left.** The full steps are in the plan's U3 section, NEXT #3 (e); the record is in the private backup folder `~/.claude/flow/backup/step8c-2026-10-22/`. Read `live-groundtruth.txt` there first (one line per arrival so far, plus the findings), then `live-provenance.txt`. The captures are in `~/.claude/flow/probes/q14-live/captures.jsonl`. **Step 8c records Q14's live data. It does not settle Q14:** Q14's `decide()` can't return VERIFIED, and nothing reads the captures yet, so that is its own follow-up (Next #4 below).

**Done (2026-10-23):** the code landed in `9658d4b6` (CI run `39893753866` passed); both settings-writer patches were applied (C29's rule and the hook); `--only Q14` filed PARTIAL with the new summary and was cleaned up. Live arms recorded so far: a task notification, an agent's message back, a peer message that arrived mid-turn, two `/loop` ticks, and two of Briggsy's own prompts (one each into "our setup" and "our setup-2"). The hook loaded mid-session with no restart. All 6 polling lines got their after-return line, and every line carries the committed recorder's stamp.

**Left, in this order:**

1. **Ask Briggsy how he sent his two prompts of 2026-10-23,** in plain words: "Did you type your first messages this morning, at 11:07 and 11:09 your time, on the laptop keyboard, or send them from your phone?" Write his answer into `live-groundtruth.txt` against the `15:07:59Z` and `15:09:39Z` lines. Both records read `promptSource: typed`, so this answer decides whether a phone message looks different at all.
2. **Two Remote Control prompts.** Briggsy sends two short messages from his phone into this session, starting with `rc` (say, `rc one` and `rc two`), and confirms he sent them that way. Log one ground-truth line for each.
3. **A peer message that opens a turn.** The peer message measured so far landed mid-turn, so the usual handoff case, a message that wakes an idle session, is unmeasured. A throwaway `claude --bg` session, launched in a fresh folder inside `$TEMP/claude-probe-q8-trusted/`, waits about 60 s and then messages this session by its exact name while this session is idle. Clean up with `claude stop <id>` and `claude rm <id>`; it leaves one more dead `~/.claude.json` entry for Next #6.
4. **The end checks**, per the plan's (e): the provenance check (disk blob equals the HEAD blob; every line's `recorder` equals the file's stamp), the mechanical audit of `captures.jsonl` (no key outside the recorder header's schema, every string a fixed token, an ISO time or a hex tag), and the tree-kill tally (every `polling: true` line joined to its `afterReturn` line).
5. **Write the results down:** the plan's U3 NEXT #3 gets (e)'s results, and its (f) gets the findings below as design inputs. Then, through the review cadence, update `projects/hooks/README.md` line 3 ("built and tested but not live yet") and line 68 ("which stays unmeasured until the install step"), plus the recorder's header lines 31 to 35 ("Whether it does is measured at the install step"), to the measured result with its count. Edit the recorder only after the measurement ends (see Landmines).

**Findings so far** (detail in `live-groundtruth.txt`):
- **The prompt's origin can't be read while the hook runs.** In all 6 turn-opening lines, the prompt's record was missing when the hook looked (20 to 38 ms) and present after it returned (about 0.7 to 1 s).
- **A peer message that arrives mid-turn fires the hook with the current turn's prompt id.** Anything that keys a prompt's origin on its prompt id would file that peer message as the turn opener. This is a trap for U15.
- **A task notification queued at the start of a turn produced no hook line** (seen once).
- **An agent's message back reached the hook starting at its bare `<agent-message>` tag,** while its stored record starts with the "Another Claude session sent a message:" preamble.

The hook stays until Q14's verdict arm settles Q14. It comes out through the writer (patch 02's inverse), with Briggsy's words if the safety check blocks it.

## Current state

- **U3 is landed and live:** the one settings writer, versioned hook deploys, the status line and the pre-push leak gate.
- **Step 8b is done** (2026-10-23): probe Q8's background-session arm runs in a fresh folder inside one trusted folder, and Q8 is VERIFIED on CLI 2.1.309.
- **Probes on 2.1.309:** the load-bearing set waits only on Q13 (unit U10) and Q14 (step 8c records its live data; Next #4 turns that data into a verdict).
- **The Q14 hook is live** in `playbook/.claude/settings.local.json` (gitignored), so every session started in this folder records into the captures file.
- **Lessons** live in [docs/insights/](docs/insights/), 001 to 007.
- **Gates:** the hooks suite (`cd projects/hooks && node --test "tests/*.test.mjs"`) exits 0 locally (run 2026-10-23). CI's "Hooks tests" passed on `9658d4b6` (run `39893753866`).

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
- **Don't edit `projects/hooks/probes/live/q14-recorder.mjs` while 8c's measurement runs.** Any edit changes the stamp on every line written after it, so lines from before and after the edit count separately, and the end check (disk blob equals HEAD blob) fails until the edit is committed.
- **Every capture line carries its CLI version (`cli`).** If Briggsy has updated the CLI past 2.1.309, the arms left in 8c land on the new version. The verdict arm counts each version separately, and the new version needs the full probe rerun first (the landmine above).
