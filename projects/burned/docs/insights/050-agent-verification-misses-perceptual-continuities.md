---
title: Agent-eye verification systematically misses perceptual continuities — calibration-style passes need eye-in-loop for light, shadow, motion
date: 2026-05-06
modules: [scripts/generate-cards, public/assets/cards]
tags: [imagen, eye-in-loop, asset-pipeline, verification, perceptual-continuity, asset-review, agent-blind-spots, prompt-engineering]
---

## Problem

Burned card art regen this session, iter 1: my critical-eyeball pass cleared
every check I was tracking — composition, anatomy, frame-fit, deck cohesion,
no text leak, full prompt comment about the bulb-tripod "happy accident"
deviation. I shipped it. Briggsy spotted the actual flaw in seconds: the
cone of light hard-truncated mid-air at the operative's torso with no
physical motivation — a graphical polygon rather than a physical event.

Same shape as the drama-beat clipping bug captured in
`feedback-eye-in-loop-beats-calibration-for-motion.md` (calibration ran
~10 days while every drama beat clipped to ~30% visible). My agent-style
asset review was operating in calibration mode: checking discrete
properties, not continuous physical relationships.

## Root Cause

Agent-style verification decomposes images into checkable PROPERTIES —
composition, anatomy, color cohesion, text presence, frame fit. It does
not naturally read CONTINUITIES — the relationships across the image that
a human eye reads in one glance:

- **Light continuity** — does the cone follow plausible physics? Falloff
  gradual or terminated arbitrarily?
- **Shadow direction** — do all shadows point away from the same source?
- **Depth cues** — does atmospheric perspective hold? Near/far fog
  consistent?
- **Motion timing** — does animation's visible shape match design?
  (insight 049)

These are fluency reads, not yes/no checks. My eye locks on items I can
name and discretize. Continuities live in the gaps between named items.

## Fix

Three iterations to land Burned. The technical fixes that finally worked:

1. **Cone continuity prescribed explicitly** — "cone CONTINUES past the
   operative to the screen-left edge, NO hard-edged truncation in mid-air,
   light fades GRADUALLY with soft gradient falloff." Iter 1 had none of
   this; iter 2 added it.
2. **Compositional layout in fractions** — "operative occupies LEFT
   TWO-THIRDS of the frame, bulb at FAR RIGHT edge as compositionally
   subordinate." Imagen responded to fractional structural directives
   where pose/scene prose alone failed to constrain layout. Iter 3 unlock.
3. **Emotional payload named explicitly** — "caught/discovered, frozen
   at the instant of being SEEN" produced a reactive pose where "operative
   on rooftop with flashbulb" produced a passive walking figure. Pose
   shifted as a direct response to naming the EMOTION, not the action.

Archives: `_archive/burned-2026-05-06-iter1-cone-truncation-rejected.webp`,
`_archive/burned-2026-05-06-iter2-operative-too-small-rejected.webp`.
Commits `fea581fd` (iter 1) and `a828c12e` (iter 3).

## Key Insight

**An agent-style verification pass is a calibration check, not a fluency
read.** It decomposes; the eye reads continuities. Whenever the deliverable
is something a human will FEEL — light physics, motion timing, atmosphere,
emotional read — agent verification is necessary but insufficient. Either:

- Get a human eye on it before declaring done, OR
- Build a quantitative gate that captures the continuity (e.g., the rAF
  opacity sampling in `tests/e2e/drama-beat-timing.spec.ts` for motion
  shape).

Don't pretend a property checklist substitutes for a fluency read.

## Also Applies To

- **Animation review.** Already established in
  `feedback-eye-in-loop-beats-calibration-for-motion.md` — agents miss
  motion timing. Same root cause; insight 050 is the generalization.
- **Generated text/copy.** "Reads naturally" is a fluency property; a
  grammar+tone keyword checklist does not capture it.
- **Music/audio generation.** Mood, pacing, mix balance — continuities.
- **Prompt engineering for visual models.** Complements insight 018 (priors
  are unbreakable). When a continuity is broken, name it explicitly in the
  prompt; when emotional payload is the actual goal, name THAT, not the
  scene. Fractional layout directives ("LEFT TWO-THIRDS") constrain
  composition where prose alone fails.
- Any deliverable where the user reaction starts with "this feels wrong"
  rather than "this has bug X."
