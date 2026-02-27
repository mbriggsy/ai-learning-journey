# Testing Patterns

**Analysis Date:** 2026-02-27

> **Note:** This project is in scaffold state. The `tests/` directory exists with subdirectory structure (`tests/engine/`, `tests/ai/`, `tests/renderer/`) but contains no test files. No `vitest.config.*` file exists yet. All findings below are derived from `package.json`, `tsconfig.json`, planning documents, and the architectural decisions in `docs/` and `CLAUDE.md`. These represent the **intended** testing setup, not patterns inferred from existing tests.

---

## Test Framework

**Runner:** Vitest `^4.0.18`

**Config:** No config file exists yet. No `vitest.config.ts`, `vitest.config.js`, or `vitest.config.mjs` is present in the project root. Vitest will use its defaults when a config is eventually created.

**Assertion Library:** Vitest's built-in `expect` (from `@vitest/expect`, which ships with Vitest).

**Run Commands:**

```bash
# Currently broken — placeholder script only
pnpm test
# Outputs: "Error: no test specified" and exits 1

# Intended commands (not yet configured):
pnpm vitest          # run tests in watch mode
pnpm vitest run      # single run, CI mode
pnpm vitest run --coverage  # with coverage report
```

Source: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\package.json` — `"test": "echo \"Error: no test specified\" && exit 1"`

Note: The test script is a placeholder from `pnpm init`. Vitest is installed as a dev dependency but has not been wired into the scripts block.

---

## Test File Organization

**Location:** Separate `tests/` directory (not co-located with source files).

The `tests/` directory mirrors the `src/` directory structure:

```
tests/
  engine/     ← tests for src/engine/
  ai/         ← tests for src/ai/
  renderer/   ← tests for src/renderer/
```

Note: `tests/` is explicitly **excluded** from the TypeScript compiler in `tsconfig.json` (`"exclude": ["node_modules", "dist", "tests"]`). Vitest handles its own TypeScript transpilation for test files.

Source: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\tsconfig.json`

**Naming:** No test files exist yet to establish a naming pattern. Based on the directory scaffold and Vitest defaults, the expected pattern will be `*.test.ts` (e.g., `tests/engine/physics.test.ts`).

---

## Test Structure

**Suite Organization:**

No test files exist yet. Based on Vitest conventions and the project's TypeScript + ESM setup, the expected pattern is:

```typescript
import { describe, it, expect } from 'vitest';

describe('ModuleName', () => {
  it('does the expected thing', () => {
    // arrange
    // act
    // assert
    expect(result).toBe(expected);
  });
});
```

---

## Mocking

**Framework:** Vitest's built-in `vi` mock utilities (`vi.fn()`, `vi.mock()`, `vi.spyOn()`).

**Patterns (from architectural intent):**

The decoupled engine/renderer architecture makes mocking strategy straightforward:

- **Engine tests** (`tests/engine/`) — no mocking needed. The engine is pure TypeScript logic with zero external dependencies (no PixiJS, no DOM, no async I/O). All functions are deterministic and tick-based. Tests can call engine functions directly.

- **Renderer tests** (`tests/renderer/`) — PixiJS rendering calls will need mocking. PixiJS relies on WebGL/Canvas APIs not available in Node.js. Vitest's `jsdom` environment or manual mocks of the PixiJS `Application` and scene objects will be required.

- **AI bridge tests** (`tests/ai/`) — ZeroMQ/WebSocket connections will need mocking. The bridge's Python communication layer will require mock implementations of the transport layer.

From `CLAUDE.md`: "Engine and renderer are strictly separated — engine has zero PixiJS imports." This architectural constraint means engine tests run as pure unit tests with no environment setup.

---

## Coverage

**Requirements:** None enforced. No coverage configuration exists in `package.json` or any Vitest config. No coverage threshold has been set.

Coverage tooling (`@vitest/coverage-v8` or `@vitest/coverage-istanbul`) is not listed in `package.json` dependencies and has not been installed.

---

## Test Types

**Unit Tests:** Primary focus. The engine layer (`src/engine/`) is designed to be fully unit-testable headless — deterministic physics, tick-based simulation, zero rendering dependencies. This is explicitly called out as a design goal in `docs/Top-Down-Racer-v02-Complete-Tool-Stack.md`: "Phase 1 deliverable: Deterministic tick-based physics, car dynamics, track geometry, collision detection. Fully testable, zero rendering."

**Integration Tests:** Anticipated for the AI bridge layer (`tests/ai/`) — testing that the Gymnasium wrapper correctly steps the simulation and returns valid observation vectors.

**E2E Tests:** Not planned. No E2E framework (Playwright, Cypress) is installed. The project is a game, not a web application with user flows. Manual play-testing serves the E2E role for the rendered game.

---

## Architecture Notes Affecting Testability

From `docs/gsd-interview-prep.md` and `CLAUDE.md`:

1. **Fixed 60Hz tick rate, decoupled from rendering** — the simulation `tick()` function can be called synchronously in tests. No `requestAnimationFrame` mocking needed for engine tests.

2. **Deterministic physics** — given the same initial state and input sequence, the simulation always produces the same output. Tests can be fully deterministic with no random seeds to manage.

3. **Headless-first design** — the engine was designed from the start to run without a browser, making the entire `src/engine/` tree testable in Node.js with Vitest's default environment.

4. **Test directory excluded from tsconfig** — `tests/` is excluded from `tsconfig.json` compilation. Vitest will need its own `tsconfig` reference or inline compiler options to pick up the same strict mode settings.

---

*Testing analysis: 2026-02-27*
