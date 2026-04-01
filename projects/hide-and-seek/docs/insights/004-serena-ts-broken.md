---
title: Serena MCP find_referencing_symbols broken for TypeScript
date: 2026-03-30
phase: 5a
modules: [tooling]
tags: [mcp, serena, tooling, typescript]
---

# Serena MCP: find_referencing_symbols Broken for TypeScript

## Problem

After 10 sessions of planning to use Serena for code navigation, a direct shootout revealed it doesn't work for our TypeScript codebase.

## Root Cause

`find_referencing_symbols` returned empty `{}` for TypeScript type aliases and exported functions — 3/3 failures. The underlying language server couldn't resolve references for TS-specific constructs (type aliases, `as const satisfies` patterns, branded types).

## What We Tested

4 real Phase 5a tasks:
- `find_referencing_symbols` on TS type aliases: FAILED (empty)
- `find_referencing_symbols` on exported functions: FAILED (empty)
- `find_referencing_symbols` on interfaces: FAILED (empty)
- `get_symbols_overview`: Worked, marginal value at ~40 files
- `find_symbol` / `list_dir`: Worked but Grep/Glob are faster

## Decision

Removed Serena from project config and user config. Grep + Read + Glob is the winning stack for TypeScript codebases under 500 files.

## Key Insight

When an AI assistant agrees to use a tool but repeatedly doesn't, that's signal — not laziness. The path of least resistance often IS the right path. Test with data before writing more "remember to use X" rules.

## Also Applies To

Don't install Serena for future TS projects unless: (1) codebase exceeds 500+ files AND (2) language is Python, Java, or Go where LSP references actually work.
