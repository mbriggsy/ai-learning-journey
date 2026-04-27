# 04 — Review

The code is on disk. Plans flew, the executor advanced through every phase, the contract still holds. Now review proves the code holds up — before it goes in front of human eyes for evidence.

Review is **fully agent-driven**. A challenger panel pressure-tests the code, the agent resolves findings, `/distill` captures what the team learned. Your job: aim the panel, decide on contested findings, approve gate-clear, never re-review by hand.

## The code review panel

Use a code-review skill (`/code-review`, `/pr-review-toolkit:review-pr`, `/security-review`, or whichever fork fits your stack) to run the panel. The shape mirrors PRD lock and plan deepen: multiple agents review from different angles — correctness, maintainability, security, performance, test coverage, framework-fit — each writing its own findings; a synthesizer integrates them.

Same pattern, different specialists per artifact. PRD review checks scope and assumptions. Plan deepen stresses approach and feasibility. Code review checks the code that lands in production. The discipline carries through.

Not every finding survives triage. The synthesizer sorts findings against the contract:

- **Fix.** Real defect or clear regression. The agent resolves in place.
- **Defer.** Real but out of scope for this build. Captured as a follow-up, not papered over silently.
- **Reject.** Reviewer was wrong, code is right. Recorded with reason so the same false positive doesn't get re-raised next pass.

If the agent can't tell which bucket a finding belongs to, that's a Briggsy call.

## /distill — capture what just happened

After review settles, the agent runs `/distill` — at session end, manually or hook-enforced depending on your stack. /distill writes the lessons learned during this build into the team's institutional memory — the same memory `/brief` will load on the next build. Gotchas hit, framework quirks discovered, patterns that worked, anti-patterns that bit. Specific, actionable, attached to the right surface so it shows up when relevant.

/distill is not a session journal. It captures what the team didn't know before this build. If nothing new was learned, /distill is a no-op — and that's fine. The point is the loop: every build sharpens the brief; the next build hits fewer of the same potholes.

## The review gate

The gate clears when:

- Every panel finding has been triaged — fixed, deferred, or rejected — with reason recorded.
- Code passes the verification outcomes the plans called for, runtime, not just CI.
- `/distill` has run.

Gate cleared, evidence starts. Gate not cleared, the code does not advance — fix in place.

## Your job: ATC

You are not reviewing code by hand. The panel is. Stay in the tower:

- **Aim and start.** Pick the review skill, point it at the build, kick it off.
- **Decide contested findings.** When the agent can't choose between fix, defer, and reject — you call it. Once, recorded, move on.
- **Approve gate-clear.** Sanity-check the resolution log and the `/distill` output before you green-light evidence.

If you find yourself diffing files and arguing with the agent about a one-line refactor, you've climbed into the cockpit. Climb back out.

## What to expect when this phase ends

After review:

- The panel has run, every finding has a resolution, fixes are in.
- `/distill` has captured the build's lessons into team memory.
- Code matches plans, plans match contract, contract still load-bearing.

Code reviewed, lessons captured, ready for the human eye. `05-evidence.md` starts here.
