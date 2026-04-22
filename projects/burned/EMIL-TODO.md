# EMIL-TODO

Deferred items from the 2026-04-21 Emil design-review session.  All shipped 2026-04-21 (same-day follow-up).

> ⚠ **2026-04-22 UPDATE — SUPERSEDED ITEMS.** The 2026-04-22 color/blotter review concluded that the blotter concept itself is the deeper problem (paper context fighting 3D cards; COMMS-as-ink violating the live-feed metaphor; decoration overload). **The blotter-polish surgical cuts we discussed — remove felt reticle, folder tab → wine, status strip → ochre bar, 4° fiber grain — are superseded by the Desk Redesign plan at `docs/plans/desk-redesign/PLAN.md`.** The desk concept retires the entire blotter rather than polishing it, so the surgical cuts would be wasted work. Burned-fire color change (shipped) + remaining polish items in this file stand. Real-device playtest stands.

Legend: `[x]` done · `[ ]` pending · `[~]` in-progress · `[?]` flagged for Briggsy review

---

## Quick wins (mechanical, <15 min each)

- [x] **DramaOverlay spring tuning** — `MOTION_SPRINGS.punchy` 400/15 → 280/24; DramaOverlay GSAP `back.out(1.4)` → `back.out(1.1)`. Crisp arrival, minimal overshoot. Archer-deadpan.
- [x] **`dragMomentum` spring preset** — added `{ type: 'spring', duration: 0.5, bounce: 0.15 }` to `MOTION_SPRINGS` + `MOTION`. Ready for future drag work; not consumed yet.

## Small (15-30 min each)

- [x] **`.pressable` shared utility** — `src/client/shared/interactions.module.css`. Composable via CSS-Modules `composes:`. Documented which existing sites keep custom overrides (SmartActionBox, sheets, MinimalCard) and which aren't worth retrofitting; utility is for the next new button.
- [x] **PlayerAlert entry migration** — confirmed-clean. File never had the ErrorToast keyframe-race; Framer owns entry/exit via `MOTION.snappy`. No edit needed.
- [x] **TitleBar / StatusBar mount `@starting-style { opacity: 0 }`** — added `transition: opacity ...` + `@starting-style { opacity: 0 }` on both. Subtle fade on first paint, no default-mount pop.
- [x] **`@starting-style` migration (CardDetailSheet + JoinScreen.iconWrap)** — retired `@keyframes joinScreenPopIn`; iconWrap now uses `transition` + `@starting-style { transform: scale(0.92); opacity: 0 }`. CardDetailSheet confirmed clean (no mount keyframe to migrate).

## Medium (20-40 min each)

- [x] **"YOU'RE UP" TitleBar entrance** — lived in StatusBar, not TitleBar. Wrapped content in `AnimatePresence mode="wait" initial={false}`, keyed on turn state. Inner `m.span` punches with `MOTION.snappy`. Outer `.statusBar` crossfades bg/fg between `waiting` ↔ `yourTurn`. Mount fade owned by `@starting-style`, not Framer.
- [x] **STAGING empty-state collapse** — `.staging[data-empty]` switches from `flex: 42 1 0` → `flex: 0 1 auto` when `selectedIds.size === 0`. Container collapses to content size, hand reclaims the vertical space. Emil dead-white-space rule satisfied.
- [x] **Duration audit against 300ms UI cap** — swept all `--motion-duration-slow` (400ms) and `--motion-duration-dramatic` (800ms) call sites. Every non-token-definition use is decorative/mount/ambient (briefing cascade beats, TV hover letter-spacing on `.startButton`, CRT flicker, JoinScreen iconWrap mount). No UI feedback violates the cap. Token surface is clean.

## Open-ended (judgment calls, may need check-in)

- [x] **Lobby pre-players dead-space layout** — `.waiting` stretches to `flex: 1 1 auto` + centered column + classified-terminal type treatment (mono, uppercase, 0.25em tracking, muted cream). The empty roster zone now reads as "scanning for operatives" rather than dead white. `[?]` Briggsy may want a bigger ambient addition (scanning hairline, dossier placeholder, etc.) — flagged for eye-on review.
- [x] **Broader ambient-motion audit** — inventoried existing: venetian sunDrift L+R (14s), drawPile breathe + glow (4s), presencePulse on active tile (2.4s), COMMS idle ticker + crtFlicker on new messages. Empty zone identified: blotter center was static. Added `blotterFiberDrift` (45s, ±1.5px background-position shift). Subliminal — paper is never frozen. Respects `prefers-reduced-motion`.

---

## Decisions closed in the prior session (do not revisit without reason)

- **Framer shorthand `x/y/scale` → full `transform:` strings** — skipped as "pre-emptive; modern Framer uses WAAPI."
- **BottomSheet `transform-origin`** — rejected; pure y-slide, no scale, so origin is irrelevant.

---

## Session result (round 1 — the 11 original items)

- **11 / 11 shipped.** Two (PlayerAlert entry, CardDetailSheet migration) were confirmed-clean with no edits needed; the remaining nine carried concrete code changes.
- **Verification:** `pnpm typecheck` clean, `pnpm test` 358 / 358 green.

## Round 2 — "go big or go home" (5 additional Emil moves)

After the first round, Briggsy asked for the bigger Emil recommendations that the prior session had punted. Five additional tasks executed:

- [x] **Framer shorthand → transform strings on hot paths.** Converted `initial/animate/exit` from `{ x, y, scale }` shorthand to `{ transform: 'translateX(Npx) scale(N)' }` strings across 10 sites (PlayerAlert, ErrorToast, Lobby playerCards, GameOver winner/rankings/playAgain, EliminatedView skull + title + aliveList, StatusBar inner, BlotterContent idle ticker + COMMS stream + status strip, SmartActionBox enter/exit, BottomSheet slide, StealReport paper slam, Hand slot deal, Hand enlargeCard, StagingArea enlargeCard). Emil: shorthand runs on main thread via rAF (drops frames under load); transform strings stay GPU-composited. Prior session's "pre-emptive" dismissal reversed.
  - **`EliminatedView` bonus fix:** skull was starting from `scale: 0` — violates Emil's "never animate from scale(0)" rule. Bumped to `scale(0.4)` so a silhouette is always present.
  - **SKIPPED (intentional):** StagingArea.stagedSlot has no initial/animate (pure `layout="position"`, Framer-owned). PlayerStrip tiles are opacity-only.
- [x] **Clip-path reveal for CASE BANNER cascade.** Swapped `transform: translateX(-8px) → 0` for `clip-path: inset(0 100% 0 0) → inset(0 0 0 0)`. Banner lines now read as classified text being UNCOVERED left-to-right, not "things sliding in." Pure Archer vocabulary. Stagger timings preserved (50/120/190/260/330ms).
- [x] **Connection spinner perceived-fast tune.** `--motion-duration-essential-spin`: 1000ms → 700ms baseline (reduce-mode stays at 1500ms). Cascades to: TitleBar `.dotConnecting` reconnect blink, ConnectionOverlay loading spinner, JoinScreen spinner, BlotterContent idle cursor blink. Reconnect feels snappier; idle cursor reads as 1.4Hz blink (still a blink). Motion-token-sync test enforces TS/CSS parity — both files updated in lockstep.
- [x] **Blur-mask bridge between drama beats.** `DramaOverlay.tsx`'s GSAP timeline now animates `filter: blur(0px ↔ 4px)` in parallel with the opacity ramp. On exit, blur ramps up to 4px as opacity fades; on next-beat entry, text starts at blur(4px) and focuses in. For two-beat sequences (BURNED: "{NAME} IS…" → "BURNED"), the handoff now reads as one continuous morph instead of a harsh blink between states. Capped at 4px per Emil's Safari-mobile rasterization warning.
- [x] **Hand card entry stagger audit.** Confirmed 80ms per-card stagger is within Emil's 30-80ms range — and is deliberate "dealing beat" vocabulary. Removed the 150ms initial lead-in so the first card lands immediately: `delay: dealComplete ? 0 : i * 0.08` (was `i * 0.08 + 0.15`). Perceived-speed win; dealing still feels paced.

**Verification (round 2):** `pnpm typecheck` clean, `pnpm test` 358 / 358 green.

---

## Landmines (for future Claude sessions)

### Round 1
- `MOTION_SPRINGS.punchy` is now 280/24 (was 400/15). Any code that wanted the old bouncy punch should add its own spring, not retune this shared preset.
- `MOTION_SPRINGS.dragMomentum` uses Apple-style `{ duration, bounce }` rather than `{ stiffness, damping }`. Framer accepts both; don't try to normalize to stiffness/damping without reason.
- `StatusBar.tsx` now owns a render function (`bodyFor`) that picks the AnimatePresence key. Changing the text inside a branch requires changing the key, or the crossfade won't fire on the update.
- `.staging[data-empty]` on PlayingView.module.css is gated by `selectedIds.size === 0` in Player.tsx. If you add another "stage these cards" flow, make sure it feeds through `selectedIds` so the collapse still fires correctly.
- `.pressable` utility is available for new buttons; existing custom rules are preserved by design (SmartActionBox's `animation: none` on `:active` is load-bearing — don't force a migration).
- `blotterFiberDrift` runs on a 45s cycle at ±1.5px. If someone "optimizes" it to a faster cycle or larger shift, the paper will start to read as "alive," which defeats the subliminal-ambient intent.

### Round 2
- **Transform-string idiom is now the house style** for Framer Motion `initial/animate/exit` props. NEW code should prefer `{ transform: 'translateX(10px) scale(0.9)' }` over `{ x: 10, scale: 0.9 }`. Shorthand goes through rAF on the main thread (drops frames under WS-hot load).
- **Exception** — components using `layout` or `layoutId` (MinimalCard, StagingArea.stagedSlot, Hand.slot with `dealComplete`): Framer's layout system owns transform. The transform string in `initial/animate` still works but Framer will override during layout animations. Don't add layout-conflicting transforms mid-layout.
- **`EliminatedView` skull** now starts at `scale(0.4)` instead of `0`. Don't "fix" it back to 0 — that was the Emil violation (nothing in reality pops from nothing).
- **`@keyframes caseBannerLineIn`** uses `clip-path: inset()` + `opacity` — no `transform`. If you add a slide back for any reason, check the stagger still reads as "uncovering" rather than "moving."
- **`--motion-duration-essential-spin` is 700ms** (down from 1000ms). Motion-token-sync test in `__tests__/motion-token-sync.test.ts` enforces TS (`motion.ts: essentialSpin: 0.7`) and CSS (`primitives.css: --motion-duration-essential-spin: 700ms`) parity. Never change one without the other.
- **DramaOverlay filter-blur is load-bearing on multi-beat sequences.** On beat completion, the reset deliberately leaves `filter: blur(4px)` so the next beat's `fromTo` starts blurred and focuses in. If you "clean up" the reset to `filter: blur(0px)`, the blur-mask bridge disappears and beat handoffs get harsh again.
- **Hand `initial` delay is now `i * 0.08` (no lead-in).** First card lands at time 0. If you restore a positive initial offset, the whole deal feels front-loaded — that's the "dead air" Emil flagged as perceived-slow.
