---
title: Authoring BURNED's product specification — lessons from a 1M-token session
date: 2026-04-10
phase: spec-authoring
modules: [docs/PRODUCT-SPECIFICATION.md, docs/ideation/2026-04-11-visual-layer-autopsy.md, src/client/]
tags: [process, spec, debate, architecture, retheme, authoring, pattern-learning]
---

## Context

BURNED's visual layer was fragile because the project was built without a product specification. On 2026-04-10, in a single 1M-token Claude Opus 4.6 context session, we authored `PRODUCT-SPECIFICATION.md` v1.0 from scratch. The session produced a locked spec, fixed a cascade of errors that had propagated across 13 files, and established the workflow for future product specifications.

## The headline finding

**BURNED didn't fail because it lacked "Visual Architecture" in its documents. BURNED failed because it lacked a product specification entirely.**

UMB's phase 4 and phase 5 plans both inherited *"indistinguishable from a polished commercial party game"* directly from UMB's `SPEC.md`. The plan-generation agents read the spec, picked up the quality bar phrase, and embedded it into architectural rationale. Token systems, color palettes, clamp formulas, and animation easing all flowed from that one inherited line. **The transitive enforcement pattern worked for UMB.**

BURNED's phase 1–6 plans couldn't inherit anything because there was no spec to inherit from. Each CSS Module made independent decisions — "organized chaos" per the visual autopsy. The fix is not *"put Visual Architecture in the spec"* — it's *"write the spec, then generate a new plan from it."*

## Key learnings

### 1. Specs are loaded every session; phase plans are not

A decision that must be honored in *every* session (bug fixes, feature additions, post-phase work) must live in something loaded every session:
- The SPEC (`docs/PRODUCT-SPECIFICATION.md`)
- CLAUDE.md
- The code itself (self-documenting via grep)

Phase plans are loaded only when Claude is working in that phase. A Phase 4 plan's token system won't help a Phase 7 bug-fix session if the tokens didn't make it into the code.

### 2. "Load every session" does NOT mean "put everything in the spec"

The spec → plan → code → self-documenting-code pipeline produces transitive enforcement *without* bloating the spec. UMB's spec had ONLY the quality bar line for visuals. Phase plans derived the token system from that line. Code embedded the tokens. Future sessions followed the tokens by grep.

**BURNED's spec v1.0 deliberately omits Visual Architecture details.** It has the quality bar (§2), visual reference (§3), form factors (§3.4), and ADR-05 (visual consistency as a product requirement — not an implementation). The token values, clamp formulas, and migration strategy live in a separate CSS Foundation Rebuild Plan, generated from the spec *after* the spec locks.

### 3. The product-level vs. implementation-level split

The user flagged ADR-06 (CSS Modules) in draft with: *"feels kinda like we're forcing an implementation strategy on the planners. Maybe rephrasing from what effect that would have on the user experience?"*

That triggered a full audit of all 10 draft ADRs. Verdict:
- **8 kept, reframed** to lead with user-facing decisions instead of tech-stack choices
- **2 merged** (server Cloudflare + client Cloudflare → one ADR about picking Cloudflare for the full stack)
- **1 removed from spec** (types derived from `as const satisfies`) — pure engineering convention, moved to CLAUDE.md
- **1 new ADR added** (protocol version mismatch halts clients) — real user-facing behavior, worth capturing

Every ADR in v1.0 now leads with *"Decision (user-facing)"* and labels implementation detail as "owned by this spec" or "owned by [specific plan]."

### 4. Hallucinated references calcify in days (the Saul Bass incident)

"Saul Bass" as BURNED's visual reference was a Claude hallucination. It was dropped into `docs/ideation/2026-04-05-burned-brainstorm.md` in a prior session. Briggsy didn't know who Saul Bass was, didn't flag it, and over 5 days the phrase propagated into **13 files**: memory, README, VISUAL-LAYER-AUTOPSY, gauntlet skill calibration, 5 image generation scripts, and 2 brainstorm docs.

Saul Bass's aesthetic overlaps with Archer, which hid the error — the generated card art accidentally turned out on-target. The UI chrome, which didn't benefit from the accidental overlap, is the part that's broken.

**The real reference is "Archer the TV show."** The acceptance test for every screen is: *"Could this look like a frame from an Archer episode?"* — a binary yes/no that removes wiggle room from Claude's decision-making.

Second hallucination caught in the same session: the footer line *"Built with Maximum Overdrive. SDLC is the product."* — copied from UMB's SPEC.md by reflex. UMB was not built with Maximum Overdrive either; the footer was a latent bug in UMB's spec that Claude replicated without verification.

**Full defenses** are in `feedback-hallucinated-references.md` in memory. Short version: never copy specific claims from a template, only structural patterns. Verify every name/reference/methodology came from the user.

### 5. Form factors drive Visual Architecture (the wrong-axis root cause)

- **Phone controller = portrait = constraining axis is HEIGHT = primary unit is `svh`**
- **Board view = landscape = constraining axis is WIDTH = primary unit is `vw`**

The current player view uses `42vw` for card sizing — wrong axis. This is the root cause of the visual fragility documented in `docs/ideation/2026-04-11-visual-layer-autopsy.md`. The CSS Foundation Rebuild Plan must derive every phone dimension from `svh`.

### 6. Debate produces better designs than fast agreement

The session's biggest pivot came from Briggsy's devil's-advocate question:

> *"When we generate and even more importantly, harden the phases with adversarial/review agents, we instruct the agents to understand spec and then go do your bidding — which is how 'indistinguishable from a commercial app' shows up in numerous plan phase docs. If we instruct the agents to use the spec to write/harden each phase, does that work? Keeps a good separation of what vs. how with some insurance spec is continuously reinforced?"*

Claude's initial position was "Visual Architecture belongs in the spec." The debate and investigation (reading UMB's actual phase 4 and phase 5 plans, finding *"indistinguishable from commercial"* in both) flipped the position. The final design is cleaner because of the friction. The `feedback-debate-pushback.md` memory entry earned its keep — this is exactly the kind of friction it's meant to produce.

### 7. Retheme gaps (full inventory in spec §6.4)

A background subagent produced a complete inventory of Exploding Kittens leftovers across BURNED source:
- **Tier 1 (user-visible, must fix):** EliminatedView title says *"You Exploded!"* (should be spy-themed); 4 of 8 EliminatedView flavor lines are EK-era puns; GameTable `feltBranding` has *"EK identity"* code comment
- **Tier 2 (internal code, cleanup):** 11 `engine.ts` comments with "EK" shorthand, 3 timing constants named `EK_*_MS`, 1 error message, 1 Arena.tsx comment
- **Tier 3 (state machine `defuse` domain language):** intentionally left alone — too much blast radius (server, client selectors, Zod schemas, tests, Durable Object hibernated state version migration) for zero user-facing benefit

## What comes next

The spec describes the product. Next steps in order:

1. **Generate the CSS Foundation Rebuild Plan** from the spec in a fresh session. Transitive enforcement in action — the plan will pick up the Archer quality bar and produce the token system.
2. **Execute the retheme** — fix Tier 1 and Tier 2 gaps in a single coordinated pass.
3. **Execute the CSS rebuild** against the new plan.
4. **Deploy to Cloudflare Pages + Workers** per ADR-01.
5. **Run the first-time player test (§8.7)** — the final quality gate.

## References

- `docs/PRODUCT-SPECIFICATION.md` — the v1.0 contract
- `docs/ideation/2026-04-11-visual-layer-autopsy.md` — the post-mortem that triggered this session
- `feedback-vibes-are-not-specs.md` in memory — universal lesson: specs are the contract
- `feedback-transitive-contract-pattern.md` in memory — universal lesson: spec → plan → code → self-documenting
- `feedback-hallucinated-references.md` in memory — universal lesson: never copy specific claims from templates
- UMB's `docs/v1/plans/2026-03-16-005-feat-phase-4-host-table-view-plan.md` — the evidence for transitive enforcement
