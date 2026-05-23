---
title: A foreign motion dialect inside a coherent visual album reads "weird" regardless of easing-curve perfection
date: 2026-05-23
phase: Phase 4 — Origin trailer composite
modules: [videos/trailer/src/scenes, videos/trailer/src/components]
tags: [motion, design-coherence, vocabulary, easing, root-cause, multi-scene-composition]
---

## Problem

BURNED trailer S04 R1 used a linear-velocity scroll of `htp-fullpage.png` over 19 seconds as the load-bearing visual. Briggsy eye-checked the result: *"the scrolling is s04 almost looks like a conveyor belt, looks weird."* Initial hypothesis space focused on the linear curve — the temptation was to bezier-ease the velocity, sync velocity beats to VO cues, add subtle settle moments. Reasonable patches that would absolutely improve THE scroll. None of them would fix the actual problem.

## Root Cause

The scroll wasn't broken because it was linear. It was broken because **scrolling — at any velocity curve — was a foreign motion dialect inside an otherwise object-cascade-grammar trailer**:

- S01 cold open: card flashes + R15 stamp slaps + LOGO_SPRING_COLD spring entry
- S02 briefing setup: venetian-blind pan + dossier folder crossfade (EASE_DRAWER)
- S03 mission background: 6 operative cards cascade diagonally with progressive tilt (–8° → +12°), 15f stagger × 24f settle (EASE_OUT_EMIL)
- S04 (R1): linear scroll of one tall PNG

Every other scene speaks the SAME grammar: discrete paper objects entering with deliberate motion + progressive tilt + stagger + EASE_OUT_EMIL or spring envelopes. Then S04 suddenly speaks Notion-autoscroll. The reader registers the discontinuity even when they can't name it — they label it "conveyor belt" but the underlying failure is dialect mismatch.

A perfectly bezier-eased scroll would still be a scroll. Still a foreign dialect. The eye would still pattern-match it against S01/S02/S03 vocabulary and find it doesn't rhyme.

## Fix

Replaced the linear scroll with a 7-page dossier cascade — pages tossed onto the briefing-room desk like S03's operative cards, same EASE_OUT_EMIL settle envelope, same entry-tilt-resolves-to-final pattern, same chrome-decay focal hierarchy. Each VO beat = one page landing. The trailer now speaks ONE motion grammar across S01-S04.

`HtpDossierHero` + `CardArtHalo` + `GoofyStatCaption` components shelved (not deleted) — preserved for potential reuse but not in the active S04 scene. New components: `DossierPage` (paper shell + land/decay envelopes) + `DossierPageCascade` (orchestrator + 7 inline content components). Compose-in-code from existing tokens; no Imagen spend.

Briggsy approved R2: *"way better than the conveyor belt!"*

## Key Insight

**When a single scene "reads weird" inside an otherwise-coherent visual album, suspect motion-vocabulary mismatch BEFORE suspecting easing or timing.** The patch-instinct (better easing curve, smarter velocity sync) treats the surface symptom; the rip-out instinct (swap the motion idiom entirely) treats the root cause.

Trigger questions for the diagnosis:
1. What motion vocabulary do ALL OTHER scenes share? (Sketch the grammar: object types, entry envelopes, stagger patterns, tilt language.)
2. Does THIS scene speak the same grammar? (Honest answer.)
3. If no — does perfecting the easing of THIS scene's existing motion bring it INTO the grammar, or only soften the misfit?
4. If only softens — rip out, redesign in the established grammar.

The patch path is seductive (low cost, "just one more iteration"). The rip-out path is correct (matches the bar).

## Also Applies To

- **Any multi-scene composition (trailer, demo reel, animated explainer).** Define the motion vocabulary as a contract early; treat per-scene deviations as flags, not features.
- **Mixed-component pages where one component uses a different animation library** (e.g., GSAP + Framer Motion side by side on the same page). The motion-style discontinuity reads as "off" the same way; pick one, port the other.
- **UI surface where one widget uses CSS transitions and adjacent ones use spring physics.** Same dialect problem at the component scale.
- **Game scenes where one card type's reveal animation diverges from the rest of the deck's grammar** — the diverging card draws disproportionate attention not from importance, but from dialect mismatch.

Inverse useful: if you WANT a beat to stand out (the trailer's payoff stamp, a hero reveal, a "look here" moment), giving it a unique motion grammar IS the tool. But it's a tool you wield deliberately, not a side effect of building scenes in isolation.
