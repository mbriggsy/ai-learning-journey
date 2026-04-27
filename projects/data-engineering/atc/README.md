# ATC

**An agentic SDLC for data engineering builds.**

You are Air Traffic Control. The AI is your pilot. You direct. The pilot flies. ATC is the flight pattern your team flies — from PRD to shipped pipeline — without compromise, without vibes, without theater.

## What this is for

ATC is the methodology your team uses to *build* data pipelines that are wow-grade reproducibly — not lucky-vibe-grade. Two flavors:

**Chapter 1 — Replace a shit-show.** You have a legacy ETL job that works and is also shit. The reverse-engineering skill (sister project at `../etl-reverse-engineering/`) reads the legacy code and emits a clean, build-ready PRD. ATC then takes *only the PRD* and builds the new version. The build agent **never reads the legacy code** — that is the point. We call this **clean room**: the PRD is the contract, the legacy code is a wall away. Output parity with the legacy job is proved separately, by golden in/out tests and reconciliation, not by the agent peeking at how the old code did it. If the agent peeks, you haven't done a build — you've done a refactor with extra steps.

**Chapter 2 — Net-new.** No legacy code. The PRD is authored fresh by the team, always agent-guided, to capture requirements, contracts, and acceptance criteria. From that point forward, ATC works the same — same flight pattern, same gates, same evidence package.

In both chapters, **the PRD is the contract.** Plans, code, tests, and review all trace back to the PRD. If something gets built that isn't in the PRD, that is a process bug, not a feature.

**Stack:** ADF, ADLS, Delta Lake, Azure Databricks, Unity Catalog. Production runtime is The ETL Framework 2.0 (the team's job-cluster queueing framework).
**Reader:** A data engineer who already knows the stack and is steering a Claude-class agent to do the build.

## The bar

Wow-grade pipelines, reproducibly. Acceptance test: the best ETL engineers on the team look at the build and say *wow*. Not "fine." Not "ships." *Wow*.

In our context, wow-grade means:

- Documented and well-structured. A new engineer reads it in a session and owns it.
- Every requirement traces to a test. Every test traces to the PRD.
- Runs cleanly on The ETL Framework 2.0 — no bolt-ons, no workarounds.
- Provably matches the legacy output (Chapter 1) or meets stated acceptance criteria (Chapter 2).

If the build doesn't clear all four, it isn't wow-grade. Re-run the failing phase. Don't ship a six-out-of-ten and call it iteration.

## Why a methodology, not vibes

Vibe coding with an LLM produces lucky wins and silent disasters in roughly equal measure. ATC removes the silence. Each phase has an artifact — the ones you need to eyeball get reviewed, the rest are working context for the agent. What ships is documented, well-structured code that is inherently easier to maintain. That's the difference between an engineering practice and a demo.

Heavily influenced by Compound Engineering. Skills and agents are reusable text artifacts — fork what works (CE, Microsoft, Anthropic, whoever shipped it), build only the gaps, modify everything to fit your stack. Don't reinvent the wheel. Forever loop, not a milestone.

## The flight pattern

```
PRD  →  Plans  →  Deepen  →  Execute  →  Review  →  Evidence
```

Six phases run in order. Each one completes before the next begins. Half the value of ATC is the *refusal* to short-circuit phases.

A `/brief` and `/distill` loop wraps every build: load what the team has learned before you start, capture what you just learned at the end. Knowledge compounds across builds. Mechanics in `03-execute.md` and `04-review.md`.

A challenger panel reviews every major artifact before it locks — PRD, plans, code. Same shape (multi-angle review + synthesizer integration), different specialists per artifact. Drafts strengthen before they go downstream. Mechanics in chapter docs.

## Reading order

**Start here:** [`viz/index.html`](viz/index.html) — single-page visual summary of the methodology. The whole flight pattern at a glance, two-minute read.

For the depth:

| # | File | What's in it |
|---|---|---|
| 1 | [`01-prd.md`](./01-prd.md) | How to own a PRD as the build contract |
| 2 | [`02-plan.md`](./02-plan.md) | Phased plans and sequential deepening |
| 3 | [`03-execute.md`](./03-execute.md) | Sequential execution, one phase at a time, `/brief` at the start |
| 4 | [`04-review.md`](./04-review.md) | `/code-review`, `/distill`, the review gate |
| 5 | [`05-evidence.md`](./05-evidence.md) | The evidence package — what proves "done" |
| – | [`skills.md`](./skills.md) | Catalog of skills (Microsoft, Databricks, CE, ours) |

First read: top to bottom, ~5 minutes per file. In-flight pickup: jump to the file for your current phase.

## What this doc does NOT do

- Teach Spark, Delta, Databricks, or AI fundamentals. Bring those.
- Replace your judgment. ATC is a flight pattern, not autopilot.
- Promise the AI can build a pipeline alone. ATC is *human-led* agentic SDLC. You are ATC, not a passenger.
