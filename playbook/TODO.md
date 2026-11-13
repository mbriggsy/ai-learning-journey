# How We Work: TODO

The queue for work on how we work. Sessions for it start in this folder.

**The direction (Briggsy, 2026-10-27):** "we still haven't got to the dev process -the actually thing I wanted us to focus on -ce-plan, ce-plan:deepen, ce-docreview, ce-work, ultramode, brief, distill - or functional equivalents that allow Claude to upgrade and not be confined." Every item is judged by one test: does this ever happen to us, or does it change his day? Nothing gets frozen: "We want updates."

## ▶ START HERE

**Next: nothing is queued here; Briggsy names the next job.** The doc audit's fixes have all landed. Back Nine work runs in Back Nine sessions, from that project's TODO (Act 5 after build 2; the early-withdrawal plan's reader faults before its U1).

**Check at start:** (1) CI: none open. The doc audit's fixes (`ceba647e`) passed "Verify the brief bench" (run `43354010439`) and "Verify The Back Nine" (run `43354010470`, for its `TODO.md`), and every push of 2026-11-12 before it is green. Playbook commits outside `docs/insights/` touch no CI path. (2) The weekly meter (`seven_day` in `~/.claude/statusline-meters.json`): 52% at 2026-11-13 02:23Z. (3) CE updates itself (3.38.1): `grep -A4 '"compound-engineering@every-marketplace"' ~/.claude/plugins/installed_plugins.json` names the live version. (4) `ListAgents` and `/window`. (5) Every spawn is Opus with its effort set.

## Current state

- **The flow and the plan step:** the five plays are in [README.md](README.md#the-plays-in-order) (the dev-process study plus Briggsy's yes, 2026-10-31), "sizable" is in [principles.md](principles.md#how-we-work), and the close rule is squeaky step 1. The plan step is ce-plan (Briggsy, 2026-11-12: "Ce-plan as the plan step - cool") ending with the three blind readers ("Love the three blind mice add-on!"): README step 2 and [how-to/plan-step.md](how-to/plan-step.md). On their first run, against the trial readers' list for the same plan, the readers found build 2, the six rulings, R4, U3's witness step and half of U5's shape-test claim again, and missed U6's flat Roth basis and `lifetimeTaxPaidReal`.
- **`ultramode-plan` is archived** at `projects/archive/skills/ultramode-plan/` (Briggsy: "This one warrants the archive, so our failure is out there for the world to see"), uninstalled and out of CI. The trial's record is in its `trial/` folder; its lessons are insight 029 and its extensions.
- **No cheaper verifier models** (Briggsy, 2026-11-12: "forget my sonnet comment").
- **CE facts README lacks:** since 3.37.1, ce-code-review's `julik-frontend-races-reviewer.md` is `frontend-races-reviewer.md` and `swift-ios-reviewer.md` is gone (`ultramode-code-review` names the new file since `bfc7a72b`). `~/.claude/CLAUDE.md`'s Claude-models-only line is the only off switch for CE's bake-off, and no other vendor's tool is installed.
- **Lessons** live in [docs/insights/](docs/insights/).

## Landmines

Every standing landmine is in [docs/landmines.md](docs/landmines.md), by area. None bites a queued step, since nothing is queued: read the area a new job works in before starting it.

## DISTILL CANDIDATES

- **"It's in git" was believed, not checked, right before deleting the source.** playbook-7 copied the trial's record into the archive, committed with `git add -- <folder>`, said "everything in it is in git", and deleted the trial folder on Briggsy's words. The repo's root `.gitignore` ignores `*.txt`, so `git add` had silently skipped `key.txt` and `ce-plan-receipt.txt`; the doc audit's link reviewer found them on disk but untracked, and `9fb9d829` force-added them. Before deleting a source on the strength of a copy, compare `git ls-files <copy>` with the files on disk (or `git check-ignore -v` each one). (playbook-7, 2026-11-13)
- **A hand-off written into another project's TODO is a plan, and drew a plan's faults.** playbook-7 wrote the Back Nine's Act 5 and early-withdrawal steps (`54a6d02f`), each fact read from its source first. Three Opus xhigh skeptics (sources, fit with the rest of that TODO, a cold builder; `wf_0ff94a8b-6b5`, 0.67M helper tokens) still found 36 problems: 15 open findings counted as 13, "U12" that every other line of that TODO meant as another build's unit, an order that settled findings after units they change, the readers' "checked and read" gate left out, a gate's reach overstated, a file parked in `temp/` (which squeaky's step 4 deletes once read), and a memory line saying "no build go" that would have stopped the next session. The rewrite's two-skeptic pass (`wf_cd8985ea-86b`, 0.50M) found 17 more, and its two "wrong" ones were the rewrite's own new claims (a `receipt:` line that plan never had; two entries where there are three). A record meant to outlive the session goes in the project's records folder outside the repo (the Back Nine's `~/.claude/projects/<b9 slug>/b9-*`), never `temp/`. (playbook-7, 2026-11-12)
- **The Workflow completion notice shows only the start of a long result** (about 5,000 characters of the readers' 52,000), so the readers' script now returns a one-line index of every fault ahead of the full answers; a cached replay of the same run (`resumeFromRunId`, 0 tokens, 22 ms) proved the new shape. Any Workflow whose result runs long can lead with its index the same way. (playbook-7)
