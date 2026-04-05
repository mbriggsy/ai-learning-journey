# Top-Down Racer v03

## Project Overview
Visual upgrade + track evolution of v02. Simulation engine is FROZEN and untouched.
Focus: commercial-quality graphics, redesigned tracks, AI retraining.

## Architecture (SACRED — do not violate)
- Simulation engine (src/engine/) is COMPLETELY FROZEN. Zero modifications.
- Engine/renderer boundary: renderer reads engine state, NEVER mutates game logic.
- Track geometry files (src/tracks/) are DATA, not engine code. Safe to modify.
- HUD lives OUTSIDE the filter container — stays crisp while world has post-processing.

## Key Constraints
- PixiJS v8 — no renderer change
- Static deployment — no server infrastructure
- v02 ONNX model is RETIRED — full PPO retrain required on v03 track geometry
- Track 1 (oval) geometry is FROZEN — it's the AI training sanity check
- No multiplayer. No fourth track. No physics engine changes. No renderer swap.

## Asset Pipeline
- assets/raw/ — AI-generated raw assets from Nano Banana / Ludo.ai (gitignored, human provides)
- public/assets/ — processed, game-ready assets (tracked in git)
- tools/ — asset processor scripts (Sharp-based, build these in Phase 1)
- Claude Code defines asset specs; Briggsy runs the generation tools

## Post-Processing Layer Order (Phase 3)
```
WorldContainer (filter chain: bloom, motion blur)
  TrackLayer (background, surface textures)
  CarLayer (sprites + shadows)
  EffectsLayer (particles, skids)
HUDContainer (NO filters — always sharp)
  Speedometer, LapCounter, MiniMap
```

## Locked Decisions (do not revisit)
- Stay on PixiJS v8 WebGL — no Three.js/Babylon.js
- Car sprites: single top-down PNG per variant, PixiJS handles rotation natively
- Track art: pre-rendered background PNG + tiled surface textures as overlay
- Google Stitch: design reference only — Claude Code implements from screenshots
- AI training: full retrain from scratch on v03 tracks, NOT transfer learning from v02

## Reference
- v02 repo: C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02
- v03 spec: docs/Top-Down-Racer-v03-GSD-Spec.md
- v03 setup guide: docs/Top-Down-Racer-v03-Environment-Setup-Guide.md
