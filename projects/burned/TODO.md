# BURNED — TODO

## Current State
- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10).
- **236/236 Vitest, typecheck clean** (verified 2026-04-18, end of session).
- **Intercept UX refactored** — FloatingActionButton deleted. Intercept CTA now lives in `SmartActionBox`:
  - Non-actor with Intercepted in hand: red pulsing `Intercept · Ns` button (bypasses outer permission-disabled so it's actually clickable during another player's turn).
  - Non-actor without Intercepted: `Intercept window · Ns` alert-toned status (not dim/disabled looking).
  - Countdown ticks at 100ms so the 0s frame renders before the server's 300ms grace.
- **Roster portraits regenerated** (Imagen-4) — Sable (voluptuous + V-neck), Janet (full-body with red-sole Louboutins, vertical geo bands), Dash (bourbon lowball w/ ice cube), Agent X (Slater-style rugged badass w/ eye patch, blonde stubble, trench coat). Old art archived at `public/assets/roster/_archive/`. Vera + Neal unchanged. One rejected Vera variant archived as `-voluptuous-rejected`.
- **Card art pipeline — no more crop** — `scripts/process-assets.ts` preserves native aspect (3:4 for roster, 1:1 for action cards), resizes to 384px max. `MinimalCard.module.css` switched `object-fit: cover` → `contain` so full artwork displays inside the card.
- **MinimalCard layout refactor** — icon + name share a `.cardHeader` flex row (no more wrap), name font reduced to fit one line, `.cardDesc` hidden by default and only renders at `@container (min-width: 177px)` (i.e. tap-to-enlarge previews, not hand/staging cards).
- **DramaOverlay scaled for phone** — `INTERCEPTED.` + `EXTRACTED.` no longer crop on 393px viewport. Tokens `--text-drama-{hero,subdued,victory}-min` reduced, cqi factors reduced from 12/8/10 to 9/6/8. Board view unchanged (always clamps to max).
- **Discard top card opacity fix** — removed `opacity: 0.5` from `.card[aria-disabled='true']` in `MinimalCard.module.css`. The DiscardFan was passing `disabled={true}` which made the top card translucent and showed the face-down peek card bleeding through. Only DiscardFan uses `disabled` on MinimalCard; no other consumers affected.
- **BlotterTicker prototype live (A/B)** — horizontal COMMS chyron at `src/client/board/BlotterTicker.tsx`, positioned below the blotter in the wood/felt margin above the viewport-bottom StatusBar. Runs in parallel with the existing right-side-panel `AnnouncementFeed`. **Both are rendered right now.** This prototype is obsolete per the §1 redesign below and should be deleted when that lands.

## Next Steps (in priority order)

### 1. Three-box blotter redesign (Briggsy's call, 2026-04-18)
**Goal:** the blotter becomes the single dossier the whole game reads off of. Side panel frees up entirely for dossiers at high player counts.

**Layout inside the blotter:**
- **Left half** — Draw pile + Discard pile (stacked vertically, draw above discard, each with their existing caption lockup).
- **Right half** — COMMS event feed (vertical stack, newest on top). Port `AnnouncementFeed`'s content but re-skin for cream paper: switch the dark-card teletype backgrounds to something that reads on paper (faint ochre fill + accent-drama rule on the left edge, `--font-mono`, no CRT-dark gradient). Keep the CRT-flicker on the newest entry.
- **Bottom strip** (~48px inside blotter) — Current instruction/status. Pulls the existing viewport-bottom `StatusBar` ("Alice is on deck", "Whiskers is reinserting the Burned file…") up onto the paper. Typewriter baseline line — consistent with the paper aesthetic, not a brass plate.

**Effects on rest of layout:**
- **Delete** `src/client/board/BlotterTicker.tsx` + `.module.css` — prototype, obsolete.
- **Delete** `src/client/board/AnnouncementFeed.tsx` + `.module.css` OR repurpose inside the blotter right-half. If deleting, move the `formatEvent` helper to a shared location (currently re-exported for BlotterTicker's benefit).
- **Delete** `src/client/board/StatusBar.tsx` + `.module.css` (board version, not phone version). Content migrates into the blotter's bottom strip.
- **Remove** the `AnnouncementFeed` render from `GameTable.tsx` + the `BlotterTicker` render I added this session. Keep everything else (piles, Arena, NopeCountdownBar, PlayerRing, CaseBanner).

**Geometry:**
- Blotter current width at 1920px viewport: 915px × 420px tall.
- Left half: piles zone — ~380px wide. Stacked draw + discard with ~20px gap. Each pile + label lockup ~170px tall (piles are 5:7 aspect). Total ~360px — fits the 420px blotter height with padding.
- Right half: comms feed — ~480px wide × ~360px tall (leaves room for bottom strip).
- Bottom strip: ~48px tall, full blotter width.
- Tune via `--size-blotter-height` and internal grid at 1280/1920/2560/3840 viewports.

**Drama overlay scope:** stays full-screen over everything, not constrained to blotter. Confirmed with Briggsy.

**Open question:** the `.center` flex container in `GameTable.tsx` currently centers the piles in the viewport via absolute positioning. Moving piles into the blotter's left half means repositioning this — probably an internal blotter grid layout.

### 2. Discard fan — show 2–3 previous plays face-up
**Problem:** `DiscardFan` currently shows top card + ONE face-down peek. User asked whether we should see prior plays; agreed yes, briefing-room aesthetic benefits from evidence stacking.
**Prescription:**
- Update `DiscardFan.tsx` to accept `discardPile: readonly CardInstance[]` (already in protocol at `src/shared/protocol.ts:88`).
- Render top card centered/straight. Render previous 1-2 cards face-UP at slight rotation (-4°, -7°), offset left by 4px / 8px, z-index behind top, opacity 0.85 / 0.7.
- If <3 cards played, render only what exists.
- No information leak risk — discard is public per protocol.

### 3. Live mid-play state verification (pre-existing, pushed from last session)
Playwright script at `tests/e2e/arena-states.spec.ts`: 3-player game, play a card that triggers Nope window, screenshot mid-countdown; play a card that triggers DramaOverlay, screenshot the drama. Scaffold proven this session.

### 4. Physical hardware verification (pre-existing)
Push commits, deploy to Cloudflare Pages (wrangler), open on actual TV with phone controllers.

### 5. AnnouncementFeed event-copy pass (pre-existing)
Full Archer-deadpan voice pass across all event types. Blocked/subsumed by §1 if AnnouncementFeed is deleted — re-home the copy into the blotter comms feed.

### 6. Tier 2 Retheme Cleanup (pre-existing, non-blocking)
- `src/shared/card-defs.ts:27` — `'sable-ashworth'` card type → `'otto-prang'`. Stale character name from a pre-spec iteration. Rename affects the CardType union; grep first for call sites.
- `src/server/game/engine.ts:224` — comment `// EKs excluded` → `// Burned cards excluded`.
- `src/server/game/engine.ts:1051` — error message `'No EK in hand'` → `'No Burned card in hand'`.
- `src/shared/constants.ts:21` — `EK_REVEAL_MS` → `BURNED_REVEAL_MS` (rename across all call sites).
- `src/server/game/engine-phase3.test.ts:226` — comment `// EK moved from hand...` → `// Burned card moved from hand...`.

### 7. Execute Phase 5 — Verification & Acceptance (pre-existing)
**`/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`**

### 8. Engine coverage gaps (pre-existing)
- **G1:** No regression test that `pendingFuture` survives mid-turn if Intel Briefing is played during a non-attack turn.
- **G3:** No explicit test of Attack+Defuse multi-turn continuation (rules §11 worked example). Engine logic at `engine.ts:715-733` is correct per audit, just untested.

### 9. Optional polish follow-ups (not blocking ship)
- **Brass studs on wood frame.** Add via CSS pseudo-elements (small radial-gradient dots at regular intervals on `.woodTop/.woodBottom`).
- **Remove unused `public/assets/arena/mahogany.png`.** Superseded by the 4-edge split.
- **Player dossier visual variety.** If the ring reads repetitive at 8–10 players, generate 2 more silhouette variants and rotate by slot index mod 3.

## Landmines

- **Intercept button must bypass the outer `disabled` prop.** In `SmartActionBox.tsx`, `buttonDisabled = isIntercept ? optimisticPending : (disabled || optimisticPending)`. The outer `disabled` is driven by `permission.allowed`, which is false during an opponent's turn — correct for normal card actions, but the intercept CTA is exactly the legal non-actor action. Don't re-apply the outer disabled to the intercept branch or the button will gray out and clicks won't fire.
- **`.card[aria-disabled='true']` no longer dims.** The opacity: 0.5 was removed so DiscardFan's top card reads correctly. The only consumer of `disabled={true}` on MinimalCard is DiscardFan; if a future consumer wants dimming, apply it explicitly — don't resurrect the rule.
- **DramaOverlay cqi factors are paired with the min tokens.** Reducing the min without reducing the cqi factor doesn't help on phone (cqi falls below min, min wins, still overflows). Current pairing: hero 9cqi/32px, subdued 6cqi/24px, victory 8cqi/40px. Long player names (12 chars) + "WINS." will still overflow at 393px — if this becomes a real issue, truncate names in the drama text or reduce victory min further.
- **CSS modules + `:global()` for cross-component attribute hooks.** `SmartActionBox.module.css` does NOT reference a body attribute anymore (the earlier `body[data-enlarge-open] .fab` rule was removed along with the FAB). If you need a cross-component CSS hook in the future, the pattern is: `useEffect` toggles a body data-attribute, CSS module uses `:global(body[data-attr]) .localClass`. Vite's CSS module hash is preserved for `.localClass`.
- **Card illustration uses `object-fit: contain`, not `cover`.** Preserves the full artwork. If you revert to `cover` you'll re-introduce the crop Briggsy specifically flagged (Janet's red-sole Louboutins cropped out).
- **Card asset pipeline preserves native aspect.** `scripts/process-assets.ts` resizes to 384px max with `fit: 'inside'`. It reads from `temp/cards/*.png` for action/utility cards and `public/assets/roster/*.png` for operative portraits. `temp/cards/` was empty at end of session — if you need to regenerate action cards, re-populate from source first.
- **Name on the card title line uses `white-space: nowrap` + `overflow: hidden`.** At 9 chars (longest: "DASH BARLOWE", "JANET BROADSIDE", "SABLE ASHWORTH") the names fit the small-card clamp without wrapping. If you add a longer-named card, re-verify on the narrowest hand card container (~115px content box).
- **Player dossiers must NOT map slot → named operative** (pre-existing).
- **Wood frame color unification depends on a CSS filter** (pre-existing).
- **Imagen safety filter is inconsistent** (pre-existing). Retry a failed generation before assuming the prompt is unsafe. The Sable regen failed on its first attempt with a monochrome-engraving fallback; retry with strengthened flat-color language succeeded.
- **Roster regen scripts are per-character.** `scripts/regen-sable.ts`, `regen-janet.ts`, `regen-dash.ts`, `regen-agent-x.ts`, `regen-vera.ts`. Run with `set -a && source .env && set +a && npx tsx scripts/regen-<name>.ts`. Output goes to `temp/roster/<name>.png`. Always eyeball the temp output before swapping into `public/assets/roster/`.
- **Asset archive convention.** When replacing roster art, move the old file to `public/assets/roster/_archive/<name>-<date>-<tag>.png`. Rejected variants use the suffix `-<reason>-rejected.png` (e.g. `vera-khan-2026-04-18-voluptuous-rejected.png`).
- **Playwright MCP session-token sharing** (pre-existing). `localStorage.clear()` between tabs.
- **Wrangler local SQLite corruption** (pre-existing). `taskkill //F //IM workerd.exe && rm -rf .wrangler/state`.
- **Dev launcher race condition** (pre-existing).
- **`.table` box-sizing is load-bearing** (pre-existing).
- **Layout-sweep detector false positives** (pre-existing).
- **E2E button locators are copy-coupled** (pre-existing).
- **Blotter height × ring geometry coupling** (pre-existing). If §1's blotter-internal grid changes the blotter's height, re-verify that dossiers clear it at 3 viewports.
- **Side-panel width capped at 400** (pre-existing). Moot if §1 removes the side panel, but until then it's still load-bearing.
