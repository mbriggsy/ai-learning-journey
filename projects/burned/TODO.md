# BURNED — TODO

## Current State

- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10).
- **358/358 Vitest, typecheck clean** (verified 2026-04-19, end of session). Coverage expanded with `deck-composition-exhaustive.test.ts` (parameterized 2-10 players against `docs/rules/RULES-REFERENCE.md` §3) and `rules-gaps-exhaustive.test.ts` (plugs §11 Attack+Defuse continuation, §6 Intel Briefing mid-turn, §9 triple-Nope, §7 combo overrides, §10.3 Back Channel under Attack, §6 empty-hand Favor, §9 Burned/Extraction not Nopeable, §5 multi-play per turn, §12 dead-card disposal).
- **Protocol version 2** — unchanged this session.
- **Triple-steal flow is deferred-commit.** 3-of-a-kind play stages cards in the stealer's hand; cancel returns them untouched. Name-commit discards the cards AND opens the nope window (carrying stealer+target+namedCardType), so defenders Nope with full context. Matches tabletop semantics where the named card is public before Nope. Engine: `handleCombo` skips discard/nope for comboSize===3; `handleNameCard` commits and opens the window; `handleNopeWindowExpired` has a named-steal resolution branch that runs BEFORE the legacy `pendingSteal` branch.
- **Cancel button on NameCard sheet.** "Call off the raid" — pre-commit only (rejected post-name because the play is already public and the nope window is live).
- **Favor-target uses hand + staging, not a sheet.** `FavorResponse.tsx` deleted. When targeted, the phone shows a pinned `Vera demands a card` banner; the hand stays live (permission carve-out in `useInteractionPermission.ts`); staging caps at 1 (auto-swap on second tap); SmartActionBox shows a `Surrender this card → Vera` confirm. One less modal, consistent grammar with normal play.
- **All server prompt-timeouts removed.** Party-game policy: game waits for you. Favor / future-rearrange / defuse / name-card have no auto-resolve timer. Only the Nope window timer remains (it bounds a reactive window, not a decision window). Removed: `PROMPT_TIMEOUT_MS`, `updatePromptTimer`, `handlePromptTimeout`, the `prompt-timeout` action type.
- **Session token in sessionStorage, not localStorage.** Per-tab isolation fixes the dev-launcher multi-tab clobber that was making refreshed players reconnect as the wrong identity. Tradeoff: closing a tab fully kills the session (a real player who closes their browser mid-game must rejoin by name).
- **Name-reclaim mid-game.** Server's `handleJoin` now accepts a bare-name rejoin if (a) the name matches an existing player and (b) no other device is currently connected as them. Covers closed-tab / dead-phone recovery. Identity theft blocked: if another device is actively connected as that name, reclaim is rejected with `NAME_TAKEN`.
- **Attack-stack copy is dynamic.** Reassign / Direct Order action buttons compute `${turnsRemaining + 1}` and render honest copy — `next player takes 2 turns` on a fresh turn, `next player takes 4 turns` when stacking under an existing attack.
- **Discard pile is the hero.** Draw pile shrunk and dimmed (decorative counter); discard fan shows 3 face-up cards with the newest centered, previous two tilted left/right at reduced opacity. Selector `useDiscardRecent(3)` returns newest-first.
- **Drama overlay adds a two-beat burned sequence.** Non-drawers (and the board) see `{NAME} IS…` → `BURNED`; the drawer still sees the single-beat `BURNED`. All five drama beats (`BURNED`, `EXTRACTED`, `{NAME} ELIMINATED`, `INTERCEPTED`, `{NAME} WINS`) render without terminal periods.
- **FuturePeek (See / Alter the Future) rewrite.** Full `MinimalCard` art in a horizontal scroll-snap container (70vw per card, next peeks past the edge). Badge: `Draw 1 · next` / `Draw 2` / `Draw 3` read-only; tap-order `#1` / `#2` / `#3` in rearrange. Auto-close countdown removed.
- **Sable Ashworth portrait regen.** Direct camera gaze, deep V-neck, Zippo at hip. Old portrait archived at `public/assets/roster/_archive/sable-ashworth-2026-04-19-flame-gaze.png`.
- **`pnpm dev:launch` rewrite.** Generates the room code in Node and spawns Chrome with `board.html#ROOM` + N player URLs as positional args — no popup-blocker dependency (the isolated `.chrome-dev-profile/` had default Chrome settings, blocking the old `window.open` loop in `dev.html` after the first tab). Flags: `--players=N` for 2-10 (default 4), `--dev-html` falls back to the old in-browser launcher.
- **Card-drawn toast on safe end-of-turn draw.** `card-drawn` event now carries `cardType` (server `performDraw` sets `drawnCard.type`). `PlayerAlert` renders an `info` toast `You drew {name}.` when `event.playerId === myId && event.safe === true`. Burned draws skip this — drama overlay owns that beat.
- **`applyShuffle` clears `pendingFuture`.** Previously, Intel Briefing peek + Burn the Files left stale peek IDs pointing at cards that had moved off the top, so Falsify Intel would validate a permutation against IDs that no longer matched the top 3. Regression locked by `rules-gaps-exhaustive.test.ts` → "pendingFuture is cleared (or still valid) when Burn the Files follows Intel Briefing".
- **Lobby dev toolbar removed.** The Whiskrs/Mittens/Tuna/Pickles quick-join links under the `Cleared Hot` button are gone (`Lobby.tsx` + `Lobby.module.css`). `pnpm dev:launch` owns dev-time player spawning — don't restore.
- **Layout-sweep detector tightened.** `tests/e2e/layout-sweep.spec.ts` only flags overflow on `overflow: hidden|clip` containers — `overflow: visible` (glow halos, focus rings, pseudo-elements with negative `inset`) no longer registers as a clipping bug. 253 raw findings → 198 after the fix, of which 2 are real clip issues.

## Next Steps (in priority order)

### 1. Real-device playtest
Live 4-8 player test on iPad Pro 1366 + phones. Verify recent flows on real hardware:
- Triple-steal deferred commit — cards return on cancel, nope window opens AFTER the name.
- Favor-target banner + staging (no more sheet modal).
- Discard hero sizing reads from couch distance.
- Burned two-beat drama sequence on non-drawer phones.
- Sable's new portrait reads at card size.
- Card-drawn toast fires for the drawer (and ONLY the drawer) on a safe draw.
- `pnpm dev:launch` actually makes debugging easier.

### 2. Host kick-and-advance affordance
**Goal:** when a seat is truly abandoned (not a beer break), host can force the game forward. Backstop for the "timeouts removed" policy.
**Prescription:**
- Board-side button in the dossier footer or alongside the blotter — `Skip {name}` or similar.
- Only visible when the named player is disconnected (via `disconnectTimers` state) AND the game is stalled on their prompt.
- Server action: `host-force-resolve` that auto-resolves the current pendingPrompt the same way the removed prompt-timeout used to (random Defuse position, cancel the steal, no transfer, etc).
- Connection detection: `BoardPlayer.isConnected` already exists in the projection. Gate the button on `!isConnected`.

### 3. 8-player stress test
Verify PlayerStrip layout at max count on real TV, COMMS scroll under event volume, nameplate legibility from couch distance.
**Landing gate:** at 1366×1024, strip math leaves ~34px headroom with all 10 tiles; verify at 1920 and 4K that tiles grow proportionally.

### 4. Blotter content layout polish
Options for the piles column: (a) vertically center the pile lockup, (b) scale the pile visual further, (c) decorative classified chrome (memo pad, paperclip). Briggsy's call at kickoff which direction feels right.

### 5. Live mid-play state verification — `tests/e2e/arena-states.spec.ts`
Playwright script: 3-player game, drive the `window.__gameStore` dev hook to force each state, screenshot each. Target states: Nope window mid-countdown, DramaOverlay (BURNED → EXTRACTED, ELIMINATED, INTERCEPTED, WINS), Favor banner + staging, Triple-steal name-card sheet pre-commit and post-name, FuturePeek (read-only and rearrange). Output to `temp/arena-states/` for eyeball review. Each state is ~30 min to script; ~3-4 hours for the full set.

### 6. Physical hardware verification
Push commits, deploy to Cloudflare Pages (wrangler), open on actual TV with phone controllers.

### 7. Extend PlayerAlert coverage (optional)
- **Reassign / Direct Order target** — no direct event type; victim only learns via `turn-started` with `turnsRemaining > 1`. Probably fine as-is because the target's phone sits dormant — when they come back, staging is lit and status reads "Your turn · 3 turns".
- **Your card was intercepted** — optimistic snapback + board DramaOverlay already communicate this, but explicit phone toast would remove ambiguity. Skip until playtest reveals confusion.

### 8. Tier 2 retheme cleanup (non-blocking)
- `src/server/game/engine.ts` — any remaining `// EKs` / `'No EK in hand'` strings → Burned vocabulary.
- `src/shared/constants.ts` — `EK_REVEAL_MS` → `BURNED_REVEAL_MS` (rename across all call sites).

### 9. Execute Phase 5 — Verification & Acceptance
**`/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`**

### 10. Optional polish follow-ups
- **Brass studs on wood frame.** CSS pseudo-elements (small radial-gradient dots at regular intervals on `.woodTop/.woodBottom`).
- **Remove unused `public/assets/arena/mahogany.png`.** Superseded by the 4-edge split.

### 11. Optional test coverage expansion (deferred until visual layer stabilizes)
- **Card-drawn toast E2E** (~30 min). Extend Tier 1 spec: active phone taps `End turn · draw`, assert `PlayerAlert` renders `You drew {name}.`. Locks today's feature end-to-end.
- **Agent-X combo matrix** (~15 min). Add explicit tests to `combo-validation.test.ts` for `3× Agent X`, `2× Agent X + operative`, `Agent X + 2 matching operatives`. Belt-and-suspenders over the existing generic rule.
- **Pixel-diff regression** (~2h setup + ongoing baseline maintenance). Playwright `toHaveScreenshot()` with committed baselines. Requires `MotionConfig reducedMotion="always"` in test mode + fixed server RNG seed so baselines are deterministic. Defer until after Phase 5 lands — mid-rebuild baselines churn too fast.

## Landmines

### New this session

- **`applyShuffle` clears `pendingFuture`.** Burn the Files now wipes the peek (`engine.ts:454`). Previously, Intel Briefing + Burn the Files left stale IDs pointing at cards that had moved off the top, and Falsify Intel would then validate a permutation against IDs no longer on the top 3. Any future card that mutates draw-pile order (beyond-the-grave resurrection cards, deck-swap abilities, etc.) should clear `pendingFuture` the same way.
- **`dev:launch` uses Chrome's positional-URL multi-tab mode.** `chrome.exe [flags] url1 url2 url3…` opens each URL as a tab in the profile's window. `--auto-open-devtools-for-tabs` applies per-tab. Works even when a profile window is already running — the second invocation appends tabs. Popup blocker is irrelevant (URLs come from the CLI, not `window.open`). If you ever re-introduce browser-side tab spawning, the isolated `.chrome-dev-profile/` will re-block popups (it's a fresh profile with defaults, separate from your main Chrome's popup-allow).
- **Lobby debug toolbar was removed.** Don't restore the Whiskrs/Mittens/Tuna/Pickles quick-join `<a>` strip — `pnpm dev:launch` owns dev-time player spawning now. The `.devToolbar` / `.devLink` CSS is gone from `Lobby.module.css`.
- **Layout-sweep detector only flags `overflow: hidden|clip`.** Elements with `overflow: visible` (the default) don't clip — pseudo-elements with negative `inset` (like `.card::after { inset: -2px }` glow halos), focus rings, and tooltips extend outside their box by design. If you tighten the detector to also flag `visible`, you will re-surface ~57 false positives per sweep.
- **`card-drawn` event carries `cardType`.** Server `performDraw` sets `cardType: drawnCard.type` on the safe-draw branch only — Burned draws never emit `card-drawn` (they emit `burned-drawn` + drama overlay). The `cardType` field is non-private: the card is going into the drawer's own hand and will appear in `myHand` on the next state update anyway.
- **Triple-steal cards DO NOT leave hand until name commits.** `handleCombo` for comboSize === 3 only sets `pendingNameCard.cardIds` and transitions to `name-card-pending` — no `removeCardsFromHand`, no `addToDiscard`, no nope window, no `card-played` event. All of that fires in `handleNameCard`. Cancel is free (pre-commit). If you "simplify" by moving discard back into `handleCombo`, cancel silently destroys 3 cards.
- **`name-card-pending` can hold an open nope window.** After name commit, subPhase stays `name-card-pending` and a nope window is active. `handleCancelNameCard` explicitly rejects when `pendingNameCard.namedCardType` is set or `nopeWindow` is non-null — don't drop those guards.
- **`handleNopeWindowExpired` checks the named-steal branch FIRST.** Before the legacy `pendingSteal` branch. If you flip the order, a 3-of-a-kind steal will never resolve.
- **Favor-target is the one prompt that keeps interaction live.** Carve-out in `deriveInteractionPermission`: when `pendingPrompt.type === 'favor-response' && playerId === myPlayerId`, return `{ allowed: true }`. Don't remove — it's what lets the target double-tap their hand instead of opening a sheet.
- **`useCardPlay` has a `maxStaged` param.** Favor mode passes `1`; normal play passes `3`. At `maxStaged === 1` the reducer AUTO-SWAPS on a second tap (replaces the staged card) — don't change to "reject second tap" without reviewing the favor UX.
- **All prompt-timeouts are gone.** No `PROMPT_TIMEOUT_MS`, no `prompt-timeout` action, no `handlePromptTimeout`. Adding any auto-resolve-by-timer for a pending prompt REVERSES the "game waits for you" policy — needs a product decision, not a regression fix.
- **Session tokens live in `sessionStorage`.** Per-tab. Refresh: token survives, client reconnects silently. Closing the tab entirely: token gone, player falls back to name-reclaim. Don't move back to `localStorage` — dev-launcher clobber comes back.
- **Name-reclaim is intentional.** Server accepts a bare-name rejoin mid-game IF no other device is actively connected as that name. This is the "phone died, reopen browser" backstop. Identity theft is prevented by the `activelyConnected` check — don't relax that guard.
- **`pendingNameCard.cardIds` is projection-private.** The field lives on server `PlayingState` and is used by the engine to move cards on name commit. Clients don't see it; they only see `pendingPrompt = { type: 'name-card', ... }`.
- **Draw pile is decorative; discard is the hero.** Size tokens diverge deliberately: `--size-draw-pile-width` is roughly 60% of `--size-discard-card-width`. Don't "unify" them.
- **DiscardFan shows face-up history.** Top card centered, behind1 tilts left (-7°), behind2 tilts right (+7°). Information is public per protocol. If you add more fan layers, preserve the alternating tilt pattern so the fan reads as a stack, not a row.
- **Drama overlay burned sequence is 2 beats for non-drawers, 1 beat for the drawer.** `getDramaBeats` returns an array; the queue processor handles multi-beat sequences. The drawer distinction is `myPlayerId === event.playerId`. For the board (myPlayerId === null), always show both beats.
- **FuturePeek has NO countdown.** The old auto-close was bugged (guard flipped false at zero, dismiss never fired) AND violated the "game waits for you" policy. User-triggered `Got it` only.
- **`.chrome-dev-profile/` is gitignored.** Delete the directory to reset the dev Chrome profile (e.g., clear cached dev servers, reset DevTools panel state).

### Pre-existing

- **Combo flow bundles target with `play-card`.** `select-target` action, `steal-target-pending` subphase, and `steal-target` PendingPrompt type are GONE. The new flow exists so the nope window opens with the target name visible to opponents.
- **Attack / TargetedAttack formula.** `(turnsRemaining - 1) + 2`, NOT `turnsRemaining + 2`. Tests in `engine.test.ts` lock the stacking case.
- **PlayerStrip tile sizing is font-driven.** No `min-width` on `.tile` — 10 tiles × 120px min would overflow the viewport.
- **`projectForBoard` requires `connectedPlayerIds: Set<string>`.**
- **PROTOCOL_VERSION = 2.** Bump to 3 if you change the wire protocol; update `gameStore.test.ts`.
- **`--size-blotter-width` is a direct calc.** No clamp, no ring-aware min().
- **`useDramaActive()` is the modal gate.** Any sheet / overlay that could cover a BURNED → EXTRACTED sequence must gate on it.
- **StealReport queue is local React state.** Multiple combo-steals while a player is away all queue up with `+N more` chip.
- **`window.__gameStore` dev hook.** Guarded by `import.meta.env.DEV`. Lets Playwright inject events. Tree-shaken from prod.
- **PlayerAlert no longer handles target-side combo-steal.** StealReport owns that surface.
- **combo-steal.cardType is PRIVATE to stealer + target.** `stripPrivateEventFields` in `src/server/projection.ts` filters it from the public board and every non-party player.
- **Hand sort lives in `useSortedHand`, not in Hand.tsx.** `TYPE_PIN_PRIORITY` pins Extraction rightmost, Intercepted second-rightmost.
- **Intercept button must bypass the outer `disabled` prop** in `SmartActionBox.tsx`.
- **`.card[aria-disabled='true']` no longer dims.** Only DiscardFan consumes `disabled={true}` on MinimalCard.
- **DramaOverlay cqi factors are paired with the min tokens.** Hero 9cqi/32px, subdued 6cqi/24px, victory 8cqi/40px.
- **Card illustration uses `object-fit: contain`, not `cover`.**
- **Card asset pipeline preserves native aspect.** `scripts/process-assets.ts` resizes to 384px max with `fit: 'inside'`.
- **Imagen safety filter is inconsistent.** Retry a failed generation before assuming the prompt is unsafe.
- **Roster regen scripts are per-character.** `set -a && source .env && set +a && npx tsx scripts/regen-<name>.ts`. Output to `temp/roster/<name>.png`; eyeball before swapping into `public/assets/roster/`.
- **Asset archive convention.** `public/assets/roster/_archive/<name>-<date>-<tag>.png`. Rejected variants suffix `-<reason>-rejected.png`.
- **Wrangler local SQLite corruption.** `taskkill //F //IM workerd.exe && rm -rf .wrangler/state` if DO state misbehaves.
- **Dev launcher popup throttling.** User gesture must remain active; don't `setTimeout` the `window.open` calls.
- **`.table` box-sizing is load-bearing.** `height: 100vh; box-sizing: border-box` required so fixed-position status bar anchors to visible viewport edge.
