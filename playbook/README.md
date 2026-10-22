# The Playbook

This folder is the front door to how we work: Briggsy directs and judges the result, and Claude builds. It is written for Briggsy, so "you" below means him. Each page explains a play and points to where it lives. The machinery stays where it is: hooks (small scripts Claude Code runs by itself at set moments, such as session start or just before a tool runs) in [projects/hooks/](../projects/hooks/), and skills (written instructions Claude loads for one kind of job) in [projects/skills/](../projects/skills/).

Sessions for this work start in this folder: open the terminal in `playbook/` and say "resume our setup work". Screenshots for those sessions go in `playbook/temp/`, which never leaves this laptop.

## The plays, in order

For sizable work, steps 1 to 5 are required, in this order: brief, a deepened and checked plan, the build, the whole-file review, and distill. Steps 6 and 7 close the session: squeaky when you call it, and the handoff when you have named a successor. Which tool delivers a step is Claude's call, made job by job, and it can change when a better tool comes along.

### 1. Brief

Before work starts on a topic, Claude finds the few past lessons in the project's `docs/insights/` folder that bear on it, checks each one against today's code, and hands back a short list of landmines.

- **Start it:** "brief me on <topic>", "any gotchas with <topic>?", "what should I know before I start <topic>?", or `/brief <topic>`.
- **Lives in:** [projects/skills/distill-and-brief/brief/](../projects/skills/distill-and-brief/brief/SKILL.md)

### 2. Plan, deepen, then check the plan

Claude writes a structured plan into the project's `docs/plans/` folder, and the planning skill gives it a quick strength check automatically. Deepening is the extra pass on a finished plan: it scores each section, picks the two to five weakest, and sends helper agents (other copies of Claude that Claude starts to do part of a job) to research them.

Then, before any build, the deepened plan gets checked as a whole: skeptical reviewers look for parts that contradict each other, sections a later change left out of date, steps that can't be built, and work nobody asked for. Their fixes go into the plan before any code is written.

- **Start it:** "plan <the work>", then "deepen the plan". For the full, broader research pass instead of the quick, targeted one, add "do not use fast path". Claude runs the check itself once the deepen is done: today with the compound-engineering plugin's `ce-doc-review` skill or a batch of reviewer agents, until our own version is built.
- **Lives in:** the `ce-plan` skill of the compound-engineering plugin (an add-on pack of skills installed into Claude Code), under `~/.claude/plugins/`.

### 3. Build

Claude builds from the plan you approved. Claude also picks how: the `ce-work` build skill, a Workflow script (a script that runs several helper agents side by side), helper agents one after another, or plain hands-on work.

- **Start it:** your go-ahead on the plan. When the answer is clearly yes ([what counts](principles.md#who-decides-what)), Claude checks there is room in its working memory (the context window; see the window check under Always on) and goes without waiting.
- **Lives in:** the `ce-work` skill of the compound-engineering plugin, when that is the tool. Its brief gate is under Always on, below.

### 4. Review (the deep review we call ultramode)

The deep review at the end of a milestone or feature: whole files, specialist reviewers including one whose only job is to break the code, and every finding checked against the real code before anything is fixed.

- **Start it:** Claude runs it on its own at a milestone. You can also ask for an "ultramode code review", "a deep review before we move on", or "review what we just built".
- **Lives in:** [projects/skills/ultramode-code-review/](../projects/skills/ultramode-code-review/SKILL.md). Step by step: [how-to/code-review.md](how-to/code-review.md).

### 5. Distill

Claude writes the hard-won lesson as a short, numbered note in the project's `docs/insights/` folder: the problem, the root cause, the fix, the lesson, and where else it applies. The next brief finds it.

- **Start it:** "distill", "capture this", "write it up", "before we forget", or `/distill`. The review runs it as its last step, and the Stop gate (below) reminds Claude after a build or review skill.
- **Lives in:** [projects/skills/distill-and-brief/distill/](../projects/skills/distill-and-brief/distill/SKILL.md)

### 6. Squeaky (close the session)

The end-of-session checklist, in order: wait for this session's own background jobs and check which other sessions are running, update `TODO.md`, run the code checks, see which changed files are this session's, delete only the temp files this session made or read (and nobody changed since), check that docs it changed don't now contradict other docs, commit only this session's own files, push (unless GitHub already has commits this laptop doesn't), stop leftover background programs, run a final check, and hand off. It says "Squeaky clean." only when that final check proves it.

- **Start it:** "squeaky", "squeaky clean", or "let's get squeaky".
- **Lives in:** [projects/skills/squeaky-clean/](../projects/skills/squeaky-clean/SKILL.md)

### 7. Hand off to the next session

When you have named the session that takes over, squeaky's last step sends it one message saying how the close went and where to start. An idle successor wakes within seconds; a busy one reads the message as soon as its current step finishes.

- **Start it:** tell the closing session the next session's whole name, for example "our setup 7 is watching". Both sessions must run on this laptop (a session anywhere else gets no message) and in the same permission mode (the setting for which actions Claude may take without asking you); if the modes differ, the successor holds the message for your approval, and overnight that approval can run out. The full rules: [how-to/session-chains.md](how-to/session-chains.md).
- **Lives in:** step 10 of [projects/skills/squeaky-clean/SKILL.md](../projects/skills/squeaky-clean/SKILL.md).

## Always on

These fire by themselves. Claude runs the window check itself at checkpoints, and the leak check runs on every push.

- **The manifesto at session start.** Every new session opens with the Elite Engineer Protocol loaded in full: the quality bar, the rules, and the test before any "done". A warning block comes with it only when a hook names a skill or script that isn't there, or a skill link is broken. [elite-engineer.md](../projects/hooks/elite-engineer.md) · [elite-engineer-session-start.sh](../projects/hooks/elite-engineer-session-start.sh) · [check-config-liveness.mjs](../projects/hooks/check-config-liveness.mjs)
- **The WebFetch blocker.** Claude's built-in page fetcher has no time limit and can hang forever, so it is blocked. Claude uses the gemini-grounding search tool (a web search that answers with its sources) or `curl` (a plain command-line page fetcher) with a 15-second limit instead. [block-webfetch.sh](../projects/hooks/block-webfetch.sh)
- **The brief gate.** When Claude starts the `ce-work` build skill, it is held until `/brief` has run. A build done another way (a Workflow script, helper agents) passes no gate, so there the brief is on Claude. [enforce-brief-before-work.sh](../projects/hooks/enforce-brief-before-work.sh)
- **The distill reminder and Stop gate.** After the `ce-work` build skill or a code review skill (`ce-code-review` or `ultramode-code-review`), a flag is set. When Claude next tries to finish its reply, it is stopped once and told to run `/distill`, or to say nothing was worth writing down. A build or review done another way (a Workflow script, helper agents) sets no flag, so there the distill is on Claude. [remind-distill-after-work.sh](../projects/hooks/remind-distill-after-work.sh) · [stop-distill-gate.sh](../projects/hooks/stop-distill-gate.sh)
- **The status line.** One line Claude Code refreshes after each reply: the model, the folder, the git branch, how full the context window is, how much of the 5-hour and weekly Claude usage limits is used, tokens (the units Claude's usage is counted in) this session and all time, how long the session has run, and the effort level (how hard Claude is set to work, from low to max). [The Status Line](../projects/hooks/README.md#the-status-line)
- **The pre-push leak check.** On every push from this repo, git first runs a check over each commit about to go out. It refuses the push if a commit would publish a private detail, for example a path into a Windows user folder, a session id, or a file that isn't plain text. It checks only the hooks folder and the brief and distill, squeaky-clean and ultramode-code-review skill folders. Its report names the commit, file and rule, never the leaked text. [The Pre-push Leak Gate](../projects/hooks/README.md#the-pre-push-leak-gate) · [pre-push-leak.mjs](../projects/hooks/tools/pre-push-leak.mjs)
- **The window check.** A one-line answer to "how full is the context window?" Claude runs it at natural checkpoints without being asked; you can type `/window` or ask "how's the window?". It names the line you've reached (40%, 50% or 60%) and what that means; the details are on the [cheat sheet](cheat-sheet.md#during-the-session). It never runs `/context`, whose big table can't be scrolled on a phone. [projects/skills/window/](../projects/skills/window/SKILL.md)

## In this folder

- [principles.md](principles.md): the rules underneath every play.
- [cheat-sheet.md](cheat-sheet.md): when X happens, say Y.
- [how-to/session-chains.md](how-to/session-chains.md): hand off from one session to a named successor.
- [how-to/throwaway-sessions.md](how-to/throwaway-sessions.md): short-lived background test sessions with `claude --bg`.
- [how-to/code-review.md](how-to/code-review.md): the ultramode code review, step by step.

## Where things live

- **Hooks:** [projects/hooks/](../projects/hooks/) holds the source and the tests; its [README](../projects/hooks/README.md) explains each hook. The live copies run from a version folder under `~/.claude/hooks/`, which the deploy script builds from a commit ([Deploys](../projects/hooks/README.md#deploys)).
- **Skills we built:** [projects/skills/](../projects/skills/) holds brief and distill, squeaky-clean, ultramode-code-review, window and doc-audit. Claude Code loads them from `~/.claude/skills/`.
- **Plugin skills:** `ce-plan` and `ce-work` come from the compound-engineering plugin, installed under `~/.claude/plugins/`.
- **Lessons:** each project keeps its own `docs/insights/` folder. `/distill` writes to it; `/brief` reads from it. For example: [the-back-nine](../projects/the-back-nine/docs/insights/), [burned](../projects/burned/docs/insights/), [hooks](../projects/hooks/docs/insights/).
- **Claude's private memory:** under `~/.claude`, outside this public repo.
