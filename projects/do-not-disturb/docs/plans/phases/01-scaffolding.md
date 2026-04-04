---
phase: 1
title: Scaffolding & Tech Stack
status: deep
---

# Phase 1: Scaffolding & Tech Stack

**Goal:** Empty project that builds, typechecks, and runs tests (even with zero tests). Phaser canvas renders. All conventions locked.

## Tasks

### 1. Initialize pnpm project

```json
{
  "name": "do-not-disturb",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.30.3",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:game": "vitest run --project game",
    "test:renderer": "vitest run --project renderer",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "phaser": "3.90.0"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^4.1.2",
    "jsdom": "^28.1.0",
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vitest": "^4.1.2"
  },
  "pnpm": {
    "onlyBuiltDependencies": [
      "esbuild"
    ]
  }
}
```

**Notes:**
- Phaser pinned exact at 3.90.0 (proven stable, likely last v3 release)
- No asset pipeline deps yet — those come in later phases (Sharp, @google/genai, tsx, etc.)
- No pathfinding lib yet — custom platform graph in Phase 2
- `pnpm install` after writing package.json

### 2. TypeScript configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],

    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "verbatimModuleSyntax": true,

    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noUncheckedSideEffectImports": true,

    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Key flags (proven from hide-and-seek):**
- `verbatimModuleSyntax` — enforces `import type` for type-only imports
- `strict` + 4 extra: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUncheckedSideEffectImports`
- `esModuleInterop` — required for Phaser's `export = Phaser` definition style
- `moduleResolution: "bundler"` — Vite requirement
- `noEmit` — TS for checking only, Vite handles builds
- Phaser's docs suggest adding `typeRoots` and `types: ["Phaser"]` — skip this, it works without and avoids polluting the global namespace

### 3. Vite configuration

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) {
            return 'phaser';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['phaser'],
  },
});
```

**Why:**
- Phaser gets its own chunk (~1.5MB) — cached separately from game code
- Pre-optimize Phaser in dev mode (avoids slow first-load)
- Relative base path for deployment flexibility

### 4. Vitest configuration

**vitest.config.ts:**
```typescript
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: false,
      restoreMocks: true,
      clearMocks: true,
      projects: [
        {
          extends: true,
          test: {
            name: 'game',
            include: ['tests/game/**/*.test.ts'],
            environment: 'node',
            pool: 'threads',
          },
        },
        {
          extends: true,
          test: {
            name: 'renderer',
            include: ['tests/renderer/**/*.test.ts'],
            environment: 'jsdom',
            pool: 'forks',
          },
        },
        {
          extends: true,
          test: {
            name: 'integration',
            include: ['tests/integration/**/*.test.ts'],
            environment: 'node',
            pool: 'forks',
            testTimeout: 30000,
          },
        },
      ],
      coverage: {
        provider: 'v8',
        enabled: false,
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.ts'],
        exclude: [
          'src/main.ts',
          'src/types/**',
          '**/*.d.ts',
        ],
      },
    },
  })
);
```

**Three test environments (proven pattern):**
- **game** — Node, threads pool. Pure game logic, no DOM. This is where 90%+ of tests live
- **renderer** — jsdom, forks pool. Phaser scene tests that need DOM
- **integration** — Node, forks pool, 30s timeout. Cross-layer and architecture boundary tests

`globals: false` — explicit imports from `vitest`, no magic globals.

### 5. Directory structure

```
src/
  game/              # Pure logic — ZERO Phaser/DOM/browser imports
  renderer/          # Phaser scenes, sprites, camera
  types/             # Shared type definitions (no imports from game/ or renderer/)
  constants.ts       # All design constants
  main.ts            # Composition root — creates Phaser.Game, wires everything
tests/
  game/              # Node environment tests
  renderer/          # jsdom environment tests
  integration/       # Cross-layer tests
public/
  assets/            # Static assets served by Vite
```

Create all directories including empty ones (add `.gitkeep` to empty dirs so git tracks them).

### 6. Entry point files

**index.html:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Do Not Disturb</title>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #000; overflow: hidden; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**src/main.ts:**
```typescript
import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: '#1a1a2e',
  scene: {
    create() {
      const text = this.add.text(480, 270, 'Do Not Disturb', {
        fontSize: '32px',
        color: '#e0e0e0',
      });
      text.setOrigin(0.5);
    },
  },
};

new Phaser.Game(config);
```

Minimal — just proves Phaser boots and renders. Real scenes come in later phases.

### 7. Copy insight docs from hide-and-seek

Copy these 3 files verbatim to `docs/insights/`:

- `006-scattered-door-cost-updates.md`
- `009-dual-sentinel-infinity-vs-negative-one.md`
- `010-ai-tiles-plaid-at-32px.md`

Source: `projects/hide-and-seek/docs/insights/`

### 8. Add .gitignore entries

Append to existing `.gitignore` (or create if missing):
```
node_modules/
dist/
coverage/
*.tsbuildinfo
```

### 9. Update CLAUDE.md

Update the Tech Stack section from "TBD" to the finalized stack, and add the Commands section:

**Tech Stack:**
- Phaser 3.90.0, TypeScript 5.9+, Vite 7, Vitest 4, pnpm 10

**Commands:**
- `pnpm dev` — start dev server
- `pnpm build` — typecheck + production build
- `pnpm test` — run all tests
- `pnpm test:game` — game logic tests only (node)
- `pnpm test:renderer` — renderer tests only (jsdom)
- `pnpm test:watch` — watch mode
- `pnpm typecheck` — TypeScript check only

## Acceptance Criteria

- [ ] `pnpm install` completes without errors
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm build` produces `dist/` with index.html + chunks
- [ ] `pnpm test` runs and reports 0 tests (no failures)
- [ ] `pnpm dev` serves Phaser canvas showing "Do Not Disturb" text
- [ ] `src/game/` exists with no Phaser imports (architecture boundary ready)
- [ ] All 10 insight docs present in `docs/insights/` (7 original + 3 copied)
- [ ] CLAUDE.md Tech Stack and Commands sections updated
- [ ] `.gitignore` covers node_modules, dist, coverage

## Deliverable

`pnpm build` succeeds, `pnpm test` runs clean, `pnpm dev` serves a Phaser canvas with the game title. All conventions locked, directory structure ready for Phase 2.
