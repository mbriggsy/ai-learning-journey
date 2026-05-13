---
aliases: [commands, skills, slash-commands, commands-and-skills]
tags: [playbook]
---

# Commands and skills inventory

Slash commands and skills available in Claude Code. Say `/command-name` to invoke, or describe what you want and Claude will find the right one.

## Core workflow commands

### `/distill`
**What:** Preserve a hard-won technical insight so future sessions don't rediscover it.
**Triggers:** "capture this", "distill", "write it up", "document this", "before we forget", "worth noting for next time"
**When:** After solving a tricky problem or learning something the hard way.
**Output:** `docs/insights/NNN-<slug>.md` in the project, with the problem, investigation, fix, and lesson.
**Not for:** Feature implementations, bug fixes, general code changes. Only for hard-won *knowledge* that would otherwise evaporate.
**Why:** Future sessions load these via `/brief` before starting work. Pain stops compounding.

### `/brief`
**What:** Surface documented gotchas and lessons from `docs/insights/` before starting work.
**When:** Before touching a subsystem you haven't worked on in a while; before starting a new feature that might intersect with known issues; when Claude says *"I think I've seen this before"* — make Claude verify against insights.
**Output:** Claude reports relevant past insights inline in the conversation.

### `/squeaky-clean`
**What:** End-of-session nuclear cleanup. Runs in a fork (so it doesn't pollute the main session).

**Steps:**
1. Updates `TODO.md` (if not already done)
2. Runs typechecks — must pass
3. Verifies `git status` — only expected files changed
4. Deletes contents of `temp/` folder (keeps the folder)
5. Deletes any other temporary files/folders from the session
6. Commits all changes with a descriptive message
7. Pushes to origin

**Triggers:** *"squeaky clean"*, *"squeaky-clean"*
**When:** End of any meaningful session where you want a ship-ready state.
**Safety:** Does NOT force-push, amend previous commits, or touch other branches.

---

## Verbal triggers (not slash commands)

### "Write the TODO"
**What:** Updates `TODO.md` with the current state of work.
**Triggers:** *"write the TODO"*, *"update the TODO"*

**What gets updated:**
- Current state (what's done, what's working)
- Next steps in priority order
- Unfinished fixes — as **prescriptions** (exact `file:line` changes to make next time, not diagnoses)
- Landmines (things to watch out for)

**What does NOT go in TODO:** Session history, "what we did" logs, diary entries. Git log has the history. TODO is forward-looking.

**Critical:** Claude must NEVER auto-update TODO without your explicit signal. It's opt-in.

**Origin:** `feedback-todo-is-not-a-diary.md` in Claude's memory.

---

## Git commands

### `/commit` (commit-commands plugin)
**What:** Create a git commit with an auto-drafted message following repo style.
**When:** You want to commit the current staged/unstaged changes.
**What Claude does:** Runs parallel `git status`, `git diff`, `git log` to understand the changes, drafts a message, stages and commits.

### `/commit-push-pr` (commit-commands plugin)
**What:** Commit, push, and open a PR in one shot.
**When:** You're ready to push a change for review.
**What Claude does:** Commit workflow + push + `gh pr create` with auto-drafted title and body.

### `/clean_gone` (commit-commands plugin)
**What:** Clean up local git branches marked `[gone]` (deleted on remote but still exist locally), including worktrees.
**When:** After a merge/cleanup where several branches have been deleted remotely.

---

## Review commands

### `/review-pr` (pr-review-toolkit plugin)
**What:** Comprehensive PR review using multiple specialist agents in parallel.
**When:** Before merging a high-stakes PR.
**Agents invoked:**
- pr-test-analyzer — test coverage and thoroughness
- code-reviewer — style, conventions, CLAUDE.md compliance
- comment-analyzer — comment accuracy and long-term maintainability
- code-simplifier — YAGNI violations, over-engineering
- type-design-analyzer — invariants, encapsulation
- silent-failure-hunter — inadequate error handling, fallback traps

### `/ce:ce-review` (compound-engineering plugin)
**What:** Exhaustive code review using multi-agent analysis with ultra-thinking and worktrees.
**When:** For very large or architectural PRs.

---

## Project-specific skills

### `/doc-audit`
**What:** Audit documentation for quality (5 agents, 4 iterations, 100% pass rate on BURNED).
**When:** After generating or modifying a substantial documentation change.
**Checks:** Contradiction detection, formatting, duplication, consistency, fidelity to source.

### `/gauntlet` (BURNED-specific)
**What:** GAN-inspired design improvement loop. Evaluates live UI via Playwright, scores against a 4-criteria rubric, generates one coherent improvement per iteration.
**When:** Visual polish work on BURNED. Say *"run the gauntlet"* or *"design loop"*.

### `/product-specification` — SUPERSEDED by `/ce:ce-brainstorm`
**Status:** Never built. Use `/ce:ce-brainstorm` instead — it covers the same need (collaborative spec authoring through dialogue, with quality bar elicitation).
**Origin:** Design was proven in BURNED 2026-04-10 session and originally planned as a dedicated skill. In practice `/ce:ce-brainstorm` was already filling the role; building a separate skill would have been duct tape on top of duct tape.
**See:** the `/ce:ce-brainstorm` entry below under Compound engineering skills.

---

## Compound engineering skills

### `/ce:ce-brainstorm`
**What:** Explore requirements and approaches through collaborative dialogue before planning.
**When:** Before implementing features, building components, or making major changes.

### `/ce:ce-plan`
**What:** Transform feature descriptions into well-structured project plans following conventions.
**When:** After brainstorm, before execution. For foundational work where agent-orchestrated research and forcing-function sections (System-Wide Impact, alternatives, quality gates) pay rent. See [[workflows#Planning: Codified vs. Native]] for the decision framework.
**Under the hood:** 6-step pipeline — brainstorm ingestion → parallel local research (repo + learnings) → conditional external research → SpecFlow gap-finder → templated plan with mandatory sections → standardized downstream handoff menu. Hard "NEVER CODE" gate at the end.
**Full breakdown:** `projects/burned/docs/workflow/ce-plan-skill-analysis.md`

### `/ce:deepen-plan`
**What:** Enhance a plan with parallel research agents for each section.
**When:** To add depth to an existing plan — each section gets its own research agent running in parallel.

### `/ce:ce-work`
**What:** Execute work plans efficiently while maintaining quality.
**When:** After planning is complete, to run the actual implementation.

### `/ce:ce-compound`
**What:** Document a recently solved problem to compound team knowledge.
**Similar to:** `/distill` but with a compound-engineering flavor.

### `/ce:design:design-iterator`
**What:** Iteratively refines UI design through N screenshot-analyze-improve cycles.
**When:** When design changes aren't coming together after 1-2 attempts.

---

## Plugin development skills (for building new skills)

### `/plugin-dev:create-plugin`
**What:** Guided end-to-end plugin creation workflow.

### `/plugin-dev:skill-development`
**What:** Guidance on creating new skills (structure, progressive disclosure, description for triggering).

### `/plugin-dev:agent-development`
**What:** Guidance on creating sub-agents (frontmatter, when-to-use, tools allowlist).

### `/plugin-dev:hook-development`
**What:** Guidance on creating hooks (PreToolUse, PostToolUse, Stop).

### `/skill-creator`
**What:** Full skill creator with eval harness, variance analysis, and performance benchmarking.
**When:** Building a new high-stakes skill where you want measurable quality.

---

## Document creation skills

### `/document-skills:frontend-design`
**What:** Create distinctive, production-grade frontend interfaces with high design quality.
**When:** Building components, pages, or applications where design quality matters.

### `/document-skills:algorithmic-art`
**What:** Create algorithmic art using p5.js with seeded randomness.

### `/document-skills:canvas-design`
**What:** Create .png and .pdf visual art using design philosophy principles.

### `/document-skills:pdf`, `/document-skills:docx`, `/document-skills:xlsx`, `/document-skills:pptx`
**What:** Read/edit PDF, Word, Excel, and PowerPoint files respectively.

### `/document-skills:webapp-testing`
**What:** Playwright-based testing for local web apps.

---

## How to discover more

Slash commands are provided by plugins installed in Claude Code. When Claude loads a session, it lists available skills in a system reminder. If you want to see what's available, ask Claude *"what skills do you have?"* and Claude will list them.

**Managing skills:** Skills live in `~/.claude/skills/` (global) and `projects/skills/` (source). See `project_skills_next_steps.md` in Claude's memory for the source→global sync protocol.
