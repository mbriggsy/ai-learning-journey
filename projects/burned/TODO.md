# BURNED — TODO

## Current State
- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10).
- **236/236 Vitest, typecheck clean** (verified 2026-04-18, end of session).
- **Three-box blotter is live** — `BlotterContent.tsx` inside the briefing blotter carries piles (left, side-by-side), COMMS stream (right, chronological w/ fade-top mask + hidden-scrollbar auto-scroll), and bottom turn/status strip. Replaces the old AnnouncementFeed + BlotterTicker + board-side StatusBar, all deleted. `formatEvent` lives in `src/client/board/events.ts` for shared import.
- **Ring geometry is blotter-aware** — `getRingRadii` reads live-measured blotter + dossier + `--space-ring-gap` via hidden measurement divs. rx/ry derived from clearance math so dossiers always clear the paper by the gap token at every viewport, any player count. 2-player special case handled (east/west seats skip the `maxCos` arithmetic — otherwise `maxCos=0` collapsed rx to infinity, panels flew off screen). Viewport-edge cap prevents wood-frame clipping. CSS `--size-blotter-width` is `min()`'d against a viewport-based cap so the blotter can never grow past what the ring can clear.
- **Dossier reskin — pinned photos, not floating cards.** Deterministic ±3.5° rotation per-player-id (top-slot muted to avoid clashing with CASE folder tab), brass+red pushpin at top-right with shadow shaft, warm ochre drop shadow that reads on both felt and paper. Active state: brightness 1.14, saturate 1.12, lifted Y-shadow, amber spotlight bloom via `::before`, brighter pin head. Non-active: opacity 0.72, saturate 0.75, brightness 0.92 — eye lands on active player in one blink from TV distance.
- **Phone PlayerAlert toast** — `src/client/player/PlayerAlert.tsx` fires top-edge toast + haptic + SR announce when something happens TO the player. Covers combo-steal hit/whiff for both stealer and target sides, named-steal whiffs (target learns what was guessed), favor-given acknowledgement. Urgent tone = burned-red rule; info tone = ochre rule.
- **Private named-steal projection** — `combo-steal.cardType` included in the event payload on the triples-name path (always) and random-pair path (on hit). Projection strips it for any viewer who isn't the stealer or target. **Intentional divergence from canonical EK** (canonical is public naming) — documented in `docs/rules/RULES-REFERENCE.md` §13.8 with load-bearing comment in `projection.ts` above `stripPrivateEventFields`. Don't "fix" this without a product decision.
- **Hand sort pin-right** — Extraction pinned furthest right (panic lifeline), Intercepted pinned second-rightmost (reactive counter). Lives in `useSortedHand.ts` via `TYPE_PIN_PRIORITY` override. Hand.tsx no longer does its own sort.
- **Intercept countdown label** — `NopeCountdownBar.tsx` reads `INTERCEPT? Ns` on the board. Last EK-labeled copy scrubbed from the board.

## Next Steps (in priority order)

### 1. Per-operative silhouettes (Briggsy's call for next session)
**Goal:** Each player gets a distinct silhouette treatment so 8-player ring reads varied, not repetitive.
**Open question:** per-slot rotation (3 silhouette variants rotated by slot index mod 3) vs per-operative (unique silhouette for each Dash/Vera/Sable/Janet/Otto/Neal/Agent X character). Briggsy decides at kickoff.
**Scope:** generate via Imagen-4 with the established per-character regen scripts pattern (`scripts/regen-<name>.ts`). Budget <$5 total per the `feedback-imagen-budget` playbook — one test image first, align on style, then batch.
**Landing:** swap into `.portrait` background-image in `PlayerRing.module.css`. May need per-operative CSS variant via `data-operative-id` attribute.

### 2. 8-player stress test (Briggsy is scheduling separately)
**Goal:** Live multi-device playtest at 8 players, iPad Pro 1366 + 7 phones. Verifies ring geometry at max count, COMMS scroll under event volume, dossier legibility when shrunk, PlayerAlert traffic.
**Landing gate:** ring geometry math holds (verified in unit tests for N=3,4) but N=8 has slots AT 0° and 180° — re-check empirically that `edge_margin` comfortably clears wood frame.

### 3. Discard fan — show 2–3 previous plays face-up (pre-existing)
**Prescription:**
- Update `DiscardFan.tsx` to accept `discardPile: readonly CardInstance[]` (already in protocol at `src/shared/protocol.ts:88`).
- Render top card centered/straight. Render previous 1–2 cards face-UP at slight rotation (−4°, −7°), offset left by 4px / 8px, z-index behind top, opacity 0.85 / 0.7.
- If <3 cards played, render only what exists.
- No information leak risk — discard is public per protocol.

### 4. Live mid-play state verification (pre-existing)
Playwright script at `tests/e2e/arena-states.spec.ts`: 3-player game, play a card that triggers Nope window, screenshot mid-countdown; play a card that triggers DramaOverlay, screenshot the drama. Scaffold proven previous session.

### 5. Physical hardware verification (pre-existing)
Push commits, deploy to Cloudflare Pages (wrangler), open on actual TV with phone controllers.

### 6. Extend PlayerAlert coverage (optional)
Current alerts cover combo-steal + favor-given. Potential additions:
- **Reassign / Direct Order target:** no direct event type — victim only learns via `turn-started` with `turnsRemaining > 1`. Derivable on phone side.
- **Your card was intercepted:** optimistic snapback + board DramaOverlay already communicate this, but explicit phone toast would remove ambiguity.
Skip until playtest reveals confusion.

### 7. Tier 2 Retheme Cleanup (pre-existing, non-blocking)
- `src/shared/card-defs.ts:27` — `'sable-ashworth'` card type → `'otto-prang'`. Stale character name from a pre-spec iteration. Rename affects the CardType union; grep first for call sites.
- `src/server/game/engine.ts:224` — comment `// EKs excluded` → `// Burned cards excluded`.
- `src/server/game/engine.ts:1051` — error message `'No EK in hand'` → `'No Burned card in hand'`.
- `src/shared/constants.ts:21` — `EK_REVEAL_MS` → `BURNED_REVEAL_MS` (rename across all call sites).
- `src/server/game/engine-phase3.test.ts:226` — comment `// EK moved from hand...` → `// Burned card moved from hand...`.

### 8. Execute Phase 5 — Verification & Acceptance (pre-existing)
**`/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`**

### 9. Engine coverage gaps (pre-existing)
- **G1:** No regression test that `pendingFuture` survives mid-turn if Intel Briefing is played during a non-attack turn.
- **G3:** No explicit test of Attack+Defuse multi-turn continuation (rules §11 worked example). Engine logic at `engine.ts:715–733` is correct per audit, just untested.

### 10. Optional polish follow-ups (not blocking ship)
- **Brass studs on wood frame.** Add via CSS pseudo-elements (small radial-gradient dots at regular intervals on `.woodTop/.woodBottom`).
- **Remove unused `public/assets/arena/mahogany.png`.** Superseded by the 4-edge split.
- **2-player layout Whiskers/Mittens overlap the left CASE banner** at 1366. Banner has same z-index as the ring (both `--z-raised`) so dossier paints over. Low priority since banner is `aria-hidden` set dressing and 2-player is the rarest count.

## Landmines

- **Ring radii are derived, not hardcoded.** `getRingRadii` in `src/client/board/layout/ringLayout.ts` reads live-measured blotter + dossier + ring-gap via hidden measurement divs (`.measurePanel`, `.measureBlotter`, `.measureGap`). If you "simplify" by reverting to a viewport-ratio formula, you'll re-introduce blotter overlap at narrow viewports. The `ResizeObserver` re-reads on every viewport change because the widths are CSS `clamp()` against `100vw`. Do not use `getComputedStyle().getPropertyValue('--var')` on tokens — it returns the raw unresolved clamp string; the measurement div approach is the hash-safe way to get resolved pixels.
- **2-player layout uses east/west seats, not the standard arithmetic.** `calculateRingPositions` has a handcrafted special case for N=2 (angles {0, π}). `getRingRadii` has a matching early-return branch that bypasses `maxCos`/`maxSin` — otherwise the standard arithmetic evaluates `cos(-π/2)=0`, triggers the divide-by-zero guard, and panels fly off screen. If you refactor the ring math, preserve both branches.
- **CSS blotter-width auto-caps to fit the ring.** `--size-blotter-width = min(desired-clamp, viewport-minus-ring-cap)` in `semantic.board.css`. The cap depends on `--size-dossier-width` and `--space-ring-gap` — if you change either, the blotter rescales automatically. Side effect: at very narrow viewports the desired width loses to the cap; this is correct, don't "fix" it.
- **combo-steal.cardType is PRIVATE to stealer + target.** `stripPrivateEventFields` in `src/server/projection.ts` filters it from the public board and every non-party player. This is an intentional divergence from canonical EK — documented in `docs/rules/RULES-REFERENCE.md` §13.8 and tagged in a load-bearing comment above the function. Don't leak it publicly without a product decision.
- **Hand sort lives in `useSortedHand`, not in Hand.tsx.** `TYPE_PIN_PRIORITY` in `src/client/player/hooks/useSortedHand.ts` pins Extraction rightmost (priority 11), Intercepted second-rightmost (priority 10). These override the category bucket. If you add another pinned type, bump priorities carefully so operative/wild/action ordering stays untouched.
- **Pushpin lives at top-right of the dossier** (14×14 absolute px). Manila folder tab is still on the top-left so they don't collide. Both carry player-color identity: tab = player-color, pin = agency-red. Don't move the pin to top-center — that's the folder tab's zone.
- **Intercept button must bypass the outer `disabled` prop.** In `SmartActionBox.tsx`, `buttonDisabled = isIntercept ? optimisticPending : (disabled || optimisticPending)`. The outer `disabled` is driven by `permission.allowed`, which is false during an opponent's turn — correct for normal card actions, but the intercept CTA is exactly the legal non-actor action. Don't re-apply the outer disabled to the intercept branch or the button will gray out and clicks won't fire.
- **`.card[aria-disabled='true']` no longer dims.** The opacity: 0.5 was removed so DiscardFan's top card reads correctly. The only consumer of `disabled={true}` on MinimalCard is DiscardFan; if a future consumer wants dimming, apply it explicitly — don't resurrect the rule.
- **DramaOverlay cqi factors are paired with the min tokens.** Reducing the min without reducing the cqi factor doesn't help on phone (cqi falls below min, min wins, still overflows). Current pairing: hero 9cqi/32px, subdued 6cqi/24px, victory 8cqi/40px.
- **Card illustration uses `object-fit: contain`, not `cover`.** Preserves the full artwork. Reverting to `cover` re-introduces the crop Briggsy specifically flagged (Janet's red-sole Louboutins cropped out).
- **Card asset pipeline preserves native aspect.** `scripts/process-assets.ts` resizes to 384px max with `fit: 'inside'`. It reads from `temp/cards/*.png` for action/utility cards and `public/assets/roster/*.png` for operative portraits.
- **Name on the card title line uses `white-space: nowrap` + `overflow: hidden`.** At 9 chars the names fit the small-card clamp without wrapping. If you add a longer-named card, re-verify on the narrowest hand card container (~115px content box).
- **Player dossiers must NOT map slot → named operative** (pre-existing).
- **Wood frame color unification depends on a CSS filter** (pre-existing).
- **Imagen safety filter is inconsistent** (pre-existing). Retry a failed generation before assuming the prompt is unsafe.
- **Roster regen scripts are per-character.** Run with `set -a && source .env && set +a && npx tsx scripts/regen-<name>.ts`. Output goes to `temp/roster/<name>.png`. Eyeball the temp output before swapping into `public/assets/roster/`.
- **Asset archive convention.** When replacing roster art, move the old file to `public/assets/roster/_archive/<name>-<date>-<tag>.png`. Rejected variants use the suffix `-<reason>-rejected.png`.
- **Playwright MCP session-token sharing** (pre-existing). `localStorage.clear()` between tabs.
- **Wrangler local SQLite corruption** (pre-existing). `taskkill //F //IM workerd.exe && rm -rf .wrangler/state`.
- **Dev launcher race condition** (pre-existing).
- **`.table` box-sizing is load-bearing** (pre-existing).
- **Layout-sweep detector false positives** (pre-existing).
- **E2E button locators are copy-coupled** (pre-existing).
- **Side-panel width capped at 400** (pre-existing). Becomes moot as dossiers take over that real estate.
