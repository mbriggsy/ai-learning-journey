---
status: pending
phase: 2
title: Renderer
description: WebGL2 multi-pass rendering pipeline — cells, ghosts, particles, bloom/glow
depends_on: [phase-1]
deepened: 2026-03-28
---

# Phase 2 — Renderer

## Enhancement Summary

**Deepened on:** 2026-03-28
**Agents used:** 6 (architecture strategist, performance oracle, TypeScript reviewer, code simplicity reviewer, pattern recognition specialist, framework-docs researcher)

### Critical Fixes Discovered
1. **Age texture format contradiction** — Plan said "G+B channels as uint16." Phase 1 decided age is Uint8Array (0-255). Fixed to single-channel R8 texture.
2. **Pipeline order bug** — Ghost pass gets overwritten by composite. Corrected: cells to FBO first, bloom, composite to screen, THEN ghosts + particles alpha-blended on top.
3. **Padded grid upload** — WebGL2's `UNPACK_ROW_LENGTH` uploads the inner region of padded buffers natively. Zero CPU copies. GridBuffers needs `stride` added.

### Key Improvements
1. Files reduced from 12 to 10 (merged shader+renderer pairs into Pass files, eliminated shaders/ subdirectory)
2. Quarter-res bloom (4x cheaper than half-res, actually looks MORE bioluminescent)
3. Linear-space rendering with RGBA16F cell FBO (correct bloom math)
4. Generic `ShaderProgram<T>` for typed uniform names with compile-time autocomplete
5. Camera moved to `src/Camera.ts` (shared between renderer + UI)
6. ParticlePool extracted as testable pure-math class
7. Grid lines rendered in composite shader (no extra draw call)
8. `UNPACK_ALIGNMENT = 1` set at init (prevents silent R8 texture corruption)

---

## Goal

WebGL2 renderer that brings the simulation to life. Bioluminescent cells with age-based color, ghost trails, death particle animations, and bloom/glow post-processing. Pan/zoom camera. Performant at 1000x1000 — estimated render time 1.7-2.1ms at 1080p.

## Spec Acceptance Criteria

- [ ] WebGL canvas renders live cells
- [ ] Cell age tracked, color shifts young → old
- [ ] Death particle animation
- [ ] Ghost trail afterglow
- [ ] Bloom/glow post-processing on cells

## Architecture: Texture-Based Rendering (ADR-01/02)

CPU simulation runs on padded Uint8Array buffers. Each frame, upload grid state as WebGL2 R8 textures using `UNPACK_ROW_LENGTH` to skip the sentinel ring. Fragment shaders sample textures to determine cell color/visibility. This avoids CPU-side data extraction and handles 1M+ cells efficiently.

**Correct render pipeline order:**
1. **CellPass** → render to RGBA16F FBO (opaque, blending OFF)
2. **BloomPass H** → horizontal blur to quarter-res FBO A
3. **BloomPass V** → vertical blur to quarter-res FBO B
4. **Clear** default framebuffer to #050508
5. **Composite** → cellFBO + bloomFBO to screen (additive blend + gamma correction + grid lines)
6. **GhostPass** → alpha blend onto default framebuffer
7. **ParticlePass** → alpha blend onto default framebuffer

Ghosts and particles render AFTER composite so they aren't overwritten by the fullscreen composite quad and don't get bloomed (ghosts are subtle echoes, particles are crisp fading fragments).

## Pre-Phase 2: Update Phase 1 Interface

- [ ] Add `stride: number` to `GridBuffers` in `src/types/simulation.ts`
- [ ] Grid.getBuffers() returns raw padded buffers + stride (not extracted data)

### Research Insight
> WebGL2's `UNPACK_ROW_LENGTH` lets the GPU driver do strided DMA transfer natively. The renderer sets `UNPACK_ROW_LENGTH = stride`, `UNPACK_SKIP_ROWS = 1`, `UNPACK_SKIP_PIXELS = 1` to upload only the inner grid region. Zero CPU copies, zero extraction buffers.

## Tasks

### 2.1 — GLContext.ts (WebGL2 context + utilities)

- [ ] Create `src/renderer/GLContext.ts`
- [ ] Class holding `WebGL2RenderingContext` reference
- [ ] **`preserveDrawingBuffer: true`** on context creation (Phase 5 captureStream requires the buffer to persist after compositing — without it, video capture gets black frames)
- [ ] Set `gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)` at init (**critical** for R8 textures)
- [ ] Assert-on-create utilities — return non-nullable types, throw on failure:
  - `createShader(type, source): WebGLShader`
  - `createTexture(width, height, internalFormat, format, type, data?): WebGLTexture`
  - `createFramebuffer(texture): WebGLFramebuffer` (with completeness check)
- [ ] `createProgram<T>(vertSrc, fragSrc, uniformNames): ShaderProgram<T>` — returns typed uniform bundle
- [ ] `getUniformLocations<T>(program, names): UniformLocations<T>` — runtime assertion for every uniform
- [ ] `FullscreenQuad` — shared VAO with `layout(location = 0)`, created once, `bind()` + `draw()`
- [ ] Export `FULLSCREEN_QUAD_VERT` source constant (GLSL ES 3.00)
- [ ] Context-lost event handler placeholder (noted as future landmine in CLAUDE.md)

#### Research Insights

**Assert-on-create eliminates downstream null checks:** Every WebGL creation function returns `T | null`. The utilities assert once at creation and return non-nullable types. All downstream code works with `WebGLProgram`, not `WebGLProgram | null`. One assertion boundary, zero scattered `!` operators.

**Generic ShaderProgram type:**
```typescript
type UniformLocations<T extends string> = Readonly<Record<T, WebGLUniformLocation>>

interface ShaderProgram<T extends string> {
  readonly program: WebGLProgram
  readonly uniforms: UniformLocations<T>
}
```

Each shader defines its uniform set as a string union type. Compile-time autocomplete on `shader.uniforms.u_time`. Runtime assertion that the GLSL actually declares every expected uniform.

**Shared fullscreen quad:** All shaders using `layout(location = 0) in vec2 a_position` can share one VAO. 6-vertex triangle pair covering clip space [-1,1]. Bind once, reuse across cell, ghost, bloom, and composite passes.

### 2.2 — Camera (shared, at src/ level)

- [ ] Create `src/Camera.ts` (NOT inside renderer — shared between renderer + UI)
- [ ] State: panX, panY, zoom level
- [ ] `pan(dx, dy)` — translate view (instant, no animation)
- [ ] `zoom(factor, centerX, centerY)` — zoom toward/from point (instant), **clamped to [0.05, 200]** (prevents GPU hang from extreme zoom)
- [ ] `screenToGrid(sx, sy): [gx, gy]` — for draw mode (Phase 3)
- [ ] `gridToScreen(gx, gy): [sx, sy]` — for UI overlays
- [ ] `getViewMatrix(): Float32Array` — 3x3 matrix, **pre-allocated and reused** (no allocation per frame)
- [ ] Shaders consume the view matrix (NOT separate u_offset / u_zoom uniforms)
- [ ] **NO lerp transitions** (Phase 3)
- [ ] **NO centerOn animation** (Phase 3)
- [ ] **NO double-click center-on-activity** (Phase 3)

#### Research Insights

**Camera at `src/` level — dependency graph:**
```
src/Camera.ts           ← pure math, zero GL deps
src/renderer/*          ← reads Camera (view matrix for uniforms)
src/ui/*                ← writes Camera (user input in Phase 3)
src/main.ts             ← creates Camera, passes to both
```

If Camera lived in `src/renderer/`, then `src/ui/` would import from `src/renderer/` — creating unwanted coupling.

**Pre-allocated matrix:** `getViewMatrix()` writes into a reused `Float32Array(9)`, never allocates. Called every frame — this prevents 60 object allocations per second.

### 2.3 — CellPass.ts

- [ ] Create `src/renderer/CellPass.ts`
- [ ] GLSL vertex: imports `FULLSCREEN_QUAD_VERT` from GLContext
- [ ] GLSL fragment (GLSL ES 3.00, `#version 300 es`):
  - Samples cell data texture: `texture(u_cellTexture, uv).r` (R8 format, 0.0 or ~0.004)
  - Samples age texture: `texture(u_ageTexture, uv).r` (R8, 0.0–1.0 = age/255)
  - Maps age to color gradient: young blue → mature gold → ancient purple via `mix()`
  - Circular cell shape within grid cell via SDF (`discard` outside radius)
  - Subtle pulse animation via `u_time` uniform
  - Output: `layout(location = 0) out vec4 fragColor`
- [ ] Uniform type: `CellUniforms` string union, co-located with GLSL source
- [ ] Per-frame texture upload via `texSubImage2D` with `UNPACK_ROW_LENGTH` for padded buffers
- [ ] `texStorage2D` at init (immutable allocation), `texSubImage2D` per frame (update only)
- [ ] Data textures use `gl.NEAREST` filtering, `gl.CLAMP_TO_EDGE` wrapping
- [ ] Renders to **RGBA16F FBO** (linear space for correct bloom math)
- [ ] Implements `Disposable` interface

#### Research Insights

**Padded buffer upload pattern:**
```typescript
gl.pixelStorei(gl.UNPACK_ROW_LENGTH, stride)   // width + 2
gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 1)          // skip sentinel top row
gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 1)        // skip sentinel left column
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height,
                 gl.RED, gl.UNSIGNED_BYTE, paddedBuffer)
gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0)          // reset to defaults
gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0)
gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0)
```

Zero CPU extraction. The WebGL2 driver does strided DMA transfer natively.

**Linear-space rendering:** Bloom operates by blurring bright regions. In sRGB space, gamma curve causes artificially dark bloom edges and incorrect color mixing. RGBA16F FBO gives linear values + HDR headroom. Gamma correction (`pow(color, 1/2.2)`) applied in composite shader as final step.

**GLSL color constants (from spec):**
```glsl
const vec3 YOUNG_COLOR  = vec3(0.310, 0.765, 0.969);  // #4FC3F7
const vec3 MATURE_COLOR = vec3(1.000, 0.702, 0.000);  // #FFB300
const vec3 ANCIENT_COLOR = vec3(0.808, 0.576, 0.847); // #CE93D8
```

### 2.4 — GhostPass.ts

- [ ] Create `src/renderer/GhostPass.ts`
- [ ] GLSL fragment: samples ghost R8 texture + age R8 texture (for color inheritance)
- [ ] Ghost decay value (0–3) maps to alpha: `decay * GHOST_MAX_OPACITY`
- [ ] Color inherits from cell's age-based color at time of death
- [ ] Alpha blended onto default framebuffer: `gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)`
- [ ] Same UNPACK_ROW_LENGTH upload pattern as CellPass
- [ ] Implements `Disposable`

### 2.5 — ParticlePool.ts (pure math, testable)

- [ ] Create `src/renderer/ParticlePool.ts`
- [ ] **Zero GL dependencies** — fully testable in Node
- [ ] Pre-allocated `Float32Array` buffer: `MAX_PARTICLES * PARTICLE_STRIDE`
- [ ] Typed constants with `as const satisfies`:
  ```typescript
  const PARTICLE_STRIDE = 8  // x, y, vx, vy, life, r, g, b
  const PARTICLE_OFFSETS = { x: 0, y: 1, vx: 2, vy: 3, life: 4, r: 5, g: 6, b: 7 } as const
  ```
- [ ] `spawn(gridX, gridY, r, g, b)` — creates 8-12 particles with random radial velocity
- [ ] `update(dt)` — advance positions, decrement life, compact expired particles
- [ ] `count` property for active particle count
- [ ] `buffer` property for GL upload (subarray view of active region)
- [ ] No rate limiting yet — add when measured as needed

### 2.6 — ParticlePass.ts

- [ ] Create `src/renderer/ParticlePass.ts`
- [ ] Imports `ParticlePool` for data management
- [ ] GLSL vertex: `GL_POINTS`, `gl_PointSize` from life + zoom
- [ ] GLSL fragment: circular point sprite via `gl_PointCoord`, alpha fade with `smoothstep`
- [ ] `drawArrays(gl.POINTS, 0, pool.count)` — no instancing needed
- [ ] Upload via `bufferSubData` (only active region of pool buffer)
- [ ] Alpha blended: `gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)`
- [ ] Check `gl.ALIASED_POINT_SIZE_RANGE` at init, store max as cap
- [ ] Implements `Disposable`

#### Research Insight
> For GL_POINTS, instanced vs non-instanced rendering is functionally equivalent since each particle is 1 vertex = 1 point. Instancing only adds value if you upgrade particles to textured quads (4 vertices each). Start simple.

### 2.7 — BloomPass.ts (includes composite)

- [ ] Create `src/renderer/BloomPass.ts`
- [ ] Bloom GLSL: separable Gaussian blur (horizontal/vertical via boolean uniform)
- [ ] Composite GLSL: additive blend cellFBO + bloomFBO, gamma correction `pow(color, 1/2.2)`, grid lines
- [ ] **Quarter resolution** FBOs (not half — 4x cheaper, better bioluminescent aesthetic)
- [ ] Two ping-pong FBOs with `gl.LINEAR` filtering for smooth upsampling
- [ ] Grid lines rendered in composite fragment shader:
  ```glsl
  if (u_showGrid && u_cellSize > 4.0) {
    vec2 grid = abs(fract(gridPos - 0.5) - 0.5);
    float line = min(grid.x, grid.y);
    float gridAlpha = 1.0 - smoothstep(0.0, 1.5 / u_cellSize, line);
    color = mix(color, GRID_LINE_COLOR, gridAlpha * 0.5);
  }
  ```
- [ ] Resize: dirty-flag pattern, `dispose()` old FBOs then recreate
- [ ] Implements `Disposable`

#### Research Insights

**Quarter-res bloom is BETTER:** Each bloom texel covers 4x4 screen pixels. Bilinear upsampling during composite produces naturally wider, softer halos — literally the bioluminescent look the spec demands. Half-res would require a wider blur kernel to achieve the same effect at 4x the cost.

**Ping-pong FBO pattern:** Horizontal blur reads from texture A, writes to FBO B. Vertical blur reads from texture B, writes to FBO A (or a third target). Always call `gl.viewport()` when switching between FBOs of different sizes.

### 2.8 — Renderer.ts (pipeline orchestrator)

- [ ] Create `src/renderer/Renderer.ts`
- [ ] Owns: GLContext, CellPass, GhostPass, ParticlePass, BloomPass
- [ ] Camera passed in from main.ts (NOT owned)
- [ ] `init(canvas: HTMLCanvasElement)` — create context, compile all shaders, set up FBOs
- [ ] `render(buffers: GridBuffers, state: SimulationState, dt: number)` — full pipeline:
  1. CellPass → RGBA16F FBO (blending OFF)
  2. BloomPass horizontal → quarter-res FBO A
  3. BloomPass vertical → quarter-res FBO B
  4. `gl.clear` default framebuffer to #050508
  5. Composite → cellFBO + bloomFBO to screen (gamma correction + grid lines)
  6. GhostPass → alpha blend onto screen
  7. ParticlePass → alpha blend onto screen (last)
- [ ] `resize(width, height)` — dirty-flag, debounced FBO recreation (150ms cooldown)
  - Only render-target FBOs need recreation (cell FBO, bloom FBOs)
  - Data textures (cells, ages, ghosts) are grid-sized, not canvas-sized
- [ ] `dispose()` — cleanup chain for all passes and shared resources
- [ ] `getCanvas()` — expose for MediaRecorder (Phase 5)
- [ ] Toggle: grid lines (passed as uniform)
- [ ] Toggle: ghost trails (skip GhostPass)
- [ ] Import only `GridBuffers` and `SimulationState` from `src/types/` — never import Grid or Simulation

#### Research Insights

**Blend mode per pass:**
| Pass | Blend | gl.blendFunc |
|------|-------|-------------|
| CellPass (to FBO) | OFF | `gl.disable(gl.BLEND)` |
| Bloom H/V passes | OFF | `gl.disable(gl.BLEND)` |
| Composite to screen | OFF (opaque fullscreen) | `gl.disable(gl.BLEND)` |
| GhostPass | Alpha | `gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)` |
| ParticlePass | Alpha | `gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)` |

**State changes per frame:** 5 program switches, 4 FBO binds, 7 texture binds, 2 viewport changes. Already optimal — no further minimization needed.

**GPU memory budget at 1080p:** ~20MB total (3MB data textures + 16MB RGBA16F cell FBO + 1MB bloom FBOs + 0.24MB particle VBO). Well within any GPU's budget.

### 2.9 — Renderer types + barrel export

- [ ] Create `src/renderer/types.ts`:
  - `ShaderProgram<T extends string>` generic type
  - `UniformLocations<T>` type
  - `Disposable` interface (`dispose(): void`)
  - Particle buffer constants (`PARTICLE_STRIDE`, `PARTICLE_OFFSETS`, `MAX_PARTICLES`)
- [ ] Create `src/renderer/index.ts`:
  - Export `Renderer` (public API)
  - Re-export `Camera` from `src/Camera.ts`
  - Do NOT export: individual passes, GLContext, ParticlePool (internal implementation)
- [ ] Add spec-derived constants to `src/constants.ts`:
  - Cell colors: YOUNG, MATURE, ANCIENT (RGB tuples)
  - GHOST_MAX_OPACITY = 0.15
  - PARTICLE_COUNT_MIN/MAX = 8/12
  - PARTICLE_LIFETIME_MS = 400
  - GRID_LINE_COLOR, GRID_LINE_MIN_CELL_SIZE = 4

### 2.10 — Wire renderer to engine

- [ ] Update `src/main.ts`: create Camera, Renderer, Simulation
- [ ] GameLoop tick: `renderer.render(sim.getBuffers(), sim.getState(), dt)`
- [ ] Load test pattern (blinker) to verify visual output
- [ ] Verify pan/zoom with mouse wheel + drag
- [ ] Verify ghost trails visible after cells die
- [ ] Verify bloom glow around living cells
- [ ] Verify particles on death events

### 2.11 — Tests

- [ ] Create `tests/unit/Camera.test.ts`
  - Pan offsets coordinates correctly
  - Zoom centered on point
  - screenToGrid / gridToScreen roundtrip accuracy
  - View matrix correctness (multiply test point, verify output)
  - Pre-allocated matrix: same Float32Array reference returned each call
- [ ] Create `tests/unit/renderer/ParticlePool.test.ts`
  - Spawn creates 8-12 particles per call
  - Update advances positions by velocity * dt
  - Expired particles (life <= 0) removed from pool
  - Pool cap respected (MAX_PARTICLES)
  - Count property accurate
  - Buffer subarray contains only active particles
- [ ] Note: GLSL compilation, texture upload, and visual output require a real GL context — test via Playwright screenshot comparison in `tests/integration/` (future)

## Commits

- `feat(renderer): webgl2 context + camera + cell pass (linear space)`
- `feat(renderer): ghost trails + particle system + bloom (quarter-res)`
- `feat(renderer): compose full pipeline + wire to engine`

---

## Performance Estimates

| Scenario | Engine (ms) | Renderer (ms) | Total (ms) | 60fps? |
|----------|-------------|---------------|------------|--------|
| 1000x1000, 1080p, integrated GPU | 3-5 | 3-5 | 6-10 | Yes |
| 1000x1000, 4K, discrete GPU | 3-5 | 2-3 | 5-8 | Yes |
| 1000x1000, 4K, integrated GPU | 3-5 | 5-8 | 8-13 | Yes |
| 2000x2000, 1080p (future, needs worker) | 15-20 | 3-4 | 18-24 | No |

The renderer is NOT the bottleneck at any supported grid size. Draw calls: 6 per frame. State changes: minimal and already optimal.
