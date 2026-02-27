# Coding Conventions

**Analysis Date:** 2026-02-27

> **Note:** This project is in scaffold state. The directory structure has been established and configuration files are in place, but no application source files exist yet in `src/` or `tests/`. All conventions below are derived from the tooling configuration (`package.json`, `tsconfig.json`), planning documents, and the architectural decisions captured in `docs/` and `CLAUDE.md`. These represent the **intended** conventions for the project, not conventions inferred from working code.

---

## Naming Patterns

**Files:** No source files exist yet. Based on the directory scaffold:
- `src/engine/` — simulation engine modules
- `src/renderer/` — PixiJS rendering layer
- `src/ai/` — AI bridge / Gymnasium wrapper
- `src/tracks/` — track geometry definitions
- `src/types/` — shared TypeScript type definitions
- `src/utils/` — utility functions

Expected file naming: `camelCase.ts` for modules (inferred from TypeScript project conventions and the architecture described in `CLAUDE.md`).

**Functions:** Not yet established from source. Architecture intent is functional/modular design for the engine (pure functions for deterministic physics) and class-based design for the renderer layer.

**Variables:** Not yet established from source.

**Types:** TypeScript interfaces and types expected in `src/types/`. The architecture separates shared types from module-specific types.

---

## Code Style

**Formatting:** No `.prettierrc`, `biome.json`, or other formatting config file is present in the project root. No formatter is currently configured.

**Linting:** No `.eslintrc.*` or `eslint.config.*` file is present. No linter is currently configured.

No `format`, `lint`, or `check` scripts exist in `package.json`. The current scripts section is:

```json
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

Source: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\package.json`

---

## Import Organization

**Order:** Not yet established — no source files exist.

**Path Aliases:** None configured. `tsconfig.json` does not define `paths` aliases. Module resolution uses `"moduleResolution": "bundler"` which enables Vite's resolution behavior.

Source: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\tsconfig.json`

---

## Error Handling

**Patterns:** Not yet established from source. No application code exists.

Architectural intent from `docs/gsd-interview-prep.md`: The engine is deterministic and tick-based; error handling will likely focus on invalid state detection (e.g., car out-of-bounds) rather than async error flows.

---

## TypeScript Patterns

**Strict mode:** Yes — enabled via `"strict": true` in `tsconfig.json`.

Full compiler options from `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

Key implications of strict mode: `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict` are all enabled.

`tests/` is **excluded** from the main TypeScript compilation (handled separately by Vitest's own transpilation).

**Key patterns (from architecture intent):**
- Engine modules (`src/engine/`) must have **zero PixiJS imports** — enforced by architectural constraint documented in `CLAUDE.md`
- Renderer modules (`src/renderer/`) read engine state without modifying it
- Shared types live in `src/types/` to allow both engine and renderer to reference them without creating circular dependencies
- `declaration: true` generates `.d.ts` files — modules are designed to be used as a library (e.g., by the Python AI bridge)

---

## Module Design

**Exports:** Not yet established from source. The project targets ESNext modules (`"module": "ESNext"`) with bundler resolution, meaning named exports over default exports is the expected pattern for TypeScript library code.

**Architecture boundary (from `CLAUDE.md`):**
- Engine (`src/engine/`) — pure TypeScript logic, headless-first, no rendering imports
- Renderer (`src/renderer/`) — PixiJS only, reads engine state
- AI Bridge (`src/ai/`) — Gymnasium-compatible wrapper, Python bridge via ZeroMQ/WebSocket
- The strict separation is a **hard constraint**, not a soft preference

---

## Toolchain Summary

| Tool | Version | Config File |
|------|---------|-------------|
| TypeScript | `^5.9.3` | `tsconfig.json` |
| Vite | `^7.3.1` | None yet |
| Vitest | `^4.0.18` | None yet |
| PixiJS | `^8.16.0` | — |
| Node.js | 24.x (per `CLAUDE.md`) | — |
| pnpm | `10.30.3` | `package.json` `packageManager` field |

Source: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\package.json`

---

*Convention analysis: 2026-02-27*
