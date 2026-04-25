---
title: Research agents paste plausible-but-wrong URLs and counts; audit before they calcify
date: 2026-04-25
phase: Phase 1B-VERIFY (citation audit on Phase 1B reference docs)
modules: [projects/data-engineering/atc/reference]
tags: [research-agents, citation-hygiene, hallucinated-references, primary-source-wins, anthropic-blog-urls, x-com-200-false-positive, count-drift]
---

## Problem

Five parallel research agents synthesized a comprehensive Phase 1B reference doc. The doc looked solid — concrete repos cited, specific dates, named skills, tool counts. Briggsy asked one targeted question ("where did `feature-dev` come from?"). Verification then found:

- ~9 of ~30 cited URLs returned HTTP 404 (Anthropic Code Review, Genie API GA, Mosaic AI, Agent Bricks, multi-agent research blog, Cursor docs, Gemini CLI docs, …)
- A specific GA date ("April 22, 2026") was unverifiable; only "April 2026" was supported
- Specific catalog counts ("46 skills, 28 agents, 230+ tools") were either wrong on the day, or destined to drift within weeks
- Boris Cherny X status IDs returned HTTP 200 — but X.com returns 200 for ANY status path

About half the agents' citations were accurate. The other half were plausible-looking fabrications.

## Root Cause

Research agents emit citations the same way they emit prose — plausible-by-pattern, not retrieved-by-fetch. Four reliable fabrication patterns observed:

1. **`anthropic.com/news/<slug>` over-defaulting.** Anthropic content actually splits across `claude.com/blog/`, `anthropic.com/engineering/`, and `anthropic.com/news/`. Agents default to `/news/` because it's the most common shape in training-data shadow; in 2026 it's often the wrong subdomain.
2. **Specific dates within plausible ranges.** Day-precision ("April 22, 2026") looks authoritative but isn't actually retrieved. Month-precision ("April 2026") is more likely real.
3. **Catalog counts that drift.** "46 skills, 28 agents" was true on the day the agent ran. Stale six weeks later. Stale before the doc shipped.
4. **HTTP 200 ≠ "real."** X.com returns 200 for any status path (placeholder served regardless). Cannot verify tweet IDs without an authenticated session.

Crucially: **five parallel agents emitting the same fabricated URL is not five independent confirmations.** It's one shared training-data shadow producing correlated hallucinations.

## Fix

Phase 1B-VERIFY pass before any downstream phase consumes the doc:
- Parallel `curl -sL --max-time 12 -o /dev/null -w '%{http_code}'` HEAD-check on every URL (~30 URLs in seconds)
- Replace 404s via `mcp__gemini-grounding__search_with_grounding` to find canonical posts
- Inspect local sources directly (vendor plugin manifests, package.json, CHANGELOGs, repo trees)
- Soften specific counts in body text → keep names, drop numbers; counts move to date-stamped audit-log footers
- Remove unverifiable specifics (X tweet IDs, day-precise GA dates) and replace with verifiable broader facts (release notes, "GA in April 2026")
- Append a `## Citation audit log` section to each doc, dated, listing what was verified vs. softened

## Key Insight

**Audit research-agent citations at synthesis time, not after publication.** The audit cost grows linearly with every downstream doc that quotes the citation; a 5-minute parallel-curl HEAD-check before Phase N+1 starts is exponentially cheaper than re-auditing every paragraph downstream.

For long-lived docs: **counts belong in audit logs, not body text.** Names, structures, and verbatim quotes (e.g., Anthropic's "fewer than 1% marked incorrect") survive drift. Numbers don't.

For inherently unverifiable claims (X status IDs, day-precision dates with no anchor): **don't cite them at all.** Cite the verifiable broader fact instead (release notes, month-precision GA, archive.org snapshot).

## Also Applies To

- **Any multi-agent research synthesis.** Not unique to ATC. CE-style document-review, plan-deepening, doc-coauthoring all consume research-agent output and need the same audit.
- **External-link-heavy documents in general.** Vendor docs reorganize routinely (Databricks moved `docs.databricks.com/en/…` → `docs.databricks.com/aws/en/…` in 2026). Anthropic split blog content across three subdomains. URLs decay.
- **Specs, plans, deepening passes** (per `feedback-plans-are-baking-recipes`). Plans reference specific URLs/versions/APIs; verify before the plan executes, not during.
- **Memory and insight docs** (this file too). Verify against session evidence before citing claims about agent behavior.
