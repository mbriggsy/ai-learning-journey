# How We Work: TODO

The queue for work on how we work. Sessions for it start in this folder.

**The direction (Briggsy, 2026-10-27):** "we still haven't got to the dev process -the actually thing I wanted us to focus on -ce-plan, ce-plan:deepen, ce-docreview, ce-work, ultramode, brief, distill - or functional equivalents that allow Claude to upgrade and not be confined." Every item is judged by one test: does this ever happen to us, or does it change his day? Nothing gets frozen: "We want updates."

## ▶ START HERE

1. **The dev process: the study is done (2026-10-31, ten verified Opus agents). Three calls wait on Briggsy, then the change list below.**
   - **The picks:**
     - brief and distill stay ours, unchanged: nothing native or in CE reads or writes `docs/insights/`.
     - Plan, deepen and the plan check stay CE's `ce-plan`, run to its end. It deepens in auto mode and runs `ce-doc-review` as its own last step. This is today's default, never a mandate.
     - The build is native: hands-on for units that land one after another, a Workflow when the work splits into independent pieces. `ce-work` leaves the playbook (unused since 08-08).
     - The review stays ultramode: native `/code-review` reads only the change, and a skill-less Workflow review repeats insight 019's dropped-crash trap.
     - What keeps the flow running: the TODO's START HERE names each sizable job's next step by name. Every step START HERE named ran (10-20 to 10-31). What lived only in a standing rule or a hook faded: /brief, unnamed, ran in about 4 of 13 pay-check build sessions.
   - **His three calls:**
     - (a) **"Sizable"** = adds new logic (a new script or module, a new engine rule, or any change to a number the product shows), or takes more than one session. Not sizable: copy, docs, config, or a fix that changes no shown number and comes with a test that failed first. When unsure, it's sizable.
     - (b) **Retire the brief gate, the distill reminder and the Stop gate:** `enforce-brief-before-work.sh`, `remind-distill-after-work.sh` and `stop-distill-gate.sh` in `projects/hooks/` and `~/.claude/hooks/`, plus their three `~/.claude/settings.json` entries. The brief gate guards only `ce-work`; the Stop gate fired mid-review 6 times, 5 of them waved off. The public ai-journey-stats hooks card (5 hooks, locked 2026-05-25) would then read 2.
     - (c) **The CE update:**
       - update to 3.34.0;
       - turn auto-update on for every-marketplace (`extraKnownMarketplaces` in `~/.claude/settings.json`);
       - put `cross_model_review_mode: off` in a repo-root `.compound-engineering/config.yaml`, the written form of "no Codex" (no other vendor's tool is installed, so nothing can fire today);
       - add a "Claude models only" line to `~/.claude/CLAUDE.md`, the only off switch for CE's bake-off.
     - Auto mode needs his sentence naming each path for (b) and (c).
   - **On his yes, the change list.** Re-check each anchor before editing, because line numbers drift.
     - **squeaky-clean SKILL.md step 1:** for a sizable job, the TODO's START HERE line (add one if the TODO has none) names the job's next step by capability and its bar, then the steps still owed after it, in order:
       - "the plan, deepened and checked as a whole";
       - "the whole-file review, with an adversary, every finding verified".
       A skipped step goes first. Lessons go to DISTILL CANDIDATES. Name no tool.
     - **principles.md,** "Sizable work runs the whole flow": add the definition, and add that START HERE is what keeps the flow running.
     - **README:**
       - Step 2: ce-plan run to its end, with plan-only wording ("stop after the check"), the plan's path named inside the project's `docs/plans/`, and every helper on opus. Drop "deepen the plan" and "do not use fast path".
       - Step 3: the native build, and why ce-work isn't used.
       - Step 4: "Start it" says START HERE carries the review until it runs.
       - Step 5: drop the Stop-gate clause.
       - Always on: drop the brief-gate and distill bullets.
       - Where things live: fix the plugin line.
     - **cheat-sheet,** "Starting something big": rewrite to match.
     - **Receipts live in the plan's commit message** ("planned, deepened and checked: <what ran>"). A build starts once `git log -- <plan>` shows both. No plan-header fields: CE 3.34.0's plan contract forbids readiness fields and repurposing `deepened`.
     - **ultramode SKILL.md step 7:**
       - a one-session job runs /distill at the review's end;
       - a multi-session job sends its lessons to DISTILL CANDIDATES, runs /distill once after the whole-file review, and names that /distill in START HERE.
     - **The distill-and-brief READMEs and `projects/hooks/README.md`:** drop the hook sections, including the Deployment JSON and the "Stop hooks fire when work is DONE" line. Answer the old "agents skip instructions under task pressure" row with the START HERE evidence.
     - **Memory:** update three notes.
       - `feedback-pilot-owns-flow-and-tools`: settle "sizable" and how the flow sticks.
       - `feedback-distill-after-review`: the new timing, and that the Stop gate was retired on evidence.
       - `feedback-upgrades-always-approved`: CE updated, with its guards.
   - **Landmines from the study:**
     - Never pick ce-plan's "Start ce-work", and never ask ce-plan to "build it". CE 3.34.0 fires the next action itself when the request already authorizes it (`plan-handoff.md` 5.4), and its ce-work then moves the work off main onto a new branch, in a checkout parallel sessions share.
     - Name every plan's path: 3.34.0 builds its plans folder from the git top level, which here is the whole monorepo.
     - A widened deepen or check Workflow finds CE's prompt files through `installed_plugins.json`, never a version-numbered path.
     - A running session keeps the CE version it loaded until it restarts.
   - **Record fix:** whole-plan checks kept running after U4's on 10-23: u4-cut and u4-r2bf on 10-27, the Feud gameday on 10-29. From 10-22 the written rule named the step.

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
