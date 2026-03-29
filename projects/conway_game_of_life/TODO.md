# Conway's Game of Life — TODO

## Current State
- Spec locked (`docs/spec/SPEC.md`)
- Phases 0, 1, 2 deeply researched and enhanced via multi-agent review (8 agents each)
- Phases 3, 4, 5 have initial plans but NOT deepened yet
- Zero code written — execution hasn't started

## What We Did (2026-03-28)
- Deepened Phase 0 (Scaffolding) — found canvas context poisoning bug, fixed tsconfig rootDir, added security headers + CSP, merged vitest into vite config
- Deepened Phase 1 (Engine) — discovered padded grid optimization (eliminates 16M modulo ops/step), extracted Rules.ts as pure function, fixed GameLoop DOM dependency via TimerProvider injection
- Deepened Phase 2 (Renderer) — fixed age texture format contradiction, corrected pipeline order (ghosts after composite), added UNPACK_ROW_LENGTH for zero-copy padded buffer uploads, quarter-res bloom

## Next Steps (Priority Order)
1. **Deepen Phase 3** (Patterns & UI) — not yet researched
2. **Deepen Phase 4** (Audio) — not yet researched
3. **Deepen Phase 5** (Polish & Deploy) — not yet researched
4. Fix SPEC.md phase numbering contradiction
5. **THEN execute Phase 0** — no code until ALL plans are deepened and tight

## Pre-Flight Before Phase 0 (after ALL plans deepened)
- Fix SPEC.md phase numbering (Phase 0=Scaffolding, not Engine) — contradiction flagged by 2 agents

## Landmines
- WebGL context-lost event handling not implemented (noted for future)
- COEP header (`require-corp`) may need review when adding PWA icons in Phase 5 (all local = should be fine)
- Vitest 4.x `.bench.ts` files MUST be separate from `.test.ts` (throws if mixed)
- `noUncheckedIndexedAccess` requires `!` assertions in hot paths (Grid, Rules) — document safety invariants
