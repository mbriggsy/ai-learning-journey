# The Back Nine — Project Conventions

## What this is

A **personal** (never-sold) retirement / tax-strategy co-pilot for a married couple. The first magic moment is **state-adaptive** (R26–R39, the 2026-06-08 full-projection expansion): for a **not-yet-retired** household, **the fuck-off date** — two confidence-graded work-optional dates from sweeping the household date-offset over the same engine (accumulation is a bounded near-retirement on-ramp, never a FIRE calculator); for an **already-retired** household, the calm plain-language **confidence statement**. Then — both states — a **recommend-second**, confidence-graded strategy over two coupled tax controls (withdrawal **sequencing** + Roth **conversion**) that funds a user-built budget toward a user-chosen goal.

**The cardinal rule: calm-but-wrong is the sin.** Friends bet real retirement money on this answer with *less* protection than a commercial tool — so the honesty + engine-validation bar **rises**, it never softens. *"It's just for friends" never excuses a confidently-wrong recommendation.*

## The map (where truth lives)

Start at [`docs/README.md`](docs/README.md). The documentation is story-first:

1. **Product — the *why* + *what*** (thesis, cardinal rule, locked decisions, the R1–R40 requirements ledger): [`docs/product.md`](docs/product.md).
2. **Roadmap — *where we are* + *what's next*** (the four acts, the maintained **You-Are-Here** per-unit status table, the requirement→unit trace, the validation gates): [`docs/roadmap.md`](docs/roadmap.md).
3. **Architecture — *what you must never break*** (the load-bearing engine invariants, one canonical home): [`docs/architecture.md`](docs/architecture.md).
4. **Act plans** [`docs/plans/`](docs/plans/) (`1-engine` … `4-recommendation` + `features/`) · **decision records** [`docs/decisions/`](docs/decisions/) · **research** [`docs/research/`](docs/research/) · **glossary** [`docs/glossary.md`](docs/glossary.md) · **insights** [`docs/insights/`](docs/insights/).

5. **Backlog — *everything still open*** (the full tiered register — 42 open items, consolidated 2026-08-02 from a source audit + an archive salvage and re-anchored the same day against the shipped code; each traced to its raw obligations): [`docs/backlog.md`](docs/backlog.md).

Precedence on conflict: the **roadmap's You-Are-Here table** wins on build status; **`docs/architecture.md`** wins on an invariant; **`docs/product.md`** wins on the *why*/*what*.

**The work queue is two files, and the split is load-bearing.** `TODO.md` is the volatile RANKED queue — what is next, ~17 entries, re-ranked every session. [`docs/backlog.md`](docs/backlog.md) is the full open REGISTER — everything still open, whether or not it is ranked. **Read the register before filing anything as new**: a queue of 17 is not the open surface, and TODO's numbers are re-ranked per session, so **never cite "TODO item N"** — it will silently resolve to a different item later. Cite the register entry's title instead.

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
| `pnpm verify:state-tax` | State-income-tax **re-verify** gate for the priced roster {NC, PA, FL} (mirrors `verify:aca`; NC's record carries the ~Aug-2026 rate-certification checkpoint) |
| `pnpm verify:csp` | Real-Chromium **CSP enforcement** gate (`e2e/csp.spec.ts` serves `dist/` through `vercel.json`'s headers — a blocked inline script + a blocked cross-origin fetch, each with a no-CSP control arm) |
| `pnpm verify:fit` | Real-Chromium **vertical-fit** gate (`e2e/vertical-fit.spec.ts` on `pnpm dev` — the one-frame fit law + the date-route order contract; own harness `playwright.fit.config.ts`) |
| `pnpm verify:doc-stats` | Doc test-count **drift** gate (README + roadmap must match the live `vitest` suite) |

## Layers & import boundaries (ESLint-enforced)

`engine · crypto · store · intake · budget · viz · ui · shared` (path aliases `@engine/*` … `@shared/*`).

- **`src/engine/` is PURE.** A deterministic function of `(params, seed)`. It imports only `@shared`; it must not import ui/store/intake/budget/viz/crypto. It reads **no clock, entropy, or environment** — `Math.random`, `crypto.getRandomValues`, `Date`, `performance`, and `process` are all lint-banned inside `src/engine/**` (the seed is **injected** by the caller). Tests under `src/engine/**` are exempt.
- **`src/crypto/`** — primitive layer; CSPRNG **required** (`crypto.getRandomValues` for every salt, IV, and the raw data key), `Math.random` banned. The recovery credential is a **second user-chosen passphrase** (PBKDF2-600k, same floor — the v1 BIP-39 phrase was reworked away in U8), never a system-minted wordlist phrase.
- **`src/shared/`** — leaf (the plaintext model + outcome-state enum); imports nothing from feature layers.

## Load-bearing engine contracts (do not break)

*Canonical home — with the per-overlay contracts and the full reasoning — is [`docs/architecture.md`](docs/architecture.md). Below is the always-in-context summary.*

- **Single shared market draw / CRN.** All buckets (pre-tax/Roth/taxable/HSA) share **one** market-return draw per year — buckets differ only in tax treatment. Per-bucket draws are **forbidden** (they break CRN and would re-enable asset-location). The draw schedule is a pure function of path/horizon **dimensions only**.
- **Stateless Box-Muller.** No cached spare across calls (a cached spare desyncs two CRN candidates that draw normals in different interleavings).
- **Reduce-to-spine invariant.** Every overlay (tax, healthcare, earned-income bridge) reduces **byte-identically (same seed)** to the Trinity/Bengen-validated decumulation when OFF. The golden cases are never perturbed.
- **Externally-derived fixtures (DND 012).** A golden value computed via the engine's own formula proves typing, not correctness. Derive Trinity/Bengen/tax/ACA expected numbers by an independent path.
- **Cross-engine headline robustness.** Plain-TS transcendentals are not bit-identical across JS engines, so `confidence.ts` quantizes the headline statistic to a coarse grid **before** the band-edge decision (the screenshot-reproduction guard).

## Constants discipline (`src/engine/constants/`)

*Full detail: [`docs/architecture.md §8`](docs/architecture.md). Summary:*

- **ONE canonical, year-keyed table** (burned/057,061,063). Plan, overlays, tests, and the copyGuard allowlist all **read** it — a dated figure is never re-typed elsewhere (a shape test greps for inlined values).
- Every figure carries `{ value, citation, directionalUntilPinned }`. **No in-range default fallbacks** (burned/062): a figure the research names but doesn't value is an `Unsourced` sentinel whose `.value` **throws** — never a plausible default.
- The ACA legislative entry carries `reVerifyEveryBuild` and is gated in CI by `verify:aca` — it can flip the whole pre-65 model.
- Persisted "never-depleted" sentinels must be a numeric value (e.g. `-1` / max-horizon year), **never `Infinity`/`NaN`** — `JSON.stringify`/IndexedDB silently null them (DND 009).

## Security / CSP boundary

- Strict CSP ships via **HTTP response headers** (`vercel.json`), not a meta tag: `script-src 'self'` (no inline/eval — Vite's modulepreload polyfill is disabled, `injectRegister:false`, so this holds), `connect-src 'self'`, `worker-src 'self'`, `object-src/frame-src/child-src/media-src 'none'`, `base-uri/frame-ancestors 'none'`. A vitest regression guard asserts the directives (`scripts/__tests__/csp-headers.test.ts`); real browser ENFORCEMENT is CI-gated by `pnpm verify:csp` — `e2e/csp.spec.ts` serves `dist/` through `scripts/serve-dist-with-headers.ts` with `vercel.json`'s exact headers (`vite preview` does NOT apply them) and asserts a real Chromium blocks an injected inline `<script>` AND a cross-origin `fetch` exfil (`connect-src`), while the engine worker still constructs under `worker-src 'self'` — each with a no-CSP control arm proving the assertions aren't vacuous.
- **The full boundary is canonical in [`docs/architecture.md §10`](docs/architecture.md):** what `connect-src 'self'` does and does not buy (it blocks programmatic exfil — fetch/XHR/WS/beacon — but **not** top-level `location.href`/`window.open` navigation), the extensions + self-hosting caveats (Same-Origin-Policy / Host-header validation / the Private-Network-Access preflight), and the **forward landmines**: Trusted Types breaks `new Worker(new URL())` (needs a `TrustedScriptURL` policy, roll out Report-Only first); WASM will need `'wasm-unsafe-eval'`; motion's injected `<style>` needs `<MotionConfig nonce>`.

## Conventions

- **Toolchain:** mirrors `projects/burned` — `pnpm@10.30.3`, TS `~5.9.3` (tilde — a TS minor can't silently change type-checking under a correctness-critical engine), Vite 8 (`rolldownOptions`, `resolve.tsconfigPaths`), Vitest 4 (`globals:false`), flat ESLint 10, **no Prettier**. Co-locate `*.test.ts`; property tests `*.pbt.test.ts` via `fast-check`.
- **Clean-clone discipline (AJS 008):** no cross-project value/type imports; no fixtures generated into gitignored dirs. Vendor (`rng.ts`) and **commit** fixtures. Prove by hiding the artifact + fresh typecheck, not local green.
- **Cross-repo insight citations** carry the **full relative path + title slug**, not a bare number.
- **Stale-HMR (burned/072):** a frozen `?t=<ms>` 500 in the Vite dev overlay while `pnpm build` passes is a stale HMR cache — **restart the dev server, don't hunt a phantom bug.** Make multi-edit refactors atomic.
- **CI assumes Linux case-sensitivity (burned/055):** a green local Windows run is not proof; normalize env keys to UPPER_SNAKE.

## UI design skills (P2+ — load before ANY UI surface is touched)

Four skills, each with a distinct job (evaluated 2026-06-11; ui-ux-pro-max REJECTED — permission-system writes, greenfield-landing-page bias, Windows-hostile packaging):

1. **`frontend-design:frontend-design`** (the official plugin skill) — aesthetic direction + lifecycle. The Every variant `compound-engineering:frontend-design` we used to prefer was **dropped from the CE skill list (2026-06-29), so it no longer loads** — the official plugin is now the frontend-design skill and is **permitted**. **CAVEAT (the reason we once banned it, still true):** it biases toward "pick an EXTREME / maximalist / UNFORGETTABLE," the WRONG tone for this calm financial co-pilot — so `back-nine-design`'s calm-not-dashboard law OUTRANKS it (precedence below); when it pushes bold/extreme, that is the bias to COUNTER, not follow. Every bare `/frontend-design` reference in older plan docs meant the now-gone Every variant; read it as this skill, filtered through back-nine-design.
2. **`emil-design-eng`** (global user skill) — motion/micro-interaction craft: timing, easing, the motion@12 hardware-acceleration trap, reduced-motion.
3. **`back-nine-design`** (project skill, `.claude/skills/`) — project law the market doesn't cover: color-blind-safe encoding (color is NEVER the only signal — WCAG AA contrast does NOT satisfy this), confidence-band/fan-chart honesty, intake-form UX, the CSP/`<MotionConfig nonce>` landmine, PWA/offline UX.
4. **`web-design-guidelines`** (project skill, vendored from `vercel/agent-skills` — adapted: WebFetch stripped) — the post-build REVIEW lens (a11y, `tabular-nums`, reduced-motion checklist).

Precedence on conflict: back-nine-design (project law) > emil-design-eng (motion) > frontend-design (direction) > web-design-guidelines (review). Any bare `/frontend-design` reference means `frontend-design:frontend-design` (the CE Every variant having been dropped 2026-06-29) — always filtered through back-nine-design's calm tone, never followed into maximalism.

## The bar

NASA standard — quality is the deliverable, not completion. Verify in the real environment before claiming done. The automated optimality oracle judges *correctness*; the N=1 cold-read judges *tone* — never the reverse.
