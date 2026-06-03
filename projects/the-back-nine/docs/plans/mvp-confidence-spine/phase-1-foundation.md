---
title: "Phase 1 — Foundation"
type: feat
phase: 1
parent: docs/plans/mvp-confidence-spine/roadmap.md
date: 2026-06-03
status: not-started
---

# Phase 1 — Foundation

**Goal.** Stand up the buildable PWA skeleton, the deterministic Monte Carlo engine validated against known-good reference cases, and the encrypted local store that makes the privacy promise provable. Nothing user-facing ships in this phase — but the engine's answer must be *right* and the store's guarantee must be *proven* before any surface consumes them.

**Why this is Phase 1.** The two hardest, highest-risk surfaces — *correctness* (a calm-but-wrong number fails the bar worse than no tool) and *trust* (R15: provable before spoken) — are foundations everything else stands on. Units 1 and 2 are independent of each other (parallelizable after Unit 0) and have zero monorepo precedent, so they carry the most risk and must be locked first.

> Paths are relative to `projects/the-back-nine/`. References: `(origin: …)` → `docs/brainstorms/the-back-nine-requirements.md`; `(findings §StrandN)` → `docs/research/foundation-findings-2026-06-03.md`. Reference numbers/params live in the findings doc — never re-stated here.

---

- [ ] **Unit 0: Project scaffold, conventions, PWA shell, CI**

**Goal:** A buildable, deployable React 19 + TS + Vite 8 PWA skeleton with the monorepo's conventions and an offline app shell.

**Requirements:** Enabler for all; R13 (disclaimer surface).

**Dependencies:** None.

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.ts`, `index.html`, `src/main.tsx`, `public/manifest.webmanifest`
- Create: `CLAUDE.md` (model on `projects/burned/CLAUDE.md`)
- Create: `.github/workflows/verify-the-back-nine.yml` (in the monorepo `.github/`, path-scoped to `projects/the-back-nine/**`)
- Test: `src/shared/__tests__/scaffold.smoke.test.ts`; a `verify:bundle` budget sentinel script

**Approach:**
- Adopt the convergent baseline verbatim (React 19.2.4, TS 5.9 strict + `noUncheckedIndexedAccess`, Vite 8, Vitest 4, pnpm 10.30, `motion` v12). Decide and document the Vite 8 variant (rolldown vs rollup) in `CLAUDE.md` — siblings differ.
- `vite-plugin-pwa` in **`prompt`** mode (NOT `autoUpdate` — `skipWaiting`+`clientsClaim` can reload a tab mid-encrypt-write and tear an IndexedDB write; findings/framework research). `useRegisterSW` → "Update ready" toast. `globPatterns` includes all shell assets; raise `maximumFileSizeToCacheInBytes` if any asset is large.
- ESLint layer import boundaries (`engine` must not import `ui`/`store`; `engine` is pure). Ban `Math.random()` in `src/engine/**`.
- `CLAUDE.md` names `docs/brainstorms/the-back-nine-requirements.md` as the contract and sets a bundle budget.
- Static "informational and educational — not legal, tax, or investment advice; consult a licensed professional" disclaimer in the app shell (R13).

**Patterns to follow:** `projects/burned/CLAUDE.md`, `projects/burned/vite.config.ts` (Vite 8 notes), `projects/undercover-mob-boss/vite.config.ts` (PWA), `.github/workflows/verify-ai-journey-stats.yml`.

**Test scenarios:**
- Happy path: `pnpm build` produces a PWA that loads offline (app shell precached) on a second visit.
- Edge case: bundle-budget sentinel fails the build when initial JS exceeds the budget (test against a planted oversize import).
- Integration: service worker registers in `prompt` mode and surfaces an update toast rather than auto-reloading (verify no `skipWaiting`).
- `Test expectation: none` for pure config files beyond the above.

**Verification:** Clean clone → `pnpm install --frozen-lockfile` → `pnpm build` succeeds on CI (Node 22); the built app loads offline; the disclaimer is visible.

---

- [ ] **Unit 1: Monte Carlo engine core + validation contract** *(the correctness unit)*

**Goal:** A pure, deterministic TypeScript Monte Carlo engine that models a married couple's joint-and-survivor longevity and emits a distribution the UI reads as "X of N futures" + the dollar adjustment — validated against known-good reference cases.

**Requirements:** R3 (distribution of futures), R14 (plain-language reading), correctness success criterion.

**Dependencies:** Unit 0.

**Files:**
- Create: `src/engine/rng.ts`, `src/engine/longevity.ts`, `src/engine/simulate.ts`, `src/engine/confidence.ts`, `src/engine/engine.worker.ts`, `src/shared/model.ts`
- Create: `src/engine/reference/` (Trinity/Bengen fixtures)
- Test: `src/engine/__tests__/rng.test.ts`, `simulate.test.ts`, `longevity.test.ts`, `confidence.test.ts`, `src/engine/reference/__tests__/validation.test.ts`

**Approach:**
- Port `mulberry32` + the CSPRNG/seeded split from `projects/burned/src/server/rng.ts`; add a Box-Muller normal transform. **Production runs seed from `crypto.getRandomValues`; a saved scenario stores its seed so identical inputs reproduce the identical headline** (seed-stability).
- Lognormal sim with **log-drift μ = arithmetic_mean − σ²/2** (the #1 MC bug is naïve arithmetic compounding — findings §Strand 4). Conservative real-return + inflation defaults, all user-overridable.
- **Joint-and-survivor longevity** from cohort (not period) tables: P(last survivor alive) = pₓ + pᵧ − pₓ·pᵧ. Two-regime horizon (joint → survivor): survivor-SS step-down (keep larger benefit) + survivor-spending ratio (default ~75%, param). Never a fixed "to-age-90".
- Outputs: the full terminal-value distribution + percentiles + depth-of-failure (not a binary pass/fail) → `confidence.ts` maps it to "X of N", the dollar adjustment ("trim ~$Y/month"), and the outcome state. **Never "probability of failure"** (Kitces framing).
- Runs in `engine.worker.ts` behind Comlink; results returned via `Comlink.transfer` (typed-array buffers) to avoid clone cost.

**Execution note:** Implement test-first against the reference cases — the golden numbers are the contract.

**Patterns to follow:** `projects/burned/src/server/rng.ts` (determinism discipline).

**Test scenarios:**
- Happy path: 50/50 portfolio, 4% inflation-adjusted, 30-yr → success rate matches the Trinity 50/50 anchor (findings §Strand 4) within tolerance.
- **Diagnostic (the landmine):** 100%-bond / 4% / 30-yr returns the corrected **~70%** (NOT 20–35%) — wrong inflation/volatility handling fails here.
- Edge case: log-drift unit test — +50% then −50% yields two-year cumulative −25% / annualized geometric −13.4% (correct labels, findings §Strand 4).
- Edge case: same inputs + same seed → byte-identical headline across repeated runs (seed-stability); a different seed shifts the distribution but not the rounded headline under hysteresis.
- Edge case: $0 portfolio + positive spending → honest "0 of N" (coherent-but-dire, never a crash or NaN).
- Edge case: NaN hygiene — no `ln`/`exp` of a non-positive escapes into a percentile.
- Integration: couple longevity — at-least-one-survivor-to-90 probability materially exceeds a single life (sanity vs findings §Strand 4 ~53% figure); survivor-SS step-down lowers the verdict vs ignoring it.

**Verification:** All reference-case tests pass on CI (fail-loud, self-tested against a planted wrong number per `burned/070`); a 1k-path run completes well under the live-recompute budget in a Worker.

---

- [ ] **Unit 2: Encrypted local store + key lifecycle + recovery/export/restore**

**Goal:** The trust layer — derive an AES key from a passphrase, encrypt the model at rest in IndexedDB, lock/unlock, and provide the recovery-phrase + encrypted-export/restore mechanism. **This unit makes R15's promise provable.**

**Requirements:** R15, R16, R17, R18.

**Dependencies:** Unit 0. (Independent of Unit 1 — parallelizable.)

**Files:**
- Create: `src/crypto/kdf.ts` (PBKDF2-600k), `src/crypto/cipher.ts` (AES-GCM), `src/crypto/recoveryPhrase.ts`, `src/store/db.ts` (idb), `src/store/session.ts` (key in memory, lock/unlock), `src/store/backup.ts` (export/restore)
- Test: `src/crypto/__tests__/cipher.roundtrip.test.ts`, `kdf.test.ts`, `src/store/__tests__/session.test.ts`, `backup.test.ts`

**Approach:**
- `importKey('raw', utf8(passphrase), 'PBKDF2')` → `deriveKey({PBKDF2, salt, iterations:600000, SHA-256}, …, {AES-GCM,256}, extractable:false, ['encrypt','decrypt'])`. **Key lives in memory only — never written to IndexedDB** (passphrase-each-session model). Store only `{salt(16B), iv(12B), ciphertext}`.
- Fresh 12-byte IV per encryption; never reuse. Wrong passphrase → GCM auth-tag failure surfaced as a calm "that passphrase didn't unlock this", not a stack trace.
- **Key hierarchy:** the recovery phrase wraps a stable random *data key*; the passphrase wraps the *same* data key independently — so a passphrase change does NOT invalidate the recovery phrase or force a new export.
- Recovery phrase = client-generated mnemonic; **export = encrypted blob**; restore = import file + phrase → set new passphrase. Onboarding copy states phrase + file are a **pair** (no-sync MVP: phrase alone recovers nothing).
- `navigator.storage.persist()` after first save (best-effort; the exported phrase+file is the real durability backstop — findings §Strand 2).

**Execution note:** Test-first on the crypto round-trip and the wrong-passphrase + restore paths — these are the trust guarantees.

**Patterns to follow:** Greenfield for the monorepo; `idb` (jakearchibald) for IndexedDB; findings §Strand 2 is the spec.

**Test scenarios:**
- Happy path: encrypt model → persist → reload → unlock with passphrase → byte-identical model.
- Error path: wrong passphrase → decrypt fails cleanly (auth-tag), no partial/garbage model surfaced.
- Edge case: passphrase change re-wraps the data key without invalidating the recovery phrase (restore with the old phrase still works).
- Integration: export encrypted blob → wipe IndexedDB → restore from file + recovery phrase → set new passphrase → original model recovered.
- Edge case: lock mid-session zeroes the in-memory key; subsequent access requires re-unlock.
- Security assertion: the AES key never appears in any IndexedDB record (assert the store contains only salt/iv/ciphertext).

**Verification:** A full save→reload→unlock and an export→wipe→restore cycle both reproduce the model; grep of the persisted store shows no key material. *(This is the evidence R15 requires before any "we can't see your money" copy ships.)*
