# 03 — Execute

The plans are deepened. The contract is locked. Time to fly.

Execution is where the build agent translates plans into code. The agent runs against one plan at a time — phase 1 all the way through, before phase 2 starts. No skipping. No chaining. No "let me start phase 2 while phase 1 wraps."

This file is about how the agent flies, and how you keep it on the runway.

## Start with /brief

Every execution session — and every phase within a session — opens with `/brief`. The brief loads what the team has already learned: prior gotchas, framework quirks, patterns that work, anti-patterns that don't. It's the agent's institutional memory.

If your team's `/brief` library is empty (early days of ATC adoption), seed it with one or two known-good patterns from your existing codebase. The brief gets richer with every `/distill` at phase end (see `04-review.md`). The loop only compounds if you run both halves.

## The execution loop

Use an executor skill (`gsd-executor`, `ce:work`, or whichever fork fits your stack) to drive the loop. For each phase plan, in order:

1. `/brief` to load context.
2. Read the plan, top to bottom. Don't skim.
3. Execute one task at a time, verifying at runtime as you go. Commit each task atomically with a descriptive message. When something breaks, one fix at a time — no chaining.
4. If reality diverges from the plan, fix the right artifact (plan, or contract if the plan was correctly derived) before continuing — never paper over in code.
5. When all tasks are done, run the phase's exit criteria check. If the phase clears the bar, advance. If not, fix in place — don't pull defects forward.

Boring on purpose.

## What to expect when this phase ends

After execution:

- Every plan has been executed end to end.
- Every task has been verified at runtime, not just in CI.
- Any plan or contract deviations have been written back to the source artifact.

Code on disk, plans updated, contract still load-bearing. `04-review.md` starts here.
