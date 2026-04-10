# Session hygiene

Session-level protocols that prevent pain. Follow these and your sessions end cleanly.

## Screenshots go in `temp/`

When sharing a screenshot, drop it in the **project's `temp/` folder** (e.g., `projects/burned/temp/`). Then tell Claude *"look at this"* or *"check the screenshot"*. Claude reads the most recent image file from `temp/` automatically.

**Don't:** Paste a path or ask Claude to navigate to `/Users/.../Downloads/screenshot.png`. The temp/ convention exists so you don't have to.

**Claude's rule:** When Briggsy mentions a screenshot, read the most recent image from the project's `temp/` folder immediately. Never ask him to paste a path.

---

## Start a new terminal at ~70% context

When Claude Code's context window is ~70% full, start a new terminal. Don't wait until 90%+ — by then Claude is juggling truncation and dropping context.

**How to know current usage:** Claude should warn you. If Claude doesn't, ask: *"what's my context usage?"*

**Context window note:** Claude Opus 4.6 has a **1 million token context window**. 70% of that is a LOT — long sessions are fine. But when approaching the limit, transition gracefully.

**Transition protocol:**
1. Say *"write the TODO"* — updates `TODO.md` with current state
2. Optionally *"squeaky clean"* — commits everything
3. Close the terminal
4. Open a new terminal in the same directory
5. Claude loads TODO + memory, picks up where you left off

---

## Claude's memory location

`C:/Users/brigg/.claude/projects/C--Users-brigg-ai-learning-journey/memory/`

That's where Claude stores everything it remembers about you. If you're curious what Claude is "thinking" about a project or a preference, browse that folder. It's human-readable markdown.

**You can edit memory files directly.** If Claude has a stale or wrong entry, fix it. Claude will honor the updated content next session.

**But prefer asking Claude to update memory.** That way Claude also updates the `MEMORY.md` index and keeps the frontmatter consistent.

**Types of memory entries:**
- **user** — who you are, your role, your preferences
- **feedback** — specific corrections you've given Claude
- **project** — ongoing work, goals, state
- **reference** — pointers to external systems

---

## "Write the TODO" is explicit

Claude won't update `TODO.md` unless you say so. That's intentional — TODO is opt-in, not auto-managed.

**How to trigger:** *"write the TODO"* or *"update the TODO"*

**What gets updated:**
- Current state (what's done, what's working)
- Next steps in priority order
- Unfinished fixes (as **prescriptions** — exact file:line changes to make next time, not diagnoses)
- Landmines (things to watch out for)

**What does NOT go in TODO:** Session history, "what we did" logs, diary entries. Git log has the history. TODO is forward-looking.

**Origin:** `feedback-todo-is-not-a-diary.md` in Claude's memory.

---

## "Squeaky clean" is the nuclear cleanup

When you say *"squeaky clean"*, Claude runs the `/squeaky-clean` slash-command skill in a fork. It:

1. Updates `TODO.md` (if not already done)
2. Runs typechecks — must pass
3. Verifies `git status` — only expected files changed
4. Deletes contents of `temp/` folder (keeps the folder)
5. Deletes any other temporary files/folders from the session
6. Commits all changes with a descriptive message
7. Pushes to origin

**When to use:** End of any meaningful session where you want a clean ship-ready state.

**What it doesn't do:** Force-push, amend previous commits, touch other branches. Safe by default.

---

## Distill: capture hard-won insights

When you solve a tricky problem or learn something the hard way, say *"capture this"* or *"distill this"*. Claude runs the `/distill` skill, which writes `docs/insights/NNN-<slug>.md` in the project with the problem, investigation, fix, and lesson.

**Why:** Future sessions load these insights via `/brief` before starting work. You won't rediscover the same pain twice.

**Not for:** Feature implementations, bug fixes, general code changes. Only for hard-won *knowledge* that would be lost if not captured.

---

## Brief: load past insights before work

At the start of meaningful work on a subsystem, say *"brief me on X"* or run `/brief`. Claude loads relevant insights from `docs/insights/` so you start informed about past gotchas.

**When to use:**
- Before touching a subsystem you haven't worked on in a while
- Before starting a new feature that might intersect with known issues
- When Claude mentions *"I think I've seen this before"* — make Claude verify in insights

---

## Hooks exist but don't rely on them

Hooks are small scripts that run on specific Claude events (PreToolUse, PostToolUse, Stop, etc.). Current hooks:
- **PreToolUse WebFetch hook** — blocks WebFetch calls and redirects to `gemini-grounding` or `curl`
- **PostToolUse distill marker** — drops a marker when Claude finishes work
- **Stop hook** — enforces `/distill` when work is done

Hooks CAN fail. Don't rely on them for safety. Claude should still avoid WebFetch at the prompt level even though a hook exists to catch it.

---

## Claude Code has NO project isolation between memory files

All Claude Code memory in `C:/Users/brigg/.claude/projects/C--Users-brigg-ai-learning-journey/memory/` is shared across every project in `ai-learning-journey`. BURNED, UMB, Racer — all the same memory pool.

**What this means:** A feedback note captured in a BURNED session applies to all future sessions, in all projects, until removed. This is intentional — cross-project lessons should generalize.

**If you want project-specific knowledge**, use:
- `projects/<name>/docs/insights/` for project-specific lessons
- `projects/<name>/CLAUDE.md` for project-specific conventions
- `projects/<name>/TODO.md` for project-specific task tracking
