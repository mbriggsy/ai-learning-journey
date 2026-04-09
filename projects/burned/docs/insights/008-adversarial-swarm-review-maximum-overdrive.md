---
title: Adversarial swarm review — "maximum overdrive" due diligence
date: 2026-04-06
phase: post-review
modules: [full codebase]
tags: [process, review, agents, quality, methodology]
---

## Context

After completing 7 TODO items (feature, cleanup, fixes), we committed clean and then launched a hostile review swarm — not scoped to the diff, but against the entire codebase. The metaphor: a hostile consultant doing acquisition due diligence. They don't know us, don't like us, and are looking for reasons to walk away.

## Why Not Diff-Scoped

A diff-scoped review only catches issues in files you touched. A full-codebase adversarial review catches:
- Systemic architectural rot that no single diff reveals
- Convention drift that accumulated across phases
- Security gaps in code that "works" but was never scrutinized
- Test coverage holes where entire subsystems have zero assertions
- Performance characteristics that only matter at scale

The diff is 29 files. The codebase is 60+. Reviewing only what changed leaves 30+ files unexamined.

## The Swarm Composition

Seven agents, each with a distinct adversarial mandate:

| Agent | Hunting For | Why This One |
|-------|------------|-------------|
| Security Sentinel | Exploits, injection, info leakage, session hijacking | New message type + projection changes = new attack surface |
| Silent Failure Hunter | Game-freezers, state desync, timer races, zombie sessions | Real-time game where "silently wrong" = permanently stuck |
| Architecture Strategist | Boundary violations, scaling bombs, dead abstractions | 6-phase project — conventions declared early may have drifted |
| Frontend Races Reviewer | WebSocket ordering, store races, reconnect timing | React + WebSocket + reconnection = race condition paradise |
| Test Coverage Analyzer | What 149 tests DON'T cover | Passing tests prove nothing about untested paths |
| Performance Oracle | Message bloat, render thrash, memory leaks, bundle budget | Party WiFi + cheap phones = hostile runtime environment |
| Pattern Recognition | Convention violations, duplicated logic, dead code | CLAUDE.md claims strict conventions — prove it |

## Key Design Decisions

### 1. Commit before review, not during

The swarm reviews committed code, not work-in-progress. This means:
- The agents see exactly what would ship
- No "I was going to fix that" escape hatch
- Findings map to a specific git SHA
- Clean baseline for before/after comparison

### 2. Full codebase scope, not PR scope

Each agent is told to examine `src/` — the whole thing. They don't know what changed this session. They evaluate the system as-is, like an external auditor would.

### 3. Adversarial framing, not collaborative

The prompt tells each agent to be hostile — "you WANT to find reasons to reject." This counteracts the natural tendency of review tools to be polite and deferential. A hostile framing produces:
- Findings that would otherwise be softened into "consider maybe..."
- Edge cases the author rationalized away
- Exploitation scenarios, not just "this could be improved"

### 4. Parallel launch, sequential synthesis

All 7 agents run simultaneously (3-5 minutes each). Synthesis waits for ALL agents to report. No premature conclusions from partial data. This is critical — the most valuable findings often come from cross-referencing reports (e.g., security says "card IDs are deterministic" + architecture says "projection is allowlist" = information leakage through an otherwise secure channel).

### 5. Severity ratings required

Every agent must rate findings as CRITICAL/HIGH/MEDIUM/LOW with specific file:line references and concrete exploitation/failure scenarios. No hand-waving, no "this might be a problem." Either demonstrate the issue or don't report it.

## When To Use This

- After completing a batch of work (not after every commit)
- Before first production deploy
- After major architectural changes
- When you need confidence that goes beyond "tests pass"
- When the codebase has accumulated enough surface area that manual review misses things

## When NOT To Use This

- Mid-implementation (findings will be noise about incomplete work)
- For trivial changes (overkill, wastes tokens)
- As a substitute for thinking (agents find symptoms, humans find root causes)

## Cost

~7 agent invocations, each reading 10-30 files. Total token cost is significant but bounded. The alternative — shipping a bug to real users at a party — is more expensive in every way that matters.

## Key Insight

**The value of a review is proportional to how much the reviewer wants to find problems.** Friendly reviews confirm what you already believe. Hostile reviews surface what you'd rather not know. The swarm's adversarial framing is the single most important design decision — everything else is logistics.
