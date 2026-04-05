# v03 BUILD — TODO (UPDATED)

---

## STATUS: v03 BUILD KILLED — PIVOTING TO ORCHESTRATOR PROJECT

v03 Phase 1 executed without deepening due to fundamental flaw in gsd-autopilot's
execution model. Build killed. Money burned on unreviewed execution.

**New project: Build `briggsy-build` — an external orchestrator that actually works.**

v03 (or v04, whatever it becomes) resumes AFTER the orchestrator is built and
tested on a toy project.

---

## Root Cause Analysis

gsd-autopilot was a slash command (markdown loaded into Claude's context window).
It CANNOT spawn fresh context windows or chain commands programmatically.
The "walk away" promise was architecturally impossible.

When advised to use GSD's `--auto` flag as a workaround, it skipped deepening —
the single most valuable quality step in the entire methodology (15/15 bug catches in v02).

**Lesson: You cannot orchestrate from inside the thing you're orchestrating.**

---

## What's Next

1. Start new project: `briggsy-build` orchestrator
2. Build as Node.js CLI that calls `claude` as subprocess
3. Every step = fresh context window (guaranteed by process spawning)
4. Deepening is mandatory and code-enforced (not skippable)
5. Test on toy project FIRST
6. Once proven, use it to build v03/v04

See handover files:
- `HANDOVER-orchestrator-project.md` — full context and story
- `ORCHESTRATOR-ARCHITECTURE-SPEC.md` — technical blueprint
- `LESSONS-LEARNED.md` — every failure and design principle

---

*Last updated: March 6, 2026*
