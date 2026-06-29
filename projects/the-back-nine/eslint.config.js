import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'

// Cross-layer import ban — a precise REGEX, not globs, so it is depth- AND
// segment-agnostic and never false-matches a node_module. It bans the alias form
// (`@layer/...`) and the relative-ladder form (`../[../]*layer/...`) for any banned
// layer, at any depth and any subpath. (Globs like `@layer/*` miss `@layer/sub/x`,
// and a depth-capped `../../../../layer/*` misses deeper ladders — the holes the
// U0 adversarial review found. A scoped package like `@scope/ui` does NOT match,
// since the regex requires `@` immediately followed by a banned layer name.)
const importBan = (layers, message) => {
  const alt = layers.join('|')
  return {
    'no-restricted-imports': ['error', {
      patterns: [{ regex: `^(@(${alt})/|(\\.\\./)+(${alt})/)`, message }],
    }],
  }
}

// Reusable weak-RNG property ban (Math is otherwise needed: log/exp/sqrt/imul).
const banWeakRng = (message) => ({ object: 'Math', property: 'random', message })

// Engine purity (cross-cutting contract #1): the engine reads NO entropy, clock, or
// environment, in ANY form. Bans: the weak RNG; the Date/performance/crypto/process
// globals; the global OBJECTS themselves (globalThis/self/window) so member access
// like `self.crypto.getRandomValues` or `globalThis.Math.random` can't sneak entropy
// in (engine.worker.ts runs where `self` IS the global); eval/new Function; and
// dynamic `import()` (the pure engine is synchronous and bypasses the static
// layer-boundary ban otherwise). All of these were live bypasses the review found.
const enginePurity = {
  'no-restricted-properties': ['error', banWeakRng(
    'Math.random is non-deterministic — banned in the pure engine. The stateless Box-Muller consumes the INJECTED mulberry32 stream (src/engine/rng.ts).',
  )],
  'no-restricted-globals': ['error',
    { name: 'Date', message: 'The engine is timeless — no wall clock. Index by absolute year. (engine purity)' },
    { name: 'performance', message: 'No performance timing in the pure engine. (engine purity)' },
    { name: 'crypto', message: 'The engine reads no entropy. The seed is INJECTED; crypto.getRandomValues lives in src/crypto/**. (engine purity)' },
    { name: 'process', message: 'The engine reads no environment. (engine purity)' },
    { name: 'globalThis', message: 'No global-object access in the pure engine — it is how entropy/clock sneak in (e.g. globalThis.crypto). (engine purity)' },
    { name: 'self', message: 'No global-object access in the pure engine — the worker scope IS self, so self.crypto would read entropy. (engine purity)' },
    { name: 'window', message: 'No global-object access in the pure engine. (engine purity)' },
  ],
  'no-eval': 'error',
  'no-new-func': 'error',
  'no-restricted-syntax': ['error', {
    selector: 'ImportExpression',
    message: 'No dynamic import() in the pure engine — it is synchronous and bypasses the static layer-boundary ban. (engine purity)',
  }],
}

// Match every TS module extension so an engine/crypto/shared file authored as .mts
// or .cts cannot escape the rules (a hole the review found via an _evil.mts probe).
const tsGlobs = (base) => [`${base}/**/*.{ts,mts,cts,tsx}`]
// Only __tests__ dirs are exempt — a stray impure *.test.ts elsewhere stays linted
// (closes the masquerade where shipped engine code imports an impure test helper).
const TEST_IGNORES = ['**/__tests__/**']

export default tseslint.config(
  { ignores: ['dist/', 'dev-dist/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Ban React unsafe HTML injection — defense-in-depth against XSS into the
  // in-memory plaintext model (the CSP is the primary guard; this is belt-and-braces).
  {
    files: ['src/**/*.tsx'],
    plugins: { react: reactPlugin },
    rules: { 'react/no-danger': 'error' },
  },

  // The copy-catalog fence (phase-2 cross-cutting #4, added at D1): every
  // user-facing string in src/ui + src/intake routes through src/ui/copy.ts so
  // the U7 copyGuard's catalog-enumeration covers it BY CONSTRUCTION. Bans
  // inline JSXText AND user-facing attribute literals — the a11y contract
  // REQUIRES aria-labels, which are user-facing, so they route through the
  // catalog too (a directive can't leak through an attribute). copy.ts itself
  // is a plain .ts module of object literals — JSX selectors never fire there.
  {
    files: ['src/ui/**/*.tsx', 'src/intake/**/*.tsx'],
    ignores: TEST_IGNORES,
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: 'JSXText[value=/\\S/]',
          message: 'Inline user-facing copy is banned (cross-cutting #4) — add the string to src/ui/copy.ts and render {copy.yourKey} so the copyGuard gate covers it.',
        },
        {
          selector: 'JSXAttribute[name.name=/^(aria-label|aria-description|placeholder|alt|title)$/] > Literal',
          message: 'User-facing attribute copy is banned inline (cross-cutting #4) — route aria-label/aria-description/placeholder/alt/title through src/ui/copy.ts.',
        },
        {
          selector: 'JSXAttribute[name.name=/^(aria-label|aria-description|placeholder|alt|title)$/] JSXExpressionContainer > Literal',
          message: 'User-facing attribute copy is banned inline (cross-cutting #4) — route aria-label/aria-description/placeholder/alt/title through src/ui/copy.ts.',
        },
      ],
    },
  },

  // src/store/** — the orchestrator layer: imports engine + crypto + shared, but
  // NEVER the feature layers above it (intake/budget/viz/ui). The whole builder-
  // injection seam (intakeMap's builders are INJECTED at appModel.ts, never
  // imported here) rests on this inversion — without the gate it was author
  // discipline only, though CLAUDE.md claimed the boundary ESLint-enforced (D1
  // review A1). (intake→@ui/copy is a legit carve-out, so the intake/ui blocks
  // need the nuanced @ui/copy exception — deferred; the store inversion is the
  // load-bearing one D1's testability seam depends on.)
  {
    files: tsGlobs('src/store'),
    ignores: TEST_IGNORES,
    rules: {
      ...importBan(
        ['intake', 'budget', 'viz', 'ui'],
        'src/store/ is the orchestrator: it must not import feature layers above it (intake/budget/viz/ui). The param builders are INJECTED at the ui composition point (appModel.ts), never imported into the store.',
      ),
    },
  },

  // src/engine/** — PURE: imports nothing impure; reads no clock/entropy/env in any form.
  {
    files: tsGlobs('src/engine'),
    ignores: TEST_IGNORES,
    rules: {
      ...importBan(
        ['ui', 'store', 'intake', 'budget', 'viz', 'crypto'],
        'src/engine/ is pure: it must not import from ui/store/intake/budget/viz/crypto. Import only @shared (model types) and within @engine.',
      ),
      ...enginePurity,
    },
  },

  // src/crypto/** — primitive layer: CSPRNG REQUIRED (crypto.getRandomValues for the
  // recovery phrase) so only the weak RNG is banned; no eval; imports nothing from features.
  {
    files: tsGlobs('src/crypto'),
    ignores: TEST_IGNORES,
    rules: {
      'no-restricted-properties': ['error', banWeakRng(
        'Math.random is not a CSPRNG — banned in src/crypto/**. Recovery-phrase / key entropy must come from crypto.getRandomValues.',
      )],
      'no-eval': 'error',
      'no-new-func': 'error',
      ...importBan(
        ['engine', 'store', 'intake', 'budget', 'viz', 'ui'],
        'src/crypto/ is a primitive layer: it must not import from feature layers. Import only @shared.',
      ),
    },
  },

  // src/shared/** — leaf (the plaintext model + outcome-state enum): imports nothing
  // from any feature layer (everything depends on shared, never the reverse).
  {
    files: tsGlobs('src/shared'),
    ignores: TEST_IGNORES,
    rules: {
      ...importBan(
        ['engine', 'crypto', 'store', 'intake', 'budget', 'viz', 'ui'],
        'src/shared/ is the leaf model layer: it must not import from any feature layer.',
      ),
    },
  },

  // src/viz/** — colorblind-safe palette + chart primitives: renders from PURE inputs. Imports
  // only @shared (model / outcome-state types) and within @viz — never up the stack. CLAUDE.md
  // lists viz among the ESLint-enforced layer boundaries, but no block existed (the same
  // claimed-but-unenforced gap the D1 review found for store; U6-palette review finding B3).
  // culori is a devDep imported only by the CVD probe (a test, exempt via TEST_IGNORES).
  {
    files: tsGlobs('src/viz'),
    ignores: TEST_IGNORES,
    rules: {
      ...importBan(
        ['ui', 'store', 'intake', 'budget', 'crypto', 'engine'],
        'src/viz/ renders from pure inputs: import only @shared (model / outcome-state types) and within @viz; never ui/store/intake/budget/crypto/engine.',
      ),
    },
  },

  // .claude/workflows/** — Workflow-tool orchestration scripts (automation, NOT app source and
  // never bundled). They run in the Workflow runtime, which INJECTS these globals. Declared here
  // so the scripts still lint for REAL bugs (unused vars, typos) instead of every injected name
  // reading as no-undef — a blanket ignore would silence genuine issues too. (`meta` is an ESM
  // export, not a global; agent/parallel/pipeline/phase/log/args/budget/workflow are the runtime's.)
  {
    files: ['.claude/workflows/**/*.js'],
    languageOptions: {
      globals: {
        agent: 'readonly',
        parallel: 'readonly',
        pipeline: 'readonly',
        phase: 'readonly',
        log: 'readonly',
        args: 'readonly',
        budget: 'readonly',
        workflow: 'readonly',
      },
    },
  },
)
