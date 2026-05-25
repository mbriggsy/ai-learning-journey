---
created: 2026-05-24T09:46:48-04:00
deepened: 2026-05-24T14:51:45-04:00
doc-reviewed: 2026-05-24T15:18:00-04:00
---

# Phase 1 — Scaffold `projects/claude-credits/`

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is the paint-by-numbers recipe for the foundation Phase 2+ builds on.

Phase 1 lands the **foundation**, not features: the Vite + React 19 + TypeScript shell, the three-route SPA skeleton (with a cross-fade transition seam) and placeholder pages, the token system (physical → semantic → light-override, role-based), the motion foundation (four named eases + duration tokens + GSAP plugin registration + a `prefers-reduced-motion` helper), the type system (three self-hosted variable fonts + a 7-step clamp scale), the mobile-first global baseline (dvh fallback, viewport-fit, dual theme-color, chromeless scrollbars), and the Vercel config. **No data, no real components, no animations** — those are Phase 2+. The bar for "Phase 1 done" is: `pnpm dev` AND `pnpm build && pnpm preview` both serve all three routes, fonts load with no layout shift, tokens resolve, light/dark switches with the OS (and via a dev `?theme=` override), and `pnpm typecheck` is green with **no carve-outs**.

Getting the foundation right matters more here than anywhere else in the project: every component built in Phases 3–9 references these tokens, eases, and type steps. A wrong primitive cascades into every surface. This is why the scaffold phase encodes the full token + motion + type contract now, not "later when we need it."

---

## Decisions locked at this deepening (read before executing)

1. **Vite 8, not Vite 7.** The pre-deepening plan said `vite@^7`; the README's stack row states the stack without pinning a Vite version. Both are corrected: **both** sibling projects ship Vite 8 (`burned` on `^8.0.3`, `undercover-mob-boss` on `^8.0.0`; Context7 latest stable ~`8.0.10` as of 2026-05-24). Pin `vite@^8.0.10`. The README's stack row gains an explicit `vite@^8.0.10` pin in the same commit (see Cascade).

2. **`react-router-dom` v7 is net-new to the monorepo — and it is the right call.** No sibling uses a client router: `burned` is multi-page (separate `board.html` / `player.html` / `howtoplay.html` Vite entries), `undercover-mob-boss` and `top-down-racer-04` are vanilla-TS single-page. But the README locks **three routes** AND a **cross-fade route transition**. A multi-page Vite build would full-reload between routes and kill the cross-fade. So this site is a true SPA. **The install package is `react-router-dom@^7`; the v7-canonical import specifier is `react-router`** (v7 merged the packages — `react-router-dom` re-exports from `react-router`). Use `BrowserRouter` + `<Routes>` + `<Route>` (declarative mode), NOT `RouterProvider` + `createBrowserRouter` (data-router mode) — mutually exclusive. The cross-fade is the SOLE justification for taking on the router, so §1.7 scaffolds a `useLocation`-keyed transition seam now (no-op in Phase 1) to validate the choice against its premise.

3. **GSAP registration: Phase 1 registers only what Phase 1 needs.** Register `useGSAP` + `CustomEase` at module top-level in `src/motion/gsap-context.ts`. **ScrollTrigger and DrawSVGPlugin are NOT registered in Phase 1** — ScrollTrigger arrives in Phase 4 (the grid reveal), and DrawSVGPlugin in Phase 5 (the AssetDonut, the detail page's one flourish — the tier breakdown that earlier drafts imagined here was CUT at the Phase 5 deepening). Registering heavy plugins eagerly on the entry chunk for zero/deferred consumers fights the "water beads" load/paint bar. Each later phase registers the plugin it introduces (DrawSVG → Phase 5). `useGSAP` itself must be passed to `registerPlugin` or it fails silently. Drive component animations with `useGSAP(() => {...}, { scope: ref })`, never raw `useEffect` + gsap (React 19 StrictMode double-invokes effects → raw useEffect leaks).

4. **Token system is a multi-file split, role-based semantics.** `tokens.physical.css` (raw color/spacing/radii values, NEVER imported by components) → `tokens.semantic.css` (role-based aliases + the light-mode override block) → components import `tokens.semantic.css` only. Semantic tokens are role-based (`--surface-page`, `--text-primary`, `--accent-stat-highlight`), NOT context-based. **Honest scoping note:** `tokens.semantic.css` ALSO carries the type scale, line-heights, tracking, and font-family stacks — these are independent design primitives with no physical-color counterpart, so they live in semantic by convention, not as aliases. The `--space-*` and `--radius-*` physicals ARE exempt from the "components use semantic only" rule for color — components may reference `--space-4` directly (there's a radius semantic layer, but spacing stays physical-direct). The Phase 9 stylelint rule targets `--c-*` color physicals specifically.

5. **Four named motion eases — and `easings.ts` MUST be imported at boot.** `weighted-arrive` (reveals/page-load), `weighted-settle` (hero counter, long settle tail), `weighted-press` (hover/press, slight overshoot), `weighted-exit` (faster than entry). They register via `CustomEase.create()` at module load — so `src/main.tsx` MUST `import './motion/easings'` as a side-effect, or the `create()` calls never run and `gsap.parseEase('weighted-…')` returns undefined. (This was the deepening's own latent bug: nothing imported `easings.ts`.)

6. **`prefers-reduced-motion` is foundation, not Phase 9.** `src/motion/reduced-motion.ts` exports `prefersReducedMotion()` from day 1; every animated component imports it. A CSS safety-net block in `global.css` is the backstop.

7. **Self-hosted fonts — no external font CDN.** All three variable fonts (Satoshi, Inter, JetBrains Mono — all free licenses) are self-hosted in `public/assets/fonts/` via local `@font-face` in `src/styles/fonts.css`. This kills the first-paint layout shift on the ~200px hero number (the CDN + `display=swap` path caused a visible ~60px horizontal jump), removes the external-CDN supply-chain trust boundary, and lets the CSP tighten to `font-src 'self'`. The display face uses `font-display: optional` (zero CLS); body/mono use `swap`. Same-origin `<link rel="preload">` for the Satoshi woff2.

8. **Standalone pnpm project — the monorepo is NOT a pnpm workspace.** No root `package.json`, no `pnpm-workspace.yaml`. Standalone `pnpm` project like every sibling. The cross-project type import (Phase 2's `src/types.ts`) uses a relative path — no workspace alias exists.

9. **`src/types.ts` is deferred to Phase 2.** It re-exports the data contract from `tools/claude-credit/dist/`, but three of those types (`TokenStats`, `EditorialContent`, `ArchiveCollective`) don't exist until Phase 0 executes and rebuilds `dist/`. Creating it in Phase 1 bakes a guaranteed `TS2305 has no exported member` failure into the scaffold and forces a carve-out in the Phase 1 typecheck gate. It's type-only and consumed by nothing until Phase 2 — so it's created in Phase 2's data-wiring commit, where it's first used and where Phase 0's `dist/` is guaranteed to exist. Phase 1's typecheck gate is then clean with no asterisk.

10. **`/frontend-design` is deferred to the component-build phases (3–9).** For a FOUNDATION phase (design primitives, not interfaces) the `emil-design-eng` pass was the correct lens and its output is baked in. `frontend-design` earns its keep when real layouts get built (Phase 3 hero, Phase 4 grid, Phase 5 detail). A deliberate "as appropriate" call.

---

## Current state (verified at deepening, 2026-05-24)

- `projects/claude-credits/` is **greenfield**: only `.env` (one key: `GEMINI_API_KEY`), `.gitignore`, `TODO.md`, `docs/`. No `package.json`, no `src/`, no `public/`.
- **The monorepo root is NOT a pnpm workspace** — no root `package.json`, no `pnpm-workspace.yaml`. Verified by `ls` + grep.
- **Existing `.gitignore` is thin** — `dist/`, `.vercel/`, `*.log`, `pnpm-debug.log*`, `.vscode/`, `.idea/`. Does **NOT** ignore `node_modules/`. §1.1 adds it.
- **`.env` is gitignored at the monorepo root** (root `.gitignore` lines 17-19). Don't commit or roll it back — holds the Gemini key + future per-project secrets.
- **Sibling versions confirmed** (lift these pins): `react@^19.2.4`, `react-dom@^19.2.4`, `@types/react@^19.2.14`, `@types/react-dom@^19.2.3`, `gsap@^3.14.2`, `@vitejs/plugin-react@^6.0.1`, `typescript@~5.9.3`, `vite@^8.0.3`, `@types/node@^25.6.0`, `packageManager: pnpm@10.30.3`, `"type": "module"`.
- **`resolve.tsconfigPaths: true` is CONFIRMED real** — `burned/vite.config.ts` ships the identical key on `vite@^8.0.3` and builds clean (verified by reading the file at review). Fallback (`vite-tsconfig-paths`) kept as insurance.
- **`undercover-mob-boss` carries the rich `vercel.json`** (CSP, cache headers, rewrites) — the §1.12 template adapts it (drops PWA/manifest/host-redirect, keeps SPA rewrite + headers, adds a tighter CSP since fonts are now same-origin).
- **No sibling uses `react-router`** — §1.7 has no copy-from reference.
- **`tools/claude-credit/dist/` currently exports only `MultiProjectReport` + `ProjectReport`** (verified: `dist/taxonomy.d.ts` predates Phase 0). The other three types arrive when Phase 0 runs — which is why `src/types.ts` is a Phase 2 file (Decision 9).
- **Phase 0 §0.7 (step 4) runs `pnpm build`** — guarantees `tools/claude-credit/dist/` is rebuilt with all five types before Phase 2 consumes them.

---

## Output structure

```
projects/claude-credits/
├── public/
│   ├── data/                          # stats.json lands here in Phase 2 — empty in Phase 1
│   └── assets/
│       └── fonts/                     # self-hosted woff2 (Satoshi, Inter, JetBrains Mono)
├── src/
│   ├── main.tsx                       # entry — theme bootstrap, createRoot, StrictMode, BrowserRouter
│   ├── App.tsx                        # <Routes> + cross-fade transition seam (useLocation-keyed)
│   ├── pages/
│   │   ├── Landing.tsx                # placeholder — heading + nav links
│   │   ├── ProjectDetail.tsx          # placeholder — reads :name param
│   │   └── About.tsx                  # placeholder — heading + nav links
│   ├── motion/
│   │   ├── easings.ts                 # 4 named CustomEase definitions (side-effecting)
│   │   ├── tokens.ts                  # duration + stagger constants
│   │   ├── reduced-motion.ts          # prefersReducedMotion() helper
│   │   └── gsap-context.ts            # registerPlugin(useGSAP, CustomEase)
│   ├── styles/
│   │   ├── tokens.physical.css        # raw values — NEVER imported by components
│   │   ├── tokens.semantic.css        # role-based aliases + light override (+ type/motion primitives)
│   │   ├── fonts.css                  # @font-face for the 3 self-hosted variable fonts
│   │   ├── reset.css                  # modern reset
│   │   └── global.css                 # body baseline, dvh fallback, .tabular, scrollbar hide, reduced-motion net
│   └── vite-env.d.ts                  # Vite client types reference
│                                      # NOTE: src/types.ts is created in PHASE 2 (Decision 9)
├── index.html                         # viewport-fit, dual theme-color, font preload, #root
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── .gitignore                         # extended (add node_modules/)
└── README.md
```

Scope declaration, not a constraint — the per-step file lists below are authoritative.

---

## Dependency pins (exact — lift into `package.json`)

**Runtime:**
- `react@^19.2.4`
- `react-dom@^19.2.4`
- `react-router-dom@^7.9.4` — declarative library mode; import from `react-router`
- `gsap@^3.14.2`
- `@gsap/react@^2.1.2` — peer-dep `gsap>=3.12`; net-new to the monorepo

**Dev:**
- `vite@^8.0.10`
- `@vitejs/plugin-react@^6.0.1`
- `typescript@~5.9.3`
- `@types/react@^19.2.14`
- `@types/react-dom@^19.2.3`
- `@types/node@^25.6.0` — matches `burned`
- `tsx@^4.21.0` — for Phase 2's `scripts/refresh-stats.ts`; install now so Phase 2 needs no dep change

**Deferred (do NOT install in Phase 1):**
- `clsx@^2.1.1` — className composition; no Phase 1 consumer. Add in Phase 3 with the first real component.

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

The `refresh` script + `tsx` are scaffolded now but `scripts/refresh-stats.ts` doesn't exist until Phase 2 (running `pnpm refresh` in Phase 1 errors "file not found" — expected).

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

(`allowImportingTsExtensions: true` is valid here because `noEmit: true` is set. `noUnusedLocals`/`noUnusedParameters` are stricter than BURNED's tsconfig — verified the placeholder pages below use every import.)

**1.4 — `vite.config.ts`:**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true, // Vite 8 native — honors tsconfig "paths" without a plugin (confirmed in burned/)
  },
  server: {
    host: true, // expose on LAN for phone testing — see landmine on shared networks
  },
})
```

**Install + verify gate:**
```
cd C:/Users/brigg/ai-learning-journey/projects/claude-credits
pnpm install
pnpm typecheck
```
Expected: `pnpm install` writes `pnpm-lock.yaml` + `node_modules/`. `pnpm typecheck` parses the config cleanly (no `src/` yet — "no inputs" is fine; the gate is "no config error").

**Commit:** `chore(claude-credits): scaffold Vite 8 + React 19 + TS project skeleton`

---

### Commit 2 — router skeleton (`index.html` + `main.tsx` + `App.tsx` + 3 placeholder pages)

**1.5 — `index.html`** (viewport-fit, dual theme-color, self-hosted-font preload, `#root`):

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

    <!-- Self-hosted fonts (no external CDN). Preload the display face — it paints the hero. -->
    <link rel="preload" href="/assets/fonts/Satoshi-Variable.woff2" as="font" type="font/woff2" crossorigin />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

(`@font-face` lives in `fonts.css`, imported by `main.tsx` at §1.6 — the preload just front-loads the critical display face. `crossorigin` on a same-origin font preload is still required, or the browser double-fetches.)

**1.6 — `src/main.tsx`** (theme bootstrap, React 19 `createRoot`, StrictMode, BrowserRouter; style + side-effect imports in order):

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './styles/reset.css'
import './styles/tokens.physical.css'
import './styles/tokens.semantic.css'
import './styles/fonts.css'
import './styles/global.css'
import './motion/gsap-context' // registers GSAP plugins (side effect)
import './motion/easings'      // registers the 4 weighted eases (side effect) — REQUIRED or parseEase fails
import App from './App'

// Dev-only theme override: ?theme=dark|light forces a mode without toggling the OS.
// data-theme on <html> wins over prefers-color-scheme (see tokens.semantic.css).
const forced = new URLSearchParams(window.location.search).get('theme')
if (forced === 'dark' || forced === 'light') {
  document.documentElement.dataset.theme = forced
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

Import order is load-bearing: `reset` → physical tokens → semantic tokens → fonts → global. `gsap-context` registers plugins; `easings` (which imports `CustomEase` from `gsap-context`) registers the eases — both must run before any component animates.

**1.7 — `src/App.tsx`** (declarative routes + cross-fade transition seam):

```tsx
import { Routes, Route, useLocation } from 'react-router'
import Landing from './pages/Landing'
import ProjectDetail from './pages/ProjectDetail'
import About from './pages/About'

export default function App() {
  const location = useLocation()
  // Transition seam: the keyed wrapper is the mount point for the cross-fade
  // (the sole justification for the SPA router). No-op in Phase 1 — the
  // route-transition phase drives opacity on this wrapper keyed by pathname.
  return (
    <div data-route-transition key={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<Landing />} />
        <Route path="/project/:name" element={<ProjectDetail />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  )
}
```

(The `key={location.pathname}` wrapper validates that declarative `<Routes>` can host a cross-fade — the later route-transition phase animates `[data-route-transition]` opacity on key change, or swaps in `AnimatePresence`-equivalent logic. The seam exists now so the router decision isn't resting on an unscaffolded premise.)

**1.8 — placeholder pages** (minimal-but-real JSX — longhand font props, NOT the `font` shorthand, which resets `font-variant-numeric` and would break `.tabular`):

`src/pages/Landing.tsx`:
```tsx
import { Link } from 'react-router'

export default function Landing() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 'var(--text-display-lg)', lineHeight: 'var(--leading-heading)',
        letterSpacing: 'var(--tracking-display)',
      }}>
        claude-credits
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body)', lineHeight: 'var(--leading-body)', color: 'var(--text-secondary)' }}>
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
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'var(--text-display-md)', lineHeight: 'var(--leading-tile)' }}>
        {name}
      </h1>
      {/* Longhand props (NOT `font:` shorthand) so .tabular's font-variant-numeric survives */}
      <p className="tabular" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-stat-callout)', lineHeight: 1, color: 'var(--accent-stat-highlight)' }}>
        1234567890
      </p>
      <Link to="/" style={{ color: 'var(--text-link)' }}>← home</Link>
    </main>
  )
}
```
(The mono digit string + `.tabular` is a deliberate smoke test that tabular numerals + the mono font + the stat-highlight token all resolve. Because the page uses longhand `fontFamily`/`fontSize`/`lineHeight` — never the `font` shorthand — the `.tabular` class's `font-variant-numeric` is not clobbered.)

`src/pages/About.tsx`:
```tsx
import { Link } from 'react-router'

export default function About() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'var(--text-display-md)', lineHeight: 'var(--leading-tile)' }}>about</h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body)', lineHeight: 'var(--leading-body)', color: 'var(--text-secondary)' }}>
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
Visit `/`, `/project/burned`, `/about`. All three render; `<Link>` nav is client-side (Network tab: no document re-fetch). `/project/burned` shows "burned" (`:name` resolves). **The headings will appear with no font/color/weight** because tokens land in Commit 3 — that is correct and expected at this commit; do NOT debug token resolution here, Commit 3 supplies the values.

**Commit:** `feat(claude-credits): three-route SPA skeleton + cross-fade transition seam + placeholder pages`

---

### Commit 3 — styles foundation (tokens + fonts + reset + global)

**1.9a — `src/styles/tokens.physical.css`** (raw values — NEVER imported by components):

```css
/* PHYSICAL TOKENS — raw values only. Components NEVER reference --c-* color tokens.
   Only tokens.semantic.css may use them. A Phase 9 stylelint rule fails CI if any
   --c-* token appears outside this file. (--space-* and --radius-* are exempt — see
   Decision 4 — components may use them directly.) */
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

**1.9b — `src/styles/tokens.semantic.css`** (role-based aliases + light override; the ONLY token file components import for color/type):

```css
/* SEMANTIC TOKENS — role-based color/surface aliases + type/motion primitives.
   Dark is the default :root. Light applies via EITHER the OS preference (when no
   manual override) OR an explicit [data-theme="light"] (dev ?theme= override). */
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

  /* Radius semantic roles (prevents uniform-corner AI-slop; tuned in Phase 9) */
  --radius-tile: var(--radius-md);
  --radius-chip: var(--radius-sm);
  --radius-button: var(--radius-pill);
  --radius-modal: var(--radius-lg);

  /* Type — families (self-hosted; see fonts.css) */
  --font-display: 'Satoshi', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Type — 7-step clamp scale (genuinely mobile-first: each vw track crosses its
     floor in the phone→tablet range, so secondary type scales on phones too) */
  --text-display-hero: clamp(4rem, 18vw, 22rem);     /* THE big number — matches Phase 3 + README ~22rem */
  --text-display-lg: clamp(2.25rem, 8vw, 4.5rem);
  --text-display-md: clamp(1.5rem, 5vw, 2.25rem);
  --text-stat-callout: clamp(2rem, 7vw, 3.5rem);
  --text-body-lg: clamp(1.125rem, 2.5vw, 1.375rem);
  --text-body: 1rem;                                  /* baseline — never clamp */
  --text-meta: 0.875rem;

  /* Type — line heights. display-hero is sub-1 for SINGLE-LINE numbers only;
     wrapping headings MUST use --leading-heading or higher (see landmine). */
  --leading-display-hero: 0.95;
  --leading-heading: 1.05;
  --leading-tile: 1.15;
  --leading-body: 1.55;
  --leading-meta: 1.4;

  /* Type — tracking */
  --tracking-display: -0.04em;
  --tracking-tile: -0.02em;
  --tracking-body: 0;
  --tracking-meta: 0.01em;
}

/* LIGHT — applied by OS preference only when no manual override is set... */
@media (prefers-color-scheme: light) {
  :root:not([data-theme]) { /* light token block (see :root[data-theme="light"] below) */
    --surface-page: var(--c-cream-paper);
    --surface-page-gradient-stop: var(--c-cream-deeper);
    --surface-elevated: rgba(255, 251, 240, 0.7);
    --surface-glass-blur: 14px;
    --surface-overlay: rgba(58, 38, 18, 0.3);
    --surface-divider: rgba(26, 26, 28, 0.08);
    --text-primary: var(--c-warm-black);
    --text-secondary: var(--c-warm-slate);
    --text-muted: rgba(74, 74, 82, 0.6);
    --text-on-accent: var(--c-cream-paper);
    --text-link: var(--c-orange-light);
    --accent-primary: var(--c-orange-light);
    --accent-stat-highlight: var(--c-gold-light);
    --accent-danger: var(--c-danger-light);
    --accent-focus: var(--c-orange-light);
    --border-subtle: rgba(26, 26, 28, 0.08);
    --border-strong: rgba(26, 26, 28, 0.16);
    --border-focus: var(--c-orange-light);
    --shadow-tile: 0 8px 32px rgba(58, 38, 18, 0.18);
    --shadow-hover: 0 16px 56px rgba(58, 38, 18, 0.28);
    --shadow-modal: 0 32px 80px rgba(58, 38, 18, 0.4);
  }
}

/* ...AND applied explicitly via the dev/v1.1 manual override. Same values —
   keep in sync with the @media block above. [data-theme="dark"] needs nothing
   (dark is the :root default, and the @media light block is gated by :not([data-theme])). */
:root[data-theme='light'] {
  --surface-page: var(--c-cream-paper);
  --surface-page-gradient-stop: var(--c-cream-deeper);
  --surface-elevated: rgba(255, 251, 240, 0.7);
  --surface-glass-blur: 14px;
  --surface-overlay: rgba(58, 38, 18, 0.3);
  --surface-divider: rgba(26, 26, 28, 0.08);
  --text-primary: var(--c-warm-black);
  --text-secondary: var(--c-warm-slate);
  --text-muted: rgba(74, 74, 82, 0.6);
  --text-on-accent: var(--c-cream-paper);
  --text-link: var(--c-orange-light);
  --accent-primary: var(--c-orange-light);
  --accent-stat-highlight: var(--c-gold-light);
  --accent-danger: var(--c-danger-light);
  --accent-focus: var(--c-orange-light);
  --border-subtle: rgba(26, 26, 28, 0.08);
  --border-strong: rgba(26, 26, 28, 0.16);
  --border-focus: var(--c-orange-light);
  --shadow-tile: 0 8px 32px rgba(58, 38, 18, 0.18);
  --shadow-hover: 0 16px 56px rgba(58, 38, 18, 0.28);
  --shadow-modal: 0 32px 80px rgba(58, 38, 18, 0.4);
}
```

(The light values are duplicated across the `@media` block and the `[data-theme="light"]` block. A Phase 9 cleanup could DRY this with a shared custom-property indirection, but the duplication is deliberate at foundation time — it's the simplest correct way to get OS-respect AND a manual override without a preprocessor. Keep them in sync.)

**1.9c — `src/styles/fonts.css`** (self-hosted `@font-face` — see §1.9e for sourcing the woff2 files):

```css
/* Self-hosted variable fonts. No external CDN — eliminates first-paint CLS on the
   hero number and the CDN supply-chain trust boundary. */
@font-face {
  font-family: 'Satoshi';
  src: url('/assets/fonts/Satoshi-Variable.woff2') format('woff2-variations');
  font-weight: 300 900;
  font-style: normal;
  font-display: optional; /* display face: zero CLS — uses fallback if not ready in ~100ms, caches for next nav */
}
@font-face {
  font-family: 'Inter';
  src: url('/assets/fonts/Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/assets/fonts/JetBrainsMono-Variable.woff2') format('woff2-variations');
  font-weight: 400 800;
  font-style: normal;
  font-display: swap;
}
```

**1.9d — `src/styles/reset.css`** (modern reset):

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

**1.9e — `src/styles/global.css`** (body baseline, dvh fallback, `.tabular`, chromeless scrollbar, reduced-motion net):

```css
html, body {
  overflow-x: hidden; /* no horizontal scroll at any width */
  /* Chromeless scrollbar — the UMB how-to-play bar. A native scrollbar thumb is a
     thumbprint on the waxed hood. */
  scrollbar-width: none;
  -ms-overflow-style: none;
}
html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }

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

/* Reduced-motion foundation safety net. Components ALSO check prefersReducedMotion()
   in JS (motion/reduced-motion.ts); this is the CSS backstop. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**1.9f — source the self-hosted woff2 files** into `public/assets/fonts/`:
- **Satoshi-Variable.woff2** — download from Fontshare (`https://www.fontshare.com/fonts/satoshi` → "Download Family"), extract the variable woff2. ITF Free License (commercial OK). Place as `Satoshi-Variable.woff2`.
- **Inter-Variable.woff2** — from the Inter release (`rsms.me/inter/` or `@fontsource-variable/inter`'s woff2 file). OFL. Place as `Inter-Variable.woff2`.
- **JetBrainsMono-Variable.woff2** — from the JetBrains Mono release or `@fontsource-variable/jetbrains-mono`. OFL. Place as `JetBrainsMono-Variable.woff2`.

(Optional optimization for Phase 9: subset Satoshi to Latin + digits with `fonttools` to shrink the preloaded display face. Not required for Phase 1 — the full variable woff2 is acceptable.)

**Verify gate:**
```
pnpm dev
```
Re-visit all three routes. Satoshi renders on headings (NO layout shift on load — the preload + `font-display: optional` hold it), the mono digit string on `/project/burned` is tabular + gold, body is cream-on-midnight. **Toggle Windows app theme dark↔light** → surface flips to warm cream, text to warm-black, link to deeper orange; no FOUC, no stylesheet swap. **Also test the dev override:** visit `/?theme=light` while OS is dark (and `/?theme=dark` while OS is light) → the forced mode applies. Confirm `@/` alias resolves (temporarily add `import '@/styles/global.css'` somewhere, confirm, revert). In console: `document.fonts.check('700 16px Satoshi')` returns `true` after load.

**Commit:** `feat(claude-credits): token system + self-hosted fonts + reset + global baseline`

---

### Commit 4 — motion foundation (eases + tokens + GSAP registration + reduced-motion)

**1.10a — `src/motion/gsap-context.ts`** (register ONLY what Phase 1 uses):

```ts
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { CustomEase } from 'gsap/CustomEase'

// useGSAP MUST be registered or it fails silently. CustomEase powers the weighted eases.
// ScrollTrigger + DrawSVGPlugin are NOT registered here — each later phase registers the
// plugin it introduces (DrawSVG → Phase 5). Don't load heavy plugins on the entry chunk
// for zero consumers.
gsap.registerPlugin(useGSAP, CustomEase)

export { gsap, useGSAP, CustomEase }
```

**1.10b — `src/motion/easings.ts`** (four named eases — side-effecting; `main.tsx` imports it at boot):

```ts
import { CustomEase } from './gsap-context'

// Reveal / arrival — scroll reveals, page load, route fade (0.6–1.0s).
// Moderate ramp-in (initial velocity ~0.5), strong glide, soft landing — an ease-out shape.
CustomEase.create('weighted-arrive', 'M0,0 C0.2,0.1 0.2,1 1,1')

// Hero counter tick-up (2.0–2.8s). Slow first 12% (mass), accelerate through the
// middle, very long final 30% so the last digit settles rather than snaps.
CustomEase.create('weighted-settle', 'M0,0 C0.12,0 0.18,0.7 0.5,0.92 C0.7,0.98 0.86,1 1,1')

// Hover lift / press (0.16–0.25s). The 1.05 control point gives a mechanical-key
// overshoot — mass without playful bounce.
CustomEase.create('weighted-press', 'M0,0 C0.3,0 0.4,1.05 1,1')

// Exit — faster than entry (asymmetric rule). ease-in is OK on exit.
CustomEase.create('weighted-exit', 'M0,0 C0.4,0 1,0.6 1,1')

export const ease = {
  arrive: 'weighted-arrive',
  settle: 'weighted-settle',
  press: 'weighted-press',
  exit: 'weighted-exit',
} as const
```

**1.10c — `src/motion/tokens.ts`** (duration + stagger constants):

```ts
export const duration = {
  press: 0.16,
  hover: 0.25,
  reveal: 0.8,
  counter: 2.4,
  exit: 0.2,
} as const

export const stagger = {
  tiles: 0.06,
  supportingLines: 0.08,
} as const
```

**1.10d — `src/motion/reduced-motion.ts`:**

```ts
// Single source of truth for the reduced-motion check. Components import this and
// skip/instant-complete motion when it returns true. CSS net in global.css backstops.
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
```

**Verify gate (dev AND prod bundle — the prod check is non-optional):**
```
pnpm typecheck          # clean
pnpm dev                # console: no GSAP plugin warnings
pnpm build && pnpm preview   # built bundle — confirm side-effect imports survived tree-shaking
```
In BOTH `pnpm dev` and the `pnpm preview` (built) tab, run in console: `gsap.parseEase('weighted-settle')` returns a **function** (not `undefined`). This proves `easings.ts` ran in both dev and the production bundle — the side-effect import is the thing most at risk of being tree-shaken out of a Rolldown prod build, so the `preview` check is the real gate, not `dev`.

**Commit:** `feat(claude-credits): motion foundation — weighted eases, duration tokens, GSAP registration, reduced-motion helper`

---

### Commit 5 — deploy config + README + final verify

(`src/types.ts` is NOT created here — it's a Phase 2 file per Decision 9.)

**1.11 — `vercel.json`** (adapted from UMB; tighter CSP because fonts are now same-origin; SPA deep-link rewrite with a `/data/` passthrough guard):

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
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'none'; object-src 'none'" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/data/(.*)", "destination": "/data/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

CSP notes: `style-src 'unsafe-inline'` is required for React inline `style={{}}` attributes AND GSAP's inline-style mutations (transforms/opacity) — don't remove it. `font-src 'self'` works because fonts are self-hosted (Decision 7). `connect-src 'self'` covers the same-origin `stats.json` fetch. The `/data/$1` identity rewrite precedes the SPA catch-all so the JSON file is served directly, not swallowed into `index.html`. **Deploy-time validation (Phase 8):** after the first Vercel deploy, open DevTools console and confirm NO CSP violation reports fire (GSAP animations, font loads, data fetch all clean). If a violation appears, the offending directive is too tight — fix before declaring deploy done.

**1.12 — `README.md`:**

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
Fonts: self-hosted Satoshi · Inter · JetBrains Mono (no external CDN)
Deploy: Vercel (`claude-credits.vercel.app`)
```

**Final Phase 1 verify gate (the "Phase 1 done" bar — runtime truth, not just green tsc):**
```
cd C:/Users/brigg/ai-learning-journey/projects/claude-credits
pnpm typecheck                 # clean — NO carve-outs (types.ts is Phase 2, not present)
pnpm build && pnpm preview     # clean dist/, built site served
```
Runtime checklist (eye on the browser):
- [ ] `/`, `/project/burned`, `/about` render in BOTH `pnpm dev` and `pnpm preview` (built); `<Link>` nav is client-side
- [ ] Self-hosted Satoshi/Inter/JetBrains Mono load; `document.fonts.check('700 16px Satoshi')` → `true`; NO layout shift on first paint
- [ ] Dark mode: midnight teal surface, cream text, orange links
- [ ] Toggle Windows to light → cream paper, warm-black text, deeper-orange links; no FOUC, no stylesheet swap
- [ ] Dev override: `/?theme=light` (OS dark) and `/?theme=dark` (OS light) force the mode
- [ ] No console errors; no CSP violations in `pnpm preview`; no 404s on fonts
- [ ] `gsap.parseEase('weighted-settle')` returns a function in BOTH dev and preview consoles
- [ ] Resize to 360/375/390/430px: no horizontal scroll; hero + secondary type clamp down legibly (secondary type actually scales, not frozen)
- [ ] OS reduced-motion set → CSS safety-net active (transitions instant)

**Commit:** `feat(claude-credits): Vercel config (CSP + SPA rewrite) + README + Phase 1 verification`

---

## Mobile foundation (set up day 1 — the UMB how-to-play bar)

- **Viewport meta** (§1.5): `width=device-width, initial-scale=1.0, viewport-fit=cover` — notch-safe.
- **Dual theme-color** (§1.5): browser chrome matches the active mode.
- **dvh fallback** (§1.9e): `min-height: 100vh` then `min-height: 100dvh`.
- **`overflow-x: hidden` + chromeless scrollbar** (§1.9e).
- **Genuinely-responsive type clamps** (§1.9b): every display step's vw track crosses its floor in the phone→tablet range, so secondary type scales on phones (not frozen at the floor).
- **Hover gating** (§1.9e): `@media (hover: hover) and (pointer: fine)` reserved.

The full breakpoint cascade (640 / 960 columns, 600px phone polish) lands with components (Phase 3+), anchored to `projects/undercover-mob-boss/public/how-to-play.html`.

---

## Light/dark architecture (equal-citizen from day 1)

The failure mode is a dark mode that *feels designed* and a light mode that *feels compiled*. The discipline: **every perceptually-mode-dependent token gets a light override — not just colors.** Encoded in §1.9b:

- **Shadow weight** — dark subtle (bg does the lift); light warm-hued + heavier (cream needs more weight to show elevation).
- **Blur radius** — `--surface-glass-blur` 20px dark, 14px light (20px on cream smudges).
- **Border alpha** — dark-on-light reads stronger; light borders tuned, not reused.
- **Accent saturation** — each mode gets its own accent physicals.

**What does NOT change between modes:** easing curves, durations, type scale, spacing, radii. Mode-agnostic — never variant them.

**Verification reach (foundation-time fix):** dark is the public default but Briggsy's OS is light — so dark is the mode he'd otherwise never see at his desk. The `?theme=dark|light` dev override (§1.6) makes BOTH modes verifiable in one browser without an OS toggle. The same `[data-theme]` mechanism is the v1.1 manual-toggle hook.

**Phase 9 discipline:** polish both modes in lockstep, side-by-side. Never "polish dark, then translate to light." If a change improves one mode and degrades the other, it's the wrong change.

---

## Landmines

| Landmine | Guard |
|---|---|
| **`easings.ts` registers eases only when imported** | `main.tsx` imports it as a side-effect at boot (§1.6). Without that import, `gsap.parseEase('weighted-…')` returns undefined and every weighted ease silently falls back. The Commit 4 prod-bundle gate catches it. |
| **Side-effect imports tree-shaken from the prod bundle** | The Commit 4 gate runs `pnpm build && pnpm preview` and re-checks `parseEase` in the BUILT tab — dev passing is not enough. |
| **`font` shorthand resets `font-variant-numeric`** | Placeholder pages (and all future components) use longhand `fontFamily`/`fontSize`/`lineHeight`, never the `font` shorthand, so `.tabular` survives. |
| **Hero token was dead + wrong** | `--text-display-hero` is now `clamp(4rem, 18vw, 22rem)` (matches Phase 3 + README ~22rem). Phase 3's HeroCounter MUST consume `var(--text-display-hero)`, not an inline clamp. |
| **Secondary type clamps frozen on phones** | vw coefficients recomputed (8/5/7/2.5vw) so each crosses its floor in the phone→tablet range. Re-verify no overflow at 360px. |
| **`--leading-display-hero: 0.95` overlaps wrapping text** | Sub-1 leading is for SINGLE-LINE hero numbers only. Wrapping headings use `--leading-heading` (1.05) or higher. Split into two tokens to enforce. |
| **`src/types.ts` re-exports types Phase 0 hasn't created** | Deferred to Phase 2 (Decision 9). The relative path `../../../tools/claude-credit/dist/taxonomy.js` is correct depth (tools/ at monorepo root); confirm `dist/` has all 5 types after Phase 0 builds. |
| **ScrollTrigger/DrawSVG eager-registered for zero consumers** | Phase 1 registers only `useGSAP` + `CustomEase`. DrawSVG → Phase 5; ScrollTrigger → whichever phase needs it. |
| **CSP too tight breaks GSAP/fonts** | `style-src 'unsafe-inline'` kept for React/GSAP inline styles; `font-src 'self'` works because fonts are self-hosted. Validate no CSP violations in `pnpm preview` + after deploy (Phase 8). |
| **`GEMINI_API_KEY` could leak into the client bundle** | NEVER prefix it `VITE_`. Vite only inlines `VITE_`-prefixed env into client code. The key is server-side-only, consumed by Phase 2's `scripts/refresh-stats.ts` via `tsx`. No component may read `import.meta.env.GEMINI_API_KEY`. |
| **`host: true` exposes the dev server on the full LAN** | Fine on a home network for phone testing. On shared networks (coffee shop, coworking), run `pnpm dev --host 127.0.0.1` or drop the `host` key temporarily. |
| **`resolve.tsconfigPaths` Vite key** | CONFIRMED real — `burned/vite.config.ts` ships it on Vite 8 and builds clean. If `@/` imports ever fail, fall back to `vite-tsconfig-paths`. |
| **`react-router` import vs `react-router-dom` install** | Install `react-router-dom@^7`; import from `react-router` (v7-canonical). Use `BrowserRouter`+`<Routes>`, not `RouterProvider`. |
| **Vercel SPA deep-link 404** | `rewrites` serves `index.html` for non-asset paths; the `/data/$1` identity rewrite precedes the catch-all so JSON isn't swallowed. |
| **`node_modules/` was not gitignored** | §1.1 adds it. Verify `git status` doesn't stage it before Commit 1. |

---

## Out of scope for Phase 1 (explicit "later")

- Data wiring / `stats.json` / `refresh-stats.ts` / `src/types.ts` → Phase 2
- Real components (HeroCounter, ProjectTile, AssetDonut, etc.) → Phase 3+
- Actual animations (motion foundation is set up; nothing animates yet) → Phase 3+
- The cross-fade route-transition LOGIC (the seam exists; the animation that drives it) → route-transition phase
- ScrollTrigger / DrawSVG registration → the phases that use them
- The full responsive breakpoint cascade → Phase 3+
- GitHub Action / deploy automation / CSP deploy-validation → Phase 8
- Phase 9 stylelint rule (physical-token boundary), Satoshi subsetting, light/dark CSS DRY-up → Phase 9
- Manual light/dark toggle UI → v1.1 (the `?theme=`/`[data-theme]` hook is wired now)
- `clsx` install → Phase 3

---

## Verification (Phase 1 done gate)

1. ✅ `pnpm install` clean; `pnpm-lock.yaml` committed; `node_modules/` gitignored
2. ✅ `pnpm typecheck` clean — **no carve-outs** (types.ts is Phase 2)
3. ✅ `pnpm build` produces a clean `dist/`; `pnpm preview` serves it
4. ✅ All three routes render in dev AND preview; `<Link>` nav is client-side
5. ✅ Three self-hosted variable fonts load; `document.fonts.check` true; no first-paint layout shift
6. ✅ Token system resolves — no unstyled `var(--…)` fallbacks
7. ✅ Light/dark switches with the OS (no FOUC/swap) AND via `?theme=` dev override
8. ✅ Motion foundation loads error-free in dev AND preview; all four eases queryable via `gsap.parseEase`
9. ✅ Reduced-motion CSS net active when OS flag set
10. ✅ No horizontal scroll at 360/375/390/430px; hero + secondary type clamp legibly
11. ✅ No console errors; no CSP violations in preview; no font 404s

Then open [phase-2-data-wiring.md](phase-2-data-wiring.md) and start.

---

## Cascade (corrections this deepening implies elsewhere)

Land in the same deepen commit or a follow-up before Phase 1 executes:

- **`README.md` (plans index) stack rows**: the "Stack" decision row states the stack without a Vite version pin — add `vite@^8.0.10`. Also add `react-router-dom@^7` (note: install package is `react-router-dom`, import specifier is `react-router`) and `@gsap/react@^2.1.2` to the dependency list. Update the fonts note to "self-hosted Satoshi / Inter / JetBrains Mono (no CDN)".
- **`phase-2-data-wiring.md`**: `src/types.ts` is created HERE (moved out of Phase 1 per Decision 9). Add a pre-step: confirm `tools/claude-credit/dist/` exports all five types (`MultiProjectReport`, `ProjectReport`, `TokenStats`, `EditorialContent`, `ArchiveCollective`) before the relative import. Also: `clsx` install moves to Phase 3.
- No other downstream phase (3–9) requires structural change from Phase 1 — the scaffold is a pure foundation. Phase 0's own cascade note confirmed "Phase 1: no structural change required."

---

← [Phase 0 — Data gaps](phase-0-data-gaps.md) | [Index](README.md) | Next → [Phase 2 — Data wiring](phase-2-data-wiring.md)
