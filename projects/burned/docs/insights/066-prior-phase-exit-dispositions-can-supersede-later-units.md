---
title: Prior-phase exit dispositions can supersede later-plan units — deepening agents miss the "already done" signal and re-prescribe work the upstream phase explicitly told them to drop
date: 2026-05-22
phase: trailer-phase-4
modules: [docs/plans/origin-trailer/phase-4-remotion-composite.md, videos/trailer/sample-eval/spike/spike-results.md, videos/trailer/src/hooks/useFonts.ts, videos/trailer/src/components/SpikeFontWeightDemo.tsx]
tags: [planning, deepening-drift, plan-execution, prior-phase-evidence, redundant-work, exit-dispositions, multi-phase, trace-before-patch]
---

## Problem

Started Phase 4 execution. The plan's first unit (Unit 4.0 — Font Load Spike, time-boxed 60 min, added by deepening amendment MA-7) prescribed building a `SpikeComposition.tsx`, rendering a 6-weight font gradient, writing `PHASE-4-FONT-SPIKE.md`, and implementing `useFonts.ts` per the PASS/FAIL verdict. Plan risk register at L3670 marks the underlying question "UNRESOLVED per Phase 3 deepening — Medium severity."

A pre-flight scan of the trailer source tree showed `useFonts.ts` already in production shape using `weight: '200 700'` for all three variable woff2 families, `SpikeFontWeightDemo.tsx` already existed rendering Clash Display at 3 weights, and `out/spike-frame-test.mp4` was already on disk. `sample-eval/spike/spike-results.md` lines 58-61 + 240-242 explicitly: *"the deferred Unit 4.0 font spike … can be **DROPPED**. PASS branch fires."* Phase 0 Unit 0.5 had answered the question and explicitly told Phase 4 deepening to drop the unit.

## Root Cause

Phase 4 deepening (2026-05-17, 10-agent parallel review including 8 CE personas + emil + /brief) added Unit 4.0 anyway. The amendment MA-7 cited insight #031 (preferred-architecture-deferred-then-discovered-at-integration) as the "we don't want to discover at integration time" rationale — but the integration had already happened in Phase 0 Unit 0.5 with the answer locked, and none of the 10 agents grepped Phase 0's spike artifacts before re-adding the gate. The risk register inherited a "UNRESOLVED" claim from Phase 3 deepening notes that themselves were stale relative to Phase 0 evidence — a two-link cascade where neither hop re-checked the upstream truth.

Same family as insight #061 (plan enumerations decay) but a different shape: not stale data inside a unit, but a whole unit that is itself obsolete. Same family as #060 (forward-deferred gates ratchet structural debt) but the inverse direction: #060 kicks gates forward into a phase that can't satisfy them; this one re-adds gates a prior phase has already satisfied.

## Fix

Surface the finding to the user before writing any code, with three paths: DROP (Phase 0's explicit instruction), MINIMAL VERIFY (extend the existing demo to 3 families × 3 weights for ~15 min), or RUN AS WRITTEN (~60 min of process theater). Recommend DROP + a single carry-forward acceptance check at Unit 4.1 ("first composite render visually validates all 3 families at non-default weights"). Update plan body to mark Unit 4.0 resolved-by-Phase-0, fix the stale "UNRESOLVED" risk register entry, and link back to `spike-results.md`. Move to Unit 4.0a.

## Key Insight

**At plan-execution entry, every unit's central question is a CLAIM about the project's current resolution state.** Plans get deepened; deepening agents re-prescribe gates citing risk language that may have been resolved by prior phases the agents didn't read. Before executing any unit, ask "did an earlier-phase exit doc or spike already answer this unit's central question?" — grep prior `PHASE-N-EXIT.md`, `sample-eval/*/results.md`, and the actual artifacts the question touches (`useFonts.ts` if the question is "does font loading work").

The detection trigger: a unit's "deferred to implementation" language paired with "NEW per deepening amendment" — those two together mean recent agents added something they thought wasn't decided. If a prior-phase exit doc says it was decided, the prior-phase exit doc wins. Spike-results.md beats plan deepening narrative when they disagree (corollary of #057 generalized from values → units).

## Also Applies To

- Any multi-phase plan where deepening passes run weeks or months after upstream phases close — deepening agents see plan body, may miss exit-doc dispositions
- Any "verify X works before downstream consumes it" gate added in deepening — first check whether X has already been verified in an upstream spike
- Doc-review agents auditing risk registers — flag any "UNRESOLVED" claim that isn't traced back to a verified-still-open source; "still unresolved" is itself a claim that decays
- Project handoffs where one party's exit-disposition becomes another party's plan-input — the disposition is sticky only if the receiving plan inherits it explicitly; otherwise it evaporates and the next plan re-invents the gate
- Any task list generated from a plan body without cross-checking the repo's current state — task lists inherit the plan's obsolescence
