# Top-Down Racer v04 — Full Build Brainstorm
*Date: 2026-03-11*
*Participants: Briggsy (ATC), Claude Code (pilot)*

## What We're Building

A visual upgrade + track evolution of v02, built using Compound Engineering methodology. Three equal story threads:

1. **Visual transformation** — rectangles to commercial-quality racing game
2. **CE methodology** — same game, different build process than v02's GSD approach
3. **AI generalization** — AI that learns to drive, not memorize track polygons

The success bar: a stranger sees v04 and says "that looks like a real game" before hearing the story.

## Why This Approach

### Build Sequencing: Foundation First
Copy the proven engine and AI bridge from v02, confirm all 366+ tests pass in v04's environment, THEN begin the creative work. Rationale:
- The engine is the untouchable foundation — verify it works before building on it
- Fail fast on the Gemini API with a single test call before writing the full asset script
- Predictable, auditable progress for a fully autonomous SDLC

### Phase Structure (from spec, confirmed)
| Phase | Focus |
|-------|-------|
| -1 (Foundation) | Engine + AI copy from v02, build tooling, 366+ tests green |
| 0 | Asset generation via Gemini Imagen 3 API |
| 1 | Asset processor tooling + Track 2/3 redesign (combined, as spec) |
| 2 | Core visual upgrade (car sprites, track art, camera) |
| 3 | Post-processing & effects (P0+P1 minimum, P2+ if clean) |
| 4 | Commercial UI & audio (DOM menus + PixiJS HUD) |
| 5 | AI retraining & validation (v02 scripts verbatim, new geometry) |

## Key Decisions

### Decided
1. **All three story threads carry equal weight** — visual, CE methodology, AI generalization
2. **Copy engine (10 files) + AI bridge (9 files) + track01 verbatim from v02** — renderer rebuilt from scratch
3. **Phase structure follows spec as-is** — Phase 1 keeps asset pipeline + track redesign combined
4. **Skip Google Stitch entirely** — design menus and HUD directly from ADR-06/ADR-07 descriptions
5. **Gemini API key untested** — first action in Phase 0 is a single smoke-test API call, fail fast
6. **Engine tests copied and run first** — 366+ tests must pass before any creative work begins
7. **VFX scope: P0 + P1 minimum** — bloom, shadows, motion blur, skid marks are the floor; P2+ (heat shimmer, speed lines, CRT bloom) are nice-to-haves
8. **Hybrid UI: DOM menus + PixiJS HUD** — as spec describes
9. **AI training scripts copied verbatim from v02** — proven pipeline, only pointed at new track geometry
10. **Fully autonomous SDLC** — zero human-written game code; Briggsy is ATC (approves/directs), Claude Code + agents fly the plane

### From Spec (Locked, Do Not Revisit)
- Engine is FROZEN — zero modifications
- Engine/renderer boundary is SACRED — zero cross-layer imports
- Track 1 geometry frozen, Tracks 2+3 redesigned
- PixiJS v8 — no renderer switch
- No multiplayer, no Spine/DragonBones
- 3 tracks total — no additions
- No Nano Banana, No Ludo.ai — Gemini API only
- PPO retrain from scratch — no transfer learning from v02 model
- HUD lives OUTSIDE the post-processing filter container

## Open Questions

None — all major decisions resolved. The spec + brainstorm dialogue covered every open area.

## Next Steps

Run `/workflows:plan` to create the Phase -1 (Foundation) plan, then Phase 0 (Asset Generation).
