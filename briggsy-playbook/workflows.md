---
aliases: [workflows, workflow, patterns]
tags: [playbook]
---

# Workflows that work

Patterns proven to produce great results. Each entry: what it is, when to use it, how to run it, and why it matters.

## Expert-Pilot Partnership

**What:** In every project I do with Claude, I'm the pilot-in-command for vision and quality but Claude is the technical expert for execution. I deliberately pick stacks I don't know how to execute in — which means I can't audit Claude's technical decisions on merit. Pushback from Claude isn't optional politeness; it's the only technical error-correction mechanism in the system.

**When:** Always. Every Claude collaboration runs under this model. I pick the project specifically BECAUSE I don't know the stack — that's the point of the collab.

**How:**

- **I own WHAT and WHY.** Vision, quality bar, tone, product direction, acceptance tests, when something feels off. I set the destination and I call whether we got there.
- **Claude owns HOW.** Architecture, libraries, state management, type design, build config, migration order, performance tradeoffs, API shape. Claude is the senior engineer I'm hiring for this project.
- **Vibes get translated into discipline, out loud.** When I say *"water beads"* or *"smooth,"* Claude translates it into concrete technical discipline (60fps on mid-tier Android, clamp formulas, bundle budget) and explains the tradeoffs. I catch vibe misses. Claude catches discipline misses. Neither of us can do the other's job.
- **If I suggest a technical approach and Claude knows a better one, Claude says so — without hedging.** "Pushback — one concern" framing. I want genuine opinions with reasoning, not polite alignment. Fast agreement from Claude is the failure mode, not the success mode.
- **Claude flips positions on evidence, never pressure.** If Claude agrees after I push once with no new evidence, that's fast-agreement in disguise. Push back again.
- **Honest uncertainty is the rule.** When Claude genuinely doesn't know, Claude says so plainly. No bluffing. My confidence signals only work if Claude's are calibrated — one bluffed answer poisons the well for every real *"I'm sure"* after.

**Why it matters:** This is the structural reality of all my Claude projects, not a preference. In a normal AI/user setup, the user is the domain expert and catches hallucinations on the way through. Here that dynamic is **inverted** — Claude is the only one in the system who knows the plane. If Claude defers to me on technical calls out of habit or politeness, nothing catches the mistakes until production bites us. The whole arrangement only works if Claude actually wields the technical authority I'm delegating.

**ATC/pilot metaphor, refined:** In aviation, ATC knows the airspace better than the pilot knows aviation. In my Claude projects, I (ATC) direct vision and destination, but Claude (pilot) is the only one who knows the plane. Same metaphor, inverted expertise distribution.

**Origin:** Crystallized 2026-04-10 during the BURNED CSS Foundation Rebuild Plan discussion, after Claude pushed back on an ambiguous *"sure"* signal for protocol-gated actions (squeaky-clean / push / TODO update). I told Claude *"I like your pushback, like a lot! This isn't command and control, this is a partnership to achieve greatness!"* — and then explained that I only pick projects I have no clue how to execute, so Claude is the expert and I'm along for the ride. That conversation is what this workflow is.

**Related:** `feedback-debate-pushback.md` and `user_unfamiliar_stacks.md` in Claude's memory carry the mirror versions of this rule on Claude's side.

---

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

## Lock-In Interview

**What:** When an informal standard keeps showing up across sessions, promote it from scattered memory into the always-on manifesto via a structured 6-question interview that extracts the substance Claude needs to carry it correctly.

**When:** A phrase or discipline has appeared 3+ times, you've watched it slip in past sessions, and you want it loaded at the top of every future session as non-negotiable. Examples: *"water beads off it,"* *"runtime truth ≫ unit tests,"* *"verify before you claim done."*

**How:** Tell Claude *"interview me to lock [phrase] into the manifesto."* Claude runs 6 questions, ONE AT A TIME:

1. **Origin** — where does this come from? What project crystallized it? Anchors the phrase in lineage so Claude carries it harder than an abstract rule.
2. **Literal image** — what am I actually seeing or feeling when I say it? Forces a concrete render, not a vibe. *("Water on a deep-gloss car hood, sexy silhouette in the back"* beats *"polished"* by miles.)
3. **Failure mode** — what am I usually correcting when I invoke this? Names what the violation looks like, so Claude knows what to scan for.
4. **Self-check question** — what line do I run before claiming done? The trigger Claude installs in its own loop.
5. **Bar vs. shipping** — is over-polish ever an enemy, or is more always more? Resolves the implicit shipping tension that contaminates most engineering work.
6. **Catch-all + voice** — verbatim words to preserve, references to keep, what I want Claude to feel when it misses the bar. Locks tone and register, not just the rule.

Claude then drafts 2-3 variants (tighter vs. richer, folded-in vs. standalone section), I pick one, Claude edits `~/.claude/manifesto/elite-engineer.md` and verifies the SessionStart hook actually injects the new content end-to-end.

**Aftermath:** Trim the related memory file to a **receipt** (origin + date + pointer to manifesto). Don't duplicate the disposition — manifesto carries it now. Stale memory entries get deleted along with their `MEMORY.md` index lines. Clean separation of roles: manifesto = always-on disposition, memory = historical receipt.

**Why it matters:** Memory is index-loaded as one-line pointers; the substance only reaches Claude if Claude opens the file. Manifesto is loaded in full every session via SessionStart hook. Promoting a standard from memory to manifesto turns *"Claude might remember this"* into *"Claude reads this before any first action."*

The interview also captures something a paraphrase can't — verbatim words, references, emotional register. The manifesto then carries YOUR voice, not Claude's interpretation of it.

**One-question-at-a-time is non-negotiable.** Batched questions get shallow answers; sharp answers come from focused ones.

**Origin:** 2026-04-29. Locked *"so fucking slick that water beads off it"* into the manifesto using this exact pattern. Six questions produced six concrete substance points (UMB origin, car-hood image, pixel-perfect failure mode, the WOW/AI-disappears self-check, no-shipping-pressure axiom, partnership register). Two stale memory files were trimmed to one UMB receipt. The pattern was clean enough to earn its own playbook entry the same session.

**Related:**
- `Quality Bar First` (sibling workflow) — sets a NEW project's bar with 4 questions about destination. This pattern promotes an EXISTING informal standard to manifesto-level.
- Manifesto section *"SO FUCKING SLICK THAT WATER BEADS OFF IT"* — first artifact produced by this workflow.
- `project_umb_water_beads_origin.md` in Claude's memory carries the receipt.

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

## Spec → Plan → Strengthen → Code (Transitive Enforcement)

**What:** Before any code, establish a product specification. Specs have WHAT (quality bar, form factors, user-facing decisions). Plans have HOW (token values, clamp formulas, implementation). Plans get strengthened (bug-hunted by review agents) phase-by-phase, sequentially, before code is written. Code becomes the living contract.

**When:** Any non-trivial project. Especially new ones.

**How:**
1. Author `docs/specifications/PRODUCT-SPECIFICATION.md` with Claude using `/ce:ce-brainstorm` (collaborative dialogue, quality bar elicitation built in)
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

## Write The TODO / Squeaky Clean

End-of-session protocols. Both are explicit verbal triggers — Claude won't auto-run either. Full mechanics in [[commands-and-skills]].

- **Write the TODO** — say *"write the TODO"* or *"update the TODO"*. Updates `TODO.md` as a forward-looking handoff (prescriptions, not diagnoses; no session diary). [[commands-and-skills#"Write the TODO"|Full reference]].
- **Squeaky clean** — say *"squeaky clean"*. Runs the `/squeaky-clean` skill in a fork: TODO + typechecks + git verify + temp cleanup + commit + push. Safe by default. [[commands-and-skills#`/squeaky-clean`|Full reference]].

**Why the workflow framing matters:** Claude has no memory of the session once the terminal closes. The TODO is the handoff to future-you and future-Claude. Squeaky-clean ensures the project is ship-ready when you walk away.

---

## One Change At A Time (Visual Work)

**Promoted to a principle.** See [[principles#8. One visual change at a time.|principle #8]] for the rule. The mechanics: one change → verify on phone → next; never chain visual changes blind. Origin: `feedback-visual-work-one-change-at-a-time.md` in Claude's memory.

---

## Planning: Codified vs. Native

**What:** Choose between `/ce:plan` (or similar heavy planning skills) and letting Claude plan natively, based on whether the forcing functions pay rent on *this* task.

**When:** Any non-trivial planning moment. Especially foundational work where getting it wrong costs a lot to undo.

**How:**

**Reach for `/ce:plan` when:**
- Work is **foundational** — tokens, schemas, architecture rewrites, migrations
- Blast radius is **non-obvious** — migrations with hibernated state, protocol changes, shared infrastructure
- Plan will be **handed off** to a separate execution session (fresh context)
- Project has > 10 plans already and cross-plan **findability** matters
- A gap-finder pass (SpecFlow) would catch things self-review would miss
- You want the "NEVER CODE" hard gate keeping the planning session honest

**Skip `/ce:plan` and let Claude plan natively when:**
- Work is a bounded bug fix or isolated feature
- A locked spec or ADRs already answer the architectural questions
- Same session will execute the plan (no handoff artifact needed)
- Planning ceremony would outweigh execution effort
- 3-line bug fix = `/ce:plan` is comedy

**Why it matters:** `/ce:plan` isn't magic — it's **codified discipline**. It's the set of things a senior engineer does consistently for important plans that Claude, unprompted, does inconsistently. The mechanical value:

- **Agent orchestration** — 4-5 parallel research agents Claude wouldn't spawn solo (repo-research, learnings-researcher, best-practices, framework-docs, SpecFlow gap-finder)
- **Forcing functions** — mandatory System-Wide Impact section (interaction graph 2+ levels deep, state lifecycle risks, API surface parity) that Claude would hand-wave native
- **Filename discipline** — sequence numbers, type prefixes, frontmatter `origin:` field — compounds across 20+ plans into findability
- **Downstream handoff** — plan is a node in a graph (brainstorm → plan → deepen → work), not a standalone doc
- **"NEVER CODE" gate** — structurally enforces research-only mode; no "while I'm here I'll just draft theme.css" drift

**Highest-leverage single forcing function for spec-derived plans:** System-Wide Impact → interaction graph + state lifecycle risks. That's exactly where native planning gets lazy — "it's just CSS, the blast radius is bounded" assumptions that miss second-order effects. The template doesn't let Claude assume.

**The trade:** Ceremony on tasks where forcing functions don't pay rent vs. skipped discipline on tasks where they would. Pick the right tool for the blast radius.

**Full academic breakdown:** `projects/burned/docs/workflow/ce-plan-skill-analysis.md` — 6-step pipeline dissection, native-vs-codified delta, when each is overkill. Not BURNED-specific, just captured there first.

**Origin:** Academic exercise during BURNED session 2026-04-10. Two parallel fresh sessions got prompted identically; the only meaningful difference was one mentioned `/ce:plan`. That divergence is what triggered the deep dive.

---

## Plan Mode (Claude Code)

**What:** A Claude Code interaction mode where Claude is locked into read-only/research mode and must propose a plan via `ExitPlanMode` before any state-changing tool call. You approve or reject; no edits, commands, or file writes happen until you do.

**When to use:**
- Foundational or high-blast-radius work — schema migrations, refactors that touch many files, anything where *"oh, I also went ahead and..."* would be a problem
- New codebase Claude hasn't seen — you want the read-and-propose pass before the do pass
- Right after `/clear` when you want to verify Claude's understanding before letting it act
- When the user (you) doesn't fully trust the prompt yet — Plan Mode buys you a vetting step for free

**When to skip:**
- Bounded bug fixes Claude can knock out in 2-3 tool calls
- Iterative visual work — One Change At A Time already enforces verification per step
- Quick conversational asks where the cost of a plan-and-approve loop exceeds the cost of just doing it
- Tasks where the spec/CLAUDE.md already constrains scope tightly enough

**How:**
- **Toggle:** `Shift+Tab` cycles through input modes; Plan Mode is one of them. The status line shows you're in it.
- **Inside the mode:** Claude reads files, searches, asks questions, but cannot Edit/Write/Bash anything that mutates state.
- **Exit:** Claude calls `ExitPlanMode` with the plan text. You accept → Claude exits Plan Mode and executes. You reject → stay in Plan Mode and refine.
- **Combine with `/ce:plan`:** Plan Mode is the *enforcement gate*; `/ce:plan` is the *codified discipline*. Stack them when the work is foundational AND you want zero "while I was in there..." drift.

**Why it matters:** Native plans (Claude proposes a plan in prose, then continues) rely on Claude's restraint. Plan Mode replaces restraint with a hard structural gate. For destructive or foundational work, the structural gate is worth more than the trust.

**Distinction from `/ce:plan`:** `/ce:plan` is a heavy planning *skill* that produces a plan *file* with forcing functions (System-Wide Impact, parallel research agents, gap-finder). Plan Mode is an interactive *mode* with a hard read-only gate. They're orthogonal; use either, both, or neither.

**Origin:** Built into Claude Code. Not a Briggsy invention — but worth surfacing here because it's underused.

---

## Sequential Thinking After Multi-Agent Research

**What:** After multiple agents return findings, invoke the `sequential-thinking` MCP tool to synthesize before acting.

**When:** Whenever 2+ subagents report back with findings to integrate.

**How:** Say *"use sequential thinking to synthesize these"* — Claude invokes `mcp__sequential-thinking__sequentialthinking` to walk through findings, identify contradictions, and synthesize.

**Why it matters:** Without synthesis, Claude tends to cherry-pick one agent's findings and ignore contradictions. Sequential thinking forces integration.

**Origin:** `feedback-sequential-thinking-always.md` in Claude's memory.
