---
phase: 06-ai-vs-human-mode
plan: 02
status: complete
date: "2026-03-02"
---

## Objective

Build the browser-side AI inference infrastructure: Vite config for onnxruntime-web WASM delivery, the BrowserAIRunner class (TDD), and the AiCarRenderer ghost car visual (VIS-06). All ready for Plan 03 to wire into GameLoop/ScreenManager.

## Tasks Completed

| Task | Status | Files |
|------|--------|-------|
| Task 1: Vite config + dependencies | PASSED (build clean, 4 WASM files copied) | `vite.config.ts`, `package.json`, `pnpm-lock.yaml` |
| Task 2: TDD -- BrowserAIRunner | PASSED (16 tests) | `src/ai/browser-ai-runner.ts`, `tests/ai/browser-ai-runner.test.ts` |
| Task 3: AiCarRenderer ghost car | PASSED (build clean) | `src/renderer/AiCarRenderer.ts` |

## Key Files

**Created:**
- `src/ai/browser-ai-runner.ts` -- BrowserAIRunner class: load(), infer(), dispose() with ONNX session management
- `src/renderer/AiCarRenderer.ts` -- AI ghost car with cyan tint (0x00eeff), alpha 0.55, GlowFilter
- `tests/ai/browser-ai-runner.test.ts` -- 16 test cases covering load/infer/dispose and error paths

**Modified:**
- `vite.config.ts` -- viteStaticCopy for ORT WASM, assetsInclude for .onnx, optimizeDeps.exclude for onnxruntime-web

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| vi.mock() factory avoids outer-scope variable references | Vitest hoists vi.mock() above all declarations; referencing outer vars causes ReferenceError |
| Float32Array precision handled with toBeCloseTo in tests | Float32 representation of 0.8 is 0.800000011920929; exact equality fails |
| AiCarRenderer delegates update() to CarRenderer | Prevents heading offset bug (CP-1); maintains consistent position API |
| Per-child tint iteration (not container.tint) | PixiJS v8 Container has no tint property; only Sprite/Graphics do |
| Tree-shakeable import from pixi-filters/glow | Only includes GlowFilter code, not all 40+ filters |
| Runtime stats JSON validation with type guard | Prevents silent NaN propagation from malformed Python export |
| Output tensor disposal after value extraction | Prevents WASM heap leak of ~43 KB/min at 60Hz inference |

## Self-Check: PASSED

- `pnpm test` -- 366/366 tests pass (16 test files), zero regressions
- `pnpm run build` -- clean build, zero TypeScript errors, 4 WASM files copied
- All 3 tasks verified individually

## Deviations

1. **Test mock restructured**: Plan specified mock fixtures above vi.mock() for closure capture, but Vitest hoists vi.mock() above all variable declarations. Fixed by moving mock configuration to beforeEach via vi.mocked().
2. **Float32 precision in test**: Added toBeCloseTo() assertion instead of exact toEqual() for the 3-tuple output test, due to Float32Array precision (0.8 -> 0.800000011920929).
