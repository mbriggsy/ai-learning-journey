---
title: Triage agent fix paths anchor subsequent investigation toward presented hypotheses
date: 2026-05-01
modules: [docs/testing/playtest/runs/, scripts/playtest/agents/playtest-triage.md, src/client/shared/DramaOverlay.tsx]
tags: [debugging, triage, anchoring, instrumentation, eye-in-loop, drama-overlay]
---

## Problem

Calibration issue 008 ("ACTOR drama beat absent or imperceptible before DefusePlacement sheet") was triaged with two hypotheses (lazy-load race, visual conflation with placement sheet's hero card) and three proposed fix paths (Option A: eager-load DramaOverlay, Option B: strengthen visual transition between drama and sheet, Option C: eye-in-loop disambiguation first).

Both stated hypotheses were wrong. Both Option A and Option B would have shipped real code changes that didn't fix the actual cause (drama beats clipping to ~30% of designed visible duration due to a GSAP position parameter bug). Only Option C — eye-in-loop — surfaced the truth, and only because Briggsy described what he saw in concrete language ("camera flash") that didn't fit either hypothesis.

The session almost picked Option A. The Option B fix would have been adopted, claimed to "land" on a calibration retry that still showed clipped beats, and the actual bug would have stayed buried under additional code.

## Root Cause

Triage agents (correctly) propose fix paths without running the bug live. Their hypotheses come from code reading + log inspection. When those hypotheses are wrong, the proposed fix paths bias the debugging toward "which of these is right" rather than "what does instrumentation show is happening." Issue 008's hypotheses were both *plausible* — and both diverted attention from the third possibility (a quantitative timing bug below the resolution of state-polling agents).

## Fix

When a triage finding is presented as "two hypotheses + three fix paths," **always run the eye-in-loop / instrumentation option FIRST**, even if a code-only option looks tempting. Treat the proposed fix paths as a menu of *contingent* moves keyed off what instrumentation actually finds — not as the candidate set for the answer.

For motion-quality / vibe-quality findings specifically: the instrumentation cost is ~5 minutes (poll DOM at 50ms intervals during the suspected event, log opacity + visible slot). That investment dominates any code-only path that might be wrong.

## Key Insight

**Triage hypotheses anchor investigation. The proposed fix paths feel like the candidate set, but they're only as good as the diagnosis that produced them — and a wrong diagnosis silently constrains what's even considered.** When a finding has *any* "feels rushed / feels absent / blink / camera flash / didn't register" component, instrument BEFORE picking from the menu. The menu was built without the data; the data may not be on the menu.

A corollary: if the triage agent proposes "eye-in-loop first" as one of the options, that's a tell that the agent itself didn't have enough signal to commit. Take the hint.

## Also Applies To

- Any planning artifact that proposes "Option A / B / C" without running the suspect path. The recommended option is often "do the cheapest disambiguation first," and the impulse to skip past it loses the run.
- Multi-agent code review where one reviewer proposes a fix and others critique it on its merits — the fix's framing biases the critique toward whether-it's-right rather than whether-the-problem-is-correctly-stated.
- Bug reports from users / playtest agents that include a presumed root cause. Treat their cause as a *symptom report*, not a diagnosis. The Pixel 7 "camera flash" report had no proposed cause — that's why it dislodged the anchored hypotheses.
