---
title: A cheaper effort tier drops redundancy before it drops hits; score an effort A/B by how many reviewers find each defect, against a fresh control
date: 2026-11-04
phase: the effort rule (measured 2026-10-31, session ai-learning-journey-1b)
modules: [~/.claude/CLAUDE.md, projects/skills/ultramode-code-review/references/workflow-template.md, projects/the-back-nine/.claude/workflows/caddie.js, projects/the-back-nine/.claude/workflows/caddie-ab.js, projects/the-back-nine/.claude/workflows/council.js]
tags: [effort, xhigh, high, subagents, fan-out, code-review, redundancy, convergence, lenses, a-b-test, control-arm, blind-judges, frozen-clone, answer-key, blindness-audit, token-cost, measurement]
---

## Problem

- Every minion inherited the session's xhigh. Running them at high would roughly halve the bill, so the question was whether review seats could drop to it.
- Counted as found or missed, high looked nearly fine: across two high runs it hit 7 of the 8 confirmed-bug slots, against 4 of 4 for the xhigh control. "One miss in eight" reads like noise.

## Root Cause

- Effort mostly buys extra checking: Anthropic's effort docs and blog say a higher level tests more edge cases and verifies more of its own work. In a multi-lens review, that extra checking shows up as convergence: several lenses reach the same defect independently.
- The defect that separated the arms was the schema-v4 codec header. It claims decode only ever rewrites a label, but decode also deletes a corrupt `savedRecommendation`. Four lenses found it in the original xhigh review, and four did in the fresh xhigh control (three findings and one overflow title). In the high runs, zero lenses found it in run 1 and one did in run 2. At high the defect survives on one lens's luck, so one high run in two missed it outright.
- The price of that redundancy, in output tokens: 627k at xhigh against 288k and 316k at high. The xhigh run also took 544 steps against 358 and 377, and 22 minutes against 16.

## Fix

- **The rule** (global `~/.claude/CLAUDE.md`, "Effort on every spawn"): judging seats run at xhigh; fetch-and-carry seats run at high; when unsure, xhigh. A measuring harness keeps the effort its baseline ran at. Every spawn sets `effort` explicitly, because an omitted level inherits the session's. Commit `b5e2acd0` set xhigh on the review template's seats and on the B9 Caddie, Caddie A/B and council workflows.
- **The method that made the number trustworthy:**
  1. **Frozen code.** Run `git clone --shared --no-checkout` on the live repo, then `git remote remove origin`. Check out the reviewed commit detached, delete `main`, and run `git reflog expire --expire=now --all`. After that, `git log --all` ends at the reviewed commit. Set `core.longpaths true` in the clone: a clone doesn't inherit the source repo's config, and the Back Nine's long insight filenames failed to check out under the scratchpad.
  2. **Find the answer key before the reviewers do.** The original review had saved its results into the same evidence folder its brief pointed reviewers at. The folder's README had also been edited after the review to describe one of its findings. Copy only the files dated before the review started, and cut the sentences added after it.
  3. **Three arms, one setting different.** All three ran the same 11 lenses with the same prompts; only `effort` changed. Two arms ran at high and one was a fresh xhigh control. Without a control, a miss at either level could just be luck.
  4. **Blind judges who see every arm.** Two judges each saw all three runs at once, under labels that didn't say which effort produced them. They matched every run against the original review's findings, first deduped into distinct defects: the original's 6 confirmed findings were 4 bugs, because 3 lenses had found the same one.
  5. **Audit after the run.** Each transcript's `"effort"` field confirmed every record matched its arm. An allowlist audit of all 1,334 tool calls (insight 011) found no read of the live checkout except its shared `node_modules`. Every bare `git` ran after a `cd` into the clone, and nothing touched the answer key. The prompt's "never read the main checkout" was only a request; the audit is what proved the arms blind. It ran four days after the scorecard was reported, so for those days the scorecard stood on a belief.

## Key Insight

Score an effort (or model) A/B on a review by **lenses per defect**, not just found or missed. A cheaper tier tends to keep the single hits and lose the convergence, and convergence is what makes a fragile defect reliably caught: a defect that only one lens finds is one roll away from being missed. Run a fresh control at the baseline setting, use blind judges who see every arm at once, and audit after the run that the arms were blind and ran at the setting you meant. Do that audit before reporting the score.

## Also Applies To

- Moving a review panel to a cheaper model. The Caddie Sonnet A/B was the same shape: its Sonnet seats kept most findings, but false-passed the walk's top calm-but-wrong line, which three Opus seats caught.
- Cutting lenses or refuters to save tokens: the first thing lost is redundancy, and it can't be seen in a found/missed count.
- Any eval that reruns a past review or decision: the run's own outputs often sit in the folder its brief points at.
