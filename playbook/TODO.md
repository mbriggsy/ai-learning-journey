# How We Work: TODO

The queue for work on how we work. Sessions for it start in this folder.

**The direction (Briggsy, 2026-10-27):** "we still haven't got to the dev process -the actually thing I wanted us to focus on -ce-plan, ce-plan:deepen, ce-docreview, ce-work, ultramode, brief, distill - or functional equivalents that allow Claude to upgrade and not be confined." Every item is judged by one test: does this ever happen to us, or does it change his day? Nothing gets frozen: "We want updates."

## ▶ START HERE

1. **Two checks owed on the 2026-10-31 dev-process changes, each the first time its moment comes:**
   - **CE's auto-update took.** In any session started after 10-31, read `~/.claude/plugins/known_marketplaces.json`: every-marketplace's `lastUpdated` should be past `2026-10-31T14:48` with no manual update run. If it hasn't moved, the `autoUpdate` key in `~/.claude/settings.json` doesn't take for a marketplace that was already registered. The only other switch is `/plugin` > Marketplaces > Enable auto-update, which needs his hands, so flag it as a blocker.
   - **The first real plan on CE 3.34.0** (in any project) is the plan-chain test:
     - name its path inside the project's `docs/plans/`, then `ls` where it landed;
     - its `ce-doc-review` result should report the other-vendor pass as "disabled by checkout config";
     - no menu or question should reach Briggsy, given plan-only wording ("stop after the check");
     - the plan's commit message carries "planned, deepened and checked".
     A miss is a fix to make then, in the README's step 2 or the repo's `.compound-engineering/config.yaml`.
2. **Nothing else is queued.** Ask Briggsy what's next.

## Current state

- **The dev process is settled (2026-10-31, the dev-process study plus his yes).** The flow's five steps and today's tools are in [README.md](README.md#the-plays-in-order): brief and distill are ours; ce-plan runs to its end (plan, auto-mode deepen, `ce-doc-review`); the build is native (hands-on, or a Workflow when the work splits); the review is ultramode. "Sizable" and what keeps the flow running (START HERE names the next step at every close) are in [principles.md](principles.md#how-we-work); the close rule is squeaky step 1.
- **Hooks: two live** (the session-start manifesto and the WebFetch blocker). The brief gate, the distill reminder and the Stop gate were retired on 10-31: scripts deleted from `projects/hooks/` and `~/.claude/hooks/`, settings entries removed, the ai-journey-stats hooks card set to 2 (its other numbers stay as of 2026-06-14 until a full refresh).
- **CE is at 3.34.0** with auto-update on for its marketplace. Its other-vendor review pass is off in the repo-root `.compound-engineering/config.yaml`, and `~/.claude/CLAUDE.md` says Claude models only (the bake-off's only off switch). No other vendor's tool is installed.
- **The our-setup program (2026-10-19 to 10-27) is flushed**, every leftover included (the two numbered hook folders went on 10-31).
- **Kept from the program:** ultracode on by default, the status bar's live effort level, the `/window` fix after compaction, and squeaky's hand-off to a named successor (found with `ListAgents`; the `<name> [ref]` send for a name clash is untested end to end).
- **Lessons** live in [docs/insights/](docs/insights/): 002, 003, 005 and 008.

## Landmines

- **Never pick ce-plan's "Start ce-work", and never ask ce-plan to "build it".** CE 3.34.0 fires the next action itself when the request already authorizes it (`plan-handoff.md` 5.4), and its ce-work then moves the work off main onto a new branch without asking, in the one checkout every session shares.
- **Name every plan's path.** CE 3.34.0 builds its plans folder from the git top level, which here is the whole monorepo.
- **Never say "deepen the plan" about a finished plan.** It routes to interactive mode, which asks Briggsy to accept or reject each helper's findings. Re-deepen with ce-plan on the plan's path and "auto mode: judge and apply the findings yourself" (memory `reference-ce-plan-deepen-fast-path`).
- **A Workflow that widens a deepen or a check** finds CE's prompt files through `~/.claude/plugins/installed_plugins.json`, never a version-numbered path. A running session keeps the CE version it loaded until it restarts.
- **Removing a fail-closed hook:** take its `settings.json` entry out first, check a call in this session still runs, then delete the script. A session whose file watcher missed the edit refuses every matching call until it restarts.
- **Auto mode blocks removing a safety check, an irreversible delete, and writes to Claude Code's own config, without Briggsy's own words.** Name every path in the sentence you draft for him: a delete command that bundles a path he didn't name gets refused.
- **Never restore `~/.claude/settings.json` whole from an old commit.** The 10-19 snapshot (config repo `22015c5`) has 15 garbled dashes and no ultracode. Edit it key by key.
- **The hooks are copies.** `~/.claude/hooks/*.sh` must match `projects/hooks/*.sh` byte for byte: a change edits both, then compares them.
- **A test session started from a Claude session's shell inherits that session's environment.** Strip a variable (`env -u NAME claude -p ...`) before claiming a fresh session lacks it.
- **A peer's unpushed commit under yours:** pushing `main` publishes it too. Commit path-scoped (`git commit -- <paths>`) and check `git log origin/main..HEAD` before a push.
- **Never freeze or pin a version** (memory `feedback-upgrades-always-approved`).
- **This folder is public.** Write paths as `~/...`, a project folder as `<slug>` and ids as `<id>`; screenshots go in the ignored `playbook/temp/`.
