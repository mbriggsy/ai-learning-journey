# How We Work: TODO

The queue for work on how we work. Sessions for it start in this folder.

**The direction (Briggsy, 2026-10-27):** "we still haven't got to the dev process -the actually thing I wanted us to focus on -ce-plan, ce-plan:deepen, ce-docreview, ce-work, ultramode, brief, distill - or functional equivalents that allow Claude to upgrade and not be confined." Every item is judged by one test: does this ever happen to us, or does it change his day? Nothing gets frozen: "We want updates."

## ▶ START HERE

1. **The brief recall fix (sizable: new logic, more than one session). Next: the plan's check.** The plan is `projects/skills/distill-and-brief/docs/plans/brief-recall-fix-plan.md`, planned and deepened on 2026-10-31 (the deepen ran inline from the research already gathered, with no deepen helpers, because the window was past 50%). Briggsy approved the fix ("that makes sense") and the in-lesson index over a separate file ("another asset to be out of sync"); `applies_when` was his "your call". Steps, in order, all owed:
   - **The plan, checked as a whole:** `ce-doc-review mode:non-interactive <plan path>` in a fresh session, passing the permission-to-edit sentence from ce-plan's `plan-handoff.md` 5.3.8 and the plan's Product Contract as the contract; the whole plan to each lens (the coherence, adversarial and feasibility reviewers especially); every lens on Opus; then a commit whose message ends "planned, deepened and checked".
   - **The build, unit by unit (U1-U7), each opened with `/brief <that unit's topic>`.** Nothing goes live before U6's verdict (KTD7): candidates are `SKILL.next.md` and `corpus.next.mjs`. U6's re-score is about 102 brief runs plus blind judges (KTD6): check the status bar's 5-hour and weekly meters first.
   - **The whole-file review** (ultramode) of everything the job changed, with an adversary and every finding verified.
   - **`/distill`** from DISTILL CANDIDATES below.
2. **CE's auto-update: the install half.** The refresh is proven: every-marketplace's `lastUpdated` in `~/.claude/plugins/known_marketplaces.json` moved on its own, to `2026-10-31T16:03:11Z` and again to `16:08:42Z`, with two fresh sessions up (the last manual update ran at 14:48:17Z; no session's transcript shows one after it, by command or by `/plugin`). Nothing new was there to install: the installed CE commit (`3449230`) is upstream's head. The first time Every ships past it, the CE entry's `gitCommitSha` in `~/.claude/plugins/installed_plugins.json` should change within a session, with no manual update. If it doesn't, the only other switch is `/plugin` > Marketplaces > Enable auto-update, which needs his hands: flag it as a blocker.
3. **Nothing else is queued.** Ask Briggsy what's next.

## DISTILL CANDIDATES (for the brief recall fix's `/distill`)

- **A recall tool that looks right can still miss most of what matters.** Brief's picks read as on target, yet blind judges found it surfaced 87 of the 222 Back Nine lessons that bore on its 11 briefs, and 73 of the 140 misses across all projects were traps the work then hit. Measure recall with blind judges, not by reading the picks (benchmark `projects/skills/distill-and-brief/brief/results/recall-benchmark-2026-10-31.json`).
- **A read-only check that finds staleness rediscovers it every run until it writes the fix.** Brief flagged the Back Nine's lesson 006 (a cap of 128, now 192) on 10-20 and again on 10-29; nobody corrected it until brief's correction rule (`8e0f7f04`, `52a9b0d7`).
- **A backfill written from today's text leaks a benchmark's answers.** Of the 222 judged pairs, 70 involve a lesson changed after its brief, 63 by a later `## Extended` section, 22 of them describing the very work that missed them; write per git blob, blind (the plan's KTD5).
- **Tool output has a budget the search must plan for.** A Grep of 148 titles is about 49 KB with paths; past about 30,000 characters Claude Code shows a 2 KB preview, and Grep stops at 250 lines unless told otherwise (the plan's KTD2).

## Current state

- **The dev process is settled (2026-10-31, the dev-process study plus his yes).** The flow's five steps and today's tools are in [README.md](README.md#the-plays-in-order): brief and distill are ours; ce-plan runs to its end (the plan, a deepen that applies its own findings, then `ce-doc-review`); the build is native (hands-on, or a Workflow when the work splits); the review is ultramode. "Sizable" and what keeps the flow running (START HERE names the next step at every close) are in [principles.md](principles.md#how-we-work); the close rule is squeaky step 1.
- **The plan step is proven on CE 3.34.0.** b9-2's schema-v4 plan (`594e4ae9`) met every check README step 2 implies: the named path in the project's `docs/plans/`, `confirm:auto`, every helper on Opus, the whole plan to each of the five `ce-doc-review` lenses, the other-vendor pass skipped because the repo config turns it off, no question to Briggsy, and "planned, deepened and checked" in the commit message. The Back Nine's START HERE (`1d1a0adc`) names build 2's steps by their bar.
- **Hook scripts: two live** (the session-start manifesto and the WebFetch blocker), plus the inline Notification pop-up in `~/.claude/settings.json`, which has no script. The brief gate, the distill reminder and the Stop gate were retired on 10-31: scripts deleted from `projects/hooks/` and `~/.claude/hooks/`, settings entries removed, the ai-journey-stats hooks card set to 2 (its other numbers stay as of 2026-06-14 until a full refresh).
- **CE is at 3.34.0** with auto-update on for its marketplace. Its other-vendor review pass is off in the repo-root `.compound-engineering/config.yaml`, and `~/.claude/CLAUDE.md` says Claude models only. That line is the only off switch for CE's bake-off, where helpers each draft an approach and, unless told otherwise, look for other companies' models to do it. No other vendor's tool is installed.
- **The our-setup program (2026-10-19 to 10-27) is flushed**, every leftover included (the two numbered hook folders went on 10-31).
- **Kept from the program:** ultracode on by default, the status bar's live effort level, the `/window` fix after compaction, and squeaky's hand-off to a named successor (found with `ListAgents`; the `<name> [ref]` send for a name clash is untested end to end).
- **Lessons** live in [docs/insights/](docs/insights/): 002, 003, 005, 008 and 009.
- **Brief and distill as live today (`8e0f7f04`):** brief corrects a lesson the code has outgrown (one dated pointer note, committed alone; never when the code is the wrong side, the right side is unclear or another session has edits in the lesson); distill extends an existing lesson with a dated `## Extended (YYYY-MM-DD): ...` section instead of a near-copy, with no line cap. The recall fix above changes neither rule.

## Landmines

- **Never pick ce-plan's "Start ce-work", and never ask ce-plan to "build it".** CE 3.34.0 fires the next action itself when the request already authorizes it (`plan-handoff.md` 5.4), and its ce-work then moves the work off main onto a new branch without asking, in the one checkout every session shares.
- **Name every plan's path.** CE 3.34.0 builds its plans folder from the git top level, which here is the whole monorepo.
- **Never say "deepen the plan" about a finished plan.** It switches CE to asking Briggsy to accept or reject each helper's findings. To re-deepen, run ce-plan on the plan's path and say "judge and apply the findings yourself" (memory `reference-ce-plan-deepen-fast-path`). That recipe is untested: expect ce-plan to ask whether to update the plan in place, answer it yourself, and check the run really scored the sections.
- **A Workflow that adds extra helpers to a deepen or a check** finds CE's prompt files through `~/.claude/plugins/installed_plugins.json`, never a version-numbered path.
- **Sessions started before 2026-10-31 10:49 run the old setup until they restart:** CE 3.14.3, plus the `~/.claude/CLAUDE.md` and memory index they loaded at start, which their helper agents get too. Start a plan or review step in a fresh session, and restart old sessions at a natural stop (never a busy one mid-work).
- **Removing a hook that refuses calls when its script is missing** (`"onFailure": "block"`): take its `settings.json` entry out first, check a call in this session still runs, then delete the script. A session whose file watcher missed the edit refuses every matching call until it restarts.
- **Auto mode (Claude Code's permission setting) blocks removing a safety check, an irreversible delete, and writes to Claude Code's own config, without Briggsy's own words.** Name every path in the sentence you draft for him: a delete command that bundles a path he didn't name gets refused.
- **Never restore `~/.claude/settings.json` whole from an old commit.** The 10-19 snapshot (config repo `22015c5`) has 15 garbled dashes and no ultracode. Edit it key by key.
- **`~/.claude/skills/brief` and `distill` are junctions into `projects/skills/distill-and-brief/`.** A saved edit is live in every session at once, mid-job included. Build a candidate beside the live file under another name (`SKILL.next.md`) and swap it in only after it is proven.
- **A Workflow agent runs in the session's working folder; `agent()` has no folder option.** Give it absolute paths, and tell it not to search the live `projects/*/docs/insights/` when it works on a copy.
- **The hooks are copies.** `~/.claude/hooks/*.sh` must match `projects/hooks/*.sh` byte for byte: a change edits both, then compares them.
- **A test session started from a Claude session's shell inherits that session's environment.** Strip a variable (`env -u NAME claude -p ...`) before claiming a fresh session lacks it.
- **A peer's unpushed commit under yours:** pushing `main` publishes it too. Commit path-scoped (`git commit -- <paths>`) and check `git log origin/main..HEAD` before a push.
- **Never freeze or pin a version** (memory `feedback-upgrades-always-approved`).
- **This folder is public.** Write paths as `~/...`, a project folder as `<slug>` and ids as `<id>`; screenshots go in the ignored `playbook/temp/`.
