# The Playbook

This folder is the front door to how we work: Briggsy directs and judges the result, and Claude builds. It is written for Briggsy, so "you" below means him. Each page explains a play and points to where it lives. The machinery stays where it is: hooks (small scripts Claude Code runs by itself at set moments, such as session start or just before a tool runs) in [projects/hooks/](../projects/hooks/), and skills (written instructions Claude loads for one kind of job) in [projects/skills/](../projects/skills/).

Sessions about how we work start in this folder: open the terminal in `playbook/`. Screenshots for those sessions go in `playbook/temp/`, which never leaves this laptop.

## The plays, in order

For sizable work, steps 1 to 5 are required, in this order: brief, a deepened, checked and read plan, the build, the whole-file review, and distill. Sizable means new logic, or work that will take more than one session ([the full line](principles.md#how-we-work)). Steps 6 and 7 close the session: squeaky when you call it (or, once a successor is named, in words or by its number, when the session calls it itself at the window's wrap line), and the handoff to that successor (step 7). Which tool delivers a step is Claude's call, made job by job, and it can change when a better tool comes along.

What keeps the steps running: each session's close writes the job's next step, by name, into the TODO's START HERE line, where the next session starts.

### 1. Brief

Before work starts on a topic, Claude finds the few past lessons in the project's `docs/insights/` folder that bear on it, checks each one against today's code, corrects any lesson the code has outgrown, and hands back a short list of landmines. For sizable work it runs at the start of the job, before the plan, and again at the start of each build unit's session.

- **Start it:** nothing to say for sizable work: START HERE names it. You can also say "brief me on <topic>", "any gotchas with <topic>?", "what should I know before I start <topic>?", or `/brief <topic>`.
- **Lives in:** [projects/skills/distill-and-brief/brief/](../projects/skills/distill-and-brief/brief/SKILL.md)

### 2. Plan, deepen, check, then read the plan

Today Claude runs the compound-engineering plugin's `ce-plan` skill from start to finish, and that one run does the first three parts:

- **Plan:** a structured plan goes into the project's own `docs/plans/` folder, at a path Claude names.
- **Deepen:** it scores every section. When some are weak, it picks the two to five weakest and sends helper agents (other copies of Claude that Claude starts to do part of a job) to research them, folding their findings in without stopping to ask you. When none are weak enough, it says the plan passed its confidence check.
- **Check:** skeptical reviewers from the plugin's `ce-doc-review` skill, the one who tries to break the plan included, look for parts that contradict each other, sections a later change left out of date, steps that can't be built, and work nobody asked for. Claude checks each finding against the code and puts the fixes into the plan before any code is written.

Then **three blind readers** read the checked plan (your call, 2026-11-12: "Love the three blind mice add-on!"). Each is a helper that never saw the planning and reads the whole plan cold through one lens: the builder (could I build this alone, and where would I take a wrong turn?), the rules (are its rules, facts and cited code right?) and the owner (is it the right size, with your calls put to you with a recommended answer, and is the problem real?). Each opens the code the plan cites and returns the plan's faults with their line numbers, and whether it would build from the plan. Claude checks every fault against the code, fixes in the plan the real ones a builder would hit, lists the minor ones there without folding them in, rewrites a unit as numbered steps when fixes crowd it, and names the fixes in the plan's commit message. On their first run (2026-11-12) the readers took 13 minutes and 0.74M helper tokens on a 753-line plan. They earned their place on the plan-step trial ([insight 029](docs/insights/029-thirteen-times-the-helpers-bought-a-plan-that-lost-the-faults-that-decided-it-were-found-by-a-few-close-reads-of-the-code-and-the-whole-plan.md)), where they found real faults that both plans' full checks had missed.

Only Claude models do the work: the plugin's review pass by another company's model is switched off in the repo's `.compound-engineering/config.yaml`. The plan's commit message says what ran, and the build starts only once the plan's history shows it.

- **Start it:** nothing to say; Claude starts it for sizable work. You can also say "plan <the work>".
- **Step by step:** [how-to/plan-step.md](how-to/plan-step.md): what Claude asks `ce-plan` for every time and why, how the readers are launched, and what happens to their faults.
- **Lives in:** the `ce-plan` and `ce-doc-review` skills of the compound-engineering plugin (an add-on pack of skills installed into Claude Code), under `~/.claude/plugins/`. The plugin updates itself (the TODO's start check names the live version). The readers: [plan-readers.workflow.js](plan-readers.workflow.js) in this folder.

### 3. Build

Claude builds from the plan and picks how: plain hands-on work for pieces that must land one after another, or a Workflow script (a script that runs several helper agents side by side) when the work splits into independent pieces. Both are built into Claude Code and get better with it. Each build unit's session opens with a brief on that unit.

- **Start it:** your go-ahead on the plan. When the answer is clearly yes ([what counts](principles.md#who-decides-what)), Claude checks there is room in its working memory (the context window; see the window check under Always on) and goes without waiting.
- **Lives in:** Claude Code itself. The compound-engineering plugin's `ce-work` build skill isn't used: it moves the work off main onto a new branch without asking, and every session shares one copy of this repo on main ([how-to/plan-step.md](how-to/plan-step.md#never-start-ce-work) keeps `ce-plan` from starting it).

### 4. Review (the deep review we call ultramode)

The deep review at the end of a milestone or feature: whole files, specialist reviewers including one whose only job is to break the code, and every finding checked against the real code before anything is fixed.

- **Start it:** Claude runs it on its own at a milestone. For sizable work, START HERE names it (a whole-file review of everything since the work began, then `/distill`) until it runs. You can also ask for an "ultramode code review", "a deep review before we move on", or "review what we just built".
- **Lives in:** [projects/skills/ultramode-code-review/](../projects/skills/ultramode-code-review/SKILL.md). Step by step: [how-to/code-review.md](how-to/code-review.md).

### 5. Distill

Claude writes the hard-won lesson as a short, numbered note in the project's `docs/insights/` folder: the problem, the root cause, the fix, the lesson, and where else it applies. When an older lesson already covers the same trap, Claude adds the new case to that one instead of writing a near-copy. The next brief finds it.

- **Start it:** "distill", "capture this", "write it up", "before we forget", or `/distill`. For a job done in one session, the review runs it as its last step. A longer job saves its lessons in the TODO's DISTILL CANDIDATES list, and START HERE names the one `/distill` that writes them, right after the job's closing review.
- **Lives in:** [projects/skills/distill-and-brief/distill/](../projects/skills/distill-and-brief/distill/SKILL.md)

### 6. Squeaky (close the session)

The end-of-session checklist. Other sessions share the same files, so every step touches only what this session made. In order:

0. Wait for this session's own background jobs to finish, then see which other sessions are running.
1. Update `TODO.md`: START HERE names the next step and what the next session checks at its start; the landmines that bite that step stay in the TODO, and every other one goes to the project's landmines file.
2. Run the code checks (the typecheck).
3. Sort the changed files into this session's and everyone else's.
4. Delete the temp files this session made. A file it only read (a screenshot you dropped in) goes too, except while another live session is working in the same project: then it stays.
5. Check that docs it changed don't now contradict other docs.
6. Commit only this session's own files.
7. Push, unless GitHub already has commits this laptop doesn't.
8. Stop leftover background programs: dev servers only when no other session is live, and this session's own background commands always.
9. Run a final check. It says "Squeaky clean." only when that check proves it.
10. Hand off to the successor, when one is named ([the next play](#7-hand-off-to-the-next-session)).

- **Start it:** "squeaky", "squeaky clean", or "let's get squeaky".
- **Lives in:** [projects/skills/squeaky-clean/](../projects/skills/squeaky-clean/SKILL.md)

### 7. Hand off to the next session

When you have named the session that takes over, in words or by numbering it next (`playbook-6`, then `playbook-7`: handoff mode), the closing session calls squeaky itself when its window nears the wrap line, never just because a task finished, and squeaky's last step sends the successor one message saying how the close went and where to start. An idle successor wakes within seconds; a busy one reads the message as soon as its current step finishes.

- **Start it:** tell the closing session the next session's whole name, for example "b9-2 is watching"; numbered sessions need no words. Both sessions must run on this laptop (a session anywhere else gets no message) and in the same permission mode (the setting for which actions Claude may take without asking you); if the modes differ, the successor holds the message for your approval, and overnight that approval can run out. The full rules: [how-to/session-chains.md](how-to/session-chains.md).
- **Lives in:** step 10 of [projects/skills/squeaky-clean/SKILL.md](../projects/skills/squeaky-clean/SKILL.md).

## Always on

These fire by themselves.

- **The manifesto at session start.** Every new session opens with the Elite Engineer Protocol loaded in full: the quality bar, the rules, and the test before any "done". A warning block comes with it only when a hook names a skill or script that isn't there, or a skill link is broken. [elite-engineer.md](../projects/hooks/elite-engineer.md) · [elite-engineer-session-start.sh](../projects/hooks/elite-engineer-session-start.sh) · [check-config-liveness.mjs](../projects/hooks/check-config-liveness.mjs)
- **The WebFetch blocker.** Claude's built-in page fetcher has no time limit and can hang forever, so it is blocked. Claude uses the gemini-grounding search tool (a web search that answers with its sources) or `curl` (a plain command-line page fetcher) with a 15-second limit instead. [block-webfetch.sh](../projects/hooks/block-webfetch.sh)
- **The status line.** One line Claude Code refreshes after each reply: the model, the folder, the git branch, how full the context window is, how much of the 5-hour and weekly Claude usage limits is used, tokens (the units Claude's usage is counted in) this session and all time, how long the session has run, and the effort level (how hard Claude is set to work, from low to max). It lives in Claude's private config, at `~/.claude/statusline.py`.
- **The window check.** A one-line answer to "how full is the context window?" Claude runs it at natural checkpoints without being asked; you can type `/window` or ask "how's the window?". It names the line you've reached (40%, 50% or 60%) and what that means; the details are on the [cheat sheet](cheat-sheet.md#during-the-session). It never runs `/context`, whose big table can't be scrolled on a phone. [projects/skills/window/](../projects/skills/window/SKILL.md)
- **The context watcher.** After each step and each message you send, it checks how full the window will be on the next step. The first time a session passes 40%, 50% or 60% (then 70, 80 and 90), it puts the `/window` line in front of Claude and on your screen, so the lines no longer depend on Claude remembering to check. [How it works](../projects/skills/window/README.md#the-watcher-lines-announce-themselves)

## In this folder

- [principles.md](principles.md): the rules underneath every play.
- [cheat-sheet.md](cheat-sheet.md): when X happens, say Y.
- [how-to/session-chains.md](how-to/session-chains.md): hand off from one session to a named successor.
- [how-to/plan-step.md](how-to/plan-step.md): the plan step, step by step.
- [how-to/code-review.md](how-to/code-review.md): the ultramode code review, step by step.
- [plan-readers.workflow.js](plan-readers.workflow.js): the three blind readers that finish the plan step (step 2).
- [TODO.md](TODO.md): the queue for work on how we work. A session starts at its START HERE line.
- [docs/landmines.md](docs/landmines.md): the known traps in the tools and setup this work runs on, by area.
- [docs/insights/](docs/insights/): the lessons that work has paid for, one numbered note each. Sessions start in this folder, so `/brief` finds them here and `/distill` adds to them here.

## Where things live

- **Hooks:** [projects/hooks/](../projects/hooks/) holds the source; its [README](../projects/hooks/README.md) explains each hook. The live copies run from `~/.claude/hooks/` (`block-webfetch.sh`, `check-config-liveness.mjs` and `elite-engineer-session-start.sh`; the manifesto from `~/.claude/manifesto/`) and match the source byte for byte: a change edits both, then compares them.
- **Skills we built:** [projects/skills/](../projects/skills/) holds brief and distill, squeaky-clean, ultramode-code-review, window and doc-audit. Claude Code loads them from `~/.claude/skills/`.
- **Plugin skills:** `ce-plan` and `ce-doc-review` come from the compound-engineering plugin, installed under `~/.claude/plugins/`. It updates itself; its settings for this repo are in [.compound-engineering/config.yaml](../.compound-engineering/config.yaml).
- **Lessons:** each project keeps its own `docs/insights/` folder, with the lessons that project's work discovered. `/distill` writes to it; `/brief` reads from it. For example: [the-back-nine](../projects/the-back-nine/docs/insights/), [burned](../projects/burned/docs/insights/), and [this folder's](docs/insights/), about how we work. Each one names the files it is about.
- **Claude's private memory:** under `~/.claude`, outside this public repo.
