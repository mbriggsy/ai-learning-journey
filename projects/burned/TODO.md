# BURNED — TODO

## Current State
- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10).
- **236/236 Vitest, typecheck clean, build clean** (verified 2026-04-15).
- **E2E: 10/10** on chromium + Mobile Chrome (verified 2026-04-15).
- **Phone bundle: ~94.7 KB gzipped initial** (player entry 11.98 + shared config 71.20 + VisualElement 11.52). Under 100 KB budget, ~5.3 KB headroom.
- **All engine correctness fixes landed** (R1 Nope-window guard, R2 pendingFuture clear, R3 self-target allowed) with regression tests.
- **All layout bugs killed** (L1 turn-indicator clip, L2 lobby overflow, L3/L4 arena overflow — L1+L4 one root cause: `.table` missing `box-sizing: border-box`).
- **Classified-dossier design pass complete for board lobby + phone lobby**: Pendleton Agency wordmark/button/QR/operative-card treatment + full Archer-deadpan copy sweep. Both surfaces now pass the §2 Archer-frame binary test.

## Next Steps (in priority order)

### 1. Arena table composition — dead bands L+R of draw pile
Design agent flagged this as the top remaining composition miss on the arena. Current layout: 3 player nameplates (Dash top, Otto bottom-left, Vera bottom-right) around a small centered draw-pile column, leaving two large empty teal bands flanking the center vertical strip. Reads as "three postcards around a prop," not a shared table surface.

**Approach options:**
- Inlaid table graphic plate behind the nameplates (dossier-folder vocabulary)
- Tighter horizontal collapse of the nameplates toward center
- Agency-branded side panels (classified stamps, "ISIS"-style briefing strips)

**Files:** `src/client/board/GameTable.module.css`, `src/client/board/PlayerRing.*`, `src/client/board/Arena.tsx`.

### 2. AnnouncementFeed event-copy pass
The 2026-04-15 copy sweep only touched `game-started`. The rest of `src/client/board/AnnouncementFeed.tsx` (card-played, card-drawn, burned-drawn, attack-started, favor-played, nope-played, elimination, winner, etc.) still uses generic event language. Full Archer-deadpan voice pass needed — same tone as the landed strings ("X is on deck", "Briefing over", "Stand by, operative").

### 3. Tier 2 Retheme Cleanup (non-blocking, still outstanding)
- `src/server/game/engine.ts:224` — comment `// EKs excluded` → `// Burned cards excluded`.
- `src/server/game/engine.ts:1051` — error message `'No EK in hand'` → `'No Burned card in hand'`.
- `src/shared/constants.ts:21` — `EK_REVEAL_MS` → `BURNED_REVEAL_MS` (rename across all call sites — grep first).
- `src/server/game/engine-phase3.test.ts:226` — comment `// EK moved from hand...` → `// Burned card moved from hand...`.

### 4. Execute Phase 5 — Verification & Acceptance
**`/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`**

No longer blocked (P0 phone layout + SmartActionBox anchor both shipped). Run the acceptance checklist end-to-end; the wordmark/button/phone-lobby work this session lands partial credit on §8 but the full gate needs the formal pass.

### 5. Engine coverage gaps (rules audit residue)
- **G1:** No regression test that `pendingFuture` survives mid-turn if Intel Briefing is played during a non-attack turn (R2 covered the Attack case). Trivial addition — mirror the R2 test without the `turnsRemaining: 2` setup.
- **G3:** No explicit test of Attack+Defuse multi-turn continuation (rules §11 worked example). Engine logic at `engine.ts:715-733` is correct per audit, just untested as a scenario.

### 6. Pending Visual Decisions (design review gates)
- **Baveuse font evaluation** — one-line token swap if Clash Display fails the Archer test on any specific surface. The classified-dossier pass showed Clash Display 900 works well; skip unless a surface demands it.
- **GameOver winner glow hue** — `--color-accent-drama` (ochre) vs `--color-accent-intercept` (emerald).
- **NopeCountdownBar emerald saturation** — emerald-9 vs -8/-10.
- **`--radius-input` / `--radius-button`** (4px) — the new stamp-vocabulary used 2px on the START button and 3px on dossier panels; this may be load-bearing for Archer feel. Reconcile with the input/generic-button radius tokens before rolling vocabulary into other components.

## Landmines
- **`.table` box-sizing is load-bearing.** `contain: layout style` anchors `position:fixed` children (StatusBar) to `.table`, not the viewport. Without `box-sizing: border-box`, content-box + vertical padding inflates the outer box past 100vh, pushing the fixed StatusBar below the fold. If any descendant is switched to a container that creates a new fixed-positioning containing block, re-verify.
- **Layout-sweep detector false positives.** `tests/e2e/layout-sweep.spec.ts` flags the draw-pile `.stack::after { inset: -10px }` glow bloom and `.filter: drop-shadow` as "overflow." These are intentional decorative bloom clipped by `.table { overflow: hidden }`. When triaging future sweep output, filter `_pileSection_`, `_stack_`, and the card `_slot_` / `_cardIllustration_` / `_cardName_` findings (horizontal-scroll containers) unless the numbers grow meaningfully.
- **E2E button locators are copy-coupled.** `tests/e2e/helpers.ts:38` matches `button:has-text("Check In")` and `tier1-lifecycle.spec.ts` matches `button:has-text("Cleared Hot")`. Any future copy edit to those CTAs must update both spec files or e2e will fail on click timeout, not on assertion.
- **Wrangler local SQLite corruption** — `.wrangler/state` can corrupt after hard kills. Fix: `taskkill //F //IM workerd.exe && rm -rf .wrangler/state`. Dev-only.
- **Dev launcher race condition** — player tabs open 1s after board (was 150ms). If players join before board sends `host-connect`, server rejects with GAME_ALREADY_STARTED.
- **DramaOverlay GSAP cleanup** — pre-existing: timeline created in `processQueue()` never killed on unmount. Phase 5 fix.
