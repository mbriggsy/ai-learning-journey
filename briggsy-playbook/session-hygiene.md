---
aliases: [hygiene, session-hygiene, session]
tags: [playbook]
---

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

**Context window note:** The current Opus model has a **1 million token context window**. 70% of that is a LOT — long sessions are fine. But when approaching the limit, transition gracefully.

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

## End-of-session protocols

These are the protocols you reach for when wrapping up. Full mechanics live in [[commands-and-skills]] — this section covers when to use them in your session flow.

- **Update the TODO** before stepping away or starting a new terminal. Say *"write the TODO"*. Forward-looking only — no session history, no diary. See [[commands-and-skills#"Write the TODO"]].
- **Squeaky clean** when you want a ship-ready state. Say *"squeaky clean"*. Updates TODO + typechecks + temp cleanup + commit + push, all in a fork. See [[commands-and-skills#`/squeaky-clean`]].
- **Distill** when you've solved something tricky and the lesson would otherwise evaporate. Say *"capture this"* or *"distill this"*. Hard-won knowledge only — not bug fixes or feature work. See [[commands-and-skills#`/distill`]].

---

## Start-of-work protocols

- **Brief** before touching a subsystem you haven't worked on in a while, or when Claude says *"I think I've seen this before"* (make Claude verify against insights). Say *"brief me on X"*. See [[commands-and-skills#`/brief`]].

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
- `projects/<name>/CLAUDE.md` for project-specific conv