# Cheat sheet

When something happens, here is what to say or do; phrases in italics are the words to say. The how-to pages hold the full steps; the [front door](README.md) lists every play in order.

## Starting

- **Just saying hi.** A greeting is only a greeting. Claude talks with you and does not go hunting for work.
- **Ready to work.** Say *"what's next"*, name the task, or say to dig into the queue (the ranked list in `TODO.md`). Claude reads `TODO.md`, checks every item against the actual code, crosses off what is already done, and shows you the plan. If the top item is an obvious yes, Claude checks there is room (`/window`) and starts right away. ([What counts as an obvious yes](principles.md#who-decides-what).) Otherwise it waits for your go.
- **About to work on something you haven't touched in a while.** Say *"brief me on X"*, *"any gotchas with X"* or *"what do we know about X"*. Claude searches the project's `docs/insights/` folder for past lessons about X, checks each one against today's code, and gives you the few that matter. Lives in [brief](../projects/skills/distill-and-brief/brief/SKILL.md).
- **Starting something big.** Nothing to say up front: big work has to run the first five plays on the [front door](README.md#the-plays-in-order), in order, from the brief to the written-up lesson. Only part of that is checked automatically, so if a big job skips a step (no brief, no plan, no review, no lesson written), say so.

## During the session

- **Wondering how much room is left.** Type `/window`, or ask *"how's the window?"*, *"how much context left?"* or *"are we running low?"*. You get one line saying how full the session's working memory (the context window) is. Claude also runs it on its own at checkpoints. The line names where you are:
  - **40%:** Claude says so and steers the work toward a clean stopping point.
  - **50%:** no new big batch of helper agents that can't finish in the room left.
  - **60%:** Claude wraps up at a clean stopping point, writes the TODO and tells you to open a fresh terminal. Open one in the same folder and say *"what's next"*.

  The three numbers live in [window.mjs](../projects/skills/window/window.mjs). To see what is using the room, type `/context` yourself: it prints a big table that won't scroll on the phone, so Claude never runs it for you.
- **Sharing a screenshot.** Save it in the project's `temp/` folder, then mention it or say *"look at this"*. Claude reads the newest image there. You never need to paste a file path. At the end of the session, the cleanup routine (squeaky, under Ending) deletes only the `temp/` files this session made or read, if nobody changed them since; everything else stays.
- **Claude wants your eye on something.** It saves the image in `temp/` and names the file and the folder in its message.
- **An ask from Claude makes no sense.** Say *"I don't understand the ask"*. That is Claude's miss, and it rewrites the ask shorter and plainer.
- **Claude hands you a bare "A or B?"** Ask *"do you have a recommendation?"*. Claude owes you one pick with its reasons, in plain words, and then acts on it.
- **Solved something hard that would be easy to forget.** Say *"capture this"*, *"distill"*, *"write it up"* or *"before we forget"*. Claude writes a short numbered lesson in the project's `docs/insights/` folder, where future briefs find it. Lives in [distill](../projects/skills/distill-and-brief/distill/SKILL.md).
- **A decision or preference worth keeping.** Say *"make a note"* or *"note that"*. Claude saves it to its memory right away, with no questions.
- **Claude promises something for a later session.** Say *"write that down"*. It goes into the TODO or Claude's memory before the session ends.
- **A piece of work is done and you want it checked properly.** Ask for an *"ultramode code review"*, or a *"deep"*, *"thorough"* or *"real"* review, a review *"before we move on"*, or *"review what we just built"*. Claude also runs it on its own when a milestone ends. What it does, what you get back, and how it differs from `/code-review`: [code review](how-to/code-review.md).

## When something is off

- **Claude is wrong.** Push back and give your reason. Claude changes its mind on evidence, not because you pushed. If it flips with no new evidence, push again.
- **You want a claim checked.** Say *"double check"*, *"verify"* or *"are you sure"*. That means Claude opens the real source (the file, the docs, the command's output) and reports what it says, even when that contradicts what it just told you. If it can't find a source, it says so. Saying the same answer again, louder, is not a check.
- **Claude drops a name or reference you don't know.** Ask *"what's that?"*. If Claude brought it in and you don't sign off on it, it comes out before it spreads into other files.
- **A sentence needs a PhD to read.** Say so. Everything Claude tells or asks you should make sense on one read; jargon is Claude's miss.
- **Claude says to refresh the page.** Push back. Refreshing is never the fix; Claude finds and fixes the real failure.
- **Claude is doing more than you asked.** Rein it in: name exactly what to change and what to leave alone. A precise limit works better than a vague one. When a job turns out bigger than it looked, Claude tells you before it starts.
- **Claude is about to do something risky.** Press `Esc` to stop it, then say what you want instead. Before risky work, start your message with `/plan`, or press `Shift+Tab` until you see "plan" (each press changes how much Claude may do without asking you). In plan mode Claude lays out its plan and waits for your okay before it edits any files.
- **Wondering why Claude did or didn't ask first.** When Claude is sure and the step can be undone, it just does it, commits and pushes included. [Principles](principles.md) lists what it always asks about first.

## Ending

- **Done for now.** Say *"squeaky"*, *"squeaky clean"* or *"let's get squeaky"*. Claude runs the end-of-session checklist: it updates the TODO, commits only this session's own files, pushes (it skips the push when GitHub already has newer commits), cleans up after itself, and hands off to the next session if you named one. It says "Squeaky clean." only after every step is checked. The full checklist is on the [front door](README.md); it lives in [squeaky-clean](../projects/skills/squeaky-clean/SKILL.md).
- **Just want the TODO current.** Say *"write the TODO"* or *"update the TODO"*. Claude brings `TODO.md` up to date; what goes in it and what stays out: [principles](principles.md#keeping-docs-honest).
- **Walking away for a while.** Run squeaky, or at least write the TODO, before you go. About 55 minutes after Claude's last reply, an idle session gets compacted: its detail is boiled down to a summary. Nothing is wiped and you can keep going afterwards, but the end-of-session notes are best written while the detail is fresh. Right after a compaction, `/window` says "compacted" instead of a number until Claude has taken one more step.
- **Handing off to the next session.** Both sessions need a name first: type `/rename <name>` in each. Then, any time before the close, tell the closing session the next one's whole name, for example *"b9-2 is watching"*. The rules, and what can go wrong: [session chains](how-to/session-chains.md).
