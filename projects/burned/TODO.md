# BURNED — TODO

## Current State

- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10).
- **235/235 Vitest, typecheck clean** (verified 2026-04-18, end of session).
- **Protocol version bumped to 2** — older clients connecting to the new server see `protocolMismatch` and get a warning overlay. Bump driven by the combo-flow refactor (see below).
- **Player ring retired, PlayerStrip is live** — `src/client/board/PlayerStrip.tsx` renders a horizontal nameplate row along the bottom of the board (UMB-vocabulary). Each tile: presence dot + name (7-char cap via `truncate()`) + card-count chip. Active player tile becomes cream paper with ochre top rule and a rotated "ACTIVE" stamp. Tiles auto-size via `clamp()` font scaling so 10-player case fits one row without overflow. Ring math (`layout/ringLayout.ts`, `PlayerRing.*`) DELETED along with the ring-related CSS tokens. Blotter grew into the reclaimed space — see `--pos-blotter-left`, `--pos-blotter-top` in `semantic.board.css`.
- **Combo target picked BEFORE nope window** — `play-card` for a 2-card or 3-card combo now requires `targetPlayerId` up-front (client picks via the `TargetSelect` bottom sheet in local-target mode). Server bundles target into `pendingSteal`; nope window opens with full info on the board so opponents can nope knowing WHO is being hit. Post-nope resolution resolves the random steal (2-card) or opens `name-card-pending` (3-card) immediately — no intermediate `select-target` step. `select-target` action + `steal-target-pending` subphase + `steal-target` PendingPrompt type all REMOVED.
- **TargetSelect has an explicit Cancel button** — used by Favor / Targeted Attack / both combos. Cancel is free (pre-commit): nothing sent to server until a target is locked in.
- **Attack / Targeted Attack stacking formula fixed** — was `turnsRemaining + 2` (off by 1), now `(turnsRemaining - 1) + 2` to match rules §10.2. Fresh DO gives target 2 turns (was 3). Stacked case (e.g. attacker on turn 1 of 2 plays DO) gives target 3 turns (was 4). Two new tests in `engine.test.ts` lock the correct behavior.
- **StealReport classified-dispatch overlay** — `src/client/player/StealReport.tsx` fires a persistent, dismissable, cream-paper dispatch on the victim's phone when a combo steal resolves (hit OR triple-steal guess miss). Queues multiple reports with `+N more` chip. Gated by `useDramaActive()` so a concurrent BURNED → EXTRACTED sequence plays first. Replaces the target-side combo-steal toasts in `PlayerAlert` (which now only fires on the stealer side, where the player is guaranteed to be at the phone).
- **Shared `dramaState`** — `src/client/shared/dramaState.ts`. `DramaOverlay` flips `setDramaActive(true/false)` across its queue; any modal/sheet consumer uses `useDramaActive()` to gate its appearance. Used by server-prompted sheets (Player.tsx `showServerSheet`) and StealReport.
- **COMMS retention** — `gameStore.accumulateEvents` no longer TTL-filters (was 30s). Only the 20-entry cap remains, so slow decision windows (long Defuse placement) don't age prior events out of the feed.
- **Event copy** — all event variants name their operative. "Safe. For now." → "Mittens is safe. For now." "Deck shuffled. Nobody knows anything." → "Mittens shuffles — nobody knows anything."
- **Back Channel description unified** — three places now all begin with "End your turn —": `card-defs.ts` (canonical), `CardDetailSheet.tsx` PLAY_HINTS, `SmartActionBox.tsx` ACTION_TEXT.
- **Phone connection fix** — `attemptAutoJoin` uses a per-tab `initialJoinDoneRef` to avoid dev-launcher tab eviction. First join in a tab with `?name=X` always fresh-joins; reconnects within that tab use the stored session token.
- **Join screen stabilized** — `.waiting` flex row is center-aligned with explicit `line-height` so the empty↔"..." rotation on `.waitingDots::after` doesn't shift the baseline.

## Next Steps (in priority order)

### 1. Real-device playtest of the new combo + StealReport flow
**Goal:** Live multi-device playtest at 4-8 players, iPad Pro 1366 + phones. Verify:
- Combo target picker opens before nope window (nope window on board shows target name to opponents).
- Cancel in TargetSelect cleanly returns cards to hand.
- StealReport lands on victim phone with no overlap against BURNED → EXTRACTED overlays.
- Attack / Direct Order stacking feels correct (target gets 2 fresh, 3 when stacking).
- PlayerStrip 10-player case reads cleanly on real TV.

### 2. 8-player stress test
**Goal:** Verify PlayerStrip layout at max count on real TV, COMMS scroll under event volume, nameplate legibility from couch distance.
**Landing gate:** at 1366×1024, strip math leaves ~34px headroom with all 10 tiles; verify at 1920 and 4K that tiles grow proportionally.

### 3. Discard fan — show 2–3 previous plays face-up
**Prescription:**
- Update `DiscardFan.tsx` to accept `discardPile: readonly CardInstance[]` (already in protocol at `src/shared/protocol.ts:88`).
- Render top card centered/straight. Render previous 1–2 cards face-UP at slight rotation (−4°, −7°), offset left by 4px / 8px, z-index behind top, opacity 0.85 / 0.7.
- If <3 cards played, render only what exists.
- No information leak risk — discard is public per protocol.

### 4. Blotter content layout polish
**Goal:** Maximized blotter exposed new empty space in the piles column. Pile lockup now sits high-left with unused cream above/below. Options: (a) vertically center the pile lockup, (b) scale the pile visual up, (c) add decorative classified chrome (memo pad, paperclip, etc.) to fill the unused area.
**Landing:** Briggsy's call at kickoff which direction feels right.

### 5. Live mid-play state verification (pre-existing)
Playwright script at `tests/e2e/arena-states.spec.ts`: 3-player game, play a card that triggers Nope window, screenshot mid-countdown; play a card that triggers DramaOverlay, screenshot the drama.

### 6. Physical hardware verification (pre-existing)
Push commits, deploy to Cloudflare Pages (wrangler), open on actual TV with phone controllers.

### 7. Extend PlayerAlert coverage (optional)
Potential additions:
- **Reassign / Direct Order target** — no direct event type; victim only learns via `turn-started` with `turnsRemaining > 1`. If Johnny-scenario applies (victim away when attack lands), promote this to StealReport-style persistent overlay. Probably fine as-is because the target's phone sits dormant — when they come back, staging is lit and status reads "Your turn · 3 turns".
- **Your card was intercepted** — optimistic snapback + board DramaOverlay already communicate this, but explicit phone toast would remove ambiguity. Skip until playtest reveals confusion.

### 8. Tier 2 retheme cleanup (pre-existing, non-blocking)
- `src/shared/card-defs.ts:27` — `'sable-ashworth'` card type → `'otto-prang'`. Stale character name from a pre-spec iteration. Rename affects the CardType union; grep first for call sites.
- `src/server/game/engine.ts` — any remaining `// EKs` / `'No EK in hand'` strings → Burned vocabulary.
- `src/shared/constants.ts:21` — `EK_REVEAL_MS` → `BURNED_REVEAL_MS` (rename across all call sites).

### 9. Execute Phase 5 — Verification & Acceptance (pre-existing)
**`/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`**

### 10. Engine coverage gaps (pre-existing)
- **G1:** No regression test that `pendingFuture` survives mid-turn if Intel Briefing is played during a non-attack turn.
- **G3:** No explicit test of Attack+Defuse multi-turn continuation (rules §11 worked example). Engine logic at `engine.ts:715–733` is correct per audit, just untested.

### 11. Optional polish follow-ups
- **Brass studs on wood frame.** Add via CSS pseudo-elements (small radial-gradient dots at regular intervals on `.woodTop/.woodBottom`).
- **Remove unused `public/assets/arena/mahogany.png`.** Superseded by the 4-edge split.
- **Blotter piles lockup** — see priority 4.

## Landmines

### New this session

- **Combo flow bundles target with `play-card`.** `select-target` action, `steal-target-pending` subphase, and `steal-target` PendingPrompt type are GONE. Do not reintroduce without a product decision — the new flow exists specifically so the nope window opens with the target name visible to opponents (rules §10.2 / real-world EK: "I play two beards on Dash"). Engine: `handleCombo` in `src/server/game/engine.ts` validates target up-front; `applyPostNope` branches on `pendingSteal.targetPlayerId` to resolve directly (2-card) or open name-card prompt (3-card).
- **Attack / TargetedAttack formula.** `(turnsRemaining - 1) + 2`, NOT `turnsRemaining + 2`. The current turn is consumed by the turn-ending card itself per rules §10.2. Two tests in `engine.test.ts` lock the stacking case. Don't "simplify" back to the naive formula or Attack stacking over-counts.
- **PlayerStrip tile sizing is font-driven.** Tiles auto-size; explicit `clamp(12px → 18px)` on the name font across 1280→3840 viewports ensures 10-player case fits one row. Do NOT add `min-width` on `.tile` — 10 tiles × 120px min would overflow the viewport and force ellipsis on 7-char names.
- **Strip max-width excludes side panels.** Strip spans `100vw - 2 * frame - 16px`. CASE banner is vertical-centered and its content doesn't reach the strip's y-position, so side-panel constraint is intentionally NOT subtracted. If you add a second vertical-full-height element (e.g. a right-side COMMS panel), re-check strip math.
- **`projectForBoard` requires `connectedPlayerIds: Set<string>`.** Room.ts uses `getConnectedPlayerIds()` helper; tests pass `new Set()`. If you add a new call site, thread the set through.
- **PROTOCOL_VERSION = 2.** Bumped from 1 for the combo-flow change. `gameStore` emits `protocolMismatch` on version skew; overlay in Player.tsx warns the user. If you change the protocol again, bump to 3 and update `gameStore.test.ts`.
- **`--size-blotter-width` is a direct calc.** No clamp, no ring-aware min(). The blotter maximizes into the space the dossier ring used to occupy. If you reintroduce elements that orbit the blotter, you need a new min() cap.
- **`attemptAutoJoin` distinguishes first-join vs reconnect.** Per-tab `initialJoinDoneRef` in Player.tsx: first connection uses `?name=` for fresh-join; reconnects within the same tab use the stored token. localStorage is shared across tabs on the same origin, so a "prefer token always" strategy makes dev-launcher tabs evict each other via `SESSION_REPLACED`. Don't revert.
- **`useDramaActive()` is the modal gate.** Any sheet / overlay that could cover a BURNED → EXTRACTED sequence must gate on it. Server-prompted sheets in Player.tsx gate via `showServerSheet`. StealReport gates internally. If you add a new modal, follow the pattern.
- **StealReport queue is local React state.** Multiple combo-steals while a player is away all queue up with `+N more` chip; dismissing pops one. Don't reset the queue on state-update or Johnny loses his dispatches.
- **`window.__gameStore` dev hook** (`gameStore.ts`). Guarded by `import.meta.env.DEV` / test mode. Lets Playwright inject events to verify overlays. Safe to keep; tree-shaken from prod.
- **PlayerAlert no longer handles target-side combo-steal.** StealReport owns that surface. PlayerAlert is strictly for events happening to you while you're AT the phone (stealer-side steal outcomes, favor-given acknowledgement).
- **Event copy rule:** every event variant in `src/client/board/events.ts` names its operative. No orphan messages like "Safe. For now." Audit before adding new variants.

### Pre-existing

- **combo-steal.cardType is PRIVATE to stealer + target.** `stripPrivateEventFields` in `src/server/projection.ts` filters it from the public board and every non-party player. Intentional divergence from canonical EK — documented in `docs/rules/RULES-REFERENCE.md` §13.8 and tagged in a load-bearing comment above the function. Don't leak it publicly without a product decision.
- **Hand sort lives in `useSortedHand`, not in Hand.tsx.** `TYPE_PIN_PRIORITY` in `src/client/player/hooks/useSortedHand.ts` pins Extraction rightmost (priority 11), Intercepted second-rightmost (priority 10). These override the category bucket. If you add another pinned type, bump priorities carefully.
- **Intercept button must bypass the outer `disabled` prop.** In `SmartActionBox.tsx`, `buttonDisabled = isIntercept ? optimisticPending : (disabled || optimisticPending)`. The outer `disabled` is driven by `permission.allowed`, which is false during an opponent's turn — correct for normal card actions, but the intercept CTA is exactly the legal non-actor action. Don't re-apply the outer disabled to the intercept branch.
- **`.card[aria-disabled='true']` no longer dims.** The opacity: 0.5 was removed so DiscardFan's top card reads correctly. Only consumer of `disabled={true}` on MinimalCard is DiscardFan; if a future consumer wants dimming, apply it explicitly.
- **DramaOverlay cqi factors are paired with the min tokens.** Reducing the min without reducing the cqi factor doesn't help on phone (cqi falls below min, min wins, overflow). Current pairing: hero 9cqi/32px, subdued 6cqi/24px, victory 8cqi/40px.
- **Card illustration uses `object-fit: contain`, not `cover`.** Reverting re-introduces the Louboutins crop Briggsy flagged.
- **Card asset pipeline preserves native aspect.** `scripts/process-assets.ts` resizes to 384px max with `fit: 'inside'`. Reads from `temp/cards/*.png` for action/utility cards and `public/assets/roster/*.png` for operative portraits.
- **Name on card title line uses `white-space: nowrap` + `overflow: hidden`.** At 9 chars the names fit the small-card clamp without wrapping. Longer names need re-verification at ~115px content box.
- **Imagen safety filter is inconsistent.** Retry a failed generation before assuming the prompt is unsafe.
- **Roster regen scripts are per-character.** `set -a && source .env && set +a && npx tsx scripts/regen-<name>.ts`. Output goes to `temp/roster/<name>.png`. Eyeball before swapping into `public/assets/roster/`.
- **Asset archive convention.** Replace: move old to `public/assets/roster/_archive/<name>-<date>-<tag>.png`. Rejected variants suffix `-<reason>-rejected.png`.
- **Playwright MCP session-token sharing.** Tabs share localStorage; `localStorage.clear()` between tabs or use the per-tab `initialJoinDoneRef` path that's already in place.
- **Wrangler local SQLite corruption.** `taskkill //F //IM workerd.exe && rm -rf .wrangler/state` if DO state misbehaves.
- **Dev launcher race condition.** The launcher opens player tabs via `window.open` in a tight loop; browser may throttle popups. User gesture must remain active (don't `setTimeout`).
- **`.table` box-sizing is load-bearing.** `height: 100vh; box-sizing: border-box` on `.table` is required so the fixed-position status bar anchors to the visible viewport edge.
- **Layout-sweep detector false positives.** Test suite's layout sweep sometimes flags legitimate CSS clamps.
- **E2E button locators are copy-coupled.** `gh pr create`, `pnpm dev` etc. locators in Playwright specs break when button text changes.
