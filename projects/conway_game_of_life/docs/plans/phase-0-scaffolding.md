---
status: active
phase: 0
title: Scaffolding
description: Project infrastructure — build tools, config, blank canvas running
depends_on: []
deepened: 2026-03-28
---

# Phase 0 — Scaffolding

## Enhancement Summary

**Deepened on:** 2026-03-28
**Agents used:** 8 (best-practices researcher, framework-docs researcher, architecture strategist, TypeScript reviewer, performance oracle, security sentinel, code simplicity reviewer, pattern recognition specialist)
**Context7 queries:** Vite 7.x, Vitest 4.x

### Critical Fixes Discovered
1. **Canvas context poisoning** — Task 0.6 must use WebGL2 context, not Canvas 2D. Getting a 2D context permanently blocks WebGL2 on that canvas.
2. **tsconfig rootDir blocks test typechecking** — `rootDir: ./src` prevents `tsc --noEmit` from checking test files. Remove it entirely.
3. **Spec vs plan phase numbering mismatch** — SPEC.md says Phase 0=Engine; plans say Phase 0=Scaffolding. Must reconcile before execution.
4. **GameLoop DOM dependency** — Phase 1 puts GameLoop in `src/engine/` using `requestAnimationFrame` (a DOM API), violating the "engine has zero DOM deps" rule. Resolve via dependency inversion.

### Key Improvements
1. Merged `vitest.config.ts` into `vite.config.ts` (one fewer file)
2. Full security header suite in `vercel.json` including WebGL-aware CSP
3. COOP/COEP headers enabled (unlocks SharedArrayBuffer for future worker offloading)
4. Enhanced tsconfig with `noUncheckedIndexedAccess` (catches grid OOB bugs at compile time)
5. WebGL2 context attributes codified (15-20% GPU savings from `alpha:false` + `antialias:false`)
6. ResizeObserver + DPR-aware canvas sizing from day one

---

## Goal

Get `pnpm dev` running with a blank dark canvas (#050508) rendered via WebGL2 in the browser. All build tooling configured, test runner working, directory structure in place.

## Pre-Flight: Fix Spec Phase Numbering

Before executing any task, reconcile the phase numbering mismatch:
- [ ] Update SPEC.md acceptance criteria from "Phase 0 — Engine" to "Phase 1 — Engine", etc.
- [ ] Confirm all 6 phases are listed: 0=Scaffolding, 1=Engine, 2=Renderer, 3=Patterns & UI, 4=Audio, 5=Polish & Deploy

### Research Insight
> Two agents independently flagged this contradiction. Per project rules (CLAUDE.md "Contradictions Mean STOP"), this must be resolved before proceeding.

## Acceptance Criteria

- [ ] `pnpm dev` serves a page with a full-viewport dark canvas (WebGL2 cleared to #050508)
- [ ] `pnpm build` produces a production build with no errors (typecheck-gated)
- [ ] `pnpm test` runs Vitest (passes with zero tests or a placeholder)
- [ ] `pnpm typecheck` passes with strict mode (checks both `src/` and `tests/`)
- [ ] Directory structure matches spec's project layout (with `types/`, `utils/`, `tests/integration/`)
- [ ] CLAUDE.md establishes architecture rules for the project
- [ ] WebGL2 context acquired successfully with performance-optimized attributes

## Tasks

### 0.1 — Initialize package.json

- [ ] Create `package.json` with project metadata
- [ ] `"type": "module"`, `"private": true`, `"packageManager": "pnpm@10.30.3"`
- [ ] `"engines": { "node": ">=20.19.0" }` (Vite 7 dropped Node 18)
- [ ] Zero production dependencies (everything is browser APIs)
- [ ] DevDependencies: `typescript ^5.9.0`, `vite ^7.3.0`, `vitest ^4.0.0`, `@vitest/coverage-v8 ^4.0.0`
- [ ] Scripts: `dev`, `build`, `preview`, `test`, `test:run`, `test:watch`, `test:coverage`, `typecheck`
- [ ] `"build": "tsc --noEmit && vite build"` (typecheck gates the build)
- [ ] `pnpm install` succeeds

#### Research Insights

**Version ranges:** Use `^` (caret) for consistency with top-down-racer-04. These are devDeps only — minor bumps from vite/vitest/typescript are well-tested and safe.

**Vite 7 over Vite 8:** Vite 8 (March 12, 2026) replaces esbuild+Rollup with Rolldown — too fresh. `vite-plugin-pwa` only declares peer deps through `^7.0.0`. Stick with Vite 7 for ecosystem stability.

**Scripts reference:**
```jsonc
{
  "dev": "vite",
  "build": "tsc --noEmit && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run",
  "test:watch": "vitest watch",
  "test:coverage": "vitest run --coverage",
  "typecheck": "tsc --noEmit"
}
```

### 0.2 — TypeScript configuration

- [ ] Create `tsconfig.json`
- [ ] Target: ES2022, Module: ESNext, moduleResolution: bundler
- [ ] `lib`: `["ES2022", "DOM", "DOM.Iterable"]` (explicit — WebGL2 types live in DOM)
- [ ] `strict: true`, `noEmit: true`, `isolatedModules: true`, `moduleDetection: force`
- [ ] `verbatimModuleSyntax: true` (forces `import type` for type-only imports)
- [ ] `noUncheckedIndexedAccess: true` (grid[x][y] returns T|undefined — catches OOB)
- [ ] `resolveJsonModule: true`, `skipLibCheck: true`, `forceConsistentCasingInFileNames: true`
- [ ] `include`: `["src/**/*", "tests/**/*"]` (tsc checks BOTH source and tests)
- [ ] `exclude`: `["node_modules", "dist"]`
- [ ] **NO `rootDir`**, **NO `outDir`** (Vite handles build output; tsc is type-check only)

#### Research Insights

**Why `rootDir` was removed (CRITICAL):** With `rootDir: ./src` and tests excluded, `tsc --noEmit` never checks test files. The entire architectural bet is that engine logic is testable — unchecked test types defeats that. With `noEmit: true`, rootDir/outDir serve no purpose anyway.

**Why `noUncheckedIndexedAccess`:** For a grid-based game, array indexing is everywhere. This forces handling `undefined` from `grid[x][y]`, catching off-by-one and out-of-bounds bugs at compile time. NASA standard.

**Why `verbatimModuleSyntax`:** Forces `import type { Foo }` instead of `import { Foo }` for type-only imports. Prevents a class of bugs where esbuild can't determine if an import is a value or type. Critical for the engine/renderer separation — makes the import graph honest.

**Reference config:**
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**WebGL2 types:** `WebGL2RenderingContext`, `WebGLProgram`, `WebGLShader`, etc. are all in TypeScript's built-in `lib.dom.d.ts`. No `@types/webgl2` package needed (it's obsolete and causes conflicts).

### 0.3 — Vite + Vitest configuration (merged)

- [ ] Create `vite.config.ts` (single file — vitest config merged in)
- [ ] Import `defineConfig` from `vitest/config` (gives both Vite + Vitest types)
- [ ] `base: './'`
- [ ] `build: { target: 'es2022', sourcemap: true }`
- [ ] `esbuild: { target: 'es2022' }` (dev/prod consistency)
- [ ] `server: { strictPort: true, open: true }` plus COOP/COEP headers
- [ ] `test: { include: ['tests/**/*.test.ts'], globals: false }`
- [ ] `test.coverage`: provider v8, include `src/**/*.ts`, reporter text+html

#### Research Insights

**Why merge vitest.config.ts:** Vitest natively reads `vite.config.ts` when you import `defineConfig` from `vitest/config`. The only test-specific config is the include glob and coverage settings. One file instead of two, one fewer import to maintain.

**Why `esbuild.target: 'es2022'`:** Without this, dev mode uses `esnext` while prod uses `es2022`, which can cause subtle behavioral differences (e.g., `useDefineForClassFields`).

**Why `globals: false`:** Explicit imports (`import { describe, it, expect } from 'vitest'`) are clearer and don't require `types: ["vitest/globals"]` in tsconfig.

**Vitest 4 breaking change:** `coverage.all` is removed. Must use `coverage.include` explicitly to ensure source files appear in reports even if not yet tested.

**COOP/COEP in dev server:** Matches production headers. Enables `SharedArrayBuffer` for potential worker offloading at 2000x2000+ grids.

**Reference config:**
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',

  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
  },

  esbuild: {
    target: 'es2022',
  },

  server: {
    port: 5173,
    strictPort: true,
    open: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  test: {
    include: ['tests/**/*.test.ts'],
    globals: false,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
    },
  },
})
```

### ~~0.4 — Vitest configuration~~ (ELIMINATED — merged into Task 0.3)

### 0.5 — HTML entry point

- [ ] Create `index.html`
- [ ] Full-viewport layout, no scrollbars
- [ ] Background color: #050508 (spec's void black) via CSS on canvas element
- [ ] Single `<canvas id="game-canvas">` element filling the viewport
- [ ] `<div id="ui-root"></div>` for future DOM-based UI overlays
- [ ] Loads `src/main.ts` as module
- [ ] PWA-ready meta tags (theme-color, apple-mobile-web-app-capable, viewport)

#### Research Insights

**CSS background-color on canvas:** Acts as fallback before WebGL context initializes. Users see void black immediately, not a white flash.

**`user-scalable=no` in viewport:** Prevents accidental zoom on mobile during touch drawing (Phase 3).

**Reference HTML:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#050508" />
    <meta name="description" content="Conway's Game of Life — cinematic WebGL2 simulation" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>Conway's Game of Life</title>
  </head>
  <body>
    <canvas id="game-canvas"></canvas>
    <div id="ui-root"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### 0.6 — Application entry stub (CRITICAL CHANGES)

- [ ] Create `src/main.ts`
- [ ] Get canvas element, set CSS size to 100vw/100vh
- [ ] **Acquire WebGL2 context** (NOT Canvas 2D — 2D permanently blocks WebGL2)
- [ ] Context attributes: `alpha: false`, `antialias: false`, `depth: false`, `stencil: false`, `powerPreference: 'high-performance'`
- [ ] Clear to background color: `gl.clearColor(0.02, 0.02, 0.03, 1.0); gl.clear(gl.COLOR_BUFFER_BIT)`
- [ ] Show user-facing error if WebGL2 unavailable
- [ ] **Use ResizeObserver** (not window resize event) for canvas sizing
- [ ] Handle `devicePixelRatio` — default to 1x DPR (bloom creates natural softness)
- [ ] Console log confirming WebGL2 boot + renderer info

#### Research Insights

**Canvas context poisoning (CRITICAL):** Per the HTML spec, calling `canvas.getContext('2d')` permanently binds that canvas to a 2D context. Any subsequent `canvas.getContext('webgl2')` returns `null`. Task 0.6 MUST use WebGL2 from day one. This also validates WebGL2 availability immediately rather than discovering it fails in Phase 2.

**Context attributes — performance impact:**
| Attribute | Default | Set To | Why |
|-----------|---------|--------|-----|
| `alpha` | true | **false** | No alpha compositing with page (5-15% GPU savings) |
| `antialias` | true | **false** | No MSAA (2-4x fragment throughput gain) — bloom provides edge softness |
| `depth` | true | **false** | No depth buffer (~8MB GPU memory saved at 1080p) — 2D app |
| `stencil` | false | **false** | No stencil buffer — not needed |
| `powerPreference` | 'default' | **'high-performance'** | Requests discrete GPU on laptops |
| `preserveDrawingBuffer` | false | **false** | MediaRecorder uses captureStream(), doesn't need it |

**ResizeObserver over window resize:** `window.addEventListener('resize')` fires 30-60 times per second during drag-resize. ResizeObserver is more reliable, catches CSS-driven resizes, and pairs naturally with debounce for expensive operations (FBO recreation in Phase 2).

**DPR handling:** A 1920x1080 display at 2x DPR has 3840x2160 physical pixels. Rendering at 1x DPR is 4x faster and the bloom post-processing creates natural softness from upscaling. Make this a quality toggle later.

**Reference pattern:**
```typescript
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const gl = canvas.getContext('webgl2', {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  powerPreference: 'high-performance',
})
if (!gl) { /* show error message */ }

const dpr = 1 // Performance mode; change to window.devicePixelRatio for quality
const observer = new ResizeObserver((entries) => {
  const { width, height } = entries[0].contentRect
  canvas.width = width * dpr
  canvas.height = height * dpr
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0.02, 0.02, 0.03, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)
})
observer.observe(canvas)
```

### 0.7 — Directory skeleton

- [ ] `src/engine/`
- [ ] `src/renderer/`
- [ ] `src/audio/`
- [ ] `src/ui/`
- [ ] `src/patterns/`
- [ ] `src/types/` (shared cross-module type definitions)
- [ ] `src/utils/` (shared math/color utilities)
- [ ] `tests/unit/`
- [ ] `tests/integration/`
- [ ] `public/`
- [ ] `.gitkeep` files where needed to preserve empty dirs

#### Research Insights

**Added `src/types/`:** Cross-module types (color constants, Vec2, SimConfig, RenderConfig) need a home. Without this, modules import types from each other's internal files, creating implicit coupling.

**Added `src/utils/`:** Shared utilities (color math, modular arithmetic for grid wrapping, throttle/debounce) are needed across engine, renderer, and UI. Without this, utilities get stuffed into whichever module needs them first.

**Added `tests/integration/`:** Phase 2 (wire renderer to engine) and Phase 3 (wire UI to app) are integration-level concerns. Establishing the directory now signals that integration testing is part of the architecture, not an afterthought.

**Removed `src/renderer/shaders/`:** This is Phase 2 internal structure. Let Phase 2 create whatever directory layout it needs for shaders.

**No `src/app/` directory:** Instead of a new directory, CLAUDE.md documents that `main.ts` is composition root only — no game logic, no rendering, no event handling. Simpler.

### 0.8 — Git infrastructure + security headers

- [ ] Create `.gitignore` (comprehensive — see reference below)
- [ ] Create `vercel.json` (SPA rewrite + full security header suite)

#### Research Insights

**Expanded .gitignore:**
```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Test coverage
coverage/

# TypeScript
*.tsbuildinfo

# Vite
.vite/

# Environment variables
.env
.env.local
.env.*.local

# Editor / IDE
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
.idea/
*.swp
*.swo
*~

# OS artifacts
.DS_Store
Thumbs.db
Desktop.ini

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Vercel
.vercel/

# Temporary files
temp/
```

**Security-critical additions:** `.env.*` patterns (Vite loads `.env.local`, `.env.development`, `.env.production`), `.vercel/` (stores deployment metadata and tokens).

**vercel.json — full security headers + CSP:**

WebGL does NOT require `unsafe-eval` for shader compilation — shaders are compiled inside the browser's WebGL implementation, not via JavaScript eval. This is a common misconception.

```jsonc
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

**CSP breakdown:**
- `blob:` in media-src/img-src: needed for MediaRecorder (Phase 5 video capture creates blob URLs)
- `worker-src 'self' blob:`: needed for potential Web Worker simulation offloading
- `'unsafe-inline'` in style-src: Vite injects inline styles during dev
- No `unsafe-eval`: WebGL shaders don't use JavaScript eval
- No external CDN sources: zero production deps = everything bundled

### 0.9 — Project CLAUDE.md (enhanced)

- [ ] Overview: cinematic Conway's Game of Life with WebGL2
- [ ] Tech stack: TypeScript, Vite 7, WebGL2, Web Audio API, no frameworks
- [ ] Architecture rule: CPU simulation / GPU rendering separation
- [ ] Architecture rule: engine has zero DOM/WebGL deps (fully testable)
- [ ] Architecture rule: DOM dependency inversion — engine defines interfaces (e.g., TimerProvider), app injects browser implementations. GameLoop lives in engine but receives `requestAnimationFrame` via injection.
- [ ] Architecture rule: all UI is vanilla TS + DOM (no React/Vue)
- [ ] Architecture rule: main.ts is composition root ONLY — creates instances, wires them together, nothing else. No game logic, no rendering, no event handling.
- [ ] Architecture rule: inter-module communication via typed callback injection — subsystems expose `onX(callback)` registration methods. No global event bus, no DOM CustomEvents on non-DOM objects.
- [ ] Architecture rule: WebGL2 context attributes are mandatory — `alpha:false, antialias:false, depth:false, stencil:false, powerPreference:'high-performance'`
- [ ] Convention: magic numbers (colors, timings, thresholds from spec) live in `src/constants.ts`
- [ ] Convention: ResizeObserver for canvas sizing, default 1x DPR
- [ ] Security: do not configure `server.host` or `server.fs.allow` in vite.config.ts without security review
- [ ] Testing: Vitest, engine-first testing strategy, `globals: false`

## Commit

`feat: scaffold project — vite + typescript + vitest + webgl2 context`

---

## Scalability Reference (from Performance Oracle)

| Grid Size | Cell Buffer | Total Memory | Est. Step Time | Worker Needed? |
|-----------|-------------|--------------|----------------|----------------|
| 500x500 | 250KB | ~1MB | ~2ms | No |
| 1000x1000 | 1MB | ~4MB | ~6-8ms | No |
| 2000x2000 | 4MB | ~16MB | ~25-30ms | Yes |
| 4000x4000 | 16MB | ~64MB | ~100-120ms | Yes + SharedArrayBuffer |

COOP/COEP headers are enabled from Phase 0 to support the SharedArrayBuffer path if needed.
