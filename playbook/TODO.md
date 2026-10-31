# How We Work: TODO

The queue for work on how we work. Sessions for it start in this folder.

**The direction (Briggsy, 2026-10-27):** "we still haven't got to the dev process -the actually thing I wanted us to focus on -ce-plan, ce-plan:deepen, ce-docreview, ce-work, ultramode, brief, distill - or functional equivalents that allow Claude to upgrade and not be confined." Every item is judged by one test: does this ever happen to us, or does it change his day? Nothing gets frozen: "We want updates."

## ▶ START HERE

1. **The first real plan on CE 3.34.0 is owed a check.** None has run yet: no plan is committed in any project since the 10:49 update. The first will most likely be The Back Nine's next sizable build, after b9-1's current fix (a tap that can miss on tall screens) and its ranking pass. That session never reads this file, so the check runs from here once its plan lands. Every item is in git or in that session's transcript (`~/.claude/projects/<slug>/<id>.jsonl`). The test is README step 2 as written:
   - the plan landed at the path named inside the project's `docs/plans/` (`ls` it);
   - no scope question or menu reached Briggsy;
   - every helper ran on Opus, and the reviewers hunting contradictions and breakage got the whole plan;
   - if the check called in any of its adversarial, product or security reviewers, its result reads "cross-model peer not run: disabled by checkout config"; if it called in none of them, the result says nothing about it, and that is a pass too;
   - the plan's commit message says what ran ("planned, deepened and checked", or "planned, confidence check passed, checked").
   A miss is a fix to make then, in README step 2 or the repo's `.compound-engineering/config.yaml`.
2. **Read The Back Nine's START HERE once b9-1's close lands, before its next build starts.** b9-1 started at 09:46 local, before the flow rule landed (10:56), and its job line was written at 10:08, so it built its fix with `/brief` and a review but no plan step. Briggsy waived the plan step for that one fix ("b9-1 can finish," 2026-10-31); the waiver covers nothing after it. Its close is the first Back Nine close under squeaky step 1: the next sizable job's line must name its steps by their bar (`/brief <topic>`; the plan, deepened and checked as a whole; the build; the whole-file review; `/distill`). If it names the build directly, fix that line in place.
3. **CE's auto-update: the install half.** The refresh is proven: every-marketplace's `lastUpdated` in `~/.claude/plugins/known_marketplaces.json` moved on its own, to `2026-10-31T16:03:11Z` and again to `16:08:42Z`, with two fresh sessions up (the last manual update ran at 14:48:17Z; no session's transcript shows one after it, by command or by `/plugin`). Nothing new was there to install: the installed CE commit (`3449230`) is upstream's head. The first time Every ships past it, the CE entry's `gitCommitSha` in `~/.claude/plugins/installed_plugins.json` should change within a session, with no manual update. If it doesn't, the only other switch is `/plugin` > Marketplaces > Enable auto-update, which needs his hands: flag it as a blocker.
4. **Nothing else is queued.** Ask Briggsy what's next.

## Current state

- **The dev process is settled (2026-10-31, the dev-process study plus his yes).** The flow's five steps and today's tools are in [README.md](README.md#the-plays-in-order): brief and distill are ours; ce-plan runs to its end (the plan, a deepen that applies its own findings, then `ce-doc-review`); the build is native (hands-on, or a Workflow when the work splits); the review is ultramode. "Sizable" and what keeps the flow running (START HERE names the next step at every close) are in [principles.md](principles.md#how-we-work); the close rule is squeaky step 1.
- **Hook scripts: two live** (the session-start manifesto and the WebFetch blocker), plus the inline Notification pop-up in `~/.claude/settings.json`, which has no script. The brief gate, the distill reminder and the Stop gate were retired on 10-31: scripts deleted from `projects/hooks/` and `~/.claude/hooks/`, settings entries removed, the ai-journey-stats hooks card set to 2 (its other numbers stay as of 2026-06-14 until a full refresh).
- **CE is at 3.34.0** with auto-update on for its marketplace. Its other-vendor review pass is off in the repo-root `.compound-engineering/config.yaml`, and `~/.claude/CLAUDE.md` says Claude models only. That line is the only off switch for CE's bake-off, where helpers each draft an approach and, unless told otherwise, look for other companies' models to do it. No other vendor's tool is installed.
- **The our-setup program (2026-10-19 to 10-27) is flushed**, every leftover included (the two numbered hook folders went on 10-31).
- **Kept from the program:** ultracode on by default, the status bar's live effort level, the `/window` fix after compaction, and squeaky's hand-off to a named successor (found with `ListAgents`; the `<name> [ref]` send for a name clash is untested end to end).
- **Lessons** live in [docs/insights/](docs/insights/): 002, 003, 005, 008 and 009.

## Landmines

- **Never pick ce-plan's "Start ce-work", and never ask ce-plan to "build it".** CE 3.34.0 fires the next action itself when the request already authorizes it (`plan-handoff.md` 5.4), and its ce-work then moves the work off main onto a new branch without asking, in the one checkout every session shares.
- **Name every plan's path.** CE 3.34.0 builds its plans folder from the git top level, which here is the whole monorepo.
- **Never say "deepen the plan" about a finished plan.** It switches CE to asking Briggsy to accept or reject each helper's findings. To re-deepen, run ce-plan on the plan's path and say "judge and apply the findings yourself" (memory `reference-ce-plan-deepen-fast-path`). That recipe is untested: expect ce-plan to ask whether to update the plan in place, answer it yourself, and check the run really scored the sections.
- **A Workflow that adds extra helpers to a deepen or a check** finds CE's prompt files through `~/.claude/plugins/installed_plugins.json`, never a version-numbered path.
- **Sessions started before 2026-10-31 10:49 run the old setup until they restart:** CE 3.14.3, plus the `~/.claude/CLAUDE.md` and memory index they loaded at start, which their helper agents get too. Start a plan or review step in a fresh session, and restart old sessions at a natural stop (never a busy one mid-work).
- **Removing a hook that refuses calls when its script is missing** (`"onFailure": "block"`): take its `settings.json` entry out first, check a call in this session still runs, then delete the script. A session whose file watcher missed the edit refuses every matching call until it restarts.
- **Auto mode (Claude Code's permission setting) blocks removing a safety check, an irreversible delete, and writes to Claude Code's own config, without Briggsy's own words.** Name every path in the sentence you draft for him: a delete command that bundles a path he didn't name gets refused.
- **Never restore `~/.claude/settings.json` whole from an old commit.** The 10-19 snapshot (config repo `22015c5`) has 15 garbled dashes and no ultracode. Edit it key by key.
- **The hooks are copies.** `~/.claude/hooks/*.sh` must match `projects/hooks/*.sh` byte for byte: a change edits both, then compares them.
- **A test session started from a Claude session's shell inherits that session's environment.** Strip a variable (`env -u NAME claude -p ...`) before claiming a fresh session lacks it.
- **A peer's unpushed commit under yours:** pushing `main` publishes it too. Commit path-scoped (`git commit -- <paths>`) and check `git log origin/main..HEAD` before a push.
- **Never freeze or pin a version** (memory `feedback-upgrades-always-approved`).
- **This folder is public.** Write paths as `~/...`, a project folder as `<slug>` and ids as `<id>`; screenshots go in the ignored `playbook/temp/`.
