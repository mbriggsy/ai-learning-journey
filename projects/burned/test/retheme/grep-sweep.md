---
title: "Phase 5 §2.8.4 — retheme grep sweep results"
type: protocol-results
phase: 5
parent: docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md
date: 2026-05-06
status: completed
---

# Phase 5 §2.8.4 — retheme grep sweep results

Eight checks per plan §2.8.4. Run from repo root via Grep tool against
`src/` (excluding test files where the rule allows). Findings triaged
inline.

## Check 1 — `\bEK\b` standalone

**Hits:** 8, all in code COMMENTS (test files + a few production comments
documenting canonical EK rule provenance).

| File | Line | Context |
|---|---|---|
| `src/server/game/deck-composition-exhaustive.test.ts:169` | comment | "Defuse-and-EK-distribution table" |
| `src/client/board/DiscardFan.tsx:14` | comment | "canonical EK, so face-up older cards are legal information" |
| `src/server/game/engine.pbt.test.ts:60` | comment | "If game_over (EK drawn without defuse)" |
| `src/server/game/engine.ts:525` | comment | "Empty-handed or EK-only target" |
| `src/server/game/engine.ts:621` | comment | "All cards must be combo-eligible (not EK, not Defuse)" |
| `src/server/game/engine.test.ts:553-557` | comments | "Draw EK → defuse-pending" / "Place EK at position 0" |
| `src/server/game/rules-gaps-exhaustive.test.ts:47` | comment | "Place EK back at position 0" |

**Disposition:** all in comments documenting canonical Exploding Kittens
rule provenance — Tier 3 domain language, analogous to the `defuse-*`
phase strings explicitly allowed by spec §6.4. None are user-facing.
**No action required.**

## Check 2 — `[Ee]xploding.?[Kk]itten`

**Hits:** 1, in `src/server/projection.ts:203` —

> "This is an INTENTIONAL divergence from canonical Exploding Kittens"

**Disposition:** comment documenting WHY a divergence exists. Tier 3
domain reference, not user-facing. **No action required.**

## Check 3 — `You Exploded`

**Hits:** 0. ✓

## Check 4 — `EK identity`, `EK_REVEAL_MS`, `EK_RELIEF_MS`, `EK_ELIMINATION_MS`

**Hits:** 0. ✓ (Tier 2 cleanup — already landed.)

## Check 5 — `defuse-pending`, `defuse-placement` phase strings

**Hits:** 9 files (state-machine internals + tests). All Tier 3 domain
state-machine phase strings explicitly allowed by spec §6.4. The retheme
moved the CARD name (Defuse → Burned card with placement of Burned back
into the deck) but kept the internal phase identifiers. **No action
required.**

## Check 6 — `feltBranding` + `EK identity` comment

**Hits:** 0 ✓ (Phase 3 §2.7 retheme landed.)

## Check 7 (S17 deepening) — `console.log` in `src/` excluding tests

**Hits:** 1, in `src/server/room.ts:1035` — `console.log` on every
`broadcastGameState` call. Spec §8.1 Technical: "No `console.log` in
production build." This was debug instrumentation added in commit
`d3605132 chore(dev): relocate dev entry`, never gated.

**Disposition:** **REMOVED** (this commit). The local counters
(`hostCount`, `playerCount`, `godCount`, `untypedCount`, `sendFailures`)
were only consumed by the log; they're removed too. Per-connection send
errors are still caught in the surrounding `try/catch` to keep one bad
connection from breaking the broadcast loop. If structured production
observability is needed later, add it as a deliberate logging primitive
(`env.LOGGER.info(...)` with a wrangler-defined toggle), not a raw
`console.log`.

`console.error` and `console.warn` in src/ are NOT flagged — they
fire on legitimate failure paths (storage failures, queue overflow,
god-event size budget warnings, ErrorBoundary fallback, uncaught
window errors). The DiagOverlay's `console.warn` calls are inside a
DEV-only lazy-loaded component (`import.meta.env.DEV` gate, verified
tree-shaken).

## Check 8 (S12 deepening) — `__test|handleFixtureSeed|handleStackDeck` in production bundle

**Hits:** 0 (verified via `pnpm verify:bundle`). `verify-prod-bundle.ts`
checks 15 forbidden strings across 9 JS chunks; all clean. Existing dev
hooks (`__gameStore`, `__testInjectEvent`, `__testForceLocalTarget`)
tree-shake correctly via `import.meta.env.DEV` guards. The plan's
fixture endpoint (`handleFixtureSeed` / `handleStackDeck`) was never
implemented — Step 4's visual regression matrix is deferred — so there
are no fixture-endpoint sentinels to verify against today. When the
endpoint lands, add its identifiers to the
`verify-prod-bundle.ts` forbidden-string list.

## §8.4 Tier 1 acceptance

All 8 checks resolved. Tier 1 retheme is complete:
- Zero user-facing references to "Exploding Kittens", "EK", "You Exploded".
- All `EK` references are in code comments documenting rule provenance.
- All `defuse-*` strings are state-machine phase identifiers (Tier 3
  domain language).
- One `console.log` violation found and fixed.
- Production bundle is clean of dev-hook sentinels.

**Recommendation:** flip `docs/PRODUCT-SPECIFICATION.md` §8.4 Tier 1
checkboxes when the spec gets its Phase 5 documentation pass (Step 19).
