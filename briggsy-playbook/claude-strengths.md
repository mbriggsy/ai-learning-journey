---
aliases: [strengths, claude-strengths, what-claude-is-good-at]
tags: [playbook]
---

# What to lean on Claude for

Things Claude is reliably good at. Use these as prompts for *"what should I delegate to Claude vs. figure out myself?"*

## Multi-step research across a codebase

**Example:** *"Audit all EK leftover language across the BURNED codebase."* Claude spawns an Explore subagent, reads 30+ files, produces a tiered inventory with `file:line` citations in about 80 seconds.

**Best practice:** Use subagents for bounded research tasks. The **Explore** subagent is specifically tuned for codebase searches and is faster than the main thread.

**When to trust:** Reliable for tracing definitions, finding references, and building inventories. LESS reliable for subtle behavioral inferences about what code *does* under rare conditions.

## Document authoring from a conversation

**Example:** BURNED's `PRODUCT-SPECIFICATION.md` was authored in a single session, section by section, through conversation. Claude drafted, I tore it up, iteration produced a locked v1.0.

**Best practice:** Start with the load-bearing section (quality bar for specs, problem statement for designs). Let Claude draft, push back, iterate. Claude is good at incorporating feedback without losing the structural thread.

**When to trust:** Coherent, well-structured documents from conversation input. Be skeptical of specific factual claims (dates, names, historical references) — verify those.

## Parallel tool calls for investigation

**Example:** When auditing multiple things at once (file A + file B + codebase grep + web search), Claude can fire them in parallel rather than serially.

**Best practice:** Say *"in parallel"* explicitly when you want parallel execution. Claude defaults to serial unless prompted.

## Pushback and friction when Claude has a well-formed opinion

**Example:** BURNED spec session — Claude argued for *"Visual Architecture in the spec."* I argued for *"in phase plans."* Claude pushed back, I pushed back harder with UMB evidence, Claude flipped. Final design was cleaner because of the friction.

**Best practice:** When you have a half-formed instinct, ask Claude to **steelman both sides** before picking. Don't just ask *"what should I do?"* — ask *"what's the case for X and what's the case against X?"*

**When to trust:** Claude's arguments are strongest when grounded in evidence (code, docs, reference examples). Weakest when grounded in abstract principles.

## Reading docs, protocols, and types

**Example:** When I need to understand a new API or framework, asking Claude to read the official docs (via Context7 MCP or direct URL) and summarize is faster than reading them myself.

**Best practice:** Use **Context7 MCP** for library docs. **Gemini-grounding** for general web searches. Don't let Claude guess at API shapes — make Claude verify.

**When to trust:** Reliable for *"what does this function take as arguments?"* Less reliable for *"what's the idiomatic way to use this library in 2026?"* — conventions evolve faster than training data.

## Tracing code flow

**Example:** *"When a player taps a card, trace the full path from DOM event through React state to WebSocket message to server dispatcher to state projection."* Claude walks this path across 8 files faithfully.

**Best practice:** Ask Claude to *"trace the execution path"* explicitly. Give Claude a start point and an end point.

## Structured synthesis of research output

**Example:** After multiple agents report findings, ask Claude to synthesize using `sequential-thinking` MCP. Output is cleaner than letting Claude just summarize.

**Best practice:** Always invoke sequential-thinking after multi-agent research. Forces integration of contradictions instead of cherry-picking.

## Long-horizon reasoning over complex problems

**Example:** The spec-vs-plan-vs-code debate in the BURNED session involved multiple investigation rounds, position flips, and synthesis. Claude sustained the reasoning across many turns without losing the thread.

**Best practice:** For complex decisions, don't rush. Let the conversation breathe. Claude holds context well — use it.

## Maintaining context across many parallel threads

**Example:** The BURNED spec session ran memory updates, file reads, spec authoring, subagent delegation, a major design debate, retheme audit, and multiple rounds of verification simultaneously. Claude kept track of all of them.

**Best practice:** Don't worry about *"am I asking Claude to hold too much in mind?"* — the current Opus model has a 1M token context window. That's enormous. Use it. (That said: quality starts to degrade past ~70% utilization. See [[session-hygiene#Start a new terminal at ~70% context|session-hygiene]] for the wrap protocol.)

## Drafting memory and insight files

**Example:** After a session teaches you something important, ask Claude to *"capture this"* or to draft a memory file. Claude knows the memory structure (frontmatter, types, MEMORY.md index) and will produce well-formed files.

**Best practice:** Distinguish one-time insights (→ `docs/insights/` in the project) from cross-session lessons (→ Claude's memory files). Let Claude propose the right home.

## Running the same review from multiple perspectives

**Example:** The `pr-review-toolkit` has multiple specialist reviewers (security, test coverage, comment analyzer, silent failure hunter, type design analyzer). Running all of them in parallel produces a comprehensive review from angles a single pass would miss.

**Best practice:** For high-stakes ch