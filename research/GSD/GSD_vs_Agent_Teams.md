# GSD vs. Claude Code Agent Teams

A comparison of two approaches to multi-agent development with Claude Code.

---

## GSD (Get Shit Done)

**What it is:** An open-source, third-party framework that acts as a context engineering and spec-driven development layer on top of Claude Code. Created by TACHES.

**GitHub:** [github.com/glittercowboy/get-shit-done](https://github.com/glittercowboy/get-shit-done)

**Philosophy:** "No enterprise roleplay bullshit. Just an incredibly effective system for building cool stuff consistently using Claude Code."

### How It Works

GSD runs its own software development lifecycle with distinct phases:

1. **Discuss** — GSD interviews you about your project, asking detailed questions to extract requirements
2. **Research** — Spawns parallel research agents to investigate technical approaches
3. **Plan** — Creates a complete spec, roadmap, and phased execution plan
4. **Execute** — Runs tasks atomically using fresh subagents, each with a clean 200K context window
5. **Verify** — Guides you through manual verification and uses debug agents for issues

### Core Problem It Solves: Context Rot

Context rot is the progressive degradation of AI accuracy as the session accumulates tokens. In practice:

- **0–30% context:** Peak quality — thorough, comprehensive, remembers everything
- **50%+:** Starts rushing, cutting corners, being "more concise"
- **70%+:** Hallucinations, forgotten requirements

GSD solves this by spawning fresh Claude instances for each task. Each subagent gets a clean 200K token context window. Task 50 has the same quality as Task 1.

### Key Features

- **Aggressive atomicity** — Each plan is 2–3 tasks, designed to fit in ~50% of a fresh context window
- **Plans are prompts** — The PLAN.md file IS the executable instruction that subagents read directly
- **Waves** — Independent tasks run in parallel; dependent tasks wait
- **Atomic commits** — Each task gets its own commit, making git bisect and rollbacks trivial
- **Goal-backward verification** — Tests observable behaviors, not implementation details
- **Quick mode** — `/gsd:quick "Add dark mode"` for smaller tasks with the same fresh-agent guarantees

### Who It's For

People who want to describe what they want and have it built correctly — without pretending they're running a 50-person engineering org. Solo developers and small teams who want structured, reliable output from Claude Code.

---

## Claude Code Agent Teams

**What it is:** A first-party, experimental feature built directly into Claude Code that allows multiple Claude instances to work together as a coordinated team.

**Docs:** [code.claude.com/docs/en/agent-teams](https://code.claude.com/docs/en/agent-teams)

**Status:** Experimental — disabled by default. Enable by adding `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to your `settings.json` or environment.

### How It Works

Agent Teams introduces an organizational structure with three core components:

- **Team Lead** — Your main Claude Code session. It spawns agents, assigns tasks, and synthesizes results.
- **Teammates** — Independent Claude Code sessions, each with its own context window and role-specific instructions.
- **Shared Task List** — A file-backed task board with task states and dependencies.
- **Mailbox System** — Agents send each other structured messages by appending JSON to inbox files.

The critical difference from subagents: teammates can message *each other* directly. No round-trip through the main agent required.

### Best Use Cases

- **Research and review** — Multiple teammates investigate different aspects simultaneously, then share and challenge findings
- **New modules or features** — Each teammate owns a separate piece without stepping on each other
- **Debugging with competing hypotheses** — Teammates test different theories in parallel and converge on the answer
- **Cross-layer coordination** — Frontend, backend, and tests each owned by a different teammate
- **QA swarms** — Multiple testing perspectives running simultaneously against a codebase

### Example Prompt

```
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

### Trade-offs

Agent Teams add coordination overhead and use significantly more tokens than a single session. They work best when teammates can operate independently. For sequential tasks, same-file edits, or work with many dependencies, a single session or subagents are more effective.

---

## Head-to-Head Comparison

| Dimension | GSD | Agent Teams |
|---|---|---|
| **Type** | Third-party framework | Built-in Claude Code feature |
| **Status** | Stable, actively maintained | Experimental (research preview) |
| **Philosophy** | Complete dev lifecycle methodology | Raw coordination tool |
| **Who drives** | The system manages orchestration — you answer questions and approve | You (or the lead agent) define structure and roles |
| **Context rot solution** | Fresh subagents per task with atomic plans sized to ~50% context | Each teammate gets its own full context window |
| **Agent communication** | Subagents report back to parent only | Teammates message each other directly |
| **Planning** | Built-in — interviews, specs, roadmaps, phased plans | You bring your own planning (or pair with a planning tool) |
| **Verification** | Built-in verification phase with debug agents | Manual or custom — not prescribed |
| **Parallelism** | Waves of independent tasks | Full parallel execution with self-coordination |
| **Token cost** | High during planning, but may save overall by avoiding failed attempts | Scales linearly with number of active teammates |
| **Learning curve** | Lower — the system guides you | Higher — you need to understand orchestration patterns |
| **Flexibility** | Opinionated workflow — follows the GSD lifecycle | Use however you want |

---

## Can You Use Both?

Yes. The two approaches are complementary rather than competitive.

GSD's philosophy of 80% planning and review, 20% execution maps well onto what makes Agent Teams effective. The better your specs, the better the agent output. A practical combo:

1. Use **GSD** for the discuss, research, and planning phases to build solid specs
2. Hand the plan off to **Agent Teams** for parallel execution across multiple teammates
3. Use **GSD's verification** approach to validate the results

---

## Getting Started

### GSD Installation

```bash
npx get-shit-done-cc
```

Then run `/gsd:new-project` in Claude Code to begin.

### Agent Teams Setup

Add to your Claude Code `settings.json`:

```json
{
  "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
}
```

Or set the environment variable before launching Claude Code:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Then describe your team structure in natural language and Claude will create the team.

---

## Recommendations

- **New to Claude Code?** Start with **GSD**. It holds your hand through the entire process and enforces good habits.
- **Know what you're doing and want raw parallelism?** Use **Agent Teams** directly.
- **Building something complex?** Combine both — GSD for planning, Agent Teams for execution.
- **Budget-conscious?** Start with single-session Claude Code or GSD's quick mode. Graduate to Agent Teams when the task genuinely benefits from parallel work.

---

*Last updated: February 2026*
