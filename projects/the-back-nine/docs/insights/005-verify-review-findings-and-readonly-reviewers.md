---
title: Adversarial-review agents need read-only tools, and confident review findings must be verified before folding
date: 2026-06-05
phase: P1·U0
modules: []
tags: [process, code-review, subagents, workflow, verification]
---

## Problem
A 6-agent adversarial review of the U0 scaffold (a) left probe files littered in `src/engine/` that broke lint/typecheck/build, and (b) produced a confident, wrong finding that — folded uncritically — reddened CI.

## Root Cause
- The review agents ran as the **default workflow subagent (full tool access)**, so they empirically tested the lint by WRITING `_lintprobe.ts` / `_evil.mts` / etc. and never cleaned them up.
- One finding ("pnpm `version:` + `packageManager` conflicts with 'Multiple versions specified'") was authoritative-sounding but **wrong for this monorepo** (no root `package.json` to conflict with). Folding it removed the required `version:` and broke CI setup.

## Fix
- Delete the litter; run reviewers as **read-only** (Read/Grep/Glob/Bash) or explicitly forbid writes in the prompt.
- Re-derive each acted-on finding against the actual source/environment before folding. CI (Earth) caught the bad fold; the review (map) was wrong.

## Key Insight
An adversarial review is an **idea generator, not an authority**. Every finding is a hypothesis to verify against the real source/runner — a confident reviewer can be confidently wrong, and a "fix" folded on faith can be worse than the flaw. Separately: give review agents least privilege (read-only) so the act of reviewing can't mutate what's under review.

## Also Applies To
Any multi-agent review/verify workflow; treating linter / LLM-judge / static-analysis output as suggestions to confirm, not verdicts to apply.
