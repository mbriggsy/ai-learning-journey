# Codebase Concerns

**Analysis Date:** 2026-02-27

---

## Summary

This codebase is a **pure scaffold** — no implementation code exists yet. Every `src/` subdirectory (`engine/`, `renderer/`, `ai/`, `tracks/`, `types/`, `utils/`) is empty. Every `tests/` subdirectory (`engine/`, `renderer/`, `ai/`) is empty. The `tools/` directory is empty. All `public/assets/` subdirectories (`audio/`, `sprites/`, `tracks/`) are empty.

Concerns in this document therefore fall into two categories:
1. **Pre-implementation structural gaps** — things the scaffold is missing that will cause friction the moment coding begins.
2. **Architectural risks** — design decisions documented in `docs/` that carry known technical hazards.

---

## Tech Debt

**Package.json — No `build`, `dev`, or `start` scripts:**
- Issue: `package.json` defines only `"test": "echo \"Error: no test specified\" && exit 1"`. There is no `dev`, `build`, `lint`, or `typecheck` script. Running `pnpm dev` or `pnpm build` will silently do nothing useful.
- Files: `package.json`
- Impact: Every developer (and every Claude subagent) must manually know the Vite CLI invocations. The first time a subagent runs `pnpm test`, it gets an error exit — which could cascade into false CI failures once CI is added.
- Fix approach: Add `"dev": "vite"`, `"build": "vite build"`, `"typecheck": "tsc --noEmit"`, `"test": "vitest"` to `package.json` scripts before Phase 1 coding begins.

**`tsconfig.json` — `tests/` excluded from TypeScript compilation:**
- Issue: `"exclude": ["node_modules", "dist", "tests"]` means test files are not type-checked by `tsc`. Vitest will still run them, but `tsc --noEmit` (the standard CI typecheck) will silently ignore all test type errors.
- Files: `tsconfig.json`
- Impact: Type errors in test files are invisible to the typecheck script. A test importing a renamed symbol will appear to pass `tsc` but fail at runtime under Vitest.
- Fix approach: Create a separate `tsconfig.test.json` that includes `tests/**/*` and extends the root config, referenced in `vitest.config.ts` when it is created.

**No `vite.config.ts` exists:**
- Issue: Vite is installed as a devDependency and locked in `pnpm-lock.yaml`, but no configuration file exists. Vite will use defaults, which may not match the project's directory structure (e.g., `src/` as root, `public/` as assets).
- Files: `package.json` (vite `^7.3.1` is declared), `pnpm-lock.yaml`
- Impact: When Phase 2 renderer work begins, Vite's default assumptions about entry points and asset paths may produce confusing errors that look like code bugs.
- Fix approach: Create `vite.config.ts` with explicit `root`, `publicDir`, and `build.outDir` settings before the renderer phase.

**No `vitest.config.ts` exists:**
- Issue: Vitest is installed but unconfigured. No environment (jsdom vs node), no coverage config, no setup files are defined anywhere.
- Files: `package.json` (vitest `^4.0.18` is declared), `pnpm-lock.yaml`
- Impact: The engine tests (Phase 1) need a Node environment. The renderer tests need jsdom or happy-dom. Without explicit config, Vitest defaults may silently use the wrong environment for a given test suite.
- Fix approach: Create `vitest.config.ts` specifying `environment: 'node'` for engine tests and configuring coverage before Phase 1 test writing begins.

**`package.json` metadata is empty boilerplate:**
- Issue: `"description": ""`, `"author": ""`, `"main": "index.js"` (wrong entry point for a Vite project — should be `"private": true` with no `main`). The `"main"` field pointing to `index.js` could confuse tooling that tries to resolve this as a Node library.
- Files: `package.json`
- Impact: Low immediate risk; higher risk if any tool (bundler, package manager, IDE extension) reads `main` and tries to resolve `index.js` which doesn't exist.
- Fix approach: Set `"private": true`, remove `"main": "index.js"`, fill in `"description"`.

---

## Known Bugs

None detected in implementation code — no implementation exists yet. However, one structural issue in the scaffold that will manifest as a bug on first use:

**`pnpm test` exits with code 1:**
- The current test script is `"echo \"Error: no test specified\" && exit 1"`. Any CI check or automated verification that runs `pnpm test` and checks exit code will fail immediately.
- Files: `package.json`
- Impact: Blocks any CI pipeline or GSD verification step that uses test exit codes as success signals.

---

## Security Considerations

**`.gitignore` — `.planning/` is gitignored:**
- Risk: The `.planning/` directory (which contains this file) is excluded from git via `.gitignore`. If `.planning/` contains architectural decisions, specs, and roadmaps that inform the build, those documents are invisible to collaborators cloning the repo.
- Current mitigation: None — the exclusion is intentional per the `.gitignore` entry.
- Recommendations: This is a deliberate design choice (planning docs may be ephemeral). Document this decision explicitly so future contributors know planning artifacts are local-only. If the planning docs need to be shared, consider committing a `docs/planning/` directory instead and keeping `.planning/` for truly ephemeral scratch files.

**No `index.html` entry point exists:**
- Risk: Vite requires an `index.html` at the project root as its default entry point. When a subagent attempts to run `vite` for the first time, it will either fail or generate an unexpected default page. This is not a security risk per se, but it is a silent failure mode.
- Files: Project root (missing `index.html`)
- Current mitigation: None.
- Recommendations: Create a minimal `index.html` as part of scaffold before Phase 1 or Phase 2 begins.

**AI Bridge — ZeroMQ/WebSocket (Phase 4 design risk):**
- Risk: The Python-to-Node.js bridge documented in `docs/gsd-interview-prep.md` and `docs/Top-Down-Racer-v02-Complete-Tool-Stack.md` will expose a local socket interface. ZeroMQ with no authentication or WebSockets with no origin validation would accept connections from any process on the machine.
- Current mitigation: Not applicable — the bridge is not yet built.
- Recommendations: When Phase 4 begins, bind the ZeroMQ/WebSocket server to `127.0.0.1` only (never `0.0.0.0`). Add a shared secret or token for the Python client to authenticate if the bridge ever runs in a multi-user or networked environment. Document this constraint in the AI bridge spec before implementation.

---

## Performance Bottlenecks

**None detected — codebase is pre-implementation (early scaffold stage).**

The following architectural performance risks are documented in `docs/gsd-interview-prep.md` and should be tracked:

**AI training simulation throughput (Phase 4–5 design risk):**
- The simulation engine is designed to run headless at high tick rates for AI training. The docs acknowledge the 60Hz tick rate "can be bumped to 120Hz later if tunneling becomes an issue." Tunneling (fast objects passing through thin walls between ticks) at 60Hz with simcade speeds is a known physics bug class in tick-based engines. The current scaffold has no safeguards and no sweep-based collision detection specified.
- Files: `src/engine/` (empty — no implementation yet)
- Risk: If the collision system is implemented as point-based rather than swept, fast-moving cars will pass through walls at high speeds or high tick rates, producing silent physics errors that corrupt AI training data.

---

## Fragile Areas

**Engine/Renderer boundary enforcement:**
- Files: `src/engine/` (empty), `src/renderer/` (empty)
- Why fragile: The architecture's core constraint — "engine has zero PixiJS imports" — has no enforcement mechanism in the current scaffold. There is no ESLint import boundary plugin (e.g., `eslint-plugin-import` with `no-restricted-imports`), no TypeScript path alias that would make cross-layer imports obviously wrong, and no CI check that validates the boundary.
- Safe modification: Before Phase 1 coding begins, add an ESLint rule or a simple CI script that scans `src/engine/**` for any import containing `pixi`. This makes the boundary a hard constraint rather than a convention dependent on developer discipline.

**Determinism requirement for AI training:**
- Files: `src/engine/` (empty)
- Why fragile: The docs specify "all game logic is deterministic and tick-based." JavaScript's `Math.random()` is not seedable in the standard library. If any engine code ever calls `Math.random()` (for spawn position variation, particle effects accidentally leaking into engine state, etc.), the determinism guarantee silently breaks. AI training sessions become non-reproducible.
- Safe modification: Create a seeded PRNG (e.g., a simple mulberry32 or xorshift implementation) in `src/utils/` at the very start of Phase 1. Establish a project-wide convention that `Math.random()` is banned in `src/engine/` and that all randomness flows through the seeded PRNG. Enforce with ESLint `no-restricted-globals` or a custom rule.

**TypeScript version `^5.9.3` — non-existent release:**
- Files: `package.json`, `pnpm-lock.yaml`
- Why fragile: At the time of scaffold creation, TypeScript `5.9.3` does not exist (TypeScript was at `5.7.x` as of early 2026). The `pnpm-lock.yaml` resolves this to `5.9.3` with an integrity hash, suggesting this is either a future version that was pulled from a pre-release channel or the version number in docs/lock is incorrect. If the lock file integrity hash is wrong, `pnpm install --frozen-lockfile` will fail in CI.
- Safe modification: Run `pnpm why typescript` and verify the installed version is functional. If CI is added, test `pnpm install --frozen-lockfile` explicitly before Phase 1 begins.

**`@types/node` version `^25.3.2` — ahead of Node 24.x:**
- Files: `package.json`, `pnpm-lock.yaml`
- Why fragile: `@types/node@25.x` provides typings for Node.js 25.x APIs. The CLAUDE.md specifies `Node 24.x`. Using typings for a newer major version than the runtime can expose type-safe code that uses APIs unavailable at runtime.
- Safe modification: Pin `@types/node` to `^24.x` to match the specified runtime.

---

## Scaling Limits

**Track system — 1 track for Phases 1–2, 3–5 for Phase 3:**
- The design doc (`docs/gsd-interview-prep.md`) explicitly accepts this constraint: "Once the spline system works, cranking out tracks is fast." This is a reasonable deferral, not a scaling problem.
- Risk to note: If the track data format is not versioned from Phase 1, adding tracks in Phase 3 may require migrating Phase 1 track definitions. Establish a track data schema version field from the beginning.

**AI training — single agent only:**
- Ghost cars / no car-to-car collision is explicitly scoped out (called "a killer v03 feature"). This is a scaling limit by deliberate design, not an oversight.

---

## Dependencies at Risk

**`typescript@^5.9.3` — version may not exist:**
- Risk: As noted above, TypeScript 5.9.3 is a future or non-existent release as of the scaffold date (Feb 2026). The lock file resolves it, which may mean it was pulled from a prerelease or nightly channel. Prerelease TypeScript versions can have breaking changes or bugs not present in stable releases.
- Impact: TypeScript compilation errors or unexpected behavior in strict mode that would not occur on a stable release. Could block all Phase 1 work if the compiler is broken.
- Files: `package.json`, `pnpm-lock.yaml`

**`vite@^7.3.1` and `vitest@^4.0.18` — very recent major versions:**
- Risk: Vite 7.x and Vitest 4.x represent recent major version bumps. These are likely stable, but ecosystem plugin compatibility (e.g., any PixiJS Vite plugins, Vitest browser mode) may not yet support these major versions.
- Impact: If a needed Vite or Vitest plugin only supports v6/v3, the project will need to downgrade or patch at the start of Phase 2.
- Files: `package.json`, `pnpm-lock.yaml`

**`@types/node@^25.3.2` — version mismatch with runtime:**
- Risk: As noted in Fragile Areas, typings for Node 25.x on a Node 24.x runtime.
- Impact: Type-safe code that calls Node 25.x-only APIs will compile but throw `TypeError` at runtime.
- Files: `package.json`

**Python ML stack (stable-baselines3 + PyTorch + Gymnasium) — not yet installed:**
- Risk: The entire AI training pipeline (Phases 4–6) depends on a Python environment that does not yet exist in the project. The `docs/` references `uv` as the Python package manager, but no `pyproject.toml`, `requirements.txt`, or `uv.lock` exists.
- Impact: Phase 4 begins with a cold-start Python environment setup problem on top of the implementation work. Dependency resolution for stable-baselines3 + PyTorch on Windows can be non-trivial (CUDA drivers, torch wheel selection).
- Files: Project root (missing Python project files entirely)

---

## Missing Critical Features

**No entry point — `index.html` missing:**
- Problem: Vite requires `index.html` at the project root. The project has no HTML entry point.
- Blocks: Phase 2 (renderer) cannot start without it. Running `vite` in dev mode will error or serve a blank default.

**No Vite configuration:**
- Problem: `vite.config.ts` does not exist.
- Blocks: Phase 2 renderer work; any customization of asset paths, aliases, or build targets requires this file.

**No Vitest configuration:**
- Problem: `vitest.config.ts` does not exist.
- Blocks: Phase 1 engine tests cannot be properly configured (environment, coverage, setup files).

**No ESLint or linting configuration:**
- Problem: No `.eslintrc`, `eslint.config.js`, or any linting setup exists.
- Blocks: The engine/renderer boundary constraint (zero PixiJS imports in engine) has no automated enforcement. The `Math.random()` determinism ban has no automated enforcement. Code style consistency across multiple subagents working in parallel (GSD wave execution) is unenforceable.

**No `index.html` and no `main.ts` entry point:**
- Problem: Neither the browser entry point HTML nor the TypeScript entry module exists.
- Blocks: Any manual verification that Phase 1 engine code runs in a browser context.

**Python environment files entirely absent:**
- Problem: No `pyproject.toml`, `requirements.txt`, `setup.py`, or `uv.lock`. The AI bridge, Gymnasium wrapper, and training pipeline have zero Python scaffolding.
- Blocks: Phases 4, 5, and 6 cannot begin without establishing the Python project structure first.

**No CI configuration:**
- Problem: No `.github/workflows/`, no `Makefile`, no CI scripts of any kind.
- Blocks: Automated verification that the engine/renderer boundary is clean, that tests pass, and that TypeScript compiles on each commit.

---

## Test Coverage Gaps

**Engine — 0% coverage:**
- What's not tested: All physics logic, collision detection, car dynamics, track geometry, checkpoint system, spline math — everything planned for Phase 1.
- Files: `tests/engine/` (empty directory), `src/engine/` (empty directory)
- Risk: Physics determinism bugs, tunneling bugs, checkpoint edge cases, and floating-point accumulation errors will only be discovered during AI training (Phase 5), which is the most expensive place to find them.
- Priority: High — engine correctness is the foundation of the entire project. All engine modules should have tests before the renderer is built.

**Renderer — 0% coverage:**
- What's not tested: PixiJS integration, canvas rendering, state-to-visual mapping.
- Files: `tests/renderer/` (empty directory), `src/renderer/` (empty directory)
- Risk: Renderer bugs are lower risk than engine bugs (visual only, won't corrupt AI training), but untested renderer code makes Phase 3 polish work fragile.
- Priority: Medium — basic smoke tests for renderer initialization and state rendering are sufficient; pixel-perfect testing is not required.

**AI Bridge — 0% coverage:**
- What's not tested: ZeroMQ/WebSocket message protocol, observation serialization, action deserialization, reset/step/close lifecycle.
- Files: `tests/ai/` (empty directory), `src/ai/` (empty directory)
- Risk: Protocol bugs between the Python Gymnasium environment and the Node.js bridge are silent and hard to debug. A mismatched observation vector dimension or wrong action scaling will produce subtly wrong training without throwing an error.
- Priority: High — the bridge is the integration point between the game engine and the ML pipeline. Contract tests (verifying observation shape, action range, step/reset protocol) are essential before Phase 5 training begins.

**No test runner configured:**
- What's not tested: Nothing — `pnpm test` exits with code 1 immediately.
- Files: `package.json`
- Risk: Any CI or verification step that runs tests will fail before executing a single test case.
- Priority: Critical — fix `package.json` test script to run `vitest` before Phase 1 begins.

---

*Concerns audit: 2026-02-27*
