# Emil Full-Repo Audit — Phase 1 (Inventory + Findings)

**Date:** 2026-04-23
**Scope:** `src/client/**` (phone + board + shared). Doc-only — no code changes this phase.
**Methodology:** Per `/emil-design-eng` skill (Emil Kowalski's decision framework and Review Format).
**Acceptance test:** *Could this frame ship in an Archer episode?* (per `PRODUCT-SPECIFICATION.md` §2).

---

## 1. How to read this document

- One section per component file or cluster. Each section is a Before/After/Why table (Emil's required Review Format).
- **No row = no issue found.** Sections with no table mean the component was checked and is already Emil-compliant.
- Findings are tagged with severity:
  - **P1 — regression / clear violation.** Fix in Phase 3.
  - **P2 — polish gap / low confidence.** Needs Briggsy's taste call in Phase 2 triage.
  - **Q — stylistic debate.** Document it; may intentionally diverge from Emil.
- Each finding includes the file + line. If no line, the finding is whole-component.

**Explicitly out of scope (per TODO.md §2):**
- Apr-21 Emil-review landmines (Hand `.slot` outer, PlayerStrip `.tile` outer, SmartActionBox `:active` breathing states, case-banner cascade, DrawPile `.stack`+`.topCard`, MinimalCard `:active` scope, status-strip key pattern, Lobby disabled sheen).
- Desk redesign surfaces (BlotterContent, DossierFeed, Nameplate visual layer, DiscardFan tabletop shadows, DrawPile `.topCard` shadows + `.countBadge`, desk-surface wood gradient).
- Server, shared protocol, tests. Non-Emil concerns (a11y beyond motion, bundle size, correctness).

---

## 2. Repo-wide summary

**What's already Emil-grade (good news):**

- Motion tokens (`motion.ts` / `primitives.css`) are strong: iOS-drawer base + Emil's ease-out decelerate `[0.23, 1, 0.32, 1]`, snappy / deliberate / punchy / gentle springs, named-preset mapping (`MOTION.quickFade/enter/exit/snappy/etc.`). `motion-token-sync.test.ts` enforces lockstep with CSS.
- Zero `transition: all` in the codebase (Grep verified).
- Zero `scale(0)` entry animations (one mention — a comment in EliminatedView explicitly documenting the rule).
- Framer Motion shorthand `x`/`y`/`scale` is NOT used on any `m.*` animating component. Every site uses `transform: 'translate…/scale…'` strings (GPU-composited, survives WS-hot paths).
- `LazyMotion strict` in MotionProvider — means only `m.div` (not `motion.div`) compiles. Zero leakage in the tree.
- `MotionConfig reducedMotion="user"` honors OS setting. Dual-family motion tokens (decorative zeroed / essential slowed) in `primitives.css` `@media (prefers-reduced-motion: reduce)`.
- Press feedback (`:active { scale(0.9x) }`) lands on every primary tap target on the phone (SmartActionBox, JoinScreen joinButton, all four sheet buttons, MinimalCard, GameOver playAgain, StealReport ackBtn, Lobby startButton). `interactions.module.css` `.pressable` composes utility exists for any new button.
- Hover gating (`@media (hover: hover) and (pointer: fine)`) present on MinimalCard, JoinScreen, SmartActionBox `.draw`/`.intercept`, GameOver.playAgain.
- Emil's blur-mask crossfade trick is correctly used in three places: Hand enlarge overlay, DramaOverlay multi-beat bridge, and the MinimalCard container-query rejig.
- `@starting-style` in use on StatusBar and JoinScreen `.iconWrap` — modern CSS, progressive.
- `backface-visibility: hidden` + `transform-style: preserve-3d` correctly applied to Nameplate `.plateContent` for the coin flip.

**Highest-value fixes (P1, quick wins):**

1. Lobby `.startButton:hover` is **not gated** by `@media (hover: hover)` — only hover rule in the repo without the guard. Sticky hover on touch devices on the most-visible first-impression button.
2. DramaOverlay fade-out uses GSAP `power2.in` (an ease-in curve) — Emil's hard no for UI exits. The element the user is watching delays its movement, reading as sluggish at the exact moment of handoff.
3. StealReport `.ackBtn` and `stampThunk` bypass the motion-token system — hardcoded durations and generic `ease`. Drift risk if tokens move.
4. PendingPromptBanner and NopeCountdownBar have **no entry/exit animation** — both appear and disappear hard. Banners are among the most jarring surfaces when they pop in.
5. Lobby startButton transitions `letter-spacing` on hover — layout-triggering property, not on Emil's "transform + opacity only" safe list.

**Biggest stylistic debate (Q):**

- **Two animation libraries.** DramaOverlay is pure **GSAP**; the rest of the app is **Framer Motion**. Duplication of animation primitives, two models for timing/easing, two bundles. Either port DramaOverlay to Framer `AnimatePresence` + timeline via `useAnimate`, or accept GSAP as the "cinematic beats only" tool and document that boundary in the spec. Not a correctness issue today but worth a deliberate decision before future drama events land.

---

## 3. Board components

### 3.1 `Lobby.module.css` / `Lobby.tsx`

| Before | After | Why |
| --- | --- | --- |
| `.startButton:hover { transform: translateY(-2px); letter-spacing: 0.22em; box-shadow: … }` (CSS:360, unguarded) | Wrap in `@media (hover: hover) and (pointer: fine) { .startButton:hover { … } }` | **P1.** Only unguarded `:hover` in the repo. Hybrid touch devices (iPad with trackpad, phones in desktop-site mode, devtools emulation) fire sticky hover on tap. First-impression button. Match the pattern used in GameOver.playAgain, JoinScreen.joinButton, SmartActionBox.draw/intercept, MinimalCard.card. |
| `transition: transform var(--motion-duration-fast) var(--motion-ease-base), letter-spacing var(--motion-duration-slow) var(--motion-ease-base);` (CSS:317-319) | Drop the `letter-spacing` leg. Transition `transform, box-shadow` only. | **P1.** `letter-spacing` triggers layout — not on Emil's `transform + opacity only` GPU-composited list. Costs frames on the TV viewport during the breathing `::after` pulse. The letter-spacing change on hover can be instant (no transition) and still feel intentional. |
| `:active { transform: translateY(1px); … }` (CSS:371, no scale) | Add `scale(0.97)` or switch to translateY + scale composite. | **P2.** Press feedback is a translateY-only depression ("push the button down"), not Emil's canonical `scale(0.97)` squeeze. Works as metaphor, but feels less tactile than the other buttons in the app. Briggsy's call — consistency vs. the stamp-button vocabulary. |
| Roster: `transition={{ ...MOTION.snappy, delay: i * 0.06 }}` (TSX:70) — 60ms stagger | Keep. | **No finding.** Within Emil's 30-80ms window. |
| `lobbyDotPulse` three-dot waiting animation (CSS:289, `ease-in-out` infinite pulse) | Keep. | **No finding.** Steady-state oscillation, not a UI enter/exit. Emil's `ease-in` rule targets transitions, not infinite loops. |

### 3.2 `PlayerStrip.module.css` / `PlayerStrip.tsx`

| Before | After | Why |
| --- | --- | --- |
| `.presence { animation: presencePulse 2.4s ease-in-out infinite; }` (CSS:90) | `animation: presencePulse var(--motion-duration-pulseSlow) var(--motion-ease-base) infinite;` | **P2.** Hardcoded duration (`2.4s`) and `ease-in-out` keyword bypass the motion-token system. `--motion-duration-pulseSlow` is 2.5s (semantically: "breathing indicator"). Drift risk: if pulse-slow gets retuned, presence oscillation stays orphaned. `ease-in-out` is acceptable for infinite loops per Emil, but `var(--motion-ease-base)` is what every other loop in the codebase uses — consistency. |

Tile entry/active-state CSS is correctly Apr-21-Emil-reviewed (excluded).

### 3.3 `NopeCountdownBar.module.css` / `NopeCountdownBar.tsx`

| Before | After | Why |
| --- | --- | --- |
| Component renders/unrenders hard when the nope window opens/closes (TSX:10 early-return `null`) | Wrap in `AnimatePresence` + `m.div` with enter `opacity: 0, scale(0.98)` → `1, scale(1)` and exit reverse, `MOTION.quickFade`. | **P1.** This is the single most time-critical board affordance — the ochre bar fills the screen from the center and defines the intercept window. Appearing hard without a fade reads as a bug, not an intent. 150ms quickFade is long enough to signal intent, short enough to not delay the intercept window itself. |
| `.fill { transform-origin: left center; will-change: transform; }` — scaleX driven imperatively by `useNopeCountdown` | Keep. | **No finding.** Correct pattern — JS imperatively animates via requestAnimationFrame against the deadline. `transform-origin: left center` is correct for a right-to-left contract. |

### 3.4 `PendingPromptBanner.module.css` / `PendingPromptBanner.tsx`

| Before | After | Why |
| --- | --- | --- |
| Component renders/unrenders hard when `pendingPrompt` appears/resolves (TSX:20 early-return `null`) | Wrap the banner in `AnimatePresence` + `m.div`. Key on `${prompt.playerId}:${prompt.type}` so a prompt-type swap crossfades. Enter `opacity: 0, transform: 'translateY(-6px)'` → `1, translateY(0)`; exit reverse. `MOTION.quickFade`. | **P1.** Same reasoning as NopeCountdownBar. Game-waiting-on-a-decision is a *significant* state; the banner popping in creates a "did something break?" moment. The text field can also change mid-prompt (same prompt type, different player under attack stacking) — keyed AnimatePresence handles the swap smoothly. |
| Container `.banner` has no transition (CSS:9-21) | Let Framer own the motion. CSS stays static. | Keeps responsibility clear: Framer for enter/exit/swap; CSS for paint. Matches StatusBar pattern. |

### 3.5 `Nameplate.tsx` / `Nameplate.module.css`

Nameplate's *visual layer* is desk-redesign-excluded. But the coin-flip motion is fair game for audit.

| Before | After | Why |
| --- | --- | --- |
| `transition={{ duration: MOTION_DURATIONS.slow, ease: MOTION_EASINGS.emphasized }}` (TSX:99-102) — 400ms + emphasized curve for a 180° rotateY | Consider `MOTION_DURATIONS.base` (250ms) for the same curve, OR keep slow and verify on TV. | **Q.** 400ms for a turn-handoff that can fire on every card play is at the top of Emil's modal-only range. Feels like a coin flip at the edge of too-slow for a 4-player game where turns rotate fast. 250ms would land more like a crisp brass click. Needs on-TV verification before deciding. |
| `perspective: 1000px` on `.nameplate` (grandparent of `.plateContent`) — CSS:27 | Consider moving perspective to `.plate` (direct parent) OR reducing to `~600px` for a more dramatic 3D arc. | **Q.** 1000px at grandparent distance flattens the 3D effect. The plate reads more like a 2D fade-swap than a physical coin flip on low-res TVs. Closer perspective would fish-eye — which IS the desired "desk object rotating in your hand" vocabulary. Needs on-TV verification. |
| Standby branch (TSX:73-84) hard-renders without AnimatePresence exit | Either absorb standby into the flip flow (render `subject.key === 'standby'` as a keyed variant) OR leave as-is since standby-to-active is a rare transition. | **P2.** Currently a standby→first-turn transition hard-swaps the DOM structure; doesn't match the otherwise-smooth coin flip. Low frequency though — game start only. |
| `backface-visibility: hidden` + `transform-style: preserve-3d` on `.plateContent` (CSS:91-92) | Keep. | **No finding.** Correct pattern. |

### 3.6 Board entry components (Board.tsx, GameTable.tsx, DrawPile, DossierFeed, BlotterContent, DiscardFan)

Excluded per TODO.md §2 (Apr-21 review + desk redesign). Not audited this pass.

---

## 4. Phone components

### 4.1 `JoinScreen.module.css` / `JoinScreen.tsx`

| Before | After | Why |
| --- | --- | --- |
| `.joinButton:hover { opacity: 0.9 }` (CSS:128, inside hover-media guard) | Consider adding `transform: translateY(-1px)` to match the Lobby startButton hover vocabulary (desktop first-impression parity). | **Q.** Stylistic — phones don't render hover at all, so this only affects desktop preview / QA. Current "opacity dip" is subtler than the Lobby lift; may be intentional to keep the phone view looking phone-like. |
| `.input:focus { border-color: var(--color-accent-drama); }` with transition on `.input` (CSS:94, transition border-color only) | Keep. | **No finding.** Focus color transition with token-driven duration + easing. |
| `.iconWrap` uses `@starting-style` + `anticipate` easing (slow, 400ms) for a pop-in (CSS:282-295) | Keep. | **No finding.** `anticipate` curve `[0.68, -0.55, 0.265, 1.55]` has the overshoot Emil allows for "first impression" decoration. Single-fire on dossier mount — rare enough to delight. |
| `joinScreenDots` animation uses `steps(4, end)` for typewriter-style dots (CSS:368) | Keep. | **No finding.** Deliberate discrete stepping for typewriter vocabulary, per Archer mono font choice. |

### 4.2 `SmartActionBox.module.css` / `SmartActionBox.tsx`

Apr-21-Emil-reviewed for `:active` breathing-state interaction. Re-verified.

| Before | After | Why |
| --- | --- | --- |
| `transition: background, border-color, box-shadow, transform` all at `var(--motion-duration-fast)` (CSS:33-37) | Keep. | **No finding.** All four are GPU-safe OR required for variant swaps. Duration ties to token. |
| `.draw:hover { background: var(--color-bg-interactive-hover); }` — inside hover-media guard | Keep. | **No finding.** Correctly gated. |
| `m.button` / `m.div` entry+exit `scale(0.96)` + opacity with `MOTION.quickFade` (TSX:107-121) | Keep. | **No finding.** Emil-spec. Keys on `state.key` so variant swaps crossfade via AnimatePresence `mode="wait"`. |

### 4.3 `StagingArea.tsx` / `StagingArea.module.css`

| Before | After | Why |
| --- | --- | --- |
| Enlarge overlay `initial={{ transform: 'translateY(-80px) scale(0.35)' }}` (TSX:163) — no `filter: blur(4px)` bridge | Add `filter: 'blur(4px)' → 'blur(0px)' → 'blur(4px)'` alongside scale (mirror Hand.tsx:154-156). | **P1.** Hand's enlarge overlay uses the blur-mask trick correctly because MinimalCard's container-query layout flips thresholds mid-scale. StagingArea's enlarge uses the SAME MinimalCard, scales from 0.35 → 1, but has NO blur bridge — so the container-query threshold rejig visibly stutters mid-animation on phone Safari. Copy the exact pattern from Hand.tsx. |
| Staged cards `layout="position"` + `transition={MOTION.snappy}` (TSX:109-110) | Keep. | **No finding.** Snappy spring is right for small-swap reordering when cards unstage. |
| No stagger delay on initial staged-card mount — cards pop-layout from hand | Keep. | **No finding.** Staging is user-driven one-at-a-time; stagger would feel artificial. |

### 4.4 `Hand.tsx` / `Hand.module.css`

Apr-21-Emil-reviewed for `.slot` outer + blur-mask + press feedback. Re-verified.

| Before | After | Why |
| --- | --- | --- |
| Card deal: `delay: dealComplete ? 0 : i * 0.08` (TSX:111) — 80ms stagger | Keep. | **No finding.** Top of Emil's 30-80ms range. Deliberate dealing beat. |
| Exit `scale(0.7)` (TSX:105) | Keep. | **No finding.** Emil's `scale(0)` rule is for *entry*, not exit. Scale-shrink on exit is a valid "card leaving hand" gesture. |
| Blur-mask bridge on enlarge (TSX:154-156) | Keep. | **No finding.** Emil-canonical. |

### 4.5 `PlayerAlert.tsx` / `PlayerAlert.module.css`

| Before | After | Why |
| --- | --- | --- |
| Initial `translateY(-80px) scale(0.96)` → `translateY(0) scale(1)` (TSX:166-168) | Keep. | **No finding.** Transform string, scale(0.96) within Emil range, MOTION.snappy spring. |
| Auto-dismiss after 2800ms (TSX:152) | Keep. | **No finding.** Aligned with content: two-line mono toast with ~8-12 words needs ~2-3s reading time. |

### 4.6 `ErrorToast.tsx` / `ErrorToast.module.css`

| Before | After | Why |
| --- | --- | --- |
| TSX owns motion; CSS is paint-only per deliberate Apr-21 refactor (comment CSS:13-17) | Keep. | **No finding.** Correct pattern — the prior double-animate bug is fixed and the landmine is documented. |

### 4.7 `StealReport.tsx` / `StealReport.module.css`

| Before | After | Why |
| --- | --- | --- |
| `.ackBtn { transition: transform 0.12s ease, box-shadow 0.12s ease; }` (CSS:274) | `transition: transform var(--motion-duration-fast) var(--motion-ease-decelerate), box-shadow var(--motion-duration-fast) var(--motion-ease-decelerate);` | **P1.** Hardcoded `0.12s` duration + generic `ease` keyword bypass the token system. Drift risk if tokens are retuned. `--motion-duration-fast` is 150ms, close enough, and `decelerate` is the Emil-canonical press-feedback curve. |
| `.stamp { animation: stampThunk 0.34s cubic-bezier(0.34, 1.56, 0.64, 1) 0.32s both; }` (CSS:216) | Consider: introduce `--motion-duration-stamp` + `--motion-ease-overshoot` tokens and consume them, OR move the 340ms + curve into `motion.ts` as a named constant the CSS mirrors. | **P1.** Two hardcoded values + a bespoke cubic-bezier with overshoot. It's the signature motion of the steal report — the stamp thunk is a load-bearing moment. That's exactly why it should be token-driven: future adjustments (slower for less-dramatic whiff variant? faster for stacked steals?) need a single knob. |
| `stampThunk` keyframe `0% { scale(2.1); opacity: 0 }` — dramatic zoom-down entry (CSS:225) | Keep. | **No finding.** Zoom-DOWN from oversized is Emil-kosher (like GameOver winner `scale(1.4) → 1`). The scale(2.1) is out-of-frame when animation starts, so no "pop from nothing" violation. |
| Paper `rotate(-9deg)` initial on enter (TSX:132) | Keep. | **No finding.** Deliberate dispatch-document tilt. |
| Backdrop has `backdrop-filter: blur(8px)` (CSS:38-39) | Keep. | **No finding.** Scrim blur is Emil-approved; kept under heavy-blur threshold. |

### 4.8 `EliminatedView.tsx` / `EliminatedView.module.css`

| Before | After | Why |
| --- | --- | --- |
| Skull `initial={{ transform: 'scale(0.4) rotate(-15deg)' }}` (TSX:36) | Consider raising to `scale(0.6)` or `scale(0.7)` with the same rotation. | **P2.** The inline comment (TSX:33) acknowledges Emil's rule and explicitly chose 0.4 "for punch." Emil's guidance is 0.95 minimum, with higher scales being the default. 0.4 is aggressive — arguably too aggressive to read as "silhouette from nothing" on phones where the skull emoji is ~72px final size. Briggsy's taste call: does the dramatic stamp-impact punch justify breaking the rule here, or does 0.6-0.7 preserve most of the punch with less rule-break? Needs on-phone eyeball. |
| Flavor-line + alive-list + prompt each have their own `transition={{ ...MOTION.snappy, delay: 0.2/0.5/0.7/1.0 }}` (TSX:47/56/65/80) — cascading 200-300ms stagger | Keep. | **No finding.** This is a one-shot "you died" ceremony — long, deliberate staggers are appropriate for a peak-and-end moment, not for everyday UI. |
| Skull filter uses `drop-shadow` (CSS:36) | Keep. | **No finding.** SVG/emoji drop-shadow is GPU-accelerated. |

---

## 5. Shared components

### 5.1 `DramaOverlay.tsx` / `DramaOverlay.module.css`

| Before | After | Why |
| --- | --- | --- |
| Fade-out uses GSAP `ease: 'power2.in'` (TSX:170 and TSX:176) | `'power2.out'` OR `'power3.out'`. | **P1.** `power2.in` is the GSAP equivalent of CSS `ease-in` — starts slow, accelerates. Emil's core rule: "Never use ease-in for UI animations. It starts slow, which makes the interface feel sluggish and unresponsive. A dropdown with ease-in at 300ms feels slower than ease-out at the same 300ms." Drama overlays are high-attention moments — the fadeout is the handoff to the next beat (in multi-beat sequences) or to normal gameplay. Starting slow delays that handoff at the exact moment the user's anticipation is peaking. The blur-mask trick (TSX:168) further amplifies the slow start — blur visibility lingers. |
| Blur defocus during fadeout (TSX:167-171) — bridges to next beat | Keep. | **No finding.** Emil's crossfade-mask trick, correctly used for the multi-beat burned sequence. |
| Entry `scale: 2.5 → 1` with `back.out(1.1)` (TSX:150-160) | Keep. | **No finding.** Subtle overshoot, Archer-deadpan per TSX:156 comment. Scale-DOWN entry from oversized is Emil-kosher. |
| Uses **GSAP** (TSX:2, `import gsap from 'gsap'`) while the rest of the app uses **Framer Motion** | **Q — architectural decision.** Options: (a) port to Framer `AnimatePresence` + `useAnimate` timeline; (b) keep GSAP, add spec note "DramaOverlay is a cinematic-beat surface; GSAP handles timeline-heavy moments, Framer handles UI state." | **Q.** Two libraries for animation is strictly worse than one unless there's a capability gap. GSAP timeline IS cleaner than useAnimate for multi-step sequences, so option (b) has a defensible case. Bundle cost: GSAP adds ~30KB gzipped (lazy-loaded? needs verification). Currently the only GSAP consumer — porting would eliminate a dependency entirely. Briggsy / ATC call. |
| Overlay mounts with `style={{ opacity: 0 }}` and uses imperative GSAP `.set()` + timeline (TSX:181) | Keep if GSAP stays. | **No finding.** Imperative is correct for timeline-based work. |

### 5.2 `GameOver.tsx` / `GameOver.module.css`

| Before | After | Why |
| --- | --- | --- |
| Rankings stagger `delay: 0.8 + i * 0.12` (TSX:85) — **120ms per rank** | Reduce to `delay: 0.8 + i * 0.06` (60ms) or `0.08` (80ms). | **P1.** Emil recommends 30-80ms between staggered list items — "Keep stagger delays short (30-80ms between items). Long delays make the interface feel slow." 120ms per rank with up to 10 players = 1.2s of stagger on top of the existing 0.8s winner delay — total reveal takes ~2s after the winner appears. The ceremony moment can afford MORE delay than everyday UI, but 120ms is roughly double the upper bound. 80ms keeps the cascade beat while trimming ~400ms off the total ceremony. |
| Winner `initial={{ transform: 'translateY(-20px) scale(1.4)' }}` (TSX:53) — zoom-DOWN entry | Keep. | **No finding.** Scale-DOWN entries are Emil-kosher. |
| `gameOverPulse` halo animation (`opacity: 0.3 → 0.8`, `ease-base`, infinite) (CSS:142, 147) | Keep. | **No finding.** Opacity-only pulse is GPU-composited; steady-state loop with token-driven duration. |
| `.playAgain:hover { transform: scale(1.04) }` (CSS:154) — inside hover-media guard | Keep. | **No finding.** Correctly gated. |
| `.playAgain:active { scale(0.97) }` (CSS:159) | Keep. | **No finding.** |
| Play-again button delay `0.8 + rankings.length * 0.12 + 0.3` (TSX:104) — reveals LAST | Recalculate if stagger drops to 80ms: `0.8 + rankings.length * 0.08 + 0.3`. | **P1 coupling.** Follow the stagger fix. Currently the button delay tracks the stagger cadence — whatever the stagger becomes, the button delay follows. |

### 5.3 `MinimalCard.tsx` / `MinimalCard.module.css`

Apr-21-Emil-reviewed for `:active` scope. Re-verified.

| Before | After | Why |
| --- | --- | --- |
| `transition: transform var(--motion-duration-fast) var(--motion-ease-decelerate);` on `.card` (CSS:58) | Keep. | **No finding.** Correct token + only transform + comment explains landmine with `[data-selected]`. |
| `.card:hover { transform: translateY(-4px); }` inside hover-media guard | Keep. | **No finding.** |
| `.card::after` glow — `transition: opacity var(--motion-duration-fast) var(--motion-ease-decelerate);` (CSS:100) | Keep. | **No finding.** Opacity-only transition on a pseudo — GPU-composited. |
| `[data-selected] { transition: none; }` (CSS:128, 133) | Keep. | **No finding.** Documented landmine — prevents Framer layoutId flash. |
| `.card:not([aria-disabled='true']):not([data-selected]):active { transform: scale(0.98); }` (CSS:122) | Keep. | **No finding.** Apr-21 landmine-locked scope. |
| `@media (prefers-contrast: more) { … border: 2px solid }` + `@media (forced-colors: active)` (CSS:258, 275) | Keep. | **No finding.** A11y — not an Emil concern but worth noting as good practice. |

### 5.4 `BottomSheet.tsx` / `BottomSheet.module.css`

| Before | After | Why |
| --- | --- | --- |
| `initial={{ transform: 'translateY(100%)' }}` → `'translateY(0%)'` — full-height slide (TSX:45-47) | Keep. | **No finding.** Emil-canonical (referenced Vaul/Sonner pattern). Percentage-based `translateY(100%)` adapts to content height. |
| `MOTION.snappy` spring for slide (TSX:48) | Keep. | **No finding.** |
| `onExitComplete={() => dialogRef.current?.close()}` defers close until animation finishes (TSX:38) | Keep. | **No finding.** Emil-correct — native `<dialog>` close() fires only after the exit animation is committed. |
| `.dialog::backdrop { background: var(--color-bg-overlay-light); }` — no transition on backdrop | **Q.** Browser support for `::backdrop` transitions is inconsistent (Safari lags). Accept non-transitioning backdrop. | **No finding.** Known browser limitation, not a code quality issue. |

### 5.5 `sheets.module.css` + sheet components (TargetSelect, NameCard, DefusePlacement, FuturePeek)

| Before | After | Why |
| --- | --- | --- |
| `.optionBtn`, `.cancelBtn`, `.confirmBtn`, `.quickBtn` all have `:not(:disabled):active { transform: scale(0.97); background?: … }` + token-driven transitions (CSS:78, 111, 140, 173) | Keep. | **No finding.** Every sheet button has press feedback. Emil-spec. |
| `.peekSlot` opacity transition for `[data-tapped]` fade (CSS:280-285) | Keep. | **No finding.** Opacity-only transition, Emil-canonical. |
| `NameCard.tsx` card grid (2-col grid of buttons) — no stagger on entry | **P2.** Consider adding `animation: staggerFade … calc(var(--i) * 40ms) backwards;` with `style={{ '--i': i }}` on each button. | **P2.** The grid pops all 12+ buttons in together when the sheet slides up. Staggered reveal (30-50ms each) would read as "cards flipping face-up on the table" instead of "menu appears." Polish gap, not a regression — sheet slide-up masks most of the issue. |
| FuturePeek `.peekScroll` scroll-snap with no motion on card tap — just the data-attribute opacity fade | Consider adding a subtle scale(0.97) press feedback on `.peekSlot[data-tapped]` — they ARE pressable. | **P2.** Tap response is opacity-only right now; scale would make the tap feel heard. |
| TargetSelect button list — no stagger | **P2.** Same as NameCard — minor polish gap. | **P2.** |
| DefusePlacement `.positionInput button` (`+`/`-` steppers) — no press feedback (CSS:187-202) | Add `transition: transform var(--motion-duration-fast) var(--motion-ease-decelerate);` + `:active { transform: scale(0.93); }` (smaller buttons, deeper squeeze per Emil's subtle-but-proportional rule). | **P1.** Every other pressable in the sheet family has `:active` scale. The `±` round buttons are the ONE exception. High-repetition tap target (stepping through 30+ positions). Needs feel-feedback. |

### 5.6 Other shared (CardIllustration, ReducedMotionProvider, PlayerIcon, announce, haptics, card-accents, card-icons, ErrorBoundary)

Audited — no motion, no interaction concerns. Skip.

---

## 6. Cross-cutting findings

### 6.1 Transition property scope

Grep of `transition:` declarations:

- `transition: all` — **0 occurrences** ✅
- `transition: opacity …` — every site opacity-only ✅
- `transition: transform …` — every site transform-only or transform+opacity composite ✅
- `transition: <layout property>` — **2 occurrences**:
  - Lobby `letter-spacing` transition (see §3.1) — **P1**
  - PlayerStrip `.tile::before { transition: background, height }` (CSS:74-77) — `height` triggers layout, but the hairline is only 2-3px and transitions on active-swap (low frequency). **Q** — could swap to `transform: scaleY()` with `transform-origin: bottom`. Marginal.

### 6.2 Hover gating

Every `:hover` rule across the client:

- GameOver.playAgain ✅ gated
- MinimalCard.card ✅ gated
- JoinScreen.joinButton ✅ gated
- SmartActionBox .draw ✅ gated
- SmartActionBox .intercept ✅ gated
- **Lobby.startButton ❌ NOT gated** — see §3.1

### 6.3 Essential vs decorative motion tokens

The two-family token system (`--motion-duration-essential-*` surviving reduced-motion; decorative zeroed) is well-documented in `primitives.css` and correctly consumed in:
- JoinScreen spinner ✅
- ConnectionOverlay spinner ✅
- SmartActionBox breathe/breatheIntense/interceptPulse ✅
- TitleBar blink ✅

No rogue decorative animation is surviving reduced-motion. Correct scoping.

### 6.4 Framer Motion transform shorthand audit

Grep verified: zero `animate={{ x: …, y: …, scale: … }}` shorthand usage. Every `m.*` animation uses `transform: 'translate…/scale…/rotate…'` strings. GPU-composited, survives WS-hot paths. Exemplary discipline.

### 6.5 `scale(0)` entry audit

Grep verified: zero `scale(0)` initial states. Smallest initial is StagingArea enlarge at `scale(0.35)` — which has the blur-mask bridge missing (see §4.3) and EliminatedView skull at `scale(0.4)` (see §4.8).

### 6.6 Stagger delay audit

| Component | Stagger (ms) | Emil range (30-80ms) |
| --- | --- | --- |
| Hand deal-in | 80 | ✅ |
| Lobby roster | 60 | ✅ |
| GameOver rankings | **120** | ❌ — see §5.2 |
| Case-banner cascade | 70 steps (50/120/190/260/330) | ✅ (excluded per Apr-21 review) |

---

## 7. Triage summary (Phase 2 input)

### P1 — Ship these in Phase 3
1. Gate `Lobby.startButton:hover` (§3.1)
2. Drop `letter-spacing` from `Lobby.startButton` transition (§3.1)
3. Add `AnimatePresence` to `NopeCountdownBar` (§3.3)
4. Add `AnimatePresence` to `PendingPromptBanner` (§3.4)
5. Copy Hand's blur-mask into `StagingArea` enlarge overlay (§4.3)
6. Token-ize `StealReport.ackBtn` transition (§4.7)
7. Token-ize `stampThunk` duration + curve (§4.7)
8. Swap GSAP `power2.in` → `power2.out` on DramaOverlay fadeout (§5.1)
9. Reduce `GameOver` rankings stagger from 120ms → 80ms (§5.2)
10. Add `:active` scale feedback to `DefusePlacement` ±steppers (§5.5)

### P2 — Triage with Briggsy
11. `Lobby.startButton:active` — add scale(0.97)? (§3.1)
12. Token-ize `PlayerStrip.presence` pulse duration (§3.2)
13. Absorb Nameplate standby into flip flow (§3.5)
14. EliminatedView skull initial scale 0.4 → 0.6 or 0.7 (§4.8)
15. NameCard / TargetSelect button stagger (§5.5)
16. FuturePeek tap `scale(0.97)` feedback (§5.5)
17. PlayerStrip `::before` height transition → transform scaleY (§6.1)

### Q — Architectural / stylistic debates
18. Nameplate flip duration (400ms vs 250ms) — on-TV verification (§3.5)
19. Nameplate perspective (1000px vs 600px) — on-TV verification (§3.5)
20. JoinScreen.joinButton hover — opacity-only vs translateY match to Lobby (§4.1)
21. **DramaOverlay animation library — GSAP vs port to Framer Motion** (§5.1). Largest architectural question in this audit.

### No-finding sections (verified Emil-compliant)
- Motion tokens (`motion.ts` / `primitives.css`)
- MotionProvider (LazyMotion strict + reducedMotion="user")
- Hand (Apr-21 review)
- SmartActionBox (Apr-21 review)
- MinimalCard (Apr-21 review)
- StatusBar (Apr-21 review — status-strip key)
- ErrorToast (Apr-21 refactor)
- BottomSheet
- PlayerAlert
- ReducedMotionProvider / PlayerIcon / CardIllustration (no motion / static)

---

## 8. Follow-up work after Phase 2 triage

Each approved P1 finding in Phase 3 should be an atomic commit. Suggested clustering:

- **Cluster A — token discipline:** #6, #7, #12. One PR: "token-ize hardcoded motion."
- **Cluster B — missing animations:** #3, #4, #5. One PR: "wire entry/exit motion on banner surfaces."
- **Cluster C — Emil rule enforcement:** #1, #2, #8, #9, #10. One PR: "Emil rule sweep — hover gating, layout-property transitions, ease-in exit, stagger timing, press feedback."

Phase 4 verification: run `tests/e2e/*.spec.ts` full suite + screenshot states matrix (§7 TODO.md item) after Phase 3 lands. Real-device pass in priority #4.
