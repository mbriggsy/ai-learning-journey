# Our Setup: TODO

The queue for our-setup work. Sessions for it start in this folder. The full flight plan, with every unit, the security items and the research behind them, is private: it lives in the config repo at `~/.claude/docs/plans/our-setup/2026-10-19-001-refactor-our-setup-flight-plan.md`, because it names security work that isn't finished. This file holds only the part that is safe to publish. When the two disagree, the plan wins and this file gets fixed.

**The direction (Briggsy, 2026-10-27):** "I feel like we built a bunch of safety checks for stuff that doesn't happen to us. Can we focus more on our setup? Like the practical things?" and "we still haven't got to the dev process -the actually thing I wanted us to focus on -ce-plan, ce-plan:deepen, ce-docreview, ce-work, ultramode, brief, distill - or functional equivalents that allow Claude to upgrade and not be confined." Every item below is judged by one test: does this ever happen to us, or does it change his day? Nothing gets frozen: "We want updates."

## ▶ START HERE

1. **Land U4, when B9 is idle.** U4 is committed (`7f2dbd4a`, on top of B9's `fde13929`), not pushed by this session: B9 had that commit unpushed and was busy, and whoever pushes `main` first pushes both. Check `git status -sb`; once it's on origin, read CI's "Hooks tests" run for it. Then the landing, per the private `~/.claude/flow/backup/u4-2026-10-23/u4-cut-build-plan.md`, "The landing":
   - Step 0: the stale `C:/wt/b9` worktree (branch `b9-squeaky`; no session ever started there) goes, with B9's word, since its settings copies hold every old allow.
   - Step 1: Q17, Q18 and Q19 are VERIFIED on 2.1.312 (Q17 and Q18 on the final catalog). If the installed CLI differs at landing, rerun those three (`--only Q17,Q18,Q19`, `report.mjs`, `--cleanup`).
   - Step 2: Briggsy types one consent sentence naming every write (the safety check blocks a write to Claude Code's own settings without his words); the plan lists them.
   - Step 3: the user patch through `deploy.mjs deploy --patch`, the project files through the writer, then `landing-env-unfreeze.json` (deletes `env.DISABLE_AUTOUPDATER`, so the CLI and every plugin update on their own; dry-run clean 2026-10-27).
   - Step 4, proof: the liveness check on his real files prints no S1 line, and the next ordinary push records `accept` by the classifier.
   - After it lands: update the memory `user-updates-cli-before-every-session` (he no longer has to run `claude update`).
2. **The dev process, in a fresh session (the real goal).** One capability at a time: plan, deepen, doc review, work, ultramode review, brief, distill. For each, what native Claude Code does now, what CE does, what ours does; keep the thinnest version that works and gets better as Claude Code gets better, never a wrapper that locks in today's behavior. The research half exists: the 2026-10-17 preflight page (memory `reference-our-setup-preflight`). Bring Briggsy a short list with one recommendation. Two U4 pieces touch this: the four CE skills Claude may not start (`ce-work-beta`, `ce-optimize`, `ce-riffrec-feedback-analysis`, `ce-resolve-pr-feedback`, his ruling 1) and the read-only review-lens that ultramode's lenses use.
3. **The practical cut of the rest of the flight plan,** the same way U4 was cut: a short list, one recommendation each, his call. From the unit headings only (not yet read in full):
   - Likely cut or shrunk (safety machinery for things that don't happen to us): U7 ledger, U8 sizable meter, U9 liveness v2, U13 handoff inbox, U15 close-out gate, U16 squeaky debt step, U30 review-lag warning, the bake-offs U18 to U20.
   - Likely kept: U14 (the overdue whole-file review of B9: 38+ commits since the last one), U26 (plugin and skill-listing cleanup), U22 (session settings), U27 and U28 (refreshes, housekeeping), U10 to U12 (folded into item 2).
   - Parked: U21, a TypeScript language server (exact "where is this used" answers in B9; modest gain).
   - Dropped: U25, the Microsoft Learn docs server (no project touches Azure).
   - Also a candidate: take the Q14 recorder hook out of `playbook/.claude/settings.local.json` (it records every prompt in this folder for a verdict nothing reads yet).

## Current state

- **U3 is landed and live:** the one settings writer, versioned hook deploys, the status line and the pre-push leak gate (it scans `playbook/` too).
- **U4 is committed, not live** (`7f2dbd4a`, 21 files): the permission catalog (129 deny rules: the history-wiping pushes in both shells, other vendors' AI CLIs, five Skill denials, Playwright's run-code on twelve servers; no ask rule; CE's marketplace set to auto-update), the patch tool, check 4 of the session-start liveness check, plugin-grant watching and probes Q17 to Q19. Nothing asks Briggsy. The CE freeze the plan had is gone, and the landing also turns the CLI's own auto-updater back on.
- **Gates:** the hooks suite (`cd projects/hooks && node --test "tests/*.test.mjs"`) exits 0: 894 tests, 890 pass, 0 failures, 4 skipped (run 2026-10-27 after the last edit; under load, two timing guards in `harness.test.mjs` skip on purpose, so up to 6). Review round 3 passed the harm-class gate (11 distinct issues, all P3, fixed). Mutation: 48 of 48 killed. CI's "Hooks tests" last passed on `096babb1`; U4 runs there once it's pushed.
- **Probes run only when a unit that depends on them is built or landed,** never after every CLI update.
- **Lessons** live in [docs/insights/](docs/insights/), 001 to 008.

## Parked until the practical cut

Each of these is probe or safety work; the cut decides whether it lives.

- **Q14's verdict arm:** a probe that reads the live recorder's lines and says whether a hook can tell Briggsy's prompts from the rest. Its inputs, step 8c's findings, are in this file's history (`d8b6357f`) and the private `~/.claude/flow/backup/step8c-2026-10-22/live-groundtruth.txt`.
- **Q6's prompt:** on 2.1.309 the model declines to repeat an identical read, so Q6 reads INCONCLUSIVE; a reworded def would fix it. Q6 isn't load-bearing.
- **Dead project entries in `~/.claude.json`**, one per probe workspace and throwaway folder: removable through the settings writer (`--target claude-json`), with Briggsy's words.
- **The exit-4 advice simplification** in `projects/hooks/deploy.mjs` (insight 004): advice that states facts instead of guessing a command.

## Landmines

- **Writes to Claude Code's own config get blocked.** Auto mode's safety check stops any write to `~/.claude.json` or `~/.claude/settings.json` as self-modification unless a standing rule names it. Ask Briggsy for the exact write in his own words, then run the same write again.
- **The leak gate refuses a push that puts these in `playbook/`:** any uuid (even a made-up one, or the one in a `claude.ai/code/artifact/` link), a user-folder path even with a placeholder name (the dashed form Claude Code names a project's folder by included), and any binary file, a screenshot for one. Write paths as `~/...`, a project folder as `<slug>` and ids as `<id>`; screenshots go in the ignored `playbook/temp/`.
- **A peer's unpushed commit under yours:** pushing `main` publishes it too. Commit path-scoped (`git commit -- <paths>`) and leave the push to the peer, or ask (2026-10-27: B9's `fde13929` sat under U4's commit).
- **A replace-all over a test file also rewrites the regex literals and expected messages that hold the same text.** Grep the result before running the suite (2026-10-27: `autoUpdate: true|false` inside a refusal pattern).
- **A commit message that quotes a force push is refused once U4 lands.** The block rules over-match a `git commit -m "... push ... --force ..."` message: word the message around it.
- **Never freeze or pin a version** (memory `feedback-upgrades-always-approved`): a design that wants stability against an update tolerates the change instead.
- **Read a surprising probe run's own record before blaming the CLI** (`modelUsage`, `permission_denials`). Probe sessions can switch models mid-run (insight 003).
- **`run.mjs --cleanup` reads `made.json` one folder down:** `--cleanup <run folder>` cleans `<run folder>/<sub>/made.json`; pointing it at an output folder that holds `made.json` itself deletes nothing and says nothing.
- **Tracked settings files outside the leak gate hold user-folder paths.** `projects/burned/.claude/settings.local.json` is public with four of them in its allow list; the gate scans only `playbook/` and `projects/hooks`. Scrubbing it and widening the gate is its own item.
- **Build lanes share one scratchpad.** Give each lane's scratch files a prefix of its own.
- **Tests that make git repos can't run from a session scratchpad folder** (Windows' 260-character limit: "Filename too long"). A mutation copy can sit in the scratchpad; the tests' own temp folder stays the system one.
- **Tests never build fixture paths with the code under test.** Mutation runs go on a copy and compare the real temp folder before and after (insight 006). A mutation copy of `projects/hooks` must be laid out as the repo (`projects/skills/ultramode-code-review` beside it) and be a git work tree.
- **The live Q14 hook runs the recorder straight from the repo:** any saved edit to `projects/hooks/probes/live/q14-recorder.mjs`, even a comment, changes the fingerprint on every line written after it.
- **A new laptop needs per-machine setup again,** including the probes' one-time trusted-folder approval (steps in the private backup folder for step 8b).
