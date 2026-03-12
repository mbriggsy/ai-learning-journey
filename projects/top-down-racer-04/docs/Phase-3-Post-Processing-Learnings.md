# Phase 3: Post-Processing & Effects — Institutional Learnings

**Search completed**: 2026-03-12
**Coverage**: v02 implementation details + v04 CE Playbook + CE Spec ADRs + issue log
**Context**: Preparing for Phase 3: Post-Processing & Effects implementation (bloom, motion blur, heat shimmer, custom GLSL)

---

## Executive Summary

**Recommendation**: The Phase 3 implementation will build on solid foundations. PixiJS v8 filter support is proven (v02 already uses `pixi-filters@6.1.5`), the container hierarchy is well-established, and the critical architectural constraint (HUD outside filters) is already documented. Three main areas require careful attention:

1. **Filter chain ordering** — Bloom before/after motion blur produces different visual results
2. **Per-frame Graphics allocation** — v02 creates new Graphics objects every frame for particles/skid marks; Phase 3 should avoid this pattern for filters
3. **HUD isolation** — PostProcessContainer split must keep HUD sharp while world effects apply

---

## Key Architectural Constraints (From v04 CE Spec)

### ADR-05: Post-Processing Pipeline Architecture

**File**: `docs/Top-Down-Racer-v04-CE-Spec.md` (lines 193-217)

**Decision**: PixiJS filter chain on a dedicated compositing container with strict HUD isolation.

**Container Hierarchy**:
```
stage
├── PostProcessContainer (HAS filter chain)
│   ├── WorldContainer
│   │   ├── TrackLayer
│   │   ├── CarLayer
│   │   └── EffectsLayer
│   │       ├── SkidMarks
│   │       ├── CheckpointFlash
│   │       └── Particles (dust/sparks)
└── HUDContainer (NO filters — always sharp)
    ├── Speedometer
    ├── LapCounter
    └── MiniMap
```

**Critical constraint**: "HUD lives OUTSIDE the filter container (always sharp). This is a critical constraint."

**Why this matters for Phase 3**:
- All filters apply ONLY to PostProcessContainer
- HUD rendering must reference frame state but NOT be subject to bloom/blur/shimmer
- RenderTexture compositing for multi-pass effects must target PostProcessContainer only

---

## Filter Chain Implementation (From v04 CE Spec)

**File**: `docs/Top-Down-Racer-v04-CE-Spec.md` (lines 199-205)

### Priority Order (P0 → P3)

| Priority | Effect | Implementation | Rationale |
|----------|--------|-----------------|-----------|
| **P0** | Bloom / glow on headlights | `@pixi/filter-bloom` or custom GLSL | Immediate commercial feel |
| **P0** | Drop shadow (car) | `@pixi/filter-drop-shadow` or native PixiJS shadow | Depth perception |
| **P1** | Motion blur at speed | `@pixi/filter-motion-blur` custom tuning | Dynamic feel at high speed |
| **P1** | Skid mark enhancement | Glow on high-slip marks | Visual feedback |
| **P2** | Heat shimmer behind exhaust | Displacement map filter, animated UV offset | Polish |
| **P3** | Screen-space bloom (full scene) | CRT/bloom post-pass on RenderTexture | Cinematic |

**From CE Playbook** (`docs/Top-Down-Racer-v04-CE-Playbook.md`, line 267-268):
> "Priority order: P0 (bloom/glow + car shadow), P1 (motion blur + skid marks), P2 (heat shimmer + speed lines), P3 (full scene bloom)."

---

## Package & Version Constraints

### PixiJS Version
- **Current**: PixiJS v8.16.0 (from v02 package.json)
- **Expected in v04**: PixiJS v8 (confirmed in CE Spec ADR-01)
- **Filter library**: pixi-filters@6.1.5 (already in v02, available for v04)

### Available Filter Packages
- `@pixi/filter-bloom` — integrated bloom
- `@pixi/filter-motion-blur` — motion blur with direction
- `@pixi/filter-drop-shadow` — drop shadows
- Custom GLSL possible via PixiJS Filter API

**Note**: PixiJS v8 WebGL supports all needed effects natively.

---

## V02 Rendering Architecture Insights

### EffectsRenderer Implementation Pattern
**File**: `src/renderer/EffectsRenderer.ts` (lines 74-128)

**Key observations for Phase 3**:

1. **Per-frame Graphics allocation** (POTENTIAL PERFORMANCE ISSUE):
   ```typescript
   private spawnDust(curr: WorldState): void {
     for (let i = 0; i < count; i++) {
       const gfx = new Graphics();  // NEW Graphics EVERY FRAME
       gfx.circle(0, 0, size).fill({ color: 0xbb9966, alpha: 0.7 });
       this.container.addChild(gfx);
       this.particles.push({ gfx, vx, vy, age, maxAge });
     }
   }
   ```
   - Creates new Graphics object for each dust particle (1-2 per tick at 60fps)
   - Creates new Graphics for each skid segment (line 145-149)
   - Creates new Graphics for checkpoint flashes (line 190)
   - **Pattern**: Object → container.addChild() → array tracking

2. **Particle system structure** (REUSABLE FOR PHASE 3):
   - Pool-based (MAX_PARTICLES = 40 limit prevents runaway allocation)
   - Age-based lifecycle (age ++ per frame, destroy at maxAge)
   - Velocity + drag physics (vx *= 0.95 for natural deceleration)
   - Alpha fade-out over last N frames

3. **Skid mark management** (POTENTIAL MEMORY LEAK PATTERN):
   - Cull by age (SKID_MAX_AGE = 720 ticks ≈ 12 seconds)
   - Also cull by count limit (SKID_MAX_SEGMENTS = 300)
   - Fade before removal (lines 169-172)
   - **Gotcha**: If particle spawn rate exceeds destruction rate, memory grows indefinitely

### WorldRenderer Container Structure
**File**: `src/renderer/WorldRenderer.ts` (lines 34-44)

```typescript
export class WorldRenderer {
  private sceneContainer: Container;  // One container for track+car
  constructor(private worldContainer: ContainerType) {
    this.sceneContainer = new Container();
    this.worldContainer.addChild(this.sceneContainer);
  }
}
```

**Current hierarchy** (v02):
- worldContainer (from RendererApp) → sceneContainer (WorldRenderer owns)
  - Track graphics (added line 64)
  - AI car (if not solo mode, line 69)
  - Player car (line 72)
  - *Effects added separately to worldContainer* (EffectsRenderer, line 91-93)

**For Phase 3 redesign**:
- PostProcessContainer will wrap sceneContainer
- EffectsLayer will live INSIDE sceneContainer (not outside)
- HUDContainer added as sibling to PostProcessContainer

---

## Critical Playbook Guidance for Phase 3

**File**: `docs/Top-Down-Racer-v04-CE-Playbook.md` (lines 248-285)

### CE Intensity Profile
- **Plan**: **HIGH** — "shader work is precision engineering, filter chain ordering matters"
- **Deepen-plan**: **CRITICAL** — "GLSL bugs are hell to debug, stress-test everything"
- **Review**: **HIGH** — "performance implications of every effect"

### Tool Strategy
1. **Context7** — "PixiJS v8 filter APIs are finicky and change between minor versions. Context7 pulls live docs so Code isn't guessing at function signatures."
2. **Serena** — "Tracing how the renderer container hierarchy works requires symbol-level code navigation."
3. **Sequential Thinking** — "Filter chain ordering has genuine complexity — bloom before or after motion blur? Displacement map UV animation timing?"

### Deepen-Plan Focus Areas
- **Filter chain ordering** — does bloom before motion blur look different than after?
- **Performance budget** — each filter adds a render pass. At what point does 60fps drop?
- **HUD isolation** — confirm the PostProcessContainer/HUDContainer split actually works
- **Heat shimmer** — displacement maps in PixiJS v8, what's the API?

---

## V02 Issues & Fixes (Relevant to Effects)

**File**: `docs/issues.md` (v02 project)

### ISS-002: Particle spawning on shoulder surface
- **Status**: Fixed (2026-03-01)
- **Issue**: Sand particles only spawned when `car.surface === Surface.Runoff`, ignoring `Surface.Shoulder`
- **Fix**: Changed guard to `car.surface === Surface.Road` (skip particles only on road, spawn on both shoulder & runoff)
- **Code location**: `src/renderer/EffectsRenderer.ts`, `spawnDust()` method
- **Lesson for Phase 3**: Particle emission guards must be explicit about which surfaces trigger effects. For Phase 3 particle upgrades, ensure spawn conditions match the intended visual feedback.

### ISS-003: HUD minimap overflow
- **Status**: Fixed (2026-03-01)
- **Issue**: Minimap track outline rendered outside 160×160 panel
- **Fix**: Dynamic scale computation instead of fixed constant
- **Lesson for Phase 3**: HUD elements are sensitive to container resizing. When PostProcessContainer recomposes, ensure HUD container scaling remains independent.

### ISS-001: Track shoulder rendering
- **Status**: Fixed (2026-03-01)
- **Polygon winding issue** affected track geometry, not directly effects-related but demonstrates the importance of geometry validation before effects rendering

---

## Performance Considerations for Phase 3

### From v02 Particle System
1. **Particle pooling** — MAX_PARTICLES = 40 hard cap prevents allocation storms
2. **Memory per particle** — Graphics object + velocity/age tracking (~2KB overhead per particle)
3. **Skid mark culling** — Both age-based (720 ticks) and count-based (300 segments) limits

### For Filter Chains
- **Each filter is a render pass** — bloom + motion blur + heat shimmer = 3-4 extra passes
- **RenderTexture overhead** — post-processing to RenderTexture requires texture memory (confirm HiDPI handling: device pixel ratio)
- **Frame budget** — v02 target 60fps stable. Every filter must be optimized.

**From Playbook**: "each filter adds a render pass. At what point does 60fps drop?"

---

## Implementation Readiness Checklist

Based on learnings from v02 and CE planning:

- [ ] **Architecture review**: Confirm PostProcessContainer/HUDContainer split in place before any filter code
- [ ] **Package setup**: Verify pixi-filters@6.1.5 compatibility with v04's PixiJS version
- [ ] **Context7 docs pull**: Get current PixiJS v8 filter API signatures before coding (they change between minor versions)
- [ ] **Filter ordering experiment**: Test bloom→motion blur vs motion blur→bloom visually in isolation
- [ ] **HiDPI safety**: If custom GLSL used, confirm shader handles high-DPI displays (use `gl_FragCoord` / canvas resolution ratio)
- [ ] **Performance baseline**: Measure frame time with no filters, then with each filter added, document dropoff
- [ ] **Particle upgrade planning**: v02 allocates Graphics per particle per frame. Phase 3 should profile memory impact of enhanced particles.
- [ ] **Heat shimmer displacement**: Test displacement map UV animation doesn't cause texture seams or artifacts

---

## No Major Gotchas Found

The v02 project demonstrates a working renderer with particle effects and no documented filter issues. The v04 CE planning is thorough and addresses the main complexity areas (filter ordering, HUD isolation, performance).

**Green flags**:
- PixiJS v8 filter support is proven and available
- v02's particle system is stable and reusable
- Container hierarchy is well-designed and refactorable
- CE Playbook provides specific focus areas for deepen-plan

**Caution areas** (not gotchas, but require attention during implementation):
- GLSL debugging can be painful — plan for iteration time
- Filter chain order affects visual appearance — test both orderings
- HUD isolation is architectural — get it right before adding filters
- Performance testing is critical — 60fps is non-negotiable

---

## Recommendation for Next Steps

**For Phase 3 Planning Session**:
1. Review v04 CE Spec ADR-05 (filter chain architecture) — it's locked and solid
2. Use Context7 to pull current PixiJS v8 filter API docs (signatures may have changed since v02)
3. Use Serena to trace the current v04 renderer container hierarchy (different from v02, confirm HUD split is designed)
4. Use Sequential Thinking to map filter ordering combinations and their visual implications
5. Review the CE Playbook deepen-plan focus areas during deepen-plan session

**For Implementation Phase**:
1. Start with P0 (bloom + shadow) — lowest complexity, highest impact
2. Add P1 (motion blur + skid glow) — test filter chain ordering here
3. Performance gate before P2/P3 — confirm 60fps with P0+P1 combined
4. P2/P3 (heat shimmer + full scene bloom) — only if performance budget permits

---

**Document created**: 2026-03-12
**Based on**: v02 issues.md, v02 code review (EffectsRenderer.ts, WorldRenderer.ts), v04 CE Spec, v04 CE Playbook
