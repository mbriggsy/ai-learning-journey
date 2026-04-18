# BURNED — TODO

## Current State
- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10).
- **236/236 Vitest, typecheck clean, build clean** (verified 2026-04-18, build 678ms).
- **Arena "last 20%" quality pass complete** — all seven §1 prescriptions (1a–1g) landed. Static arena composition at 1920×1080 matches the Archer-briefing-room acceptance bar in `PRODUCT-SPECIFICATION.md §2`.
  - Draw pile → classified manila dossier (TOP SECRET label, binder rings, FILE-47B tag, faint Pendleton seal)
  - Discard empty state → dashed manila slot with NO PLAY YET caption + rotated EMPTY stamp
  - Draw count letterpressed into blotter + REMAINING · IN FIELD / LAST PLAYED captions
  - Player dossiers use a generic redacted-operative silhouette (censor bar over eyes) tinted per-player-color via `background-blend-mode: multiply` — **not** a slot→character mapping. Character portraits (Dash/Vera/Otto/Janet/Neal/Agent X) stay in-world for card art and briefing cutaways.
  - Venetian blind rake contrast bumped (amber 22→38%, charcoal 48→62%)
  - Wood frame split into 4 edges with per-edge grain (horizontal top/bottom, vertical left/right); CSS `filter: brightness(0.78) saturate(0.88) hue-rotate(-4deg)` on top/bottom unifies tones
- **Imagen-4 assets in `public/assets/arena/`:** all 6 operative portraits (`portrait-{dash,vera,otto,janet,neal,agent-x}.png`), mahogany horizontal + vertical grain tiles, the legacy mahogany tile (`mahogany.png`, now unused), cream briefing paper (`blotter.png`), CLASSIFIED stamp, and `operative-silhouette.png`.

## Next Steps (in priority order)

### 1. Live mid-play state verification
**Problem:** static screenshots capture only the "case briefing open, first turn" state. 80% of gameplay is mid-play: cards flying into the Arena, NopeCountdownBar countdown, DramaOverlay (BURNED/EXTRACTED/ELIMINATED/WINNER moments), PendingPromptBanner during Defuse/Favor/Target-Select flows.
**Prescription:**
  - Playwright script at `tests/e2e/arena-states.spec.ts`: start 3-player game, play a Surveillance card (triggers Nope window), screenshot mid-countdown.
  - Play a card that triggers DramaOverlay (force a deck-top Burned card via dev tools if needed), screenshot the drama state.
  - Verify the Arena landing-zone shows cards landing correctly on the cream blotter, not floating in void.
  - Verify the ticker populates with multiple events and CRT-flicker + cards-played copy feels Archer.
**Scaffold already proven:** this session orchestrated 3-player joins via Playwright MCP using `player.html?room=...&name=...` + `localStorage.clear()` between tabs to bypass the session-token reuse.

### 2. Physical hardware verification
**Problem:** Playwright screenshots ≠ 65" TV from 10 feet.
**Prescription:** push queued commits, deploy to Cloudflare Pages (wrangler), open on actual TV with phone controllers. Judge from the couch. Document anything that doesn't hold up.

### 3. AnnouncementFeed event-copy pass (pre-existing)
The 2026-04-15 copy sweep only touched `game-started`. Rest of `src/client/board/AnnouncementFeed.tsx` (card-played, card-drawn, burned-drawn, attack-started, favor-played, nope-played, elimination, winner) still uses generic event language. Full Archer-deadpan voice pass needed — same tone as the landed strings ("Briefing over. 3 in the field.").

### 4. Tier 2 Retheme Cleanup (pre-existing, non-blocking)
- `src/shared/card-defs.ts:27` — `'sable-ashworth'` card type → `'otto-prang'`. Stale character name from a pre-spec iteration (product spec §1 canonicalizes Otto, not Sable). Rename affects the CardType union; grep first for call sites.
- `src/server/game/engine.ts:224` — comment `// EKs excluded` → `// Burned cards excluded`.
- `src/server/game/engine.ts:1051` — error message `'No EK in hand'` → `'No Burned card in hand'`.
- `src/shared/constants.ts:21` — `EK_REVEAL_MS` → `BURNED_REVEAL_MS` (rename across all call sites).
- `src/server/game/engine-phase3.test.ts:226` — comment `// EK moved from hand...` → `// Burned card moved from hand...`.

### 5. Execute Phase 5 — Verification & Acceptance (pre-existing)
**`/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`**
No longer blocked. Run the acceptance checklist end-to-end against the new arena + lobby + phone lobby.

### 6. Engine coverage gaps (pre-existing)
- **G1:** No regression test that `pendingFuture` survives mid-turn if Intel Briefing is played during a non-attack turn. Mirror the R2 test without the `turnsRemaining: 2` setup.
- **G3:** No explicit test of Attack+Defuse multi-turn continuation (rules §11 worked example). Engine logic at `engine.ts:715-733` is correct per audit, just untested.

### 7. Optional polish follow-ups (not blocking ship)
- **Brass studs on wood frame.** The legacy `mahogany.png` had decorative brass studs at intervals; the new per-edge tiles don't. If the frame reads flat, add studs via CSS pseudo-elements (small radial-gradient dots at regular intervals on `.woodTop/.woodBottom`) or overlay a separate brass-accent SVG.
- **Remove unused `public/assets/arena/mahogany.png`.** Superseded by the 4-edge split; delete after 1 post-deploy verification to confirm nothing else references it.
- **Player dossier visual variety.** All 10 player slots currently use the same silhouette (censor-bar-over-eyes) with color tint. If the ring reads repetitive with 8–10 players, generate 2 more silhouette variants (3/4-left and 3/4-right poses) and rotate by slot index mod 3.

## Landmines

- **Player dossiers must NOT map slot → named operative.** Early drafts mapped slot 0 → Dash, 1 → Vera, 2 → Otto (portrait-per-slot). This conflates in-world characters with players. Current correct pattern: every dossier uses `/assets/arena/operative-silhouette.png` with `background-blend-mode: multiply` + `background-color: var(--player-color)`. Named character portraits (`portrait-{dash,vera,otto,janet,neal,agent-x}.png`) are reserved for card art and briefing cutaways — never player faces. See `src/client/board/PlayerRing.tsx:15-21`.
- **Wood frame color unification depends on a CSS filter.** Imagen returned the horizontal grain tile noticeably brighter/oranger than the vertical. `src/client/board/GameTable.module.css` applies `filter: brightness(0.78) saturate(0.88) hue-rotate(-4deg)` to `.woodTop, .woodBottom` to bring them into tone with left/right. If the horizontal tile is ever regenerated (with matching warmth this time), reset or retune the filter.
- **Imagen safety filter is inconsistent.** First run of `mahogany-horizontal-v1` returned no image bytes (false-positive safety fire). Retry with a slightly reworded prompt and it passes. If a regen returns 0 bytes, retry — don't assume the prompt is fundamentally unsafe.
- **Asset script filter "mahogany-" matches v1 / v2 / horizontal / vertical.** Use a more specific filter (`mahogany-horizontal-v1`) when you only want the new tiles — otherwise you'll pay to regenerate the originals. Similarly `dossier-` matches all 6 portraits.
- **PlayerRing first-paint jitter fix is load-bearing.** `PlayerRing.tsx` useLayoutEffect reads BOTH `dimensions` and `panelSize` synchronously, and `AnimatePresence` renders conditional on `dimensions.w > 0 && panelSize.w > 0`. If either condition is removed, dossiers flash at origin (0,0) on first paint. Don't revert.
- **GSAP pulse on active player is banned.** GSAP writes to `transform` directly, zeroing Framer Motion's x/y translate and sending the active dossier to (0,0). CSS `[data-active]` + `.stampActive` mount animation is the correct pattern. If you need scale emphasis, use a CSS keyframe on a child element or use Framer Motion's `scale` prop alongside `x`/`y`.
- **Blotter height × ring geometry coupling.** `--size-blotter-height` max (720px at 3840) + `getRingRadii` scale (0.36 for 3-4 players, ry = scale-0.04) are tuned together. If either changes, re-verify that dossiers clear the blotter at all 3 viewports.
- **Side-panel width capped at 400.** Intentional — at 3840 the CASE banner + COMMS ticker would otherwise collide with bottom-L/R dossiers in the ring. If you raise the cap, re-verify bottom player positions.
- **`.table` box-sizing is load-bearing.** `contain: layout style` anchors `position:fixed` children (StatusBar) to `.table`, not the viewport. Without `box-sizing: border-box`, content-box + vertical padding inflates the outer box past 100vh. If any descendant is switched to a container that creates a new fixed-positioning containing block, re-verify.
- **Layout-sweep detector false positives** (pre-existing). `tests/e2e/layout-sweep.spec.ts` flags the draw-pile `.stack::after { inset: -10px }` glow bloom and `.filter: drop-shadow` as "overflow." Intentional decorative bloom, clipped by `.table { overflow: hidden }`. When triaging future sweep output, filter `_pileSection_`, `_stack_`, and the card `_slot_` / `_cardIllustration_` / `_cardName_` findings unless the numbers grow meaningfully.
- **E2E button locators are copy-coupled** (pre-existing). `tests/e2e/helpers.ts:38` matches `button:has-text("Check In")` and `tier1-lifecycle.spec.ts` matches `button:has-text("Cleared Hot")`. Any future copy edit to those CTAs must update both spec files or e2e fails on click timeout, not on assertion.
- **Playwright MCP session-token sharing.** `src/client/connection.ts` persists session tokens in localStorage keyed by room code, which is shared across tabs in a single Playwright MCP browser context. To simulate multiple phones in one browser, `localStorage.clear()` between navigating new phone tabs. This is how this session orchestrated 3-player joins for screenshot verification.
- **Wrangler local SQLite corruption** (pre-existing). `.wrangler/state` can corrupt after hard kills. Fix: `taskkill //F //IM workerd.exe && rm -rf .wrangler/state`. Dev-only.
- **Dev launcher race condition** (pre-existing). Player tabs open 1s after board (was 150ms). If players join before board sends `host-connect`, server rejects with GAME_ALREADY_STARTED.
- **DramaOverlay GSAP cleanup** (pre-existing): timeline created in `processQueue()` never killed on unmount. Phase 5 fix.
