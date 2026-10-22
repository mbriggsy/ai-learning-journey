# Compound Engineering — Deep Dive

Make every unit of engineering work easier than the last. Turn mistakes into institutional knowledge.

---

## What Is Compound Engineering?

Compound Engineering is a Claude Code plugin and development methodology from Every.to (EveryInc) built around a core philosophy: each unit of engineering work should make subsequent units easier — not harder. Traditional development accumulates technical debt; Compound Engineering inverts this by capturing lessons, patterns, and decisions after every piece of work and feeding them back into the system.

**By:** EveryInc (Every.to)  
**License:** MIT  
**GitHub:** [github.com/EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin)  
**Guide:** [every.to/guides/compound-engineering](https://every.to/guides/compound-engineering)

---

## The Problem It Solves

Most codebases get harder to work with over time. Each feature injects more complexity. After years, teams spend more time fighting their system than building on it. Every new feature is a negotiation with the old ones.

Compound Engineering flips this. Bug fixes eliminate entire categories of future bugs. Patterns become documented tools. Over time, the codebase becomes easier to understand, easier to modify, and easier to trust.

The same problem applies to AI-assisted development: Claude makes the same types of mistakes repeatedly across sessions because there's no feedback mechanism. Compound Engineering creates that mechanism.

---

## The Core Loop

### Plan → Work → Review → Compound

**Plan (40% of time)**  
Spell out requirements, approach, and edge cases. Let the agent research by reading the codebase, finding patterns, and suggesting approaches. Make the plan explicit and reviewable.

**Work (10% of time)**  
Execute the plan. Tell the agent the outcome, not the instructions. "Add email notifications for new comments" not "Open this file, find this function, add this code."

**Review (40% of time)**  
Review the output AND the lessons learned from the output. This isn't just "does it work" — it's "what did we learn."

**Compound (10% of time)**  
Feed results back into the system. Document what the plan missed. Capture patterns so they don't need to be re-discovered. This is where the magic happens.

### The 80/20 Split

80% of compound engineering is in Plan and Review. 20% is in Work and Compound. This inverts the typical developer instinct of diving into code and spending most time writing implementation.

---

## What's Included

### Workflow Commands

- `/workflows:brainstorm` — Deep research and ideation, output saved to `docs/brainstorms/`
- `/workflows:plan` — Structured planning with requirements and edge cases, saved to `docs/plans/`
- `/workflows:compound` — Post-work lesson capture, categorized into `docs/solutions/`

### Triage System

- `/triage` — Review and prioritize findings into structured todos in `todos/` directory

### Project Structure

```
your-project/
├── CLAUDE.md          # Agent instructions, preferences, patterns
├── docs/
│   ├── brainstorms/   # /workflows:brainstorm output
│   ├── solutions/     # /workflows:compound output (categorized)
│   └── plans/         # /workflows:plan output
└── todos/
    ├── 001-ready-p1-fix-auth.md
    └── 002-pending-p2-add-tests.md
```

### Cross-Tool Compatibility

The plugin includes a Bun/TypeScript CLI that converts plugins to other AI coding tools:

```bash
bunx @every-env/compound-plugin install compound-engineering --to opencode
bunx @every-env/compound-plugin install compound-engineering --to codex
bunx @every-env/compound-plugin install compound-engineering --to gemini
bunx @every-env/compound-plugin install compound-engineering --to copilot
bunx @every-env/compound-plugin install compound-engineering --to kiro
```

Also supports Factory Droid and Pi formats. Skills are symlinked (not copied), so changes in Claude Code are reflected immediately.

---

## Installation

```bash
/plugin marketplace add https://github.com/EveryInc/compound-engineering-plugin
/plugin install compound-engineering
```

---

## The CLAUDE.md Flywheel

CLAUDE.md is the most important file. It's what Claude reads every session. Put your preferences, patterns, and project context here. When something goes wrong, add a note so the agent learns.

**Compounding move:** When the agent makes a mistake, don't just fix it — add a note to CLAUDE.md so the mistake never happens again. Each correction makes every future session better.

---

## Why Developers Love It

From a user comparing Compound Engineering with Superpowers on GitHub: "Every's does more research up front — I can give it a feature description, it will read a huge amount of text and produce plans which suggest things I never would have thought of on my own. It also integrates a useful 'compound' step at the end where lessons are captured so they don't need to be re-discovered each time."

From Will Larson (Irrational Exuberance): implementing Compound Engineering in production monorepos was "straightforward, taking about an hour" and provided a standard approach the entire team could adopt.

---

## Pairs Well With

- **Superpowers** — Use Superpowers for TDD execution, Compound Engineering for the research/compounding phases
- **Claude-Mem** — Compound Engineering captures lessons in files; Claude-Mem captures session context in memory. Complementary persistence layers.
- **Code Review** — Let Code Review catch issues, then the Compound step documents what to avoid next time

---

*Last updated: February 2026*
