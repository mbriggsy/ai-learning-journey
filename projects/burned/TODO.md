# BURNED — TODO

## Current State
- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10). Spec itself is frozen; only §8 Acceptance Criteria checkboxes get updated as work lands.
- **234/234 tests, typecheck clean** (verified 2026-04-12).
- **Game is functional** — staging, hand, board, all card types, nope chains, elimination all working.
- **CSS Foundation Rebuild — Phase 1 + Phase 2 + Phase 3 COMPLETE.** Phone + board views fully migrated to token system.
- **Phone bundle: ~97.5 KB gzipped** (under 100KB budget, ~2.5KB headroom).

## CSS Foundation Rebuild Progress

| Phase | Status | Commit |
|---|---|---|
| Phase 1 — Token System Foundation | ✅ COMPLETE | `6f52c02d` |
| Phase 2 — Phone View Migration | ✅ COMPLETE | `421cb10c` (8 commits total) |
| Phase 3 — Board View Migration | ✅ COMPLETE | `dd1280c0` (6 commits total) |
| Phase 4 — Motion Consolidation | ✅ COMPLETE | `35dd5c2c` (15 commits total) |
| Phase 5 — Verification & Acceptance | DEEPENED | Awaiting execution after Phase 4 |

## Next Steps (in priority order)

### 1. Execute Phase 5 — Verification & Acceptance

**`/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`**

Phase 5 is the final verification pass: visual regression review, reduced-motion audit, bundle size confirmation, and Archer acceptance test.

**Prerequisites (all met):**
- Phase 1 token system in place ✅
- Phase 2 phone migration complete ✅
- Phase 3 board migration complete ✅
- Phase 4 motion consolidation complete ✅

### 2. Tier 2 Retheme Cleanup (non-blocking, can batch with any phase)
- `src/server/game/engine.ts` — 11 "EK" → "Burned" comment renames
- `src/shared/constants.ts:21-23` — `EK_REVEAL_MS` → `BURNED_REVEAL_MS` (+ 2 more), coordinated rename across all call sites
- `src/server/game/engine.ts:1040` — error message `'No EK in hand'` → `'No Burned card in hand'`
- `src/client/board/Arena.tsx:7` — comment `"EK reveal"` → `"Burned reveal"`

### 3. Pending Decisions (visual review gates)
- **Baveuse font evaluation** — during Phase 3 or later visual review. One-line token swap if Clash Display fails the Archer test.
- **GameOver winner glow hue** — `--color-accent-drama` (ochre) vs `--color-accent-intercept` (emerald). Gate: Phase 5 visual review.
- **NopeCountdownBar emerald saturation** — emerald-9 vs -8/-10. Gate: Phase 5 CVD CI check.
- **`--radius-input` / `--radius-button`** (4px) — if too sharp vs Dreamland stills, amend Phase 1's semantic alias.
