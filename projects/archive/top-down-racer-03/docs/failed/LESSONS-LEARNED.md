# LESSONS LEARNED

*Everything that went wrong, everything that went right, and the design principles that emerged.*
*These are battle scars, not theories.*

---

## Lesson 1: You Cannot Orchestrate From Inside the Thing You're Orchestrating

**What happened:** gsd-autopilot was built as a Claude Code slash command. It was supposed to spawn fresh subagents and chain GSD commands. But a prompt loaded into a context window cannot spawn separate processes. It's like writing instructions on a piece of paper and expecting the paper to follow them.

**The result:** The autopilot initialized correctly (parsed spec, created roadmap, wrote state) but couldn't actually chain the workflow. It punted to the human: "run this command yourself."

**Design principle:** The orchestrator MUST be an external process. Node.js script on the host machine. Calls `claude` CLI as a subprocess. Each call = fresh context window. The orchestrator never enters a context window — it manages them from outside.

---

## Lesson 2: GSD's `--auto` Flag Is a Footgun

**What happened:** When the autopilot couldn't chain commands, the human advisor suggested using GSD's `--auto` flag, which chains plan → execute → verify. The problem: `--auto` skips deepening entirely. Deepening is a Compound Engineering feature, not a GSD feature. GSD doesn't know it exists.

**The result:** Phase 1 executed without any plan review. The entire point of the autopilot — mandatory deepening — was bypassed by a convenience flag.

**Design principle:** The orchestrator must NOT depend on GSD or any other tool's auto-chaining. Every step transition is controlled by the orchestrator's own code. There is no `--auto` flag. The script calls plan, then deepen, then execute, then verify — explicitly, in code.

---

## Lesson 3: Deepening Is Non-Negotiable

**What happened in v02:** `/deepen-plan` was run before every phase execution. 15 consecutive runs caught real bugs in every single run. Including:
- A reward function bug that would have made AI training completely fail
- A speed bonus weighted 37x too high (AI would spin in circles instead of race)
- A snake_case/camelCase mismatch that would produce NaN in all AI inference
- A WASM memory leak (43KB/min during AI inference)

**What happened in v03:** Deepening was skipped. We don't know what bugs shipped.

**Design principle:** Deepening is enforced in code, not in prompts. The function that runs execution checks `plans_deepened === plans_total` before proceeding. There is no flag to skip it. No override. No "just this once." The code won't let you.

```javascript
function executePhase(phase) {
  if (phase.plans_deepened < phase.plans_total) {
    throw new Error(`Cannot execute: ${phase.plans_total - phase.plans_deepened} plans not deepened`);
  }
  // ... proceed with execution
}
```

---

## Lesson 4: Context Rot Is Real and Measurable

**What happened in v02:** Quality degraded predictably as context windows filled up. At 50% utilization, Claude starts cutting corners. At 70%, hallucinations begin. This was observed repeatedly across 80+ commits.

**The solution in v02:** GSD's subagent pattern — each task gets a fresh context window. Task 50 runs at the same quality as Task 1.

**Design principle:** Every step in the orchestrator is a fresh `claude` invocation. Plans target ~50% of context window. The orchestrator itself consumes ZERO context because it's a Node.js script reading and writing files.

---

## Lesson 5: State Must Survive Crashes

**What happened:** The gsd-autopilot design correctly specified state persistence — AUTOPILOT-STATE.md on disk, updated after every step. This part of the design was solid.

**Design principle:** State is always on disk. If the orchestrator process is killed at any point, `briggsy-build run` picks up exactly where it left off. The execution log is append-only. Phase statuses are updated atomically. Git commits at phase boundaries provide an additional recovery point.

---

## Lesson 6: Human Gates Must Trigger Skip-Ahead, Not Full Stop

**What happened in design:** The autopilot correctly identified that many projects have phases that are independent of each other. When Phase 2 (visual assets) is blocked waiting for a human to generate images, Phase 3 (shaders) and Phase 5 (AI training) can proceed because they don't depend on those assets.

**Design principle:** When a gate blocks a phase, the orchestrator immediately evaluates all remaining phases for independence. Anything that can proceed does proceed. The human returns to find maximum work done, not a system that sat idle.

---

## Lesson 7: The Spec Must Pre-Lock Decisions

**What happened in v02:** The GSD spec contained a "Locked Design Decisions" section with pre-baked answers for every predictable question. This prevented the AI from wasting context debating settled issues.

**What happened in v03 attempt:** The spec was well-written with comprehensive ADRs. But the autopilot couldn't enforce that Claude read and respected them.

**Design principle:** The orchestrator's prompts explicitly include locked decisions from the spec. Every Claude invocation for a given phase receives the relevant ADRs as context. The prompt says: "These decisions are locked. Do not revisit them. If the spec answers your question, use the spec's answer."

---

## Lesson 8: The Prompts Are the Product

**What happened in v02:** GSD's prompts (plan-phase, execute-phase, verify-work) encode the methodology — what a good plan looks like, how execution should proceed, what verification means. The same is true for Compound Engineering's `/deepen-plan`.

**Design principle:** The orchestrator's `prompts/` directory is not boilerplate. It's the accumulated knowledge of how to get Claude to produce high-quality work. Each prompt represents the best known approach for its step. The prompts should be versioned, reviewed, and improved over time — they're the most important files in the project.

Key prompt requirements:
- **Planning prompt:** Must produce plans that target ~50% context, have clear acceptance criteria, identify dependencies, organize into waves
- **Deepening prompt:** Must simulate multiple specialist reviewers, catch API misuse, architecture violations, race conditions, performance issues
- **Execution prompt:** Must produce atomic commits, run tests, follow the deepened plan exactly
- **Verification prompt:** Must check acceptance criteria objectively, verify architecture boundaries, run full test suite

---

## Lesson 9: Architectural Boundaries Are Testable

**What happened in v02:** The engine/renderer boundary was verified programmatically. All 9 engine source files imported exclusively from within `src/engine/`. Zero cross-boundary imports. When the architecture strategist found a violation (game state machine in the renderer), it was caught by automated review.

**Design principle:** The verification step should include boundary checks — not just "do tests pass" but "are the architectural constraints still intact?" This can be a simple import analysis script that runs as part of verification.

---

## Lesson 10: Test Before You Trust

**What happened with gsd-autopilot:** We built a complete orchestration system (7 files, careful design) and immediately tried to use it on a real project with real costs. It failed on the first run because the execution model was fundamentally broken.

**Design principle:** The new orchestrator MUST be tested on a toy project first. A 2-phase project with simple tasks. Verify that:
1. Fresh context windows actually spawn
2. Deepening actually runs and catches things
3. State persists across kills and restarts
4. Gates pause correctly and skip-ahead works
5. The full loop completes autonomously

Only after the toy project succeeds do we use it on a real build.

---

## Lesson 11: Don't Layer Duct Tape

**What happened across v02/v03:** GSD was the base. Compound Engineering was bolted on top. Then gsd-autopilot was built on top of both. Three layers of tools from three different sources, none designed to work together. Each layer added complexity and failure modes.

**Design principle:** Build one tool that does the whole job. No plugins. No slash commands from other frameworks. No "just add another layer." The orchestrator is a single, self-contained system. It has opinions about the workflow and enforces them. If it doesn't do something you need, you modify it — not bolt another tool on top.

---

## Lesson 12: Money Burns Fast When Automation Fails

**What happened:** The v03 Phase 1 execution ran without deepening. That's Claude compute spent on unreviewed plans that may contain bugs. When bugs surface later, they cost MORE to fix than they would have cost to prevent — because now you're debugging in code rather than catching errors in a plan review.

**Design principle:** The orchestrator should track and report cost. Each `claude` invocation has a measurable token cost. The orchestrator should log input/output tokens per step and provide a running total. This makes the cost of skipping steps (or retrying failed steps) visible and concrete.

---

## Summary: The Non-Negotiable Design Principles

1. **Orchestrator lives OUTSIDE Claude Code** — Node.js CLI, calls `claude` as subprocess
2. **Every step is a fresh context** — no context rot, ever
3. **Deepening is mandatory and code-enforced** — the script won't execute undeepened plans
4. **State on disk, always** — survives crashes, human-readable, git-trackable
5. **Skip-ahead on gates** — maximize autonomous progress when blocked
6. **Prompts are the product** — invest in them, version them, improve them
7. **Test on toy project first** — never trust untested automation with real money
8. **One tool, not layers of duct tape** — self-contained, no plugin dependencies
9. **Track costs** — make the economics visible

---

*— End of Lessons Learned —*
