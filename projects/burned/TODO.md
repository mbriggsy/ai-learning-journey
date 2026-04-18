# BURNED — TODO

## Current State
- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10).
- **236/236 Vitest, typecheck clean, build clean** (verified 2026-04-17).
- **Phone bundle: 94.7 KB gzipped initial** — unchanged after arena redesign (no phone files touched).
- **Arena briefing-room redesign landed in 3 commits** (2026-04-17, ahead of origin):
  - `e306fb88` — Phase A+B: mahogany wood frame, horizontal venetian-blind shadow rake, cream dossier blotter, operative-file nameplates
  - `50d7a171` — Phase C: left CASE banner with CLASSIFIED stamp + right COMMS · INTERCEPTED teletype ticker; AnnouncementFeed relocated from top strip
  - `3f96c515` — Phase E: ambient motion (blind-drift sun crawl, CRT-flicker on newest ticker entry, ACTIVE rubber-stamp slam on turn transition)
- **Imagen-4 assets generated** in `public/assets/arena/`: mahogany plank tile, cream briefing paper, CLASSIFIED stamp, Dash/Vera/Otto portraits.
- **Three viewports verified static** (1280×720, 1920×1080, 3840×2160) — screenshots in `temp/verification-*.png`.

## Next Steps (in priority order)

### 1. Arena "last 20%" — close the gap to webby-award quality
Current arena composition holds but has seven specific polish items that separate "good" from "water beads off it." Prescriptions below. Files: mostly `src/client/board/*.tsx` + `*.module.css` and `src/client/shared/tokens/*`.

#### 1a. Draw-pile card back — redesign as classified dossier file
**File:** `src/client/board/DrawPile.module.css`
**Problem:** current `.topCard` is a teal card with a red-diamond reticle + double cordovan borders. On cream paper blotter it reads as "different app's card."
**Prescription:** replace the SVG data-URI in `.topCard`'s `background-image` (lines 73-75) with a manila-dossier treatment:
  - `background-color: var(--color-paper-face)` (cream, not teal-2)
  - Two horizontal "classified stripe" bars at 15% + 85% height, `--color-accent-burned`, 4px tall
  - Centered Pendleton Agency seal SVG (reticle + diamond) in `--color-accent-drama` at 25% opacity
  - "TOP SECRET" label in JetBrains Mono, 10px, tracked 0.28em, `--color-accent-burned`, top-center just below the upper stripe
  - Hole-punch binder rings: two small filled circles at top-left and top-right, `--color-charcoal-1`, 6px radius
  - Bottom-right corner: `FILE-47B` in 8px mono
Keep `.topCard::before` and `::after` (double inner frames — they sell the dossier cover).
**Verify:** screenshot at 1920, card should read as a manila file card not a deck card.

#### 1b. Empty-discard placeholder
**File:** `src/client/board/DiscardFan.tsx` (~line 25, the empty state) + `DiscardFan.module.css` `.empty` class
**Problem:** when no cards have been played, the discard slot shows a literal em-dash character.
**Prescription:** replace `.empty` content with a ghost manila-folder silhouette:
  - Dashed rectangular outline, 2px dashed `--color-ochre-6` at 35% opacity, 2px border-radius
  - Inner text "NO PLAY YET" in JetBrains Mono 10px tracked 0.3em, `--color-ochre-5`
  - Small rotated "EMPTY" stamp overlay at 15% opacity, -8deg
  - Size: match `--size-discard-card-width`
**Verify:** screenshot at 1920 before first card played.

#### 1c. Draw count + discard label typography
**File:** `src/client/board/DrawPile.module.css` `.countBadge` + `src/client/board/GameTable.module.css` `.pileLabel`
**Problem:** `.countBadge` renders "22" in cream Clash Display — washed out on cream blotter. `.pileLabel` ("DRAW" / "DISCARD") is dark mahogany but feels light.
**Prescription:**
  - `.countBadge`: change `color` from `cream-12` to dark mahogany `color-mix(in oklab, var(--color-ochre-3) 92%, var(--color-charcoal-1))`. Add letterpress feel via `text-shadow: 0 1px 0 color-mix(in oklab, var(--color-cream-12) 60%, transparent), 0 -1px 0 color-mix(in oklab, var(--color-charcoal-1) 30%, transparent)` (emboss).
  - Add a small caption under "DRAW" and "DISCARD" in `GameTable.tsx`: "REMAINING · IN FIELD" for draw, "LAST PLAYED" for discard, in JetBrains Mono 10px tracked 0.28em, color `color-mix(in oklab, var(--color-ochre-4) 60%, transparent)`.
**Verify:** the "22" should feel stamped into the paper, not laid on top.

#### 1d. Wire Imagen portraits into dossier pane
**File:** `src/client/board/PlayerRing.tsx` (the `.portrait` block, lines ~132-140) + `PlayerRing.module.css` `.portrait`
**Problem:** portraits were generated (Dash/Vera/Otto in `public/assets/arena/portrait-*.png`) but unused. Current portrait pane shows only a CVD-safe shape icon.
**Prescription:** 
  - Map player slot index → portrait filename: slot 0 → `portrait-dash.png`, 1 → `portrait-vera.png`, 2 → `portrait-otto.png`. Slots 3-5 need Janet/Neal/Agent X generation first (see 1g).
  - Render portrait as `background-image` on `.portrait` at `cover` sizing. Keep the redacted bar `.portrait::after`, keep the `portraitLabel` at bottom.
  - Move the CVD-safe clearance shape (`.clearanceIcon`) to a small top-right corner badge (20px) so it still serves as shape-based identification, but the portrait is the hero.
  - Add "PHOTO ATTACHED" corner tabs: two small angled paper-clip SVG tabs at top corners.
**Verify:** Dash's portrait (generated spy-silhouette with blue star background) fills the portrait pane; clearance star badge is top-right corner; name/status data column unchanged.

#### 1e. Venetian blind rake — more contrast
**File:** `src/client/board/GameTable.module.css` `.blindRakeLeft/.blindRakeRight`
**Problem:** rake is too muted; bumping mix-blend to overlay helped but amber bar alpha is still too low.
**Prescription:** in the `repeating-linear-gradient` for `.blindRake*`, bump the amber stripe from 22% to 38% alpha, and the charcoal stripe from 48% to 62%. Keep the 4deg rake angle. Keep opacity 0.8 and mix-blend-mode: overlay.
**Verify:** at 1920, the lateral bands should have clearly visible bright amber bars + deep shadow bars — Mother's-office signature energy.

#### 1f. Wood frame corner grain discontinuity
**File:** `src/client/board/GameTable.module.css` `.woodFrame`
**Problem:** `border-image: url('/assets/arena/mahogany.png')` uses one tile for all four edges, so the wood grain direction breaks at corners (grain is horizontal on top/bottom, vertical on left/right).
**Prescription (choose one):**
  - **Option A (simpler):** replace PNG border-image with an inline SVG that draws solid mahogany fill + programmatic grain lines oriented per-edge. Use 4 `box-shadow: inset` strokes + repeating-linear-gradients for grain per edge.
  - **Option B (nicer):** generate two more Imagen assets with Briefing-Asset script — `mahogany-tile-horizontal.png` and `mahogany-tile-vertical.png`. Use `border-image-source: url(...)` with different slices per edge via a multi-layer approach, or split `.woodFrame` into four sub-divs (`.woodTop`, `.woodBottom`, `.woodLeft`, `.woodRight`), each with its own `background-image`.
**Verify:** grain should flow continuously around corners (for A) or correctly reorient per-edge (for B).

#### 1g. Generate missing portraits + banner assets
**File:** `scripts/generate-briefing-assets.ts`
**Prescription:** add targets for:
  - `dossier-janet-portrait` (per spec §1 "mid-century spy outfit staffed by brilliant disasters" + character notes in memory)
  - `dossier-neal-portrait`
  - `dossier-agent-x-portrait`
  - `mahogany-tile-horizontal` (explicit horizontal grain)
  - `mahogany-tile-vertical` (explicit vertical grain)
Run: `set -a && source .env && set +a && npx tsx scripts/generate-briefing-assets.ts`. Copy generated PNGs into `public/assets/arena/`.

### 2. Live mid-play state verification
**Problem:** current screenshots captured only the "waiting to start" state. 80% of gameplay is mid-play: cards flying into the Arena, NopeCountdownBar countdown, DramaOverlay (BURNED/EXTRACTED/ELIMINATED/WINNER moments), PendingPromptBanner during Defuse/Favor/Target-Select flows.
**Prescription:** 
  - Playwright script: start a 3-player game, play a Surveillance card (triggers Nope window), take a screenshot mid-countdown.
  - Play a card that triggers a DramaOverlay (force a deck-top Burned card via dev tools if needed), screenshot the drama state.
  - Verify the Arena landing-zone shows cards landing correctly on the cream blotter, not floating in void.
  - Verify the ticker populates with multiple events and the CRT-flicker + cards-played copy feels Archer.
**Files:** new `tests/e2e/arena-states.spec.ts` or an interactive Playwright session.

### 3. Physical hardware verification
**Problem:** Playwright screenshots ≠ 65" TV from 10 feet.
**Prescription:** push the 3 queued commits to origin, deploy to Cloudflare Pages (wrangler), open on actual TV with phone controllers. Judge from the couch. Document anything that doesn't hold up.

### 4. AnnouncementFeed event-copy pass (pre-existing)
The 2026-04-15 copy sweep only touched `game-started`. Rest of `src/client/board/AnnouncementFeed.tsx` (card-played, card-drawn, burned-drawn, attack-started, favor-played, nope-played, elimination, winner) still uses generic event language. Full Archer-deadpan voice pass needed — same tone as the landed strings ("Briefing over. 3 in the field.").

### 5. Tier 2 Retheme Cleanup (pre-existing, non-blocking)
- `src/server/game/engine.ts:224` — comment `// EKs excluded` → `// Burned cards excluded`.
- `src/server/game/engine.ts:1051` — error message `'No EK in hand'` → `'No Burned card in hand'`.
- `src/shared/constants.ts:21` — `EK_REVEAL_MS` → `BURNED_REVEAL_MS` (rename across all call sites — grep first).
- `src/server/game/engine-phase3.test.ts:226` — comment `// EK moved from hand...` → `// Burned card moved from hand...`.

### 6. Execute Phase 5 — Verification & Acceptance (pre-existing)
**`/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`**
No longer blocked. Run the acceptance checklist end-to-end against the new arena + lobby + phone lobby.

### 7. Engine coverage gaps (pre-existing)
- **G1:** No regression test that `pendingFuture` survives mid-turn if Intel Briefing is played during a non-attack turn. Mirror the R2 test without the `turnsRemaining: 2` setup.
- **G3:** No explicit test of Attack+Defuse multi-turn continuation (rules §11 worked example). Engine logic at `engine.ts:715-733` is correct per audit, just untested.

## Landmines

- **PlayerRing first-paint jitter fix is load-bearing.** `PlayerRing.tsx` useLayoutEffect now reads BOTH `dimensions` and `panelSize` synchronously, and the `AnimatePresence` renders conditional on `dimensions.w > 0 && panelSize.w > 0`. If either condition is removed, dossiers will flash at origin (0,0) on first paint and only stabilize on the next ResizeObserver callback. Don't revert.
- **GSAP pulse on active player is banned.** Original code had `gsap.fromTo(activeEl, {scale: 1.12, ...})` on turn change. GSAP writes to `transform` directly, zeroing Framer Motion's x/y translate and sending the active dossier to (0,0). CSS `[data-active]` + `.stampActive` mount animation is the correct pattern. If you need scale emphasis, use a CSS keyframe on a child element or use Framer Motion's `scale` prop alongside `x`/`y`.
- **Blotter height × ring geometry coupling.** `--size-blotter-height` max (720px at 3840) + `getRingRadii` scale (0.36 for 3-4 players, ry = scale-0.04) are tuned together. If either changes, re-verify that dossiers clear the blotter at all 3 viewports.
- **Side-panel width capped at 400.** Intentional — at 3840 the CASE banner + COMMS ticker would otherwise collide with bottom-L/R dossiers in the ring. If you raise the cap, re-verify bottom player positions.
- **Mahogany corner grain breaks.** See 1f. Not broken, just not polished — single tile rotated across 4 edges.
- **`.table` box-sizing is load-bearing.** `contain: layout style` anchors `position:fixed` children (StatusBar) to `.table`, not the viewport. Without `box-sizing: border-box`, content-box + vertical padding inflates the outer box past 100vh, pushing the fixed StatusBar below the fold. If any descendant is switched to a container that creates a new fixed-positioning containing block, re-verify.
- **Layout-sweep detector false positives** (pre-existing). `tests/e2e/layout-sweep.spec.ts` flags the draw-pile `.stack::after { inset: -10px }` glow bloom and `.filter: drop-shadow` as "overflow." These are intentional decorative bloom clipped by `.table { overflow: hidden }`. When triaging future sweep output, filter `_pileSection_`, `_stack_`, and the card `_slot_` / `_cardIllustration_` / `_cardName_` findings (horizontal-scroll containers) unless the numbers grow meaningfully.
- **E2E button locators are copy-coupled** (pre-existing). `tests/e2e/helpers.ts:38` matches `button:has-text("Check In")` and `tier1-lifecycle.spec.ts` matches `button:has-text("Cleared Hot")`. Any future copy edit to those CTAs must update both spec files or e2e will fail on click timeout, not on assertion.
- **Wrangler local SQLite corruption** (pre-existing). `.wrangler/state` can corrupt after hard kills. Fix: `taskkill //F //IM workerd.exe && rm -rf .wrangler/state`. Dev-only.
- **Dev launcher race condition** (pre-existing). Player tabs open 1s after board (was 150ms). If players join before board sends `host-connect`, server rejects with GAME_ALREADY_STARTED.
- **DramaOverlay GSAP cleanup** (pre-existing): timeline created in `processQueue()` never killed on unmount. Phase 5 fix.
