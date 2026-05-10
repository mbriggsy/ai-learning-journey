---
title: TypeScript wrappers can't restrict Claude subagents — enforcement lives at the frontmatter tools whitelist, not in the orchestrator's memory
date: 2026-04-23
modules: [docs/plans]
tags: [subagents, mcp, tool-allowlist, enforcement-boundary, claude-code, cross-process, frontmatter]
---

## Problem

Phase 4 of the playtest-harness plan specified a `SeatPageWrapper` — a TypeScript wrapper around Playwright's `Page` object that runtime-refuses calls to `DISALLOWED_PAGE_METHODS` (`evaluate`, `goto`, `addInitScript`, etc.). The plan called this "Layer 2 of the two-layer defense" keeping Claude seat-agents from escaping their allowlist.

Five independent reviewers (coherence, feasibility, scope-guardian, security-lens, adversarial) converged on the same finding: **the wrapper enforces nothing the agent can actually reach.** Unit tests would pass by calling the wrapper directly in test code, but real seat agents would bypass it entirely. The entire Unit 6 work stream was theater.

## Root Cause

Claude Code subagents do not call `wrapper.evaluate()`. They call MCP tools — `mcp__playwright__browser_click`, `mcp__playwright__browser_evaluate`, etc. Those tool calls are routed by the Claude Code client to the `@playwright/mcp` server, which **runs as a separate process** and holds its **own** Playwright `Page` handle (typically via CDP or its own Playwright bindings).

The wrapper is an object in the orchestrator's memory space. The MCP server never sees it. The subagent never touches it. The "Layer 2 defense" only constrains code the orchestrator itself writes that happens to use `wrapper.*` — which, in Phase 4's architecture, is nothing, because the agent is the only consumer of that Page.

The designer reasoned about enforcement in terms of TypeScript types and runtime checks (the usual language-level tools) without noticing that subagent capabilities cross a **process boundary** (Claude Code client → MCP server) that in-process wrappers can't see through.

## Fix

Architectural reshape of Phase 4:

1. **Primary enforcement = custom `.claude/agents/playtest-seat.md`** with explicit frontmatter `tools:` whitelist listing only allowed MCP tools (e.g., `mcp__playwright__browser_click`, `browser_snapshot`, `browser_fill_form`, `Write`). Claude Code enforces this at the tool-surface boundary — tools absent from the whitelist are not exposed to the subagent at all.

2. **`subagent_type: 'general-purpose'` is wrong** when capability restriction matters. `general-purpose` inherits the parent session's full tool surface, including every MCP tool in `.claude/settings.local.json`. Must use a custom `subagent_type` bound to the custom agent file.

3. **MCP server-level config** can further restrict capabilities (e.g., `@playwright/mcp --allowed-origins`), but the primary gate is the subagent frontmatter.

4. **`SeatPageWrapper` removed** from v1. The wrapper was the wrong abstraction. If future work needs to restrict orchestrator-side code that handles raw Pages, the wrapper can be added then — but it never was the seat-agent enforcement layer.

## Key Insight

**Before designing enforcement for a subagent, identify which process boundaries the subagent's capabilities actually cross.** Language-level wrappers (TypeScript type narrowing, runtime method-refusal, prototype-chain checks) only constrain code in the **same process** as the wrapper. Subagent capabilities that reach across processes — MCP tools, subprocesses, network APIs — are exposed by the outer process's grant and must be enforced at **that grant boundary**, not inside the outer process.

For Claude Code specifically: the grant boundary is the subagent's frontmatter `tools:` whitelist. Everything else — prompt instructions ("don't call X"), code-level wrappers, post-hoc audits — is defense-in-depth, not primary enforcement. "Don't call X" in a prompt is a suggestion; "X isn't in your tool list" is a constraint.

**Test the enforcement by threat-modeling, not by unit-testing the wrapper.** Unit tests that call the wrapper prove the wrapper's contract — they don't prove the subagent is actually forced through it. Ask: what code path does the subagent actually use? If the wrapper isn't on that path, it's theater.

## Also Applies To

- Any agent-native system where a subagent receives capabilities via MCP, subprocess spawn, or API key grant. The grant surface (MCP whitelist, subprocess env, API scope) is the enforcement boundary. In-process wrappers constrain only the outer process.
- Browser extensions granting tool surfaces to content scripts: the manifest permissions (analogous to MCP whitelist) are the boundary; runtime wrappers in the extension's background page don't constrain content-script behavior.
- Plugin architectures where the host process wraps APIs: if the plugin runs out-of-process (worker, subprocess), the wrapper must happen at the IPC boundary, not in the host's memory.
- Security reviews of AI-agent systems: always ask "where does the capability actually land?" before trusting any wrapper-based enforcement. Reviewers should trace the tool invocation path end-to-end, not just read the wrapper's code.
- Planning documents proposing any "Layer 2" defense: verify the defense is on the actual threat model's attack path. Theater defenses pass reviews by looking sophisticated without doing anything.
