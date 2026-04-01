---
title: Module-level let variables make FSM states single-instance only
date: 2026-03-31
phase: 5a
modules: [ai/states/search-state, ai/states/suspicious-state]
tags: [FSM, singleton, multi-seeker, architecture]
---

# Module-Level State Makes FSM States Single-Instance

## Problem (Latent)

`SearchState` and `SuspiciousState` use module-level `let` variables for per-investigation state (`ticksRemaining`, `searchTargets`, `stimulusX`, etc.). This means all instances of these states share the same variables.

## Impact

With one seeker, this is fine — there's only one FSM. With multiple seekers sharing the same state classes, seeker B entering SearchState would overwrite seeker A's search targets, search center, and remaining ticks.

## Current Status

Not a bug today (single seeker). Documented as a landmine for multi-seeker phases.

## Fix (When Needed)

Move all module-level `let` variables into `SeekerAIInternalState` (the per-seeker state bag). The FSM state classes become stateless — they read/write context instead of module globals.

## Key Insight

Module-level mutable state in a class-based system is a singleton pattern in disguise. It works for exactly one instance. If you ever need two, every module-level `let` becomes a bug.

## Also Applies To

Any future FSM state that needs per-instance data. Always store it on the context object, not at module scope.
