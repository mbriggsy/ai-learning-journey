# Workflows that work

Patterns proven to produce great results. Each entry: what it is, when to use it, how to run it, and why it matters.

## Quality Bar First

**What:** Before any project work, establish the quality bar as a concrete, testable line.

**When:** Start of any new project, phase, or major visual deliverable.

**How:** Ask Claude to elicit the quality bar with 4 sharp questions:
1. **Comparison product** — *"If a first-time player played this for the first time, what existing product should they assume it's a clone of?"* (Jackbox? A specific studio's app? Something real, not generic.)
2. **Visual touchstone** — *"What SPECIFIC show, film, or studio is the visual reference?"* (Not "mid-century modern in general" — a literal reference.)
3. **Tone reference** — *"What show or film is the tonal match? Dry comedy? Cinematic drama? Warm and inviting?"*
4. **Proof mode** — *"Is there a single hero moment that, if it lands, proves we hit the bar? Or is it cumulative ambient polish across every surface?"*

From the answers, Claude synthesizes:
- **Mission line** — one compact declarative sentence
- **Binary acceptance test** — e.g., *"Could this look like a frame from an Archer episode?"* (yes/no, no judgment calls)
- **First-time player reaction** — expected quote when a friend sees it

**Why it matters:** Vague quality bars ("make it look good") drift. Binary tests don't. The test becomes the gate every visual decision has to pass.

**Origin:** BURNED spec session 2026-04-10.

---

## Debate-Pushback

**What:** When Claude has a strong position, engage the debate. When you have a strong position, push back instead of accepting fast.

**When:** Any design decision, architectural call, or disagreement.

**How:**
- If Claude says something you're not sure about, ask WHY. Make Claude defend with evidence.
- If you have a counter-position, state it. Claude will flip if the evidence is good.
- Ask Claude to **steelman both sides** before deciding.
- When Claude flips to your position, the design is usually better — it survived friction.

**Why it matters:** Fast agreement produces generic designs. Friction produces specific ones. The BURNED spec session's biggest pivot (Visual Architecture → in spec → in phase plan) came from a devil's-advocate question that Claude initially resisted and eventually conceded on, with the final design cleaner because of the debate.

**Rule:** If Claude flips positions with no new evidence, that's fast-agreement. Push back again.

**Origin:** `feedback-debate-pushback.md` in Claude's memory. Reinforced by BURNED session 2026-04-10.

---

## Spec → Plan → Code (Transitive Enforcement)

**What:** Before any code, establish a product specification. Specs have WHAT (quality bar, form factors, user-facing decisions). Plans have HOW (token values, clamp formulas, implementation). Code becomes the living contract.

**When:** Any non-trivial project. Especially new ones.

**How:**
1. Author `docs/specifications/PRODUCT-SPECIFICATION.md` with Claude (use `/product-specification` once built, or manual authoring)
2. Lock at v1.0 when contract is complete
3. Generate phase plans from the spec — plan generators automatically pick up the quality bar phrase and embed it
4. Execute plans — implementation produces tokenized, self-documenting code
5. Future sessions grep the code and follow patterns

**Why it matters:** Without a spec, phase plans have nothing to inherit from. Without quality-bar-derived plans, code drifts. Without tokens in code, every new component makes independent decisions and the visual layer becomes "organized chaos" (BURNED's pre-2026-04-10 failure mode).

**Key insight:** The CONTRACT loads every session via spec + code. Phase plans are load-once during their phase. Tokens in code are the REAL enforcement mechanism — future sessions grep them and follow patterns by convention.

**Origin:** `feedback-transitive-contract-pattern.md` in Claude's memory. Evidence: UMB's phase 4 AND phase 5 plans both inherited *"indistinguishable from commercial"* from the spec.

---

## Sub-Agent Delegation

**What:** For bounded research tasks, spawn a subagent instead of using the main thread.

**When:**
- Codebase exploration across many files
- Multi-step research spanning multiple sources
- Anything that would bloat the main thread's context

**How:**
- Say *"use a subagent for this"* or *"delegate this to Explore"*
- For codebase searches: use the **Explore** subagent (fastest, specialized)
- For general research: use **general-purpose**
- Subagents can run in background (`run_in_background: true`) so the main thread keeps moving
- Results come back as a concise summary, not the raw file reads

**Why it matters:** Subagents have their own context windows. A subagent reading 30 files produces a 400-word summary that enters the main thread — the 30 files don't. This is how you stay under token budget on long sessions.

**Example:** BURNED spec session used a background `Explore` subagent to audit all EK leftovers across the codebase while the main thread continued the spec conversation. Results folded in at the right moment without blocking forward progress.

---

## Write The TODO

**What:** Explicit verbal signal for Claude to update `TODO.md` at end of session.

**When:** End of any session with meaningful work, OR when you're about to start a new terminal.

**How:** Say *"write the TODO"* or *"update the TODO"*. Claude will update with:
- What we did this session (briefly)
- Current state (tests passing, what's working)
- Unfinished fixes (as **prescriptions** — exact file:line changes, not diagnoses)
- Next steps in priority order
- Landmines (things to watch out for)

**Why it matters:** Claude has no memory of the session once the terminal closes. `TODO.md` is the hand-off to future-you and future-Claude.

**Critical:** Claude must NEVER auto-update TODO without your signal. It's opt-in.

**What doesn't belong in TODO:** Session history, "what we did" logs, diary entries. That's what git log is for.

---

## Squeaky Clean

**What:** Full end-of-session cleanup protocol.

**When:** You say *"squeaky clean"* — end of a meaningful session where you want a ship-ready state.

**How:** Claude runs the `/squeaky-clean` slash-command skill in a fork. It:
1. Updates TODO.md (if not already done)
2. Runs typechecks — must pass
3. Verifies `git status` — only expected files changed
4. Deletes contents of `temp/` folder
5. Deletes any other temporary files/folders from the session
6. Commits all changes with descriptive message
7. Pushes to origin

**Why it matters:** Sessions end with cruft (debug files, screenshots, notes). Squeaky-clean ships everything and leaves the project clean for the next session.

**What it doesn't do:** Force-push, amend, or touch other branches. Safe by default.

---

## One Change At A Time (Visual Work)

**What:** For visual/CSS changes, change ONE thing, verify on phone, then the next.

**When:** Any visual work where you're iterating based on how it looks.

**How:**
1. Describe ONE specific change
2. Claude implements it
3. You verify on phone
4. Only THEN move to the next

**Why it matters:** Visual changes compound unpredictably. Chaining 3 changes blind means you can't isolate which one broke things. This rule came from painful experiences with layout thrashing that took entire sessions to untangle.

**Origin:** `feedback-visual-work-one-change-at-a-time.md` in Claude's memory.

---

## Sequential Thinking After Multi-Agent Research

**What:** After multiple agents return findings, invoke the `sequential-thinking` MCP tool to synthesize before acting.

**When:** Whenever 2+ subagents report back with findings to integrate.

**How:** Say *"use sequential thinking to synthesize these"* — Claude invokes `mcp__sequential-thinking__sequentialthinking` to walk through findings, identify contradictions, and synthesize.

**Why it matters:** Without synthesis, Claude tends to cherry-pick one agent's findings and ignore contradictions. Sequential thinking forces integration.

**Origin:** `feedback-sequential-thinking-always.md` in Claude's memory.
