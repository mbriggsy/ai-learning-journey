# The Back Nine — Project Conventions

## What this is

A **personal** (never-sold) retirement / tax-strategy co-pilot for a married couple: a calm, plain-language **confidence statement** (the first magic moment), then a **recommend-second**, confidence-graded strategy over two coupled tax controls (withdrawal **sequencing** + Roth **conversion**) that funds a user-built budget toward a user-chosen goal.

**The cardinal rule: calm-but-wrong is the sin.** Friends bet real retirement money on this answer with *less* protection than a commercial tool — so the honesty + engine-validation bar **rises**, it never softens. *"It's just for friends" never excuses a confidently-wrong recommendation.*

## The Contract (source-of-truth precedence)

1. **North-star (the *why*):** [`docs/plans/direction-reset-2026-06-04.md`](docs/plans/direction-reset-2026-06-04.md) — ratified charter.
2. **Requirements v2 (the locked *what/how*):** [`docs/brainstorms/the-back-nine-requirements.md`](docs/brainstorms/the-back-nine-requirements.md).
3. **Live plan:** [`docs/plans/back-nine-mvp/`](docs/plans/back-nine-mvp/) — roadmap + 4 phase docs (U0–U17).
4. **Verified reference numbers:** `docs/research/foundation-findings-2026-06-03.md` (§Strand 1–5) + `docs/research/pre65-healthcare-aca-hsa-2026-06-04.md`.

When any doc contradicts the north-star, the **north-star wins**. `TODO.md` is the work queue. The superseded `docs/plans/mvp-confidence-spine/` is mined history — never `/ce:work` it.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server (PWA disabled in dev) |
| `pnpm build` | Typecheck + production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (`vitest run`) |
| `pnpm lint` | ESLint (layer boundaries + engine purity) |
| `pnpm verify:bundle` | Initial-JS **byte budget** sentinel (≤ 300 KiB entry JS) |
| `pnpm verify:aca` | ACA enhanced-subsidy **re-verify** gate (fails if `aca-last-verified.json` is stale/unconfirmed) |

## Layers & import boundaries (ESLint-enforced)

`engine · crypto · store · intake · budget · viz · ui · shared` (path aliases `@engine/*` … `@shared/*`).

- **`src/engine/` is PURE.** A deterministic function of `(params, seed)`. It imports only `@shared`; it must not import ui/store/intake/budget/viz/crypto. It reads **no clock, entropy, or environment** — `Math.random`, `crypto.getRandomValues`, `Date`, `performance`, and `process` are all lint-banned inside `src/engine/**` (the seed is **injected** by the caller). Tests under `src/engine/**` are exempt.
- **`src/crypto/`** — primitive layer; CSPRNG **required** (`crypto.getRandomValues` for the recovery phrase), `Math.random` banned.
- **`src/shared/`** — leaf (the plaintext model + outcome-state enum); imports nothing from feature layers.

## Load-bearing engine contracts (do not break)

- **Single shared market draw / CRN.** All buckets (pre-tax/Roth/taxable/HSA) share **one** market-return draw per year — buckets differ only in tax treatment. Per-bucket draws are **forbidden** (they break CRN and would re-enable asset-location). The draw schedule is a pure function of path/horizon **dimensions only**.
- **Stateless Box-Muller.** No cached spare across calls (a cached spare desyncs two CRN candidates that draw normals in different interleavings).
- **Reduce-to-spine invariant.** Every overlay (tax, healthcare, earned-income bridge) reduces **byte-identically (same seed)** to the Trinity/Bengen-validated decumulation when OFF. The golden cases are never perturbed.
- **Externally-derived fixtures (DND 012).** A golden value computed via the engine's own formula proves typing, not correctness. Derive Trinity/Bengen/tax/ACA expected numbers by an independent path.
- **Cross-engine headline robustness.** Plain-TS transcendentals are not bit-identical across JS engines, so `confidence.ts` quantizes the headline statistic to a coarse grid **before** the band-edge decision (the screenshot-reproduction guard).

## Constants discipline (`src/engine/constants/`)

- **ONE canonical, year-keyed table** (burned/057,061,063). Plan, overlays, tests, and the copyGuard allowlist all **read** it — a dated figure is never re-typed elsewhere (a shape test greps for inlined values).
- Every figure carries `{ value, citation, directionalUntilPinned }`. **No in-range default fallbacks** (burned/062): a figure the research names but doesn't value is an `Unsourced` sentinel whose `.value` **throws** — never a plausible default.
- The ACA legislative entry carries `reVerifyEveryBuild` and is gated in CI by `verify:aca` — it can flip the whole pre-65 model.
- Persisted "never-depleted" sentinels must be a numeric value (e.g. `-1` / max-horizon year), **never `Infinity`/`NaN`** — `JSON.stringify`/IndexedDB silently null them (DND 009).

## Security / CSP boundary

- Strict CSP ships via **HTTP response headers** (`vercel.json`), not a meta tag: `script-src 'self'` (no inline/eval — Vite's modulepreload polyfill is disabled, `injectRegister:false`, so this holds), `connect-src 'self'`, `worker-src 'self'`, `object-src/frame-src/child-src/media-src 'none'`, `base-uri/frame-ancestors 'none'`. A vitest regression guard asserts the directives; browser enforcement is verified via a header-serving harness + Playwright (`vite preview` does NOT apply the Vercel headers).
- **What connect-src 'self' actually buys:** it blocks **programmatic** network exfil (fetch / XHR / WebSocket / EventSource / beacon), and `img-src`/`form-action` close the image/form channels. It does **not** block top-level **navigation** exfil (`location.href = …`, `window.open`) — CSP cannot, and that is an accepted residual for the personal single-device model (an XSS foothold is already heavily constrained by `script-src 'self'` + no-eval + `react/no-danger` + a deliberately narrow dep surface).
- **Extensions are out of scope:** the CSP guards the in-session decrypted model against XSS-injected page scripts, NOT browser extensions — extensions run privileged and can read the page heap. Accepted risk for a personal single-device tool.
- **Self-hosting caveat (corrected):** what protects the in-memory model + IndexedDB from a DNS-rebinding attacker is the **Same-Origin Policy** (an attacker origin is never the app's origin), not `connect-src`. If ever self-hosted on `localhost`/a LAN hostname, the real controls are **Host-header validation** on the server and correctly answering the browser's **Private-Network-Access preflight** (PNA is a browser-driven preflight the local server responds to — not a header the app simply "adds").

### CSP forward landmines (do not rediscover at runtime)
- **Trusted Types is a planned hardening (U4, the scenario-import sink risk), NOT a U0 drop-in.** `require-trusted-types-for 'script'` **breaks `new Worker(new URL(…))`** — the Worker constructor requires a `TrustedScriptURL`, so the engine worker fails to construct and the app renders nothing (verified). To adopt it: mint the worker URL through a `trustedTypes.createPolicy(...).createScriptURL(...)`, allowlist that policy via a `trusted-types` directive, and roll out behind `Content-Security-Policy-Report-Only` first.
- **WASM will need `'wasm-unsafe-eval'`.** If the engine is ever promoted to WASM (the roadmap's cross-engine-determinism trigger), `script-src 'self'` blocks `WebAssembly.instantiate` of fetched bytes in Chromium — add `'wasm-unsafe-eval'` to `script-src` at that point.
- **motion's injected `<style>` may hit `style-src 'self'`.** `motion@12` animates via CSSOM (fine), but its layout-animation features inject a `<style>` element (hence `<MotionConfig nonce>`). When animation lands using those features, supply a per-response nonce to both `style-src` and `<MotionConfig>`, or avoid the style-injecting features.

## Conventions

- **Toolchain:** mirrors `projects/burned` — `pnpm@10.30.3`, TS `~5.9.3` (tilde — a TS minor can't silently change type-checking under a correctness-critical engine), Vite 8 (`rolldownOptions`, `resolve.tsconfigPaths`), Vitest 4 (`globals:false`), flat ESLint 10, **no Prettier**. Co-locate `*.test.ts`; property tests `*.pbt.test.ts` via `fast-check`.
- **Clean-clone discipline (AJS 008):** no cross-project value/type imports; no fixtures generated into gitignored dirs. Vendor (`rng.ts`) and **commit** fixtures. Prove by hiding the artifact + fresh typecheck, not local green.
- **Cross-repo insight citations** carry the **full relative path + title slug**, not a bare number.
- **Stale-HMR (burned/072):** a frozen `?t=<ms>` 500 in the Vite dev overlay while `pnpm build` passes is a stale HMR cache — **restart the dev server, don't hunt a phantom bug.** Make multi-edit refactors atomic.
- **CI assumes Linux case-sensitivity (burned/055):** a green local Windows run is not proof; normalize env keys to UPPER_SNAKE.

## The bar

NASA standard — quality is the deliverable, not completion. Verify in the real environment before claiming done. The automated optimality oracle judges *correctness*; the N=1 cold-read judges *tone* — never the reverse.
