---
title: Motion conventions
type: conventions
date: 2026-05-09
---

# Motion conventions

Rules for animation, transitions, cinematics. Read before touching any motion code, GSAP timeline, Framer Motion component, or CSS animation.

## Easing & exits

- **`--motion-ease-accelerate` is ease-in.** Never point UI exit transitions at it — reads sluggish. `MOTION.exit` is `decelerate`-based. New easings should avoid `accelerate` for UI.
- **DramaOverlay fadeout uses GSAP `power2.out`, NEVER `power2.in`.** Emil rule #1: exits use ease-out because the user watches most closely at the start of the exit.

## Composition gotchas

- **Framer transforms and CSS `:active` don't compose on the same element.** See `docs/insights/015-framer-transforms-lose-css-cascade.md`. Apply interactive states to a child.
- **CSS animations override `:active { transform }` without `animation: none`.** See `docs/insights/016-css-animation-vs-active-transform.md`.
- **`backface-visibility: hidden` is unreliable in Chrome.** See `docs/insights/014-backface-visibility-unreliable-in-chrome.md`. Use opacity crossfade at edge-on midpoint instead.
- **`contain: layout` (and siblings) trap `position: fixed` descendants.** See `docs/insights/013-contain-layout-traps-fixed-descendants.md`.

## Cascade timings (board mount)

- **Case banner cascade load-bearing.** `GameTable.module.css`: label 50ms, operation 120ms, sub 190ms, divider 260ms, footer 330ms; `DrawPile.module.css`: topCard 700ms, topSecretLabel 1000ms, fileNumber 1100ms. Tighten any → verify full arc reads "briefing → impact → folder lands." (NopeCountdownBar lives between divider and footer per commit `4e4431c9` but enters on play events, not at mount — it doesn't participate in this cascade.)

## Cinematic patterns

- **Hand→enlarge + StagingArea crossfade use blur-mask.** `filter: blur(4px → 0 → 4px)` alongside `scale: 0.35 → 1 → 0.35`. MinimalCard's container-query thresholds flip mid-scale; 4px blur smooths the rejig. Don't exceed 6px — Safari mobile rasterization gets expensive.
- **DrawPile `.stack` has infinite breathe on scale; don't add scale to `.topCard`.** Would compound with parent breathing (1.025) and throb. `translateY(-24px → 0)` is the safe axis.
- **Nameplate standby is a KEYED SUBJECT, not null.** `STANDBY_SUBJECT` has `key: 'standby'`, `name: '.'`, `subtext: 'Standby'`, `standby: true`. Name-hide selector `.plateContent[data-standby='true'] .name { visibility: hidden }` — scoped to plateContent specifically so exiting standby plate keeps blank-name through rotateY exit.
- **`.nameplate` has opacity transition** (`--motion-duration-slow`). Wrapper opacity 0.55→1 during first coin flip. New `.nameplate` opacity changes inherit — scope via different selector if needed.

## Hover

- **Hover rules gated strict.** `@media (hover: hover) and (pointer: fine)` on every `:hover` in JoinScreen / SmartActionBox / GameOver / MinimalCard / Lobby startButton. Hybrid touch+trackpad laptops no longer fire sticky hover on tap.

## Stagger

- **TargetSelect has button stagger; NameCard does NOT.** `@keyframes optionStagger` scoped to `.optionList > .optionBtn`. NameCard's 25 buttons would be ~1000ms cascade — motion soup.
- **GameOver stagger is 80ms per row.** Play-again button delay tracks (`0.8 + rankings.length * 0.08 + 0.3`). Change both.

## Press feedback

- **PlayerStrip `.tile::before` uses `transform: scaleY()`, NOT `height`.** Fixed 3px; idle `scaleY(0.667)` ≈ 2px; active `scaleY(1)` ≈ 3px. GPU-composited — don't re-introduce a `height` transition.
- **SmartActionBox press scale.** `:active { animation: none; transform: scale(0.97) }` — explained in insight 016.
- **DefusePlacement ± buttons use `:active { scale(0.95) }`.** Deeper than 0.97 default — small round buttons show less motion per unit-scale. Don't go tighter than 0.93 (visible distortion on border-radius and font).
- **EliminatedView skull `scale(0.6)`.** Breaks Emil's 0.95 minimum intentionally (peak-ceremony rule-softening). Don't go back to 0.4 without explicit "0.6 lost the punch" verdict.
- **Lobby disabled-sheen uses layered backgrounds, not pseudo-element.** `::after` is `display: none` when disabled; `::before` owns the `// ` prefix. Sheen is a `background-position` animation.

## AnimatePresence

- **Status strip key is `statusText || '__standby__'`.** Falsy statusText maps to `// STANDBY` placeholder; unkeyed branch breaks `mode="wait"`.

## Keyframe locations

- **`keyframes caseBannerLineIn` lives in `GameTable.module.css`.** `topCardDrop` and `topCardLabelIn` live in `DrawPile.module.css`. NOT in `tokens/primitives.css`. (`stampDrop` was removed 2026-05-07 alongside the case-banner CLASSIFIED stamp — see E2E audit C-11.)

## Runtime motion gates

Per-rAF sampling of computed style asserts the *rendered* shape, not the engine's accounting (`tl.totalDuration()` etc. — those passed for 10 days while drama beats clipped to ~30%). Each gate ships a fault-injection canary that proves the detector is sensitive, not numb. Mechanism details and remediation hints live in the cited insights.

| Gate | Pins | See |
|---|---|---|
| `tests/e2e/drama-beat-timing.spec.ts` | DramaOverlay beat shape (total visible ±15%, peak-sustained ≥60%) | insight 043 |
| `tests/e2e/framer-hand-enlarge-shape.spec.ts` | Hand→enlarge cinematic shape + blur-mask co-ordination invariant (median blur ≥0.5px while scale ∈ [0.4, 0.95]) | insight 015 |
| `tests/e2e/framer-bottom-sheet-shape.spec.ts` | BottomSheet translateY shape + peak bottom-edge within 50px of viewport bottom (catches `contain: layout` ancestor traps) | insights 013, 048 |
| `tests/e2e/framer-status-strip-shape.spec.ts` | StatusBar `mode="wait"` exit-then-enter contract (≤1 frame ghost overlap) | insight 037 |
| `tests/e2e/framer-hand-reorder-shape.spec.ts` | Hand-reorder shape: `timeToSettleMs ≤ 500ms` AND `midPlateauMs ≤ 150ms` | insight 047 |
| `tests/e2e/framer-nameplate-rotateY-shape.spec.ts` | Opacity-at-edge-on contract: max opacity ≤0.3 while `\|rotateY\| ∈ [80°, 100°]` | insight 014 |

Same sampler shape; differ in selectors + assertions. Template for future cinematic gates (layoutId reflashes, etc.). Sampling methodology is portable to chrome-devtools-mcp's `evaluate_script` for interactive agent-driven verification.

DEV hooks used by the gates (`__gameStore`, `__testInjectEvent`, `__testForceLocalTarget`) are `import.meta.env.DEV` guarded and verified tree-shaken by `pnpm verify:bundle`.
