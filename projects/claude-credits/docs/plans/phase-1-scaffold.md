---
created: 2026-05-24T09:46:48-04:00
deepened: 2026-05-24T14:51:45-04:00
doc-reviewed:
---

# Phase 1 — Scaffold `projects/claude-credits/`

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is the paint-by-numbers recipe for the foundation Phase 2+ builds on.

Phase 1 lands the **foundation**, not features: the Vite + React 19 + TypeScript shell, the three-route SPA skeleton with placeholder pages, the token system (physical → semantic → light-override, role-based), the motion foundation (four named eases + duration tokens + GSAP plugin registration + a `prefers-reduced-motion` helper), the type system (three variable fonts + a 7-step clamp scale), the mobile-first global baseline (dvh fallback, viewport-fit, dual theme-color), and the Vercel config. **No data, no real components, no animations** — those are Phase 2+. The bar for "Phase 1 done" is: `pnpm dev` serves all three routes, fonts load, tokens resolve, light/dark switches with the OS, and `pnpm build` + `pnpm typecheck` are green.

Getting the foundation right matters more here than anywhere else in the project: every component built in Phases 3–9 references these tokens, eases, and type steps. A wrong primitive cascades into every surface. This is why the scaffold phase encodes the full token + motion + type contract now, not "later when we need it."

---

## Decisions locked at this deepening (read before executing)

1. **Vite 8, not Vite 7.** The pre-deepening plan and README both said `vite@^7`. That was wrong — **both** sibling projects ship Vite 8 (`burned` on `^8.0.3`, `undercover-mob-boss` on `^8.0.0`; Context7 latest stable ~`8.0.10`). Pin `vite@^8.0.10` to match the monorepo. The README's stack table should be corrected in the same commit (see Cascade note at the end).

2. **`react-router-dom` v7 is net-new to the monorepo — and it is the right call.** No sibling uses a client router: `burned` is multi-page (separate `board.html` / `player.html` / `howtoplay.html` Vite entries), `undercover-mob-boss` and `top-down-racer-04` are vanilla-TS single-page. But the README locks **three routes** (`/`, `/project/:name`, `/about`) AND a **cross-fade route transition**. A multi-page Vite build would full-reload between routes and kill the cross-fade. So this site is a true SPA with `react-router-dom@^7` in **declarative/library mode** (`BrowserRouter` + `<Routes>` + `<Route>`), imported from the v7-canonical `react-router` package. This is the ONE part of the scaffold with no sibling pattern to copy — follow this file, not BURNED.

3. **`@gsap/react` top-level registration supersedes BURNED's lazy-flag pattern.** BURNED registers ScrollTrigger lazily inside a hook via a module `let registered = false` flag. The canonical React-19 pattern (Context7 `/greensock/react`, endorsed by the design pass) is: register ALL plugins ONCE at module top-level in a single `src/motion/gsap-context.ts`, and drive component animations with the `useGSAP` hook (StrictMode-double-invoke-safe; plain `useEffect` + `gsap.to` leaks on React 19 dev re-mount). Use the top-level pattern. `useGSAP` itself must be passed to `registerPlugin` or it fails silently.

4. **Token system is a three-file split, role-based semantics.** `tokens.physical.css` (raw values, NEVER imported by components) → `tokens.semantic.css` (role-based aliases + the `@media (prefers-color-scheme: light)` override block) → components import `tokens.semantic.css` only. Semantic tokens are role-based (`--surface-page`, `--text-primary`, `--accent-stat-highlight`), NOT context-based (`--hero-bg`, `--tile-glass`). Target ~25–30 semantic tokens total. A Phase 9 stylelint rule will fail CI if a physical `--c-*` token appears outside `tokens.physical.css`.

5. **Four named motion eases, not one generic `weighted`.** "Weighted" means different curves at different durations, so it gets four scoped variants in `src/motion/easings.ts`: `weighted-arrive` (reveals/page-load, 0.6–1.0s), `weighted-settle` (hero counter tick-up, 2.0–2.8s, long settle tail), `weighted-press` (hover/press, 0.16–0.25s, hint of overshoot), `weighted-exit` (faster than entry). Concrete `CustomEase` SVG paths are in the Motion foundation section. `CustomEase` is free post-Webflow (`gsap/CustomEase`).

6. **`prefers-reduced-motion` is baked into the foundation, NOT deferred to Phase 9.** `src/motion/reduced-motion.ts` exports a `prefersReducedMotion()` helper from day 1; every animated component built later imports it. Bolting it on at polish-time means a quarter of the motion code ships with implicit motion-required assumptions. Foundation-time is the only cheap time to enforce it.

7. **Standalone pnpm project — the monorepo is NOT a pnpm workspace.** The repo root has no `package.json` and no `pnpm-workspace.yaml`; each project carries its own `package.json` + `node_modules`. So this scaffold is a standalone `pnpm init` project (like every sibling). Do NOT add workspace config. The cross-project type import (`src/types.ts` re-exporting from `tools/claude-credit`) uses a **relative path** because there is no workspace alias to lean on (see §1.10 landmine).

8. **`/frontend-design` is deferred to the component-build phases (3–9), not used here.** Briggsy's instruction was "use frontend-design and emil-design-eng as appropriate." For a FOUNDATION phase (tokens, eases, type, light/dark — design primitives, not interfaces) the `emil-design-eng` pass was the correct and sufficient lens, and its output is baked into this plan. `frontend-design` is an interface-composition lens — it earns its keep at Phase 3 (hero), Phase 4 (grid), Phase 5 (detail) when real layouts get built. Invoking it on an empty scaffold would produce generic advice. This is a deliberate "as appropriate" call, not a skip.

---

## Current state (verified at deepening, 2026-05-24)

- `projects/claude-credits/` is **greenfield**: contains only `.env` (one key: `GEMINI_API_KEY`), `.gitignore`, `TODO.md`, and `docs/`. No `package.json`, no `src/`, no `public/`. Phase 1 creates everything else.
- **The monorepo root is NOT a pnpm workspace** — no root `package.json`, no `pnpm-workspace.yaml`. Each project is independent. Confirmed by `ls` + grep at deepening.
- **Existing `.gitignore` is thin** — covers `dist/`, `.vercel/`, `*.log`, `pnpm-debug.log*`, `.vscode/`, `.idea/`. It does **NOT** ignore `node_modules/`. §1.1 must add it.
- **`.env` is already gitignored at the monorepo root** (root `.gitignore` lines 17-19 cover `.env`, `.env.local`, `.env.*.local`). Do NOT commit or roll it back — it holds the Gemini key and future per-project secrets (per TODO landmine).
- **Sibling versions confirmed** (lift these pins): `react@^19.2.4`, `react-dom@^19.2.4`, `@types/react@^19.2.14`, `@types/react-dom@^19.2.3`, `gsap@^3.14.2`, `@vitejs/plugin-react@^6.0.1`, `typescript@~5.9.3`, `vite@^8.0.3`, `packageManager: pnpm@10.30.3`, `"type": "module"`.
- **`top-down-racer-04` and `undercover-mob-boss` both carry `vercel.json`** — UMB's is the rich template (CSP, cache headers, rewrites); TDR's is minimal (COOP+COEP, which we do NOT need — COEP is for WASM threads). The §1.9 `vercel.json` adapts UMB's, dropping PWA/manifest/host-redirect and adding the SPA deep-link rewrite.
- **No sibling uses `react-router`** — confirmed by grep across all three `src/` trees. §1.4 has no copy-from reference.
- **Phase 0 builds `tools/claude-credit/dist/taxonomy.js`** — the type source `src/types.ts` re-exports from (§1.10). Phase 0's handoff guarantees `dist/` exists (Phase 0 §0.7 runs `pnpm build`).

---

## Output structure

```
projects/claude-credits/
├── public/
│   ├── data/                          # stats.json lands here in Phase 2 — empty in Phase 1
│   └── assets/                        # hero images copied here in Phase 2 — empty in Phase 1
├── src/
│   ├── main.tsx                       # Vite entry — createRoot + StrictMode + BrowserRouter
│   ├── App.tsx                        # <Routes> skeleton, three routes
│   ├── pages/
│   │   ├── Landing.tsx                # placeholder — heading + nav links
│   │   ├── ProjectDetail.tsx          # placeholder — reads :name param
│   │   └── About.tsx                  # placeholder — heading + nav links
│   ├── motion/
│   │   ├── easings.ts                 # 4 named CustomEase definitions
│   │   ├── tokens.ts                  # duration + delay constants
│   │   ├── reduced-motion.ts          # prefersReducedMotion() helper
│   │   └── gsap-context.ts            # registerPlugin(useGSAP, ScrollTrigger, DrawSVGPlugin, CustomEase)
│   ├── styles/
│   │   ├── tokens.physical.css        # raw values — NEVER imported by components
│   │   ├── tokens.semantic.css        # role-based aliases + light @media override
│   │   ├── reset.css                  # modern reset
│   │   └── global.css                 # body baseline, dvh fallback, font-family bindings, .tabular
│   ├── types.ts                       # re-exports from tools/claude-credit (relative path)
│   └── vite-env.d.ts                  # Vite client types reference
├── index.html                         # viewport-fit, dual theme-color, font link tags, #root
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── .gitignore                         # extended (add node_modules/)
└── README.md
```

This is a scope declaration, not a constraint — the implementer may adjust if a better layout emerges, but the per-step file lists below are authoritative.

---

## Dependency pins (exact — lift into `package.json`)

**Runtime:**
- `react@^19.2.4`
- `react-dom@^19.2.4`
- `react-router-dom@^7.9.4` — declarative library mode; import from `react-router`
- `gsap@^3.14.2`
- `@gsap/react@^2.1.2` — peer-dep `gsap>=3.12`; not in any sibling (net-new)
- `clsx@^2.1.1` — className composition (used Phase 3+)

**Dev:**
- `vite@^8.0.10`
- `@vitejs/plugin-react@^6.0.1`
- `typescript@~5.9.3`
- `@types/react@^19.2.14`
- `@types/react-dom@^19.2.3`
- `@types/node@^25.6.0`
- `tsx@^4.21.0` — for `scripts/refresh-stats.ts` in Phase 2; install now so Phase 2 needs no dep changes

`packageManager: "pnpm@10.30.3"`, `"type": "module"`.

---

## Execution — five commits, ordered

Each commit has a verification gate. Don't proceed past a red gate (manifesto: runtime truth > "it probably works").

### Commit 1 — project skeleton (`package.json` + `tsconfig.json` + `vite.config.ts` + `.gitignore`)

**1.1 — extend `.gitignore`** (prepend `node_modules/` — it's missing):

```gitignore
# Dependencies
node_modules/

# Vite build output
dist/

# Vercel CLI link state (created by `vercel link`)
.vercel/

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Editor / IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

**1.2 — `package.json`:**

```json
{
  "name": "claude-credits",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.30.3",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "preview": "vite preview",
    "refresh": "tsx scripts/refresh-stats.ts"
  },
  "dependencies": {
    "@gsap/react": "^2.1.2",
    "clsx": "^2.1.1",
    "gsap": "^3.14.2",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.9.4"
  },
  "devDependencies": {
    "@types/node": "^25.6.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "tsx": "^4.21.0",
    "typescript": "~5.9.3",
    "vite": "^8.0.10"
  }
}
```

Note: the `refresh` script + `tsx` are scaffolded now but `scripts/refresh-stats.ts` doesn't exist until Phase 2. The script entry is harmless until then (running `pnpm refresh` in Phase 1 errors with "file not found" — expected).

**1.3 — `tsconfig.json`** (single-file, mirrors BURNED's shape, React 19 JSX transform, strict + `noUncheckedIndexedAccess`):

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    "noEmit": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,

    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "vite.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**1.4 — `vite.config.ts`:**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true, // Vite 8 native — honors tsconfig "paths" without a plugin
  },
  server: {
    host: true, // expose on LAN for phone testing
  },
})
```

**Install + verify gate:**
```
cd C:/Users/brigg/ai-learning-journey/projects/claude-credits
pnpm install
pnpm typecheck
```
Expected: `pnpm install` writes `pnpm-lock.yaml` + `node_modules/` clean. `pnpm typecheck` exits clean (nothing to check yet — no `src/` — but the config must parse). If `tsc` complains about no input files, that's fine at this step; the gate is "no config syntax error."

**LANDMINE — `resolve.tsconfigPaths`:** BURNED ships this exact key and runs clean on Vite 8, so it's real. But it is NOT documented in the Vite 7 corpus the research pass could verify. If `@/*` imports fail to resolve at `pnpm dev` (§1.6+), fall back to the `vite-tsconfig-paths` plugin (`pnpm add -D vite-tsconfig-paths`, then `plugins: [react(), tsconfigPaths()]`). Don't assume the key works — confirm an `@/` import resolves at the first `pnpm dev`.

**Commit:** `chore(claude-credits): scaffold Vite 8 + React 19 + TS project skeleton`

---

### Commit 2 — router skeleton (`index.html` + `main.tsx` + `App.tsx` + 3 placeholder pages)

**1.5 — `index.html`** (viewport-fit, dual theme-color for light/dark, font link tags, `#root`):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <!-- Dual theme-color: browser chrome matches the active mode's page surface -->
    <meta name="theme-color" content="#0a1a26" media="(prefers-color-scheme: dark)" />
    <meta name="theme-color" content="#f7f1e3" media="(prefers-color-scheme: light)" />
    <meta name="description" content="A visual showcase of the credit data across Briggsy's projects, measured by the claude-credit CLI." />
    <title>claude-credits</title>

    <!-- Satoshi Variable (display) — Fontshare, ITF Free License (commercial OK) -->
    <link rel="preconnect" href="https://api.fontshare.com" crossorigin />
    <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap" />

    <!-- Inter Variable (UI) + JetBrains Mono Variable (numeric) — Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@400;500;700&display=swap" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**LANDMINE — Fontshare URL:** the explicit weight-list form above is the safe copy-from-UI shape, but Fontshare's "Get Selected" embed UI on `https://www.fontshare.com/fonts/satoshi` generates the canonical URL with whatever weights are toggled. At implementation, grab the URL from that UI rather than trusting this hardcoded list — the `api.fontshare.com/v2/css?f[]=satoshi@...&display=swap` pattern is correct, the digits depend on selected styles. `crossorigin` on the `fonts.gstatic.com` AND `api.fontshare.com` preconnects is required for the CORS woff2 fetch — don't drop it.

**1.6 — `src/main.tsx`** (React 19 `createRoot`, StrictMode, BrowserRouter; style imports first):

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './styles/reset.css'
import './styles/tokens.physical.css'
import './styles/tokens.semantic.css'
import './styles/global.css'
import './motion/gsap-context' // registers GSAP plugins once, at module load
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

Style import order is load-bearing: `reset` → physical tokens → semantic tokens (which reference physical) → global (which references semantic). The `gsap-context` import has a registration side effect; importing it here guarantees plugins are registered before any component mounts.

**1.7 — `src/App.tsx`** (declarative routes):

```tsx
import { Routes, Route } from 'react-router'
import Landing from './pages/Landing'
import ProjectDetail from './pages/ProjectDetail'
import About from './pages/About'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/project/:name" element={<ProjectDetail />} />
      <Route path="/about" element={<About />} />
    </Routes>
  )
}
```

**1.8 — placeholder pages** (minimal-but-real JSX — enough to prove routing + tokens + fonts + light/dark, nothing more):

`src/pages/Landing.tsx`:
```tsx
import { Link } from 'react-router'

export default function Landing() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1 style={{ font: '700 var(--text-display-lg)/var(--leading-display) var(--font-display)', letterSpacing: 'var(--tracking-display)' }}>
        claude-credits
      </h1>
      <p style={{ font: '400 var(--text-body)/var(--leading-body) var(--font-body)', color: 'var(--text-secondary)' }}>
        Scaffold placeholder. Hero lands in Phase 3.
      </p>
      <nav style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Link to="/project/burned" style={{ color: 'var(--text-link)' }}>sample detail →</Link>
        <Link to="/about" style={{ color: 'var(--text-link)' }}>about →</Link>
      </nav>
    </main>
  )
}
```

`src/pages/ProjectDetail.tsx`:
```tsx
import { useParams, Link } from 'react-router'

export default function ProjectDetail() {
  const { name } = useParams<{ name: string }>()
  return (
    <main style={{ padding: '2rem' }}>
      <h1 style={{ font: '500 var(--text-display-md)/var(--leading-tile) var(--font-display)' }}>
        {name}
      </h1>
      <p className="tabular" style={{ font: '400 var(--text-stat-callout)/1 var(--font-mono)', color: 'var(--accent-stat-highlight)' }}>
        1234567890
      </p>
      <Link to="/" style={{ color: 'var(--text-link)' }}>← home</Link>
    </main>
  )
}
```
(The mono digit string + `.tabular` class is a deliberate smoke test that tabular numerals + the mono font + the stat-highlight token all resolve.)

`src/pages/About.tsx`:
```tsx
import { Link } from 'react-router'

export default function About() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1 style={{ font: '500 var(--text-display-md)/var(--leading-tile) var(--font-display)' }}>about</h1>
      <p style={{ font: '400 var(--text-body)/var(--leading-body) var(--font-body)', color: 'var(--text-secondary)' }}>
        Taxonomy explainer lands in Phase 6.
      </p>
      <Link to="/" style={{ color: 'var(--text-link)' }}>← home</Link>
    </main>
  )
}
```

**1.8b — `src/vite-env.d.ts`:**
```ts
/// <reference types="vite/client" />
```

**Verify gate:**
```
pnpm dev
```
Visit `http://localhost:5173/`, `/project/burned`, `/about`. All three render. Nav links navigate WITHOUT a full reload (SPA confirmed — watch the Network tab: no document re-fetch on `<Link>` click). `/project/burned` shows "burned" (the `:name` param resolves). Inline `var(--text-*)` references will render unstyled (fallback) until Commit 3 lands the tokens — that's expected; the gate here is "routing works + param resolves."

**Commit:** `feat(claude-credits): three-route SPA skeleton with placeholder pages`

---

### Commit 3 — styles foundation (tokens + reset + global)

**1.9a — `src/styles/tokens.physical.css`** (raw values — NEVER imported by components):

```css
/* PHYSICAL TOKENS — raw values only. Components NEVER reference these.
   Only tokens.semantic.css may use them. A Phase 9 stylelint rule fails CI
   if any --c-* token appears outside this file. */
:root {
  /* Color — dark palette physicals */
  --c-midnight-deep: #0a1a26;
  --c-midnight-gradient: #0f2839;
  --c-cream-text: #f5e9d3;
  --c-cool-gray: #9eb4c4;
  --c-orange-dark: #ff8c42;
  --c-gold-dark: #ffd34e;
  --c-danger-dark: #d4524c;

  /* Color — light palette physicals */
  --c-cream-paper: #f7f1e3;
  --c-cream-deeper: #efe6d0;
  --c-warm-black: #1a1a1c;
  --c-warm-slate: #4a4a52;
  --c-orange-light: #d4631a;
  --c-gold-light: #a8761e;
  --c-danger-light: #9e2a25;

  /* Spacing scale (4px base, modular) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-pill: 999px;
}
```

**1.9b — `src/styles/tokens.semantic.css`** (role-based aliases + light override; this is the ONLY token file components import):

```css
/* SEMANTIC TOKENS — role-based. Components reference ONLY these (never --c-*).
   Dark is the default :root; light overrides inside the prefers-color-scheme block. */
:root {
  /* Surfaces */
  --surface-page: var(--c-midnight-deep);
  --surface-page-gradient-stop: var(--c-midnight-gradient);
  --surface-elevated: rgba(20, 40, 56, 0.6);
  --surface-glass-blur: 20px;
  --surface-overlay: rgba(0, 0, 0, 0.4);
  --surface-divider: rgba(245, 233, 211, 0.08);

  /* Text */
  --text-primary: var(--c-cream-text);
  --text-secondary: var(--c-cool-gray);
  --text-muted: rgba(158, 180, 196, 0.6);
  --text-on-accent: var(--c-midnight-deep);
  --text-link: var(--c-orange-dark);

  /* Accents */
  --accent-primary: var(--c-orange-dark);
  --accent-stat-highlight: var(--c-gold-dark);
  --accent-danger: var(--c-danger-dark);
  --accent-focus: var(--c-orange-dark);

  /* Borders */
  --border-subtle: rgba(245, 233, 211, 0.08);
  --border-strong: rgba(245, 233, 211, 0.16);
  --border-focus: var(--c-orange-dark);

  /* Shadow / elevation (dark = subtle, bg does the lift) */
  --shadow-tile: 0 4px 24px rgba(0, 0, 0, 0.5);
  --shadow-hover: 0 12px 48px rgba(0, 0, 0, 0.65);
  --shadow-modal: 0 24px 64px rgba(0, 0, 0, 0.8);

  /* Type — families */
  --font-display: 'Satoshi', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Type — 7-step clamp scale (mobile-first) */
  --text-display-hero: clamp(3.5rem, 14vw, 16rem);
  --text-display-lg: clamp(2.25rem, 5vw, 4.5rem);
  --text-display-md: clamp(1.5rem, 2.5vw, 2.25rem);
  --text-stat-callout: clamp(2rem, 4vw, 3.5rem);
  --text-body-lg: clamp(1.125rem, 1.4vw, 1.25rem);
  --text-body: 1rem;
  --text-meta: 0.875rem;

  /* Type — line heights */
  --leading-display: 0.95;
  --leading-tile: 1.15;
  --leading-body: 1.55;
  --leading-meta: 1.4;

  /* Type — tracking */
  --tracking-display: -0.04em;
  --tracking-tile: -0.02em;
  --tracking-body: 0;
  --tracking-meta: 0.01em;
}

@media (prefers-color-scheme: light) {
  :root {
    /* Surfaces */
    --surface-page: var(--c-cream-paper);
    --surface-page-gradient-stop: var(--c-cream-deeper);
    --surface-elevated: rgba(255, 251, 240, 0.7);
    --surface-glass-blur: 14px; /* less blur on cream — less luminance variance to obscure */
    --surface-overlay: rgba(58, 38, 18, 0.3);
    --surface-divider: rgba(26, 26, 28, 0.08);

    /* Text */
    --text-primary: var(--c-warm-black);
    --text-secondary: var(--c-warm-slate);
    --text-muted: rgba(74, 74, 82, 0.6);
    --text-on-accent: var(--c-cream-paper);
    --text-link: var(--c-orange-light);

    /* Accents */
    --accent-primary: var(--c-orange-light);
    --accent-stat-highlight: var(--c-gold-light);
    --accent-danger: var(--c-danger-light);
    --accent-focus: var(--c-orange-light);

    /* Borders (dark-on-light reads stronger — lower alpha) */
    --border-subtle: rgba(26, 26, 28, 0.08);
    --border-strong: rgba(26, 26, 28, 0.16);
    --border-focus: var(--c-orange-light);

    /* Shadow (warm hue, heavier — cream needs more weight to show lift) */
    --shadow-tile: 0 8px 32px rgba(58, 38, 18, 0.18);
    --shadow-hover: 0 16px 56px rgba(58, 38, 18, 0.28);
    --shadow-modal: 0 32px 80px rgba(58, 38, 18, 0.4);
  }
}
```

**1.9c — `src/styles/reset.css`** (modern reset — Andy Bell / Josh Comeau flavor):

```css
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html { -webkit-text-size-adjust: 100%; }
body { -webkit-font-smoothing: antialiased; line-height: 1.5; }
img, picture, video, canvas, svg { display: block; max-width: 100%; }
input, button, textarea, select { font: inherit; }
p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }
#root { isolation: isolate; }
a { color: inherit; text-decoration: none; }
```

**1.9d — `src/styles/global.css`** (body baseline, dvh fallback, font bindings, `.tabular`, reduced-motion safety net):

```css
html, body {
  /* no horizontal scroll at any width */
  overflow-x: hidden;
}

body {
  min-height: 100vh;
  min-height: 100dvh; /* dvh truth on iOS Safari — keep directly below the vh line */
  background: var(--surface-page);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: var(--text-body);
}

/* Tabular numerals — apply to every animated/aligned number. NOT global:
   proportional figures read better in body prose. */
.tabular {
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: 'tnum' 1, 'lnum' 1;
}

/* Hover effects gate behind real pointers so touch doesn't trap hover states */
@media (hover: hover) and (pointer: fine) {
  /* component hover rules live here / in component CSS */
}

/* Reduced-motion foundation safety net. Components ALSO check
   prefersReducedMotion() in JS (motion/reduced-motion.ts), but this
   catches any CSS transition/animation that slips through. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Verify gate:**
```
pnpm dev
```
Re-visit all three routes. Now: Satoshi renders on headings, the mono digit string on `/project/burned` is tabular + gold (`--accent-stat-highlight`), the body is cream-on-midnight. **Toggle Windows app theme dark↔light** (Settings → Personalization → Colors → "Choose your mode") and refresh: the page surface flips to warm cream, text to warm-black, link to deeper orange — with NO stylesheet swap and NO FOUC. Browser chrome (mobile / address bar tint) matches via the dual `theme-color`. Confirm `@/` path alias resolves (the §1.4 landmine check): the page imports already use relative paths, so add a throwaway `import '@/styles/global.css'` somewhere temporarily to confirm the alias works, then revert.

**Commit:** `feat(claude-credits): token system (physical/semantic/light) + reset + global baseline`

---

### Commit 4 — motion foundation (eases + tokens + GSAP registration + reduced-motion)

**1.10a — `src/motion/gsap-context.ts`** (register ALL plugins once, top-level):

```ts
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { CustomEase } from 'gsap/CustomEase'

// useGSAP MUST be registered or it fails silently. All four are free post-Webflow.
gsap.registerPlugin(useGSAP, ScrollTrigger, DrawSVGPlugin, CustomEase)

export { gsap, useGSAP, ScrollTrigger, DrawSVGPlugin, CustomEase }
```

**1.10b — `src/motion/easings.ts`** (four named eases — register against CustomEase):

```ts
import { CustomEase } from './gsap-context'

// Reveal / arrival — scroll reveals, page load, route fade (0.6–1.0s).
// Instant start, strong glide, soft landing.
CustomEase.create('weighted-arrive', 'M0,0 C0.2,0.1 0.2,1 1,1')

// Hero counter tick-up (2.0–2.8s). Slow first 12% (mass), accelerate through
// the middle, very long final 30% so the last digit settles rather than snaps.
CustomEase.create('weighted-settle', 'M0,0 C0.12,0 0.18,0.7 0.5,0.92 C0.7,0.98 0.86,1 1,1')

// Hover lift / press (0.16–0.25s). The 1.05 control point gives a mechanical-key
// overshoot — mass without playful bounce.
CustomEase.create('weighted-press', 'M0,0 C0.3,0 0.4,1.05 1,1')

// Exit — faster than entry (Emil's asymmetric rule). ease-in is OK on exit.
CustomEase.create('weighted-exit', 'M0,0 C0.4,0 1,0.6 1,1')

export const ease = {
  arrive: 'weighted-arrive',
  settle: 'weighted-settle',
  press: 'weighted-press',
  exit: 'weighted-exit',
} as const
```

**1.10c — `src/motion/tokens.ts`** (duration constants — single source for every component):

```ts
export const duration = {
  press: 0.16,
  hover: 0.25,
  reveal: 0.8,
  counter: 2.4,
  exit: 0.2,
} as const

export const stagger = {
  tiles: 0.06,   // 60ms between grid tiles
  supportingLines: 0.08,
} as const
```

**1.10d — `src/motion/reduced-motion.ts`** (the helper every animated component imports):

```ts
// Single source of truth for the reduced-motion check. Components import this
// and skip/instant-complete motion when it returns true. The CSS safety net in
// global.css is the backstop; this is the JS-level intent.
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
```

**Verify gate:**
```
pnpm typecheck
pnpm dev
```
`pnpm typecheck` clean. At `pnpm dev`, open the browser console: no GSAP "invalid plugin" or "CustomEase is not registered" warnings. Confirm the eases registered by running in the console: `gsap.parseEase('weighted-settle')` returns a function (not `undefined`). No component animates yet — the gate is "the motion foundation loads error-free and the eases are queryable."

**LANDMINE — DrawSVGPlugin import path:** confirmed free + at `gsap/DrawSVGPlugin` post-Webflow. If the import 404s at dev time, the GSAP version may predate the public bundling — verify `gsap@^3.14.2` actually resolved in `node_modules/gsap/` (the version, not just presence). DrawSVG is only USED in Phase 5 (AssetDonut), but registering it now confirms the import path early.

**LANDMINE — StrictMode double-invoke:** because `main.tsx` uses `<StrictMode>`, React 19 double-invokes effects in dev. Any later component using plain `useEffect(() => gsap.to(...))` will leak/double-fire. This is WHY the foundation includes `@gsap/react` — components MUST use `useGSAP(() => {...}, { scope: ref })`, never raw `useEffect` + gsap. Note this in the Phase 3 plan when components start animating.

**Commit:** `feat(claude-credits): motion foundation — weighted eases, duration tokens, GSAP registration, reduced-motion helper`

---

### Commit 5 — deploy config + cross-project types + README + final verify

**1.11 — `src/types.ts`** (re-export the Phase 0 data contract via relative path):

```ts
// Re-export the data contract from the claude-credit CLI. The monorepo is NOT a
// pnpm workspace, so this is a RELATIVE path, not a package alias.
// Phase 0 §0.7 guarantees tools/claude-credit/dist/ exists before Phase 2 wires data.
export type {
  MultiProjectReport,
  ProjectReport,
  TokenStats,
  EditorialContent,
  ArchiveCollective,
} from '../../../tools/claude-credit/dist/taxonomy.js'
```

**LANDMINE — relative cross-project import:** the `../../../` path is brittle (depends on file depth) and points at `dist/` (built output), so `tools/claude-credit` MUST be built first. In Phase 1 this file is type-only and consumed by nothing yet, so a typecheck failure here is non-blocking for the Phase 1 gate — but verify the path resolves once Phase 0's `dist/` exists. If `dist/taxonomy.js` doesn't carry `.d.ts` declarations, point at `dist/taxonomy.d.ts` or the `src/taxonomy.ts` source instead. Confirm at Phase 2 wire-up, not now.

**1.12 — `vercel.json`** (adapted from UMB — SPA deep-link rewrite is the load-bearing part; security headers + asset caching; dropped UMB's PWA/manifest/host-redirect):

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600, stale-while-revalidate=86400" }
      ]
    },
    {
      "source": "/data/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The `rewrites` block is the SPA fallback: without it, a hard refresh on `/project/burned` or `/about` 404s on Vercel (the file doesn't exist; the client router owns the path). Every non-asset path serves `index.html` and the router takes over. Note: no CSP here (UMB needs one for its WebSocket; this static site doesn't, and a too-strict CSP would block the Fontshare/Google-Fonts CDNs — if a CSP is added in Phase 8, it must allowlist `api.fontshare.com`, `fonts.googleapis.com`, `fonts.gstatic.com`).

**1.13 — `README.md`** (minimal project README — setup + scripts; expand in later phases):

```markdown
# claude-credits

A Vercel-hosted visual showcase of the credit data across the monorepo's projects,
measured by the `claude-credit` CLI. Built with Vite 8 + React 19 + TypeScript + GSAP.

## Setup
    pnpm install

## Scripts
- `pnpm dev` — local dev server (port 5173, exposed on LAN for phone testing)
- `pnpm build` — typecheck + production build to `dist/`
- `pnpm typecheck` — types only
- `pnpm preview` — serve the built `dist/`
- `pnpm refresh` — regenerate `public/data/stats.json` (Phase 2+)

## Stack
Vite 8 · React 19 · react-router-dom 7 · GSAP 3.14.2 (+ @gsap/react) · TypeScript 5.9
Fonts: Satoshi (Fontshare) · Inter + JetBrains Mono (Google Fonts)
Deploy: Vercel (`claude-credits.vercel.app`)
```

**Final Phase 1 verify gate (the "Phase 1 done" bar):**
```
cd C:/Users/brigg/ai-learning-journey/projects/claude-credits
pnpm typecheck   # clean (src/types.ts may error if Phase 0 dist absent — non-blocking, note it)
pnpm build       # clean dist/ produced
pnpm dev         # all three routes render
```
Runtime checklist (eye on the browser, not just green tsc — manifesto):
- [ ] `/`, `/project/burned`, `/about` all render; `<Link>` nav is client-side (no full reload)
- [ ] Satoshi on headings, Inter on body, JetBrains Mono tabular on the digit string
- [ ] Dark mode: midnight teal surface, cream text, orange links
- [ ] Toggle Windows to light → cream paper surface, warm-black text, deeper-orange links; no FOUC, no stylesheet swap
- [ ] No console errors (no GSAP plugin warnings, no 404s on fonts)
- [ ] `gsap.parseEase('weighted-settle')` returns a function in the console
- [ ] Resize to 360/375/390/430px (DevTools): no horizontal scroll, type clamps down legibly
- [ ] Set OS reduced-motion → confirm the CSS safety-net rule is active (transitions instant)

**Commit:** `feat(claude-credits): Vercel config + cross-project types + README + Phase 1 verification`

---

## Mobile foundation (set up day 1 — the UMB how-to-play bar)

Phase 1 doesn't build responsive components (none exist yet), but it sets the baseline so every later component inherits a correct mobile foundation:

- **Viewport meta** (§1.5): `width=device-width, initial-scale=1.0, viewport-fit=cover` — notch-safe.
- **Dual theme-color** (§1.5): browser chrome matches the active mode.
- **dvh fallback** (§1.9d): `min-height: 100vh` immediately followed by `min-height: 100dvh` — mobile browser UI eats `vh`; `dvh` is the iOS-Safari truth.
- **`overflow-x: hidden`** on `html, body` (§1.9d): no horizontal scroll at any width.
- **Type clamps** (§1.9b): every display step uses `clamp(mobile-min, vw-track, desktop-max)` — responsive by construction.
- **Hover gating** (§1.9d): `@media (hover: hover) and (pointer: fine)` block reserved so touch never traps a hover state.

The full breakpoint cascade (640 / 960 tablet+desktop columns, 600px phone polish) lands when components exist (Phase 3+), anchored to `projects/undercover-mob-boss/public/how-to-play.html`.

---

## Light/dark architecture (equal-citizen from day 1)

The failure mode is a dark mode that *feels designed* and a light mode that *feels compiled*. The discipline that prevents it: **every semantic token that's perceptually mode-dependent gets a light override — not just colors.** Already encoded in §1.9b:

- **Shadow weight** — dark shadows are subtle (bg does the lift); light shadows are warm-hued and heavier (cream needs more weight to show elevation).
- **Blur radius** — `--surface-glass-blur` is 20px dark, 14px light (cream has less luminance variance to obscure; 20px on cream smudges).
- **Border alpha** — dark-on-light reads stronger than light-on-dark at equal alpha, so light borders are tuned, not reused.
- **Accent saturation** — each mode gets its own accent physicals (`--c-orange-dark` vs `--c-orange-light`, etc.); a single shared orange goes pastel on cream.

**What does NOT change between modes:** easing curves, durations, type scale, spacing, radii. Motion and type are mode-agnostic — never variant them.

**Phase 9 discipline (record now so it doesn't drift):** polish both modes in lockstep, side-by-side in two browser windows. Never "polish dark, then translate to light" — that's how light becomes the demoted twin. If a change improves one mode and degrades the other, it's the wrong change.

---

## Landmines

| Landmine | Guard |
|---|---|
| **`resolve.tsconfigPaths` may not be a real Vite key** | BURNED ships it on Vite 8 and runs clean — it's real enough. But verify an `@/` import resolves at first `pnpm dev`. Fallback: `vite-tsconfig-paths` plugin. |
| **Fontshare Satoshi URL is a best-guess weight list** | Grab the canonical URL from Fontshare's "Get Selected" UI at implementation. Pattern is right; weight digits depend on selection. |
| **`crossorigin` missing on font preconnects** | Required for CORS woff2 fetch on `fonts.gstatic.com` AND `api.fontshare.com`. Don't drop it. |
| **Vite 7→8 breaking changes not fully verified** | Sibling runs Vite 8 near-default, so a simple SPA scaffold is low-risk. If any nontrivial Vite feature (`define`, CSS-module hashing, `base`) is used, verify against `https://vite.dev/guide/migration`. |
| **`useGSAP` not registered → silent failure** | It's in the §1.10a `registerPlugin` call. Don't remove it. |
| **React 19 StrictMode double-invokes effects** | Components MUST use `useGSAP({ scope })`, never raw `useEffect` + gsap, or animations leak/double-fire in dev. Flag in Phase 3. |
| **`react-router-dom` v7 import surface** | Import from `react-router` (v7-canonical), not `react-router-dom`, even though the install package is `react-router-dom`. Use `BrowserRouter`+`<Routes>` (declarative), NOT `RouterProvider`+`createBrowserRouter` (data router) — they're mutually exclusive paths. |
| **Cross-project `src/types.ts` relative import** | `../../../tools/claude-credit/dist/taxonomy.js` — brittle path, points at built output. Confirm resolution at Phase 2, not Phase 1 (type-only, consumed by nothing yet). |
| **Vercel SPA deep-link 404** | The `rewrites` block in `vercel.json` serves `index.html` for all non-asset paths. Without it, hard-refresh on `/about` 404s. |
| **`node_modules/` was not gitignored** | §1.1 adds it. Verify `git status` doesn't stage `node_modules/` before the first commit. |
| **DrawSVGPlugin 404 on import** | Confirm `gsap@^3.14.2` actually resolved (the version in `node_modules/gsap/package.json`, not just folder presence). DrawSVG is public only in recent GSAP. |

---

## Out of scope for Phase 1 (explicit "later")

- Data wiring / `stats.json` / `refresh-stats.ts` → Phase 2
- Real components (HeroCounter, ProjectTile, AssetDonut, etc.) → Phase 3+
- Any actual animations (the motion foundation is set up; nothing animates yet) → Phase 3+
- The full responsive breakpoint cascade → arrives with components, Phase 3+
- GitHub Action / deploy automation → Phase 8
- The Phase 9 stylelint rule enforcing the physical-token boundary → Phase 9 (noted now, built later)
- Manual light/dark toggle UI → v1.1 (OS respect is the v1 behavior, already wired)

---

## Verification (Phase 1 done gate)

Before declaring Phase 1 complete:

1. ✅ `pnpm install` clean; `pnpm-lock.yaml` committed; `node_modules/` gitignored (not staged)
2. ✅ `pnpm typecheck` clean (modulo the documented `src/types.ts` cross-project path, non-blocking until Phase 0 `dist/` exists)
3. ✅ `pnpm build` produces a clean `dist/`
4. ✅ `pnpm dev` serves all three routes; `<Link>` nav is client-side
5. ✅ Three variable fonts load (Satoshi display, Inter body, JetBrains Mono tabular)
6. ✅ Token system resolves — no unstyled `var(--…)` fallbacks; semantic tokens reference physical correctly
7. ✅ Light/dark switches with the OS theme — no FOUC, no stylesheet swap, dual theme-color matches
8. ✅ Motion foundation loads error-free; all four eases queryable via `gsap.parseEase`
9. ✅ Reduced-motion CSS safety net active when OS flag set
10. ✅ No horizontal scroll at 360/375/390/430px; type clamps legibly
11. ✅ No console errors, no font 404s

Then open [phase-2-data-wiring.md](phase-2-data-wiring.md) and start.

---

## Cascade (corrections this deepening implies elsewhere)

Land these in the same deepen commit or a follow-up before Phase 1 executes:

- **`README.md` (plans index) stack table**: change `Vite + TypeScript + GSAP 3.14.2` row and the "Stack" decision row from `vite@^7` to `vite@^8.0.10`. The README currently says Vite 7 — it's wrong; siblings are on 8.
- **`README.md` Decisions table**: the Stack row should add `react-router-dom@^7` and `@gsap/react@^2.1.2` to the dependency list (currently unlisted).
- No downstream phase (2–9) requires structural change from Phase 1 — the scaffold is a pure foundation. Phase 0's own cascade note already confirmed "Phase 1: no structural change required."

---

← [Phase 0 — Data gaps](phase-0-data-gaps.md) | [Index](README.md) | Next → [Phase 2 — Data wiring](phase-2-data-wiring.md)
