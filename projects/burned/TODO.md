# BURNED — TODO

## Current State

- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10).
- **364/364 Vitest, 15/15 Playwright, typecheck clean** (verified 2026-04-22). +4 Agent-X combo-triple matrix cases added to `src/shared/combo-validation.test.ts` locking the matchType derivation: 3× Agent X → triple(matchType=agent-x), 2× Agent X + matching operative → triple(matchType=operative), 1× Agent X + 2 matching operatives → triple(matchType=operative), 2× Agent X + non-operative action → rejected(mismatched-types). Prior expansion (2026-04-21): `deck-composition-exhaustive.test.ts` parameterized 2-10 players against `docs/rules/RULES-REFERENCE.md` §3; `rules-gaps-exhaustive.test.ts` plugs §11 Attack+Defuse continuation, §6 Intel Briefing mid-turn, §9 triple-Nope, §7 combo overrides, §10.3 Back Channel under Attack, §6 empty-hand Favor, §9 Burned/Extraction not Nopeable, §5 multi-play per turn, §12 dead-card disposal.
- **Motion tokens upgraded to Emil-grade curves.** `--motion-ease-base` is now iOS drawer `cubic-bezier(0.32, 0.72, 0, 1)`; `--motion-ease-decelerate` is Emil's strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)`. `MOTION.exit` no longer uses `accelerate` (ease-in) — flipped to `decelerate` for crisper exits. `primitives.css` and `motion.ts` stay lockstep (`motion-token-sync.test.ts` enforces). Cascades to every component consuming these tokens.
- **Emil audit P2 triage shipped 2026-04-23 evening.** One atomic commit, 4 of 6 items landed:
  - **#13 Nameplate standby folded into flip flow.** `resolveSubject` now always returns a `Subject` (never null), with a `standby` flag. `STANDBY_SUBJECT` has `key: 'standby'`, `name: '.'`, `subtext: 'Standby'`. `data-standby="true"` attribute on `.plateContent` scopes the `visibility: hidden` name-hide to the plateContent itself (not the parent className) so the EXITING standby plate stays blank through its rotateY exit. `.nameplate` gets `transition: opacity var(--motion-duration-slow) var(--motion-ease-base)` so the wrapper brightens from 0.55 → 1 alongside the first coin flip. Game-start first-turn now flips the plate from quiet to active instead of hard-swapping DOM.
  - **#14 EliminatedView skull `scale(0.4)` → `scale(0.6)`.** Inline comment updated to reflect "peak-ceremony rule-softening, 0.4 was overshooting the break." Still below Emil's 0.95 minimum but closer to defensible range. Pending on-phone eyeball during playtest to confirm 0.6 lands.
  - **#15 TargetSelect button stagger.** New `@keyframes optionStagger` + `@media (prefers-reduced-motion: reduce)` opt-out scoped to `.optionList > .optionBtn` (TargetSelect-only — NameCard uses `.cardGrid`, untouched). Per-button `animationDelay: ${i * 40}ms` inline in TargetSelect.tsx. Max 9 buttons × 40ms = 360ms cascade, tolerable atop the sheet slide-up. NameCard held back pending on-phone verdict for TargetSelect.
  - **#17 PlayerStrip `.tile::before` height → `transform: scaleY()`.** Hairline now fixed at `height: 3px` with `transform: scaleY(0.667)` idle state, `scaleY(1)` on active. `transform-origin: top` anchors growth inward. Removes the last layout-triggering transition in the codebase.
  - **Skipped this pass:** #11 Lobby startButton :active (depression vocabulary intentional — stamp-button character), #16 FuturePeek peekSlot press feedback (audit misdiagnosis — MinimalCard `:active` scale inside the slot already owns the press response; `[data-tapped]` opacity is a post-tap STATE indicator, not a press).
- **Emil audit Phase 3 P1 sweep — all 10 findings shipped 2026-04-23.** Three atomic commits on main:
  - **Cluster A (`31d28be1`) — token discipline.** New `MOTION_DURATIONS.stamp` (0.34s) + `MOTION_EASINGS.overshoot` (`[0.34, 1.56, 0.64, 1]`) tokens, mirrored to `--motion-duration-stamp` + `--motion-ease-overshoot` in primitives. StealReport stamp animation + ackBtn press-feedback transition consume them. PlayerStrip `.presence` pulse now consumes `--motion-duration-pulse-slow` + `--motion-ease-base` instead of hardcoded `2.4s ease-in-out`.
  - **Cluster B (`a347b0fd`) — wired entry/exit motion on banner surfaces.** `NopeCountdownBar` wrapped in `AnimatePresence` + `m.div` with `MOTION.quickFade` (opacity + scale 0.98→1). `PendingPromptBanner` same treatment, keyed on `${playerId}:${type}` with `mode="wait"` so prompt-to-prompt swaps crossfade. `StagingArea` enlarge overlay got the `filter: blur(4px) → blur(0)` bridge copied from `Hand.tsx` to mask MinimalCard's container-query layout rejig.
  - **Cluster C (`06cd98fc`) — Emil rule sweep.** Lobby `.startButton:hover` gated behind `@media (hover: hover) and (pointer: fine)`; `letter-spacing` dropped from hover + from the transition leg (it triggered layout). DramaOverlay GSAP fadeout changed from `power2.in` to `power2.out` (Emil's hardest rule: exits still use ease-out). GameOver rankings stagger cut from 120ms → 80ms per row (play-again delay tracks the new cadence). DefusePlacement ± steppers got `:active { scale(0.95) }` + transition — the one sheet button that was missing press feedback.
- **Emil Q calls logged 2026-04-23.** (a) GSAP stays as the cinematic-beats library; DramaOverlay is its only consumer. (b) Nameplate flip duration (400ms vs 250ms) + perspective (1000px vs 600px) deferred to real-device playtest. (c) JoinScreen.joinButton hover stays opacity-only (no desktop-parity chase with Lobby). Full rationale in `docs/reviews/emil-audit-2026-04-23.md` §2.
- **Board mount reads as a briefing cascade.** Timeline from GameTable mount: 50→330ms case banner text stagger (`.caseBannerLabel/Operation/Sub/Divider/Footer` fade + translateX) → 450ms classified stamp impact (scale 1.8→0.94→1, opacity 0→0.5→0.35, emphasized curve) → 700ms TOP SECRET folder drop (translateY -24→0) → 1000/1100ms folder label fades → player strip stagger (35ms × idx) → comms idle ticker cycles (`CHANNEL OPEN / STANDING BY / AWAITING TRAFFIC / INTERCEPT CLEAR` every 2.5s with blinking underscore cursor).
- **Press feedback on every phone tap target.** SmartActionBox, JoinScreen joinButton, sheets (optionBtn / cancelBtn / confirmBtn / quickBtn), MinimalCard (`.card:not([aria-disabled='true']):not([data-selected]):active`) all scale to 0.97-0.98 on press with `--motion-ease-decelerate`. SmartActionBox uses `animation: none` on `:active` so the scale lands on breathing variants (action, drawIntense, urgent intercept) instead of losing the cascade to the infinite keyframe.
- **Hover rules gated strict.** `@media (hover: hover) and (pointer: fine)` on every `:hover` in JoinScreen / SmartActionBox / GameOver / MinimalCard. Hybrid touch+trackpad laptops no longer fire sticky hover on tap.
- **Status strip crossfades on turn handoff.** `BlotterContent.tsx`'s bottom status line (`Sable is on deck` / pending-prompt text) now wrapped in `AnimatePresence mode="wait"` keyed on the text itself. Each handoff, prompt change, and turns-remaining tick triggers a 3px lift + opacity crossfade with `MOTION.quickFade`. New `.statusInner` flex wrapper owns the icon+text gap so the motion layer has a single transform'd element.
- **PlayerStrip active-tile lift is CSS, not Framer.** Framer owns opacity-only entry with 35ms per-tile stagger; `.tile[data-active] { transform: translateY(-6px) }` + a transition on `.tile` handles the turn-handoff lift and the background/shadow/color swap. Framer and CSS never race the transform property. `.tile::before` hairline transitions `background` + `height` smoothly on the active swap.
- **ErrorToast has no CSS keyframes.** `@keyframes slideDown` deleted from `ErrorToast.module.css` — it was racing Framer's `y: -60 → 0` in `ErrorToast.tsx`. Framer is the single source of truth for toast motion; interruptibility comes from `AnimatePresence` for free.
- **Hand→enlarge crossfade uses blur-mask.** `Hand.tsx`'s enlarge overlay animates `filter: blur(4px) → blur(0px) → blur(4px)` alongside `scale: 0.35 → 1 → 0.35`. MinimalCard's container-query layout flips thresholds mid-scale; the 4px blur smooths the rejig into a single perceived motion (Emil's crossfade-mask trick, kept under 6px so Safari mobile doesn't rasterize heavily on the main thread).
- **Lobby disabled start button has an ambient sheen.** Replaces the pre-existing opacity pulse (which never fired anyway — `::after` is `display: none` when disabled). `.startButton:disabled` background is now a layered gradient (105° cream-12 band over teal-charcoal base) animating `background-position` every `--motion-duration-ambient` (4s). Reads as "actively listening" rather than frozen.
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
- **Action card art pass — 10 of 11 elevated to Archer-spec.** Regenerated via Imagen with tightened prompts, full-bleed scenes, noir atmosphere: `falsify-intel` (CRT terminal with Anglepoise lamp), `extraction` (helicopter rescue + city skyline), `back-channel` (trench-coat spy in a 1960s phone booth on a rainy street), `burn-the-files` (filing cabinet inferno, no dimensional-rift smoke), `reassign` (folder handoff across mahogany boardroom with bandaged wounded-agent hand), `go-dark` (trench-coat operative receding down a venetian-blind-striped corridor), `intel-briefing` (Watergate break-in: Minox camera + penlight photographing classified docs), `call-in-a-favor` (two mafia dudes side-by-side at a bar with a small cash stack between them — 29 iters), **`direct-order` (2026-04-22, `5b2c9288`)** — Mother's-office authoritative figure behind mahogany desk with the index finger jabbed at the viewer, closed venetian blinds backdrop, brass pendant lamp as sole warm light, smoldering ashtray with embers and smoke wisp on the lower-left, suit/shirt/tie visible in partial silhouette (18 iters — 13 fighting Imagen's unbreakable cigar-ember-out prior before killing the cigar entirely, then 5 more killing the blinds-cast-stripes prior by closing the blinds so no light passes through), **`intercepted` (2026-04-22, `048ab359`)** — first cameo of **DOLORES GRIEVES**, our new agency HR Director (Pam Poovey archetype, same 1:1 mapping as Dash=Archer / Vera=Lana / Janet=Malory). Dolores stands behind the HR counter holding a clipboard stamped with a bold red X while giving a thumbs-down gesture. 18 iters — Imagen defaulted to cartoon cheek-blush ovals on plus-sized female characters (persistent artifact, subtle at card size), aggressive body-size metaphors backfired, and the blind-shadow prior forced us to remove blinds from the scene entirely. Old assets archived at `public/assets/cards/_archive/<name>-2026-04-{19,22}-<reason>.webp`.
- **Discard card sizing rework.** Piles column is side-by-side on short viewports (≤1000px tall) and vertically stacked on tall viewports (≥1000px tall, e.g. iPad landscape, 1080p TV). Media query `(min-height: 1000px) and (min-width: 1300px)` gates both the `flex-direction: column` on `.piles` AND the larger discard clamp (`300→480px` stacked vs `160→300px` side-by-side). Rationale: a stacked hero discard orphans the draw pile on laptop-aspect viewports (900h) but unlocks a 400px+ card at TV aspect.
- **Draw pile label stack.** DOM order reversed so the count reads top-down as `39` → `Remaining` → `In Field` → `DRAW`. Small label group; "In Field" on its own line.
- **Blotter paper is fiber-only.** Horizontal ruled lines stripped from `GameTable.module.css` `.blotter` (read too "school notebook"); vertical fiber grain stays. `--color-paper-rule` token kept for StealReport dossier on the phone.
- **Copy nit.** Board COMMS safe-draw variant is `${name} draws a card, and is safe. For now.` (was `${name} is safe. For now.`) — `events.ts:40`.
- **Host kick-and-advance feature CUT — not shipped.** Built and reverted in the same session (`host-force-resolve` engine handler + room.ts + board Skip button + 8 tests). Reasoning: it's the first crack in the "game waits for you" policy that the timeouts-removed decision established, and name-reclaim already handles the 90% case (dead phone / closed tab). If real playtest reveals stalled 8-player games where restart cost > friction cost, revisit then with turn-active included (not just pendingPrompt).
- **Drawer Burned card-as-overlay SHIPPED (#1 of cinematic arc — see priority #3).** `10d220d2` + `02417202`. Drawer sees the Burned MinimalCard fill their phone (clamp 260→420px, 72cqi, drop-shadow for heft, scale 1.6→1 back.out overshoot, slow entry 400ms, hold 2400ms) instead of text "BURNED." Non-drawer / board beat merged from two-beat "{NAME} IS…" → "BURNED" into single-beat "{NAME} BURNED" at 1800ms per playtest feedback. DramaConfig is now a discriminated union (`variant: 'text' | 'card'`); card slot always mounted, display toggles per beat. **NOT yet real-device verified — Briggsy needs to phone-test a drawer-burns scenario before #2 starts.**
- **Comms scrollable history shipped — server-cumulative event log.** `02417202` + regression tests `77eebd2a`. Root cause was `engine.ts:47` clearing `state.events` on every dispatch, so reloaded clients only saw the last tick's events (~1-3). Fix: state.events is now cumulative across dispatches, capped at 500 in `ok()` + the game-over branch. Client `accumulateEvents` became REPLACE (not append) — server is authoritative. DramaOverlay + DossierFeed announce-tracker seed `lastProcessedRef` on first mount to the tail, so page reloads don't replay historical drama. DossierFeed is scrollable (overflow-y:auto, scrollbars hidden via scrollbar-width:none + webkit rule), bottom mask-image feathers oldest strips into the manila surface. Tests: engine log cumulative semantics (4 tests) + gameStore replace/lobby-clear/position-keys (3 tests) = 371/371 Vitest passing. **Verified "looks great" by Briggsy on the tilt/offset iteration (`a88eb772`), but the final server-cumulative version (`02417202`) has NOT been explicitly confirmed by him — session hit the 90-min sloppy mark before he re-verified.**

## Next Steps (in priority order)

### 1. ~~DESK REDESIGN — retire the blotter, arena becomes Mother's office~~ [DONE]
**Plan:** `docs/plans/desk-redesign/PLAN.md` (v1.0, locked 2026-04-22)
**Shipped:** single session, 2026-04-22 — Phase 0 → Phase 5 + two mid-flight fixes (tab red family unification, dossier message-history restoration, channel ticker restoration).

Commits in order: `639beec0` (tokens) → `21846469` (blotter retire) → `976898ee` (cards on wood) → `9238bc0b` (dossier) → `d7d43bf0` (tab red fix) → `3ad89796` (strip cursor, later superseded) → `ec2cf47f` (strip cap 4 → 8) → `ca6b63bd` (channel ticker restore) → `8b4c512d` (brass nameplate) → `fce4079f` (operative photo + lamp polish).

**Outstanding follow-ups:**
- **Color check** — Briggsy flagged color blindness + nervousness about whether the manila/cordovan/brass/mahogany palette actually reads right together. Needs a color-sighted eye (Harry? separate session?) before touching manila-face, brass tones, or tab hex. The arena currently unifies all reds through `--color-accent-burned` as of `d7d43bf0`.
- **Phase 5.5 assets (skipped this pass)** — ashtray + stubbed cigar, whisky tumbler, closed dossier stack. All need Imagen asset generation to hit the quality bar; CSS-only gradients would look toy-ish. Candidates when assets exist: upper-left corner of desk (ashtray), opposite corner (tumbler catching venetian-blind light), below/beside active dossier (closed stack = "other cases" vocabulary).
- **Status strip height bump** — `.statusStrip` went 44 → 56px to host the plate + stand. Verify on real TV that this doesn't squeeze the piles/dossier vertical band.

---

### 2. ~~EMIL FULL-REPO AUDIT — Phase 1 (audit) + Phase 3 P1 sweep~~ [DONE 2026-04-23]
**Audit doc:** `docs/reviews/emil-audit-2026-04-23.md` (346 lines; 10 P1 / 7 P2 / 4 Q).
**Shipped:** 3 atomic commits — `31d28be1` (Cluster A tokens), `a347b0fd` (Cluster B motion), `06cd98fc` (Cluster C rule sweep). 360/360 Vitest + 15/15 Playwright + typecheck clean. See Current State bullet "Emil audit Phase 3 P1 sweep" for per-cluster summary.

**Outstanding follow-ups:**
- **P2 triage walk DONE 2026-04-23 evening** — 4 items shipped (#13 Nameplate standby, #14 skull 0.4→0.6, #15 TargetSelect stagger, #17 hairline scaleY). 2 skipped (#11 depression vocab intentional, #16 audit misdiagnosis). See Current State bullet "Emil audit P2 triage shipped" for per-item summary. NameCard button stagger held back pending on-phone TargetSelect verdict.
- **Q verification (real-device only)** — hands off to Priority #4:
  - Nameplate flip duration 400ms vs 250ms — which reads as "crisp brass click" on the TV?
  - Nameplate perspective 1000px vs 600px — does closer perspective fish-eye the flip or land it as a physical desk object?

**Phase 4 verification** — 15/15 Playwright E2Es pass post-Phase 3. Real-device validation folds into priority #3 below.

---

### 3. BURNED CARD CINEMATIC ARC — four-step plan [IN PROGRESS]
Briggsy's keystone insight 2026-04-22: the Burned card illustration is
barely seen today (DramaOverlay is text-only; Burned never enters hand
except briefly during defuse; DefusePlacement sheet is text-only). Fix
is to make the card illustration LOAD-BEARING across three reveal
surfaces, then regen the art so it pays off in more eyeballs.

**Sub-step #1 — Drawer sees card fill their screen on burned-drawn.**
SHIPPED: `10d220d2` (initial cut) + refined in `02417202` (timing
tune: entry 250ms→400ms slow, hold 1600ms→2400ms; non-drawer beat
merged "{NAME} IS…" + "BURNED" → single "{NAME} BURNED" at 1800ms
per Briggsy direction during playtest).
**NOT YET REAL-DEVICE VERIFIED.** Before starting #2, Briggsy needs
to phone-test a drawer-burns and confirm the card-as-overlay lands.

**Sub-step #2 — Board + non-drawer card flip during drama.** NOT STARTED.
As the "{NAME} BURNED" text overlay fires on the board and non-drawer
phones, a face-up Burned card flips onto/behind the drama text
(shared spectacle instead of just text). Design TBD; likely a
DramaOverlay extension that accepts a visual asset alongside the
text variant, OR a separate surface layer.

**Sub-step #3 — DefusePlacement hero card.** NOT STARTED.
DefusePlacement sheet currently text-only ("Hide the Burned Card"
+ position buttons). Drawer just dodged death — hero the Burned
card at the top of the sheet during the position-pick. Visual
continuity from drama → decision: "this is what you're hiding,
where?"

**Sub-step #4 — Regen the Burned card art.** NOT STARTED.
With all three surfaces live, the illustration becomes the visual
keystone of the burned-drawn moment. Direct Order + Intercepted
shipped 2026-04-22; Burned is the only action card still at
original Apr-9 quality.

**Next-session kickoff: VERIFY #1 ON PHONE first.** Until Briggsy
has seen the drawer card-reveal land on a real device with real
timing, #2 and #3 are built on unverified foundation. Elite bar:
don't ship #2 against an unverified #1.

**Art concept pitches for #4 (when we get there):**
- **A. Operative caught in flashbulb exposure** — single moment of "you've been made." Bright white/amber flashbulb blast from outside frame, operative silhouette caught mid-turn looking toward the camera, surprise/recognition expression, dark city street or rooftop setting. Pure noir "the moment your cover is blown" vocabulary.
- **B. Photograph emerging from developer tray** — close-up overhead view of a darkroom developer tray, a black-and-white surveillance photo of the operative fully developed in the chemical bath, red darkroom light overhead. Narrative: someone has the evidence now. Ties visually to Intel Briefing's photography vocabulary.
- **C. Cinematic upgrade of the current explosion concept** — keep the badge-in-flames idea but go full Archer-spec: operative's spy ID card with a photo, burning at the edges against a dark void, embers and smoke rising. More dramatic lighting, full-bleed.

**My lean post-Intercepted session:** A (flashbulb exposure). Most narratively precise for "Burned" = identity exposed. Also tonally different from Direct Order and Intercepted (both interiors) — an exterior/action beat adds variety to the deck.

**Process for each:**
- Archive current at `public/assets/cards/_archive/burned-2026-04-<date>-<reason>.webp`.
- Tighten prompt in `scripts/generate-cards.ts` — MINIMUM VIABLE rewrites win (iter 13 Intercepted lesson). Short, clause-based prompts with every element mentioned ONCE.
- `set -a && source .env && set +a && npx tsx scripts/generate-cards.ts --only=burned` to regen.
- **Critically eyeball** the temp PNG before presenting (lesson from call-in-a-favor 29-iter grind + Intercepted 18-iter grind: optimistic descriptions waste time — tell Briggsy what you ACTUALLY see, flaws included, not what you hope is there).
- Process via `npx tsx scripts/process-assets.ts` once approved.

**Imagen landmines accumulated from Direct Order + Intercepted (must-know before rolling Burned):**
- Aggressive body-size metaphors ("HULKING / TANK / NUKE / linebacker") backfire — Imagen renders SMALLER. Use calm specific markers.
- All-caps section labels in prompts get rendered as literal title-card text. Use lowercase prose structure.
- Quoted narrative phrases in prompts get rendered as literal text. Never quote dialogue/slogans in prompts.
- "Close-up" / "chest-up framing" directives push Imagen to zoom OUT, not in. Full-scene framing is more reliable.
- Unshakeable priors worth engineering AROUND rather than fighting: (a) "cigar in ashtray = ember hanging out" — we killed cigars entirely on Direct Order after 13 fight-rolls; (b) "venetian blinds cast stripes on any surface" — we either closed the blinds tight (Direct Order) or removed them entirely (Intercepted); (c) "plus-sized female character gets cartoon cheek-blush ovals" — explicit negative prompts don't eliminate, artifact subtle at card size; (d) "woman in office" prior pulls toward slim/average — name-referenced characters (Pam, Malory, etc.) override this cleanly.
- **Occasional total anomalies** — across ~50 rolls this session we hit 3: golden retriever on seaside, man standing at a cliff, CAD architectural drawing. Retry once per landmine (always fixed by second roll).
- **Direct Pam/Archer character references in prompts work.** Imagen doesn't safety-filter "modeled on Pam Poovey from the animated show Archer." We can use this for BURNED's roster-archetype characters in future scenes — Dolores Grieves (Pam) is the template.

### 4. Real-device playtest
Live 4-8 player test on iPad Pro 1366 + phones. Verify recent flows on real hardware:
- Triple-steal deferred commit — cards return on cancel, nope window opens AFTER the name.
- Favor-target banner + staging (no more sheet modal).
- Discard hero sizing reads from couch distance.
- Burned two-beat drama sequence on non-drawer phones.
- Sable's new portrait reads at card size.
- Card-drawn toast fires for the drawer (and ONLY the drawer) on a safe draw.
- `pnpm dev:launch` actually makes debugging easier.
- **Emil design pass (2026-04-21) — verify on-phone:** SmartActionBox `:active` scale(0.97) actually lands during breathing states (.action / .drawIntense / urgent intercept); card-tap squeeze at 0.98 reads as tactile and not too subtle; hand→enlarge blur doesn't read as "stutter" on Safari mobile; sheets press feedback doesn't fight overscroll gestures.
- **Emil design pass (2026-04-21) — verify on-TV:** briefing cascade (banner text → stamp → folder → player strip → idle ticker) reads as a coherent arc and not a list of competing entrances; the idle ticker doesn't become distracting once real COMMS events accumulate; Lobby disabled sheen is subtle enough to read as ambient and not gimmicky; status strip crossfade on turn handoff doesn't ghost under rapid state ticks.
- **Emil audit Phase 3 (2026-04-23) — verify on-phone:** StagingArea enlarge overlay no longer stutters mid-scale (blur-mask bridge); DefusePlacement ± steppers feel tactile at `scale(0.95)` press; PendingPromptBanner crossfade on defuse → favor-response prompt swap during a single pause reads as a status line, not a CTA flash.
- **Emil audit Phase 3 (2026-04-23) — verify on-TV:** NopeCountdownBar fade-in doesn't delay the intercept window perception; PendingPromptBanner 6px lift reads from couch distance; Lobby startButton hover lift works on desktop preview and doesn't stick on hybrid touch laptops; GameOver 80ms rankings stagger at 10 players feels like a cascade (not a drip).
- **Emil audit Q verification (2026-04-23) — decide on-TV:** Nameplate flip duration 400ms vs 250ms (crisp brass click vs heavy coin flip); Nameplate perspective 1000px vs 600px (flat fade-swap vs proper physical 3D rotation). See `docs/reviews/emil-audit-2026-04-23.md` §3.5 + §7.

### 5. 8-player stress test
Verify PlayerStrip layout at max count on real TV, COMMS scroll under event volume, nameplate legibility from couch distance.
**Landing gate:** at 1366×1024, strip math leaves ~34px headroom with all 10 tiles; verify at 1920 and 4K that tiles grow proportionally.

### 6. ~~Blotter content layout polish~~ [SUPERSEDED by Desk Redesign #1]
Options for the piles column: (a) vertically center the pile lockup, (b) scale the pile visual further, (c) decorative classified chrome (memo pad, paperclip). Briggsy's call at kickoff which direction feels right.

### 7. Live mid-play state verification — `tests/e2e/arena-states.spec.ts`
Playwright script: 3-player game, drive the `window.__gameStore` dev hook to force each state, screenshot each. Target states: Nope window mid-countdown, DramaOverlay (BURNED → EXTRACTED, ELIMINATED, INTERCEPTED, WINS), Favor banner + staging, Triple-steal name-card sheet pre-commit and post-name, FuturePeek (read-only and rearrange). Output to `temp/arena-states/` for eyeball review. Each state is ~30 min to script; ~3-4 hours for the full set.

### 8. Physical hardware verification
Push commits, deploy to Cloudflare Pages (wrangler), open on actual TV with phone controllers.

### 9. Extend PlayerAlert coverage (optional)
- **Reassign / Direct Order target** — no direct event type; victim only learns via `turn-started` with `turnsRemaining > 1`. Probably fine as-is because the target's phone sits dormant — when they come back, staging is lit and status reads "Your turn · 3 turns".
- **Your card was intercepted** — optimistic snapback + board DramaOverlay already communicate this, but explicit phone toast would remove ambiguity. Skip until playtest reveals confusion.

### 10. ~~Tier 2 retheme cleanup~~ [DONE 2026-04-22 `4df5f555`]
- Three unused `EK_*_MS` TIMING fields deleted (zero call sites — dead weight from old Phase 5 plan).
- `engine.ts` comments updated (EK → Burned vocabulary) + local variable `ek` renamed to `burned`.
- `deck-composition-exhaustive.test.ts` TABLE field `eks` renamed to `burned`.
- Arena.tsx docblock updated.
- `src/server/projection.ts:141` intentional "canonical Exploding Kittens" pointer left intact — that's documentation, not a retheme miss.

### 11. Execute Phase 5 — Verification & Acceptance
**`/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`**

### 12. Optional polish follow-ups
- **Brass studs on wood frame.** CSS pseudo-elements (small radial-gradient dots at regular intervals on `.woodTop/.woodBottom`).
- **Remove unused `public/assets/arena/mahogany.png`.** Superseded by the 4-edge split.

### 13. Optional test coverage expansion (deferred until visual layer stabilizes)
- **Card-drawn toast E2E** (~30 min). Extend Tier 1 spec: active phone taps `End turn · draw`, assert `PlayerAlert` renders `You drew {name}.`. Locks today's feature end-to-end.
- **Agent-X combo matrix** (~15 min). Add explicit tests to `combo-validation.test.ts` for `3× Agent X`, `2× Agent X + operative`, `Agent X + 2 matching operatives`. Belt-and-suspenders over the existing generic rule.
- **Pixel-diff regression** (~2h setup + ongoing baseline maintenance). Playwright `toHaveScreenshot()` with committed baselines. Requires `MotionConfig reducedMotion="always"` in test mode + fixed server RNG seed so baselines are deterministic. Defer until after Phase 5 lands — mid-rebuild baselines churn too fast.

## Landmines

### New this session (Direct Order + Intercepted regens — 2026-04-22)

- **New recurring BURNED NPC — DOLORES GRIEVES.** Debuted in the Intercepted card. Pam Poovey archetype (same 1:1 contract as Dash=Archer, Vera=Lana, Janet=Malory). Agency HR Director. Young platinum-blonde, high-upswept quiff, broad-shouldered plus-sized confident build, cream scoop-neck sweater + pearl choker + floral brooch, clipboard + thumbs-down = her denial move. If she appears in future cards/arena surfaces, preserve this character design. Her visual signature is the Pam vocabulary translated into our IP.
- **Imagen prior — "cigar in ashtray = ember hanging outboard."** Unbreakable through prompt text. Fought it 13 iterations on Direct Order before killing the cigar entirely (replaced with smoldering-embers-in-ash ashtray — no cigar geometry = no orientation fight). If future cards want a cigar, put it IN A HAND (where the grip naturally forces correct orientation) rather than in an ashtray.
- **Imagen prior — "venetian blinds cast stripes on any surface."** Unbreakable. Direct Order solved it by closing the blinds tight (slats shut, no light through). Intercepted solved it by removing blinds from the scene entirely. Either strategy works; negative prompts alone do not.
- **Imagen prior — "plus-sized female character gets cartoon cheek-blush ovals."** Persistent stylistic artifact across 18 Intercepted rolls. Explicit "no circular cheek marks, no cartoon blush ovals" negatives don't eliminate. At card size (160-300px) the marks dissolve; full-res they are stubbornly visible. Accepted on Intercepted.
- **Aggressive body-size metaphors backfire.** Words like "HULKING / TANK / NUKE / defensive lineman" reliably trigger Imagen to render the character SMALLER and zoom out. Calm specific physical markers ("broad shoulders, thick arms, plus-sized") work. Direct Pam Poovey reference ("modeled on Pam Poovey from Archer") overrides Imagen's generic-woman prior cleanly.
- **All-caps section labels in prompts render as title-card text.** "HR OFFICE SCENE" → rendered "HR OFFICE" banner at top of image. "HERO CHARACTER — NAME, TITLE" → rendered character name/title. Use lowercase prose structure.
- **Quoted narrative phrases in prompts render as literal text.** Putting `"you, you are on this"` in a Direct Order prompt produced `"#YOU, YOU ARE ON THIS"` as a top banner. Never quote dialogue/slogans.
- **"Close-up" / "chest-up framing" directives push Imagen to zoom OUT, not in.** Counterintuitive but consistent. Full-scene framing is more reliable than tight crops. If you must close-up, force the hero props into the framing clause repeatedly.
- **Tight close-ups drop hero props.** When framed as "close-up of character," Imagen drops the clipboard/stamp/cigar the character was supposed to be holding. Full-scene framing preserves the narrative gestures.
- **Direct character/IP references work.** "Visually modeled on Pam Poovey from the animated show Archer" renders cleanly — Imagen doesn't safety-filter this as character IP clone. Use it for BURNED's roster-archetype characters (Dash/Vera/Janet/Sable/Otto/Neal all have Archer 1:1 counterparts — reference them directly when needed, same way we did for Dolores=Pam).
- **Imagen anomaly retry pattern.** This session had 3 total-anomaly responses across ~50 rolls: golden retriever on a cliff (Direct Order iter 13), man standing on a seaside cliff (Intercepted A1 iter 1), CAD architectural drawing (Direct Order iter 17). Per prior landmine: retry once, always fixed by second roll.
- **MINIMUM VIABLE PROMPT WINS.** 18 iterations of accumulated prompt edits on Intercepted left us with a bloated prompt Imagen couldn't execute. Iter 13 "clean rewrite from scratch" — 5 short clauses, every element mentioned ONCE — was the turning point. For future cards: resist the urge to keep appending; rewrite clean when the prompt hits ~10+ paragraphs.

### New this session (Emil audit — 2026-04-23)

- **Two new motion tokens live in `motion.ts` + `primitives.css`: `stamp` (duration, 340ms) and `overshoot` (easing, `[0.34, 1.56, 0.64, 1]`).** Single-consumer currently (StealReport stamp animation), but the sync test enforces lockstep — deleting one without the other breaks builds. `--motion-duration-stamp` is decorative and correctly zeros under prefers-reduced-motion; the StealReport `.stamp` rule's `animation: none` reduced-motion override is belt-and-suspenders.
- **StealReport `.ackBtn` transition now consumes `--motion-duration-fast` + `--motion-ease-decelerate`.** If you re-add the `translateY(2px)` press depression without press scale, it'll read flat. The token swap landed 2026-04-23; don't revert to the hardcoded `0.12s ease` — it was explicitly flagged in the Emil audit (finding #6).
- **PlayerStrip `.presence` pulse uses `--motion-duration-pulse-slow` + `--motion-ease-base`.** Consistent with every other ambient loop in the codebase. The 2.4s hardcoded was orphan-drift — now 2.5s tokenized. Imperceptible on an infinite loop; don't re-hardcode.
- **`NopeCountdownBar` is wrapped in `AnimatePresence`.** The hook call order is safe (`useNopeCountdown` always runs; `isActive` is derived). The `barRef` attaches to `.fill` inside the `m.div` — imperative scaleX updates don't conflict with the parent's entry/exit scale, they're different elements. If you add more effects keyed on `isActive`, make sure they tolerate the ~150ms exit delay introduced by AnimatePresence.
- **`PendingPromptBanner` is keyed on `${playerId}:${type}`.** `AnimatePresence mode="wait"` handles prompt-to-prompt swaps (e.g. defuse → favor in the same pause). If you change the key shape, verify a two-step prompt sequence still crossfades instead of reusing the node and snapping text mid-read.
- **`StagingArea` enlarge overlay has the blur-mask bridge now.** Mirrors `Hand.tsx` enlarge. MinimalCard's container-query layout thresholds flip between scale 0.35 and 1; the 4px blur at endpoints masks the rejig. Don't exceed 6px — expensive on Safari mobile.
- **DramaOverlay fadeout uses GSAP `power2.out`, NEVER `power2.in`.** Emil rule #1: UI exits use ease-out because the user is watching most closely at the START of the exit. `power2.in` was the original and got swapped 2026-04-23 per Emil audit finding #8. If future drama beats land, inherit this pattern.
- **GameOver stagger is 80ms per row, NOT 120ms.** Play-again button delay tracks the new cadence (`0.8 + rankings.length * 0.08 + 0.3`). If you tune the stagger, update BOTH the ranking loop (`m.div.rank`) AND the play-again delay or the button will fire at the wrong moment.
- **Lobby `.startButton:hover` is gated behind `@media (hover: hover) and (pointer: fine)`.** The letter-spacing transition + hover change were both removed — layout-triggering property that cost frames every step of the breathing `::after` pulse. If you want a typographic hover flourish on this button, find a GPU-safe alternative (e.g. color swap on the `::before` `// ` bracket prefix).
- **DefusePlacement ± round buttons have `:active { scale(0.95) }`.** Deeper squeeze than the 0.97 default because small round buttons show less motion per unit-scale than text buttons. Still inside Emil's 0.95-0.98 subtle range. Don't go tighter than 0.93 — visible distortion on the border-radius and font.
- **Nameplate standby is a KEYED SUBJECT now — not a null branch.** `resolveSubject` always returns a `Subject`; `STANDBY_SUBJECT` has `key: 'standby'`, `name: '.'`, `subtext: 'Standby'`, `standby: true`. If you add new subject variants, include the `standby: false` flag or the wrapper opacity/name visibility behavior will desync. The name-hide selector is `.plateContent[data-standby='true'] .name { visibility: hidden }` — scoped to plateContent (not the parent `.nameplateStandby` className) SPECIFICALLY so the EXITING standby plate keeps its blank-name during its rotateY exit when the first turn starts. Reverting the selector to the parent class will briefly flash "." mid-flip on the game-start handoff.
- **`.nameplate` has `transition: opacity var(--motion-duration-slow) var(--motion-ease-base)` now.** Wrapper opacity moves from 0.55 (standby) to 1 (active) during the first coin flip. If you add an `.nameplate` opacity change for another reason (e.g. a fade-out on victory), the slow transition will govern it — budget for it or scope new opacity changes via a different selector.
- **EliminatedView skull `scale(0.6)` — NOT 0.4.** Per 2026-04-23 P2 triage. Still breaks Emil's 0.95 minimum because this is a peak-ceremony death stamp, but the break is less egregious than before. If real-device playtest shows 0.6 is too gentle (misses the stamp-impact punch), candidates are 0.5 or 0.55. Don't go back to 0.4 without a clear "yeah 0.6 lost the punch" verdict.
- **TargetSelect has a button stagger — NameCard does NOT.** The `@keyframes optionStagger` in `sheets.module.css` is scoped to `.optionList > .optionBtn` (TargetSelect-only). NameCard uses `.cardGrid` which is untouched — adding stagger to NameCard's 25 buttons would be ~1000ms cascade, motion soup atop the sheet slide-up. If you migrate NameCard to `.optionList` for shared button styles, the stagger will start firing there — verify it's wanted first.
- **TargetSelect per-button delay is inline `style={{ animationDelay: ${i * 40}ms }}`.** 40ms cascade lands inside Emil's 30-80ms stagger range. Max 9 buttons = 360ms total reveal. If you change the iteration (e.g. reorder players), the delay tracks the map index, which should be fine — but don't key on `p.id` hash if you want deterministic reveal order.
- **PlayerStrip `.tile::before` uses `transform: scaleY()` — NOT `height`.** Hairline height is fixed at 3px (max). Idle state is `scaleY(0.667)` ≈ 2px perceived; active is `scaleY(1)` ≈ 3px. `transform-origin: top` so growth happens downward into the tile. If you tweak the active/idle heights, adjust the scaleY ratio — don't re-introduce a `height` transition (GPU-composited transform is the whole point of the swap).

### New this session (Emil review — 2026-04-21)

- **Framer owns transforms on `.slot` (Hand) and `.tile` (PlayerStrip).** If you want `:active` or CSS transitions on either, apply to the inner element instead (`.card` inside the slot via MinimalCard; CSS `.tile[data-active]` inside PlayerStrip). Writing `transform` in CSS on the outer Framer element loses the cascade war — Framer writes inline style which wins. I reverted a false-start `.slot:active { scale }` in Hand.module.css for exactly this reason. See `caad694c` for the correct pattern.
- **SmartActionBox `:active` needs `animation: none`.** CSS animations from `breathe`, `breatheIntense`, and `interceptPulse` (`--motion-duration-essential-pulse`) write `transform: scale(1 → 1.01/1.03)` every frame and will override `:active { scale(0.97) }` unless the animation itself is suspended during press. The `:not(:disabled):not([aria-disabled="true"]):active { animation: none; transform: scale(0.97) }` rule does this — on release, the animation re-runs from frame 0 (brief jump, acceptable). Don't remove `animation: none`.
- **`--motion-ease-accelerate` is still an ease-in curve.** Never point UI exit transitions at it. Emil's rule: `ease-in` delays the start of an exit, reading as sluggish. `MOTION.exit` is now correctly `decelerate`-based, but new code that hand-picks easings should avoid `accelerate` for UI.
- **Case banner cascade timings are load-bearing on the blotter arc.** `GameTable.module.css` sequences: label 50ms, operation 120ms, sub 190ms, divider 260ms, footer 330ms, stamp 450ms, `DrawPile.topCard` 700ms, topSecretLabel 1000ms, fileNumber 1100ms. If you tighten any of them, check the whole arc still feels like "briefing begins → impact → folder lands" and not "everything appears at once."
- **DrawPile `.stack` has an infinite breathe on scale; don't add scale to `.topCard`.** The mount animation for `.topCard` is `translateY + opacity` only. If you add scale to `.topCard`, it compounds with the parent's breathing scale (1.025) and the folder visibly throbs. `translateY(-24px → 0)` is the safe axis.
- **MinimalCard `:active` scope — exclude `[data-selected]` and `[aria-disabled='true']`.** `[data-selected]` has `transition: none` to dodge the layoutId reflash landmine; pressing a selected (staged) card shouldn't re-scale anyway. `[aria-disabled='true']` applies to DiscardFan cards that shouldn't respond to touch. The current selector is `.card:not([aria-disabled='true']):not([data-selected]):active` — keep both exclusions.
- **Status strip key is `statusText || '__standby__'`.** Falsy statusText maps to the `// STANDBY` placeholder; an unkeyed AnimatePresence branch would break `mode="wait"`. Don't key on `statusText` directly or the placeholder leg will desync.
- **Lobby disabled sheen uses layered backgrounds, not a pseudo-element.** The button's `:disabled` background is a 2-layer `linear-gradient(105deg, ...), color-mix(teal, charcoal)` stack. `::after` is `display: none` in the disabled state; `::before` owns the `// ` prefix. Don't try to move the sheen to a pseudo — it's cleaner as a background-position animation.
- **`keyframes stampDrop` and `caseBannerLineIn` exist in GameTable.module.css; `topCardDrop` and `topCardLabelIn` are in DrawPile.module.css.** Two component-scoped files own the briefing cascade between them. If you're hunting for the timing definitions, they are NOT in `tokens/primitives.css`.

### New this session (evening)

- **Imagen quirks cataloged.** Over ~60 card regens this session, Imagen-4 repeatedly failed at: (1) **rendering legible text** — any "rubber stamp", "document with text", "tag", "sign", or "labeled photo" in a prompt comes back as gibberish or creates text-like shapes even with explicit "NO TEXT" instructions; (2) **hand counts** — "two hands" at a bar or table reliably renders 3-4 hands unless you explicitly state "one hand in frame, other hands tucked out of view"; (3) **cigarette orientation** — will reverse filter/lit-end ~50% of the time no matter how explicit the prompt; (4) **symmetrical subjects read as "twins"** — two men at a bar default to mirror silhouettes unless given strong differentiators (fedora + bald, suit-color contrast); (5) **"slide" across a surface** — Imagen lifts objects into the air by default; forcing "flat contact with wood surface" + "no held in air" + no motion-line adjective is the only reliable way to land a sliding-object composition; (6) **occasional total anomalies** — Imagen has returned a photorealistic tabby cat AND a plaid-shirt portrait when asked for spy scenes (retry once, per prior landmine).
- **"Birthday card envelope" trap.** Imagen renders "envelope" as a pristine thin white greeting-card shape by default. No amount of "manila", "folded", "rubber-banded", or "Sopranos-style" language reliably breaks this. When the card is supposed to suggest cash, pivot to a visible cash stack directly (no envelope wrapper). Confirmed across ~15 failed call-in-a-favor iterations.
- **Full-bleed is now the set standard.** Every elevated action card fills the square frame edge to edge with scene content. The Apr-9 cards that still have white/cream vignettes (Burned, Direct Order, Intercepted) are the visual-cohesion gap in the current deck. Prompt pattern: `'the scene fills the entire square frame edge to edge with NO white borders NO vignette NO padding'`.
- **Critical-eyeball-before-presenting is non-negotiable.** The call-in-a-favor grind burned ~1.10 USD and session time largely because multiple iters were presented with hopeful descriptions ("cash is clearly sliding") when the image showed something different (cash floating, 3 hands, trapezoid shadows). Tell Briggsy what you actually see — including the flaws — before he has to point them out.

### New this session (morning)

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
