---
title: "Generative-image model priors are unbreakable by prompt engineering — remove or recontextualize, don't argue"
date: 2026-04-23
phase: playtest-harness docs migration (observed across Mar-Apr 2026 card/roster generation)
modules: [scripts/generate-cards, scripts/regen-*, public/assets]
tags: [imagen, generative-ai, prompt-engineering, asset-pipeline, meta]
---

## Problem

Across ~60 Imagen-4 regens, several concept pairs produced the same wrong output
no matter how the prompt was rewritten, negated, or detailed:

- "Cigar in ashtray" → ember always outboard (fought 13 iters on Direct Order).
- "Venetian blinds" → stripe shadows on surfaces with no line-of-sight.
- "Plus-sized female character" → cartoon cheek-blush ovals; negatives failed.
- "Birthday card envelope" → pristine white greeting-card shape; "manila, folded,
  rubber-banded" didn't override.
- "Two hands at a bar/table" → 3-4 hands. Only "one hand in frame" worked.

## Root Cause

Imagen's training data has strong co-occurrence associations between some
concept pairs. These are distribution priors, not rules or filters — you can't
prompt them out. Negative prompts often REINFORCE the concept's presence (the
model has to consider it to avoid it, re-elevating its probability). Longer
prompts make this worse: more tokens = more vectors into the trained association.

## Fix

Four strategies that work. Pick whichever fits:

1. **Remove the problem element.** Killed cigars entirely on Direct Order after
   13 fight-rolls. Replaced with "smoldering embers in ashtray, no cigar." No
   cigar geometry = no orientation fight.
2. **Recontextualize to bypass.** Intercepted removed blinds. Direct Order closed
   blinds tight — physically consistent with "no stripes."
3. **Use direct IP references to override generic priors.** "Visually modeled on
   Pam Poovey from Archer" overrode Imagen's generic-slim-office-woman prior
   cleanly for Dolores Grieves. Imagen doesn't safety-filter character refs.
4. **Minimum-viable prompts beat bloated ones.** Iter 13 on Intercepted — clean
   rewrite, 5 short clauses, every element mentioned ONCE — was the turning
   point after 12 iters of accumulated edits.

## Key Insight

**When a generative model's prior is load-bearing in its training distribution,
it's not a parameter you can tune from the outside.** No prompt — no matter how
explicit, negated, or detailed — overrides it. The only reliable strategies:
(a) remove the problem element, (b) change context so the prior is satisfied
and irrelevant, (c) reach for a STRONGER prior (direct character ref) that
overrides the weaker one.

Meta-lesson: when a concept-pair resists prompting, STOP iterating on the
prompt. Re-architect the scene. Token cost of argument grows linearly; the
probability of winning the argument does not.

Heuristic: if iterations 4-6 on the same prompt-concept pair produced
essentially the same failure mode, stop and re-architect. You're paying to
confirm the prior, not to break it.

## Also Applies To

- Midjourney, DALL-E, Stable Diffusion — same mechanism.
- LLMs resisting specific output phrasings, TTS resisting pronunciations, music
  models resisting style combinations.
- Video generation with physics priors (gravity, lighting) — fight with words
  fails, re-architecture works.
