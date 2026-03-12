---
title: "Phase -1: Foundation — Engine + AI Copy, Build Tooling, 377 Tests Green"
type: feat
status: completed
date: 2026-03-11
origin: docs/brainstorms/2026-03-11-full-build-brainstorm.md
deepened: 2026-03-11
---

# Phase -1: Foundation — Engine + AI Copy, Build Tooling, 377 Tests Green

## Enhancement Summary

**Deepened on:** 2026-03-11
**Research agents used:** Architecture Strategist, Security Sentinel, Code Simplicity Reviewer, Pattern Recognition Specialist, Vitest/Vite Best Practices Researcher, Python/Windows Best Practices Researcher

### Key Improvements
1. **Build script bug fixed** — `tsc` without `--noEmit` pollutes source tree with stale `.js` files
2. **Dependency timing corrected** — `onnxruntime-web` + `ws` required now (AI imports), `pixi-filters` deferred to Phase 3
3. **Missing files discovered** — `src/main.ts` placeholder (Vite entry), `python/training/__init__.py` (Python imports)
4. **pnpm config modernized** — `onlyBuiltDependencies` deprecated; migrate to `allowBuilds` in `pnpm-workspace.yaml`
5. **tsconfig hardened** — add `isolatedModules: true` (critical for Vite correctness)
6. **Execution simplified** — 7 phases collapsed to 3 (Setup → Copy → Validate)

### New Considerations Discovered
- ORT WASM Vite plugin has a minor path traversal gap — add `..` guard (defense-in-depth)
- PyTorch 2.9+ changed `torch.onnx.export` default to dynamo mode — v04 Phase 5 must use `dynamo=False`
- Python pytest markers needed to separate bridge-dependent vs standalone tests

---

## Overview

Phase -1 bootstraps v04 by copying the proven engine, AI bridge, and track definitions from v02, setting up build tooling, and validating all 377 tests pass unchanged. Zero creative work until this gate is green.

(see brainstorm: `docs/brainstorms/2026-03-11-full-build-brainstorm.md` — Decision #2, #6)

## Proposed Solution

Copy source files verbatim from v02. Copy config files verbatim (with minimal v04 adjustments noted below). Align dependency versions. Run tests. No modifications to any engine, AI, or track file.

## Technical Considerations

### track02.ts and track03.ts Must Be Copied

`registry.ts` has hard imports of track02/03. Multiple engine tests also import them. **All four track files must be copied** for TypeScript to compile. Track 02/03 geometry replaced in Phase 1.

### Leaderboard.ts — Utility in Wrong Directory

`src/renderer/Leaderboard.ts` is a pure localStorage wrapper — zero PixiJS imports. Copy to `src/renderer/` to preserve import paths and hit the 377 target. Relocate to `src/utils/` when renderer is built in a later phase.

### Build Script Bug (v04 scaffold)

v04 has `"build": "tsc && vite build"` — this emits `.js` files alongside `.ts` sources (Vite ignores them). **Fix to `"tsc --noEmit && vite build"`** to match v02's correct pattern.

### Research Insights: Config & Dependencies

**tsconfig.json — add these to v02's config:**
- `"isolatedModules": true` — **critical** for Vite/esbuild transpilation correctness
- `"moduleDetection": "force"` — treats all files as modules regardless of import/export presence
- v02's `"outDir"`, `"rootDir"`, `"declaration"`, `"sourceMap"` are unnecessary with `--noEmit` builds but harmless; keep for compatibility

**pnpm.onlyBuiltDependencies is deprecated (pnpm 10.26+, removed in pnpm 11):**
- Remove from `package.json`
- Create `pnpm-workspace.yaml` with `allowBuilds: { esbuild: true, onnxruntime-web: true }`

**Dependency timing — what to add NOW vs LATER:**
- **Now** (Phase -1): `onnxruntime-web`, `ws`, `@types/ws`, `tsx` — AI bridge files import these, tests won't compile without them
- **Defer to Phase 3**: `pixi-filters` — nothing in the copy set imports it
- **Keep from v04 scaffold**: `@vitest/coverage-v8` (bump to `^4.0.0`), `"private": true`, `"type": "module"`, `typecheck` script

**`"type": "module"` is safe to keep.** All copied source files use ESM `import`/`export`. `scripts/copy-ort-wasm.cjs` uses `.cjs` extension which explicitly opts out. Vitest 4, Vite 7, and tsx all handle it natively.

### Research Insights: Security

**ORT WASM plugin path traversal (defense-in-depth):** v02's custom middleware passes URL segments directly to `path.join`, which resolves `..` segments. Add guard when copying to v04:
```typescript
if (filename.includes('..')) return next();
```

**`.env` handling is correct:** `.gitignore` covers `.env`, never committed to git history, Vite has no `envPrefix` set so values won't leak into browser bundles.

### Research Insights: Python Environment

**Windows CPU-only PyTorch:** `pip install torch` on Windows already installs CPU-only wheels from PyPI. No `--index-url` needed. GPU training (Phase 5) requires explicit CUDA index.

**Bridge-dependent test separation:** Use pytest markers (`@pytest.mark.bridge` / `@pytest.mark.standalone`) and `--strict-markers` in pytest config. Auto-skip bridge tests when Node.js bridge unavailable.

**ONNX export warning for Phase 5:** PyTorch 2.9+ defaults `torch.onnx.export` to dynamo mode. v02's export script must pass `dynamo=False` to use the proven TorchScript path. Flag this for Phase 5 plan.

### Placeholder: src/main.ts

Vite dev server requires the entry point referenced in `index.html`. Create a one-line `src/main.ts`:
```typescript
console.log('v04 scaffold — no renderer yet');
```
This is not engine code — it's a Vite entry point, replaced when the renderer phase begins.

## Acceptance Criteria

### File Copy (verbatim from v02)

Copy these directories/files from v02 to v04:

- [x] `src/engine/` — 10 files (types, constants, vec2, spline, track, car, collision, checkpoint, world, RaceController)
- [x] `src/ai/` — 9 files (ai-config, observations, raycaster, reward, vecnormalize, headless-env, bridge-server, run-bridge, browser-ai-runner)
- [x] `src/tracks/` — 4 files (registry, track01, track02, track03)
- [x] `src/renderer/Leaderboard.ts` — 1 file (pure localStorage utility, no PixiJS imports)
- [x] `tests/` — 17 files preserving subdirectory structure (engine/10, ai/6, renderer/1)
- [x] `python/` — entire training infrastructure (racer_env/, training/, tests/, requirements.txt, ai-config.json) **including `training/__init__.py`**
- [x] `scripts/copy-ort-wasm.cjs` — ONNX WASM file copier

### Config Files (copy from v02, apply noted adjustments)

- [x] `tsconfig.json` — v02 verbatim + add `isolatedModules: true`, `moduleDetection: "force"`
- [x] `vite.config.ts` — v02 verbatim + add `..` path traversal guard in ORT middleware
- [x] `vitest.config.ts` — v02 verbatim (8 lines, no changes needed)
- [x] `index.html` — v02 verbatim, change `<title>` to "Top-Down Racer v04"
- [x] `src/main.ts` — new one-line placeholder (Vite entry point)

### package.json Updates

- [x] Fix build script: `"build": "tsc --noEmit && vite build"`
- [x] Add from v02: `test:verbose`, `bridge`, `setup:ort` scripts
- [x] Keep from v04 scaffold: `typecheck`, `"private": true`, `"type": "module"`
- [x] Add `packageManager` field (match v02's pnpm version)
- [x] Dependencies: align `pixi.js` to `^8.16.0`, add `onnxruntime-web ^1.24.2`, `ws ^8.19.0`
- [x] Dev deps: bump `vitest` to `^4.0.0`, `@vitest/coverage-v8` to `^4.0.0`, `typescript` to `^5.9.0`, `@types/node` to `^25.0.0`, `vite` to `^7.3.0`; add `tsx ^4.21.0`, `@types/ws ^8.18.1`
- [x] Remove `pnpm.onlyBuiltDependencies` from package.json
- [x] Create `pnpm-workspace.yaml` with `onlyBuiltDependencies` (pnpm workspace format)
- [x] `pnpm install` succeeds cleanly

### Validation Gates

- [x] `pnpm run typecheck` — zero errors
- [x] `pnpm test` — **377/377 tests pass**
- [x] `pnpm dev` — Vite dev server starts without errors
- [x] `diff -r` between v02 and v04 engine/AI/track source files — zero differences
- [x] Python venv deps installed (`pip install -r requirements.txt`) — Python 3.12 required
- [x] Python standalone tests pass (`pytest python/tests/`) — 12/12 pass
- [x] `.serena/project.yml` updated with `languages: ["typescript"]`

## Execution Order

```
Step 1 — Setup:
  ├── Copy config files (tsconfig, vite.config, vitest.config, index.html)
  ├── Create src/main.ts placeholder
  ├── Update package.json (versions, deps, scripts)
  ├── Create pnpm-workspace.yaml
  └── pnpm install (after package.json is written)

Step 2 — Copy:
  ├── Copy all TS source files (engine, tracks, AI, Leaderboard.ts)
  ├── Copy all TS test files (preserving subdirectory structure)
  ├── Copy scripts/copy-ort-wasm.cjs
  ├── Copy Python training infrastructure (including training/__init__.py)
  └── pip install -r requirements.txt in existing venv

Step 3 — Validate:
  ├── pnpm run typecheck
  ├── pnpm test (377 must pass)
  ├── pnpm dev (verify dev server starts)
  ├── diff -r verification (engine, AI, tracks byte-identical to v02)
  ├── pytest -m "not bridge" python/tests/
  └── Update .serena/project.yml
```

## Dependencies & Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `"type": "module"` causes import resolution failures | Low | Remove the field if tests fail; all imports verified as clean ESM |
| Python bridge-dependent tests fail without Node.js bridge running | High | Use pytest markers; only standalone tests required to pass in Phase -1 |

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-11-full-build-brainstorm.md](docs/brainstorms/2026-03-11-full-build-brainstorm.md) — Key decisions: (1) Copy engine + AI bridge verbatim, (2) 377 tests pass before creative work, (3) Phase structure follows spec
- **Full spec:** [docs/Top-Down-Racer-v04-CE-Spec.md](docs/Top-Down-Racer-v04-CE-Spec.md)
- **v02 reference:** `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02`
- **Vitest 4 migration guide:** https://vitest.dev/guide/migration.html
- **pnpm allowBuilds:** https://pnpm.io/settings (replaces deprecated `onlyBuiltDependencies`)
- **PyTorch ONNX dynamo change:** https://docs.pytorch.org/docs/stable/onnx.html — use `dynamo=False` for SB3 models

### Flags for Later Phases
- **Phase 1:** Relocate `Leaderboard.ts` from `src/renderer/` to `src/utils/` when building new renderer
- **Phase 3:** Add `pixi-filters ^6.1.5` dependency (deferred from Phase -1 — nothing imports it yet)
- **Phase 5:** Use `dynamo=False` in `torch.onnx.export` for SB3 model export (PyTorch 2.9+ breaking change)
- **Phase 5:** v02 ISS-001 (polygon winding) applies to new track geometry
