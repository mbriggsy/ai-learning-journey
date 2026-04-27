# 03 — Execute

The plans are deepened. The contract is locked. Time to fly.

Execution is **fully agent-driven**. You pick an executor (`gsd-executor`, `ce:work`, or whichever fork fits your stack), aim it at phase 1, and let it fly. The agent reads the plan and translates it into code — one phase end-to-end before the next phase begins. Your job: start it, answer when it asks, approve at the gate.

## /brief opens every phase. /distill closes every build.

Every phase starts with the agent running `/brief`. The brief loads what the team has already learned: prior gotchas, framework quirks, patterns that work, anti-patterns that don't. It's the agent's institutional memory. Without it, the agent rediscovers the same mistakes the team already paid for.

`/brief` is the read side of the loop. `/distill` is the write — runs at session end after review (see `04-review.md`). Together they make the brief grow build over build.

## How the agent flies

For each phase plan, in order, the executor:

1. Runs `/brief` to load context.
2. Reads the plan, top to bottom — no skimming.
3. Executes one task at a time, verifying at runtime as it goes. Commits each task atomically with a descriptive message.
4. When something breaks, applies one fix at a time — no chaining.
5. When reality diverges from the plan, fixes the right artifact (the plan, or the contract if the plan was correctly derived) before continuing — never papers over in code.
6. When all tasks land, runs the phase's exit criteria check. If criteria hold, reports clearance to the tower. If not, fixes in place — never pulls defects forward.

Boring on purpose.

## Your job: ATC

You are not flying. The agent is. You're not watching it fly either — that's not realistic, and it's not the catch mechanism. The gate is. Stay in the tower:

- **Start.** Pick the executor, point it at phase 1, kick it off.
- **Answer when asked.** When the agent surfaces a question — plan ambiguity, contract divergence, an open question that needs a human call — answer once, recorded, move on.
- **Approve at the gate.** When the phase reports clearance, review the exit criteria before you green-light advance. If criteria don't hold, send it back.

If you're writing code or arguing with the agent about implementation, you've climbed out of the tower. Climb back in.

## What to expect when this phase ends

After execution:

- Every plan has been executed end to end by the agent.
- Every task has been verified at runtime, not just in CI.
- Any plan or contract deviations have been written back to the source artifact.

Code on disk, plans updated, contract still load-bearing. `04-review.md` starts here.
