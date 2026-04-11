# ai-learning-journey

**A research experiment in autonomous software development: what happens when a senior engineer delegates all technical execution to AI agents and focuses exclusively on vision, taste, and quality.**

---

This is the monorepo for that experiment. Each project in here is a controlled test of a single question — can an agentic loop driven by a human with senior taste consistently produce work indistinguishable from polished commercial software?

Not *"can AI write code."* That question's been answered and it's uninteresting. The interesting question is whether the whole *loop* — planning, implementation, testing, review, commit — can run autonomously under human quality gating.

## The setup

I'm a senior software engineer with decades of experience. **Every project in this repo is deliberately in a technology stack I have no execution experience with.** BURNED is React 19 + Cloudflare Durable Objects + partyserver + Framer Motion — never built it. Undercover Mob Boss was vanilla DOM + GSAP — never built it. The top-down racer is Python pygame — never built it.

That's not an accident, that's the methodology. I pick unfamiliar stacks on purpose, because if I already knew how to execute I'd just execute. The experiment only runs when I *can't* audit the agent's technical decisions on merit — when I'm forced to be the product manager, not the engineer.

## The inversion

In a normal AI/user setup, the user is the domain expert and catches hallucinations on the way through. **Here that's inverted.** The agent is the only one in the system who knows the plane.

- **I own WHAT and WHY** — vision, taste, quality bar, tone, product direction, when something feels off.
- **The agent owns HOW** — architecture, libraries, patterns, type design, build config, migration order, performance tradeoffs.

If the agent defers to me on a technical call out of politeness, nothing catches the mistakes until production. **Pushback is the safety net. Fast agreement is the failure mode.** The whole arrangement only works if the agent actually wields the technical authority I'm delegating. The collaboration runs more like ATC-and-expert-pilot than boss-and-assistant — I direct the destination, the agent knows the plane.

## The methodology: agentic TDD + autonomous SDLC

The loop:

1. **I set a vision and a quality bar.** Usually via a locked product specification — see [`projects/burned/docs/specifications/PRODUCT-SPECIFICATION.md`](projects/burned/docs/specifications/PRODUCT-SPECIFICATION.md) for what that looks like in practice.
2. **The agent plans** using codified planning skills (e.g. `/ce:plan`) that run parallel research subagents, enforce forcing-function sections (interaction graph, state lifecycle risks, API surface parity), and end with a hard "NEVER CODE" gate.
3. **A fresh agent session executes** against the plan. Tests drive the implementation loop — tests are the spec, not documentation after the fact.
4. **The agent reviews its own work** via orchestrated specialist subagents: pr-test-analyzer, code-reviewer, comment-analyzer, code-simplifier, type-design-analyzer, silent-failure-hunter. Each has a narrow job and runs in parallel.
5. **I approve outcomes, not code.** I check whether the deliverable meets the vision and the quality bar. I don't audit the TypeScript. I literally can't — see "The setup" — but also by design, because auditing code is the exact work I'm trying to factor out.

Tests are the spec. The quality bar is the judge. I stay out of the implementation loop entirely.

## The quality bar is load-bearing

Every active project has a literal binary acceptance test. **BURNED's is *"could this look like a frame from an Archer episode?"*** — yes or no, no judgment calls. **Undercover Mob Boss's was *"indistinguishable from a polished commercial party game."*** Not metaphorical bars, not aspirational marketing language — binary tests that every screen has to pass.

The quality bar isn't vanity. It's the acceptance test for the methodology experiment. **If the agentic loop can consistently produce work that meets the quality bar I care about — because I'm a picky senior engineer with taste — then the methodology is real. If it can't, the methodology is bullshit.** The quality bar exists to remove wiggle room from the evaluation.

The phrase I use with the agent: *"so fucking slick water beads off it."* Not metaphorical. Literal. Every project has to pass that test or it doesn't ship.

## The projects

### Active

- **BURNED** — [`projects/burned/`](projects/burned/) — Jackbox-style spy card game in the style of *Archer*. React 19, TypeScript, Vite 8, Cloudflare Workers + Durable Objects via partyserver, Framer Motion with `LazyMotion` + `domMax`. 167 tests passing, product specification locked at v1.0, currently mid-rebuild of the CSS foundation against a newly-generated phase plan.

### Shipped complete

- **Undercover Mob Boss** — [`projects/undercover-mob-boss/`](projects/undercover-mob-boss/) — narrative mob-boss experience on vanilla DOM + GSAP, with Imagen 4 for art and Gemini TTS for narration. **This is the proof point.** It's the existing evidence that an agentic SDLC loop can ship work indistinguishable from polished commercial output. It's the baseline BURNED is being measured against.
- **Top-Down Racer v04** — [`projects/top-down-racer-04/`](projects/top-down-racer-04/) — Python pygame arcade racer. Fourth iteration on the underlying engine. 487 tests passing plus 13 build-verification tests. Merged to main 2026-03-13.

### Shelved — data, not losses

- **Hide and Seek** — [`projects/archive/hide-and-seek/`](projects/archive/hide-and-seek/) — flashlight-tag horror on the top-down engine. 336 tests, full systems working. **Shelved because the visual presentation missed the bar and no amount of systems work fixed it.** Lesson: presentation gap is the first real failure mode of agentic SDLC — the systems layer can be correct while the user-facing layer is still trash, and the loop doesn't automatically surface that gap.
- **Do Not Disturb** — [`projects/archive/do-not-disturb/`](projects/archive/do-not-disturb/) — side-scrolling playful horror set in a hotel. 449 tests, game logic intact. **Shelved when playtesting proved the side-scroller form factor fought the hotel-room setting.** Lesson: some product misfits are structural and can't be fixed with more polish — you have to catch them at the design stage or you're just painting a bad design.

Two failed projects in a row is what drove the current methodology emphasis on **locked product specifications before any implementation**. The failures aren't embarrassing — they're the most useful data in the repo, because they tell you where the methodology's limits are.

### Infrastructure

These aren't experiments — they're the scaffolding that keeps the methodology repeatable.

- **[`projects/hooks/`](projects/hooks/)** — Claude Code hooks for session discipline. `PreToolUse` gates `/brief` before work begins. `PostToolUse` drops a distill marker silently. `Stop` hook enforces `/distill` when work is complete. Together they turn "remember to capture lessons" from a habit into a rule the harness enforces.
- **[`projects/skills/`](projects/skills/)** — custom Claude Code skills built on top of the agentic workflow. `doc-audit` (5 specialized agents, 4 iterations, 100% pass rate on BURNED's documentation), `distill-and-brief`, a forthcoming `/product-specification` skill scaffolded from lessons learned during BURNED's spec authoring.
- **[`briggsy-playbook/`](briggsy-playbook/)** — my own notes on how to work with Claude effectively. Workflow patterns (Quality Bar First, Spec → Plan → Code, Expert-Pilot Partnership), command inventory, session protocols, dated lessons. The human-side mirror of the agent's memory.

### Earlier work

Several learning-phase projects live in the tree (`projects/tic-tac-toe/`, `projects/pacman/`, `projects/archive/conway_game_of_life/`, earlier racer iterations `01`/`02`/`03`). They're historical artifacts from before the methodology stabilized — not part of the current experiment. They're in the repo because this is a journey and journeys include the stumbling.

## If you're here because you want to know whether agentic SDLC is real

The best evidence I can currently point at is Undercover Mob Boss. Go look at it. Ask yourself whether it looks like something one person could have made in spare time. Then note that no human on the project wrote production code — just vision, direction, and approval gates.

The claim isn't *"AI can write code."* The claim is **"an AI agent loop can run a senior engineer's entire SDLC under human quality gating and produce commercial-grade work."** That's a different and more interesting claim, and it's the one this repo is testing.

Current evidence:
- **Yes**, for one project (UMB shipped).
- **In progress**, for another (BURNED, mid-build).
- **No**, for two earlier attempts (H&S and DND shelved) in ways that taught specific lessons now encoded into the methodology.

Each new project is another test. The quality bar is the judge. The goal is to know *when* the methodology works, *when* it doesn't, and *why*.

**The games are the vehicle. The methodology is the destination.**
