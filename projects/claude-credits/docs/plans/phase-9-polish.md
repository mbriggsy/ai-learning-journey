---
created: 2026-05-24T09:46:48-04:00
deepened: 2026-05-24
doc-reviewed: 2026-05-24
coded:
---

# Phase 9 — Visual polish iteration (THE BAR)

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is the polish phase: how the locked Phase 1 motion primitives map to surfaces, the protocol for meeting the bar, the Phase 1 work that lands here, and what stays eye-in-loop.

This is where the bar gets met or missed. After Phase 8 ships a working site, iterate. **This is where `/frontend-design` and `/emil-design-eng` skills fire.** Use them.

**What deepening locked (and what it left open):** Phase 9 does **not** redefine the motion system — Phase 1 already locked the eases, duration/stagger tokens, and the reduced-motion helper (see below). Phase 9 locks the *assignment* (which primitive drives which surface), the polish-phase contracts (data-number honesty, per-surface reduced-motion behavior, performance, GSAP-in-React lifecycle), the cold-watch rubric, and the four pieces of work Phase 1 explicitly handed forward. Genuinely *eye-in-loop* values (DrawSVG donut pace, exact stagger feel, gradient-breath period, whether the route blur-mask is even needed) stay deferred to the watch-and-tune loop — no amount of planning finds them, only watching the screen does.

---

## Motion contract — builds on the Phase 1 foundation

Phase 1 locked the motion *primitives* in `src/motion/` (**do not redefine them here** — Phase 9 maps them to surfaces and tunes within them):

- **Eases** ([phase-1-scaffold.md](phase-1-scaffold.md) §1.10b, `easings.ts` — four named `CustomEase`s):
  - `weighted-arrive` `M0,0 C0.2,0.1 0.2,1 1,1` — reveals, page load, route fade. Ease-out shape.
  - `weighted-settle` `M0,0 C0.12,0 0.18,0.7 0.5,0.92 C0.7,0.98 0.86,1 1,1` — hero counter. Slow first 12% (mass), accelerate through, long final 30% settle. **Ends monotonically — no overshoot** (control-point y-values 0→0→0.7→0.92→0.98→1→1 are non-decreasing; verify the rendered curve before trusting the honesty lock). This is the honesty lock baked into the curve.
  - `weighted-press` `M0,0 C0.3,0 0.4,1.05 1,1` — hover/press. The `1.05` control point = mechanical-key overshoot (mass, not playful bounce). **Overshoots — therefore banned on any data-bound number (see honesty lock).**
  - `weighted-exit` `M0,0 C0.4,0 1,0.6 1,1` — exits, faster than entries; ease-in is OK on exit.
- **Durations** (`tokens.ts`): press `0.16`, hover `0.25`, reveal `0.8`, counter `2.4`, exit `0.2`.
- **Stagger** (`tokens.ts`): tiles `0.06`, supportingLines `0.08`.
- **Reduced motion** (`reduced-motion.ts`): the `prefersReducedMotion()` helper + the CSS net in `global.css`.
- **Plugins** (§1.10a): Phase 1 registers `useGSAP` + `CustomEase` only. Each later phase registers the plugin it introduces — **DrawSVG → Phase 5; ScrollTrigger → Phase 4** (the grid reveal is the first scroll-reveal consumer). Don't eager-load heavy plugins for zero consumers.

### Surface → primitive map (Phase 9 locks the assignment)

| Wow-moment | Ease | Duration / stagger | Notes |
|---|---|---|---|
| Hero counter tick-up | `weighted-settle` | `counter` 2.4s | Value decelerates to the true total and **stops** — see honesty lock. GSAP `snap`; suffix locked pre-tick. |
| Supporting-line stagger | `weighted-arrive` | `reveal` 0.8s, `supportingLines` 0.08s | `y: 40 → 0` + opacity. Numbers in it are data-bound → honesty lock applies. |
| Reveal-on-scroll (sections) | `weighted-arrive` | `reveal` 0.8s | `y: 40 → 0` + opacity. |
| Project tile hover/lift | `weighted-press` | `hover` 0.25s | Gated `(hover: hover) and (pointer: fine)`. |
| Pressable `:active` (CTA, `LiveLinkButton`, tile-as-link) | `weighted-press` | `press` 0.16s | `transform: scale(0.97)` — instant "the UI heard you" feedback. Currently absent; add it. |
| Keyboard `:focus-visible` (every interactive surface) | (no tween) | instant | `outline: 2px solid var(--accent-primary); outline-offset: 3px;` — appears instantly, never gated behind `(hover:hover)`, never a stuck state on touch. |
| Grid tile reveal | `weighted-arrive` | `reveal` 0.8s, `tiles` 0.06s | `ScrollTrigger.batch`, `once: true`. |
| AssetDonut DrawSVG | `weighted-arrive` | eye-in-loop | "a designer's pace." The donut is the detail page's ONE draw-on flourish; the sparkline does NOT draw (Phase 5 Decision 6). |
| Route cross-fade | `weighted-arrive` | ~0.22s | Opacity only. |
| Exit / leave states | `weighted-exit` | `exit` 0.2s | Asymmetric — exits snap faster than entries. |

Entrances **never start from `scale(0)`** (Emil: nothing appears from nothing) — `scale(0.95)` + `opacity: 0`. **NEVER** `linear` (except genuinely constant motion like the gradient breath). **NEVER** `ease-in` for entrances. **NEVER** > 3 simultaneous animations on one element.

### Data-number honesty lock (load-bearing)

`weighted-settle` ends monotonically — keep it that way. **No animated number bound to real data may overshoot its true value.** Ticking past a real total (showing 13.2B, then settling back to 12.8B) lies about the data, and this site's credibility rests on honesty (the `tokensFresh` sub-line, the retention-window footnote, ideation §11). This binds **every** data-bound animated number, not just the hero:

- Hero counter, the `tokensFresh` sub-line, every supporting-stagger count (authored lines, project count, files, commits), and every Phase 5 TOKENS-block value → animate with a **monotonic** ease (`weighted-settle` or `weighted-arrive`). **Never `weighted-press`** (or any overshoot/`back` ease) on a number's `textContent`.
- Overshoot/spring lives **only on non-data channels** — a container's `scale`-in or an underline draw (via `weighted-press`'s `1.05`) — never on a value.
- Use GSAP `snap` so digits never render fractional; the magnitude suffix (B/M) locks **before** the tick so it never flickers mid-count (Phase 3 §hero).

### Reduced-motion behavior (per surface)

Components check `prefersReducedMotion()` (Phase 1 §1.10d). **Implementation contract:** the element's settled/visible DOM always renders (so touch affordances and layout never depend on motion) — the component gates only the *GSAP animation block* on the helper, never the element itself. Emil's nuance corrects a blunt "instant everything": reduced motion is *fewer and gentler*, not *zero* — keep opacity/color fades that aid comprehension, drop movement.

| Surface | Full motion | Reduced |
|---|---|---|
| Hero counter | 2.4s `weighted-settle` tick-up | **Snap to final value**, keep a short opacity fade-in |
| Reveal-on-scroll / stagger | `y: 40 → 0` + opacity | **Opacity only** (drop the translate) |
| AssetDonut | DrawSVG slow draw | **Render complete**, keep opacity fade |
| Tile hover / settle | `weighted-press` lift | **Removed** (transform motion); settled state still renders |
| Background gradient | slow breath | **Frozen** static gradient |

(README verification item 15 is updated to match this table — reduced motion is *gentler*, not blanket "instant state changes.")

### Performance contract

Animate **only `transform` and `opacity`** (GPU; `padding`/`margin`/`width`/`height` trigger layout + paint). DrawSVG (stroke-dashoffset) is the one sanctioned exception, scoped to the donut. The background gradient "breath" animates via an overlaid `transform`/`opacity` layer — **not** `background-position` (repaints every frame). **`backdrop-filter` glass surfaces re-composite every frame a transform animates above them** (expensive, esp. Safari) — ship `@supports not (backdrop-filter: blur())` fallbacks and watch frame rate where an animated layer overlaps a glass tile.

### GSAP-in-React lifecycle

react-router is the monorepo's first router, so route changes are a real leak surface. Every animation lives in `useGSAP(() => {…}, { scope: containerRef, dependencies, revertOnUpdate: true })`; hover/press handlers that spawn tweens are wrapped in `contextSafe()`; the grid reveal uses `ScrollTrigger.batch('.tile', { start: 'top 85%', once: true, onEnter: els => gsap.to(els, { …, stagger: stagger.tiles }) })`. Verify leak containment under THREE conditions, not one: route→route→back (`ScrollTrigger.getAll().length` stable), **navigate-away-mid-hover/animation** (orphaned tweens, not just ScrollTriggers), and **React 19 StrictMode double-invoke**. `getAll()` only counts ScrollTriggers — the hero counter and route cross-fade are plain tweens/timelines, so assert those revert via their `useGSAP` scope too.

### Route transition

Locked cross-fade (not Flip), ~0.22s opacity, `weighted-arrive`. Both lenses say resist positional motion. The **not-found state** (unknown/shelved `:name`, README verification item 8) gets the same cross-fade and on-palette editorial styling — never a bare error. Emil's polish lever: if the cross-fade reads as two distinct overlapping states, mask it with `filter: blur(2px)` *during* the transition (< 20px — expensive in Safari). **LANDMINE:** a `filter`/`backdrop-filter` on the transition wrapper creates a containing block for any `position: fixed` descendant (the project's documented contain-layout trap) — if the blur lever is used, confirm no fixed child relies on the viewport as its containing block. Whether the blur is needed at all is eye-in-loop.

---

## Inherited from Phase 1 (work that lands HERE)

Phase 1 explicitly deferred four items to Phase 9 (do not let them fall through the cracks — an executor finishing the polish loop owns these):

1. **Physical-token-boundary stylelint rule** (§1.9a, §1.10 tokens): a CI lint that fails if any `--c-*` physical token appears outside `tokens.semantic.css`. Backs README verification item 19 (grep for hex in `src/components/` returns zero). Decide whether it's a v1 bar-gate or a post-ship maintainability add (recommend: wire it before declaring v1 done — it's cheap and prevents token drift).
2. **Radius-role tuning** (§ semantic radius roles, "tuned in Phase 9"): tune the radius scale so corners read intentional (anti uniform-corner slop), varied by element weight.
3. **Satoshi subset** (§1.9f): subset the display face to Latin + digits via `fonttools` to shrink the preloaded woff2. Run after the cold-watch passes — not a bar-blocker, but real perceived-performance polish (and `font-display: optional` means a slow cold-load can paint the hero number in the fallback face permanently — subsetting shrinks that window).
4. **Light/dark CSS DRY-up** (§1.9b): DRY the duplicated light-mode token block (`@media` + `[data-theme]`) via shared custom-property indirection. Maintainability only — not a bar gate.

---

## Polish protocol

1. **Side-by-side compare against the curated reference bench** (see [`../ideation.md`](../ideation.md) → References). Each reference calibrates a *specific* choice, never a look to import: **Stripe** (gradient breath + settle + hover weight), **Linear** (materials-aware surfaces + tight type), **Vercel** (type-led restraint), **NYT digital features** (editorial type + restrained scroll motion), **Cassie Evans / Sarah Drasner GSAP demos** (motion-craft eases), **UMB's how-to-play.html** (the mobile bar). If the comparison reads "matches the bench" but the result doesn't bead, the bench led us astray — drop back to the metaphor.

2. **The cold-watch test — FOUR captures (desktop-dark, desktop-light, mobile-dark, mobile-light):** record all four (include a **landscape-short phone** capture — `svh` is fixed-small, so a hero taller than `svh` must scroll cleanly, not clip), watch them cold a day later (Emil: fresh eyes catch what dev eyes miss). If you'd say "wow Claude built this" on any one — diagnose.

3. **Agent-panel cold-read (the stranger proxy).** The failure condition is a *stranger's* reaction ("wow Claude built this"), but the team is N=1 (Briggsy + Claude — see the listener-panel doctrine: escalate Claude-side, never reach for human panels). The builder knows the provenance, so builder-cold-eye can't simulate the stranger. Proxy it: hand the four captures to a **fresh agent with zero build context** and ask "what is this, and what's your honest first reaction?" If the agent leads with "an AI built this" / "impressive AI demo" instead of reacting to the product, that's the failure condition firing. This is the sanctioned stand-in for the AI-curious peer.

4. **Slow-motion pass** (Emil): replay each named wow-moment at 2–5× duration (or the Chrome DevTools Animations panel) to catch coordination bugs invisible at full speed — colors showing two distinct states mid-crossfade, easing that stalls, wrong `transform-origin`, multi-property animations out of sync.

5. **AI-slop diagnostic checklist** (run before calling any capture clean): no 3-column symmetric feature grid; only the locked palette tokens (no stray purple/blue gradient); no icons-in-colored-circles; radius varies with element weight (no uniform corners); no cursor effects / scroll-jacking / parallax; **≤ ONE animated flourish visible per surface at any moment**; type carries the layout (strip the text and it reads empty, not decorated). Any hit is a polish failure. The **self-referential meta-tiles** (`project-metrics`, the site itself — ideation §7) carry the most AI-flex risk; give them the harshest version of this test.

6. **Common polish wins (priority order):** counter ease (tune the secondary `scale`-in intensity — the value curve is fixed); supporting-line stagger (inevitable, not mechanical); hover micro-interactions (restrained, gated); type leading/tracking on big numbers (kern at 20rem AND 4rem); AssetDonut DrawSVG pace; **cadence sparkline = monotone cubic (see lock below)**; route cross-fade (resist motion); **mobile** (safe-area insets, `-webkit-tap-highlight-color: transparent`, **`100svh` not `100dvh`**).

7. **No new features until the bar is hit.** Add motion polish, not surface area.

### Per-surface acceptance criteria (the cold-watch rubric)

| Surface | Beads when… |
|---|---|
| Hero counter | The number arrives with weight and **stops dead on the true total** (no rubber-band), suffix never flickers, tabular digits hold width throughout. |
| Supporting-line stagger | Lines arrive in a sequence that feels *inevitable*, not mechanical; numbers also stop dead on their true values; nothing pops in all at once, nothing lags noticeably. |
| Project tile | Settled state already reads as "clickable"; hover lift is felt, not announced; touch shows the same affordance with zero stuck states. |
| Shelved tile | The faded/muted treatment reads as editorial restraint, **not a disabled/broken fallback** (ideation §6); the shelved badge is legible in both modes; hover affordance present but visually subordinate. |
| Keyboard focus | The focus ring appears instantly on every interactive surface, is legible in both modes, and never traps on touch. |
| AssetDonut | Stroke draws at a pace you'd watch a designer move — unhurried, lands without a snap. |
| Cadence sparkline | The curve never dips below a zero-day or peaks above a real max; **and** a ≤3-point or single-burst project still reads as a composed editorial line (graceful arc / clear spike), not a flat dead line or a broken stub. |
| Route transition / not-found | Reads as one surface dissolving into the next, never two pages briefly stacked; the not-found state reads as an intentional editorial moment, not a browser error. |
| Both modes / both surfaces | Light is as deliberate as dark; mobile is as deliberate as desktop (anchor: UMB how-to-play). |

---

## Cascade APPLIED

Deepening surfaced corrections that touch sibling files; bodies updated so nothing contradicts the locks above.

- **`100dvh` → `100svh` across all viewport-filling surfaces.** Goal: "no janky chrome-jump on scroll." `100dvh` *resizes live* as the mobile toolbar retracts — it *causes* the jump; `100svh` (smallest viewport, fixed) is stable and best-practice for a static hero. This pass changed `100dvh` → `100svh` in the files that prescribed it: README §Responsive (~line 145), [phase-1-scaffold.md](phase-1-scaffold.md) §1.9e `global.css` (the shared baseline) + the file-tree note + the overview line + the verification note, [phase-2-data-wiring.md](phase-2-data-wiring.md) loading/error containers, [phase-3-hero.md](phase-3-hero.md) hero. The standard everywhere is now `min-height: 100vh;` then `min-height: 100svh;` (vh first for old-browser graceful degradation). All siblings now read `svh` — phase-6 already used it. Prose that *describes UMB's* "dvh-safe viewport" (README 81/212, ideation 80) is left as-is — it describes the reference file, not this site's mechanism.
- **README motion + verification reconciled to the Phase 1 / Phase 9 contract.** README §"Motion principles" described a single undifferentiated `weighted` ease and an absolute "NEVER use `linear`"; updated to name the four locked eases and the `linear`-for-constant-motion exception. README verification item 15 ("degrade to instant state changes") updated to the gentler reduced-motion table above.
- **README Audience line reconciled to ideation §11.** The brief still read "the authorship split is compelling, not embarrassing" — the exact premise §11 retired (authorship is SILENT). Since Phase 9 tells the builder to calibrate the bar against the README, that stale line risked re-introducing an authorship beat — the failure condition. Updated to match §11.
- **Sparkline curve: monotone cubic, locked at Phase 5 BUILD time (not deferred to polish).** The honest curve is monotone cubic (preserves data bounds; never the false overshoot/dips Catmull-Rom invents on sporadic zero-day data). **`curveMonotoneX` is a D3 identifier and D3 is NOT a dependency** — implement the monotone-cubic `d`-string by hand in `CadenceSparkline` (a small pure function; Fritsch–Carlson tangents). Because Phase 8 deploys *before* Phase 9, the curve must be correct from Phase 5's first build, not "tuned later" — otherwise the deployed interim sparkline is dishonest. [phase-5-detail.md](phase-5-detail.md) updated: the curve choice is locked at build (only its *visual* polish is a Phase 9 dial). Straight segments and Catmull-Rom both disqualified.
- **Accepted residual (documented, not a bug):** any line (monotone included) interpolates a slope through a zero-day toward the next active day, faintly implying intra-day ramp. Accepted because (a) Phase 5 locked the form as an area/line trend glyph with both design skills fired, (b) the exact per-day truth lives in the adjacent `activeDays` / `peakDay` / `largestSingleCommit` callouts, and (c) monotone never exceeds the real extrema. A bar/step chart would be more literal but fights the water-bead bar and overturns the locked form. Flagged for Briggsy's honesty-ethos call.

---

## Risks & dependencies

| Risk | Mitigation |
|---|---|
| GSAP tweens leak / double-fire across the 3-route cross-fade (react-router net-new) | `useGSAP` scope + `revertOnUpdate`; `contextSafe` handlers; `ScrollTrigger.batch` `once:true`. Verify under route→route→back, navigate-mid-animation, AND StrictMode double-invoke — not just one navigation. `getAll()` counts only ScrollTriggers, so assert plain tweens revert via scope too. |
| Polish drifts into "wow Claude built this" (the failure condition) | Cold-watch FOUR-capture + agent-panel cold-read (stranger proxy) + slow-mo + AI-slop checklist; reference bench calibrates specific choices only. |
| Reduced-motion path untested | `prefersReducedMotion()` is the single source of truth; component renders settled DOM, gates only the GSAP block; verification item 15 confirms per-surface degradation. |
| `backdrop-filter` glass re-composites under animated transforms (Safari jank, low-end Android) | `@supports not (backdrop-filter)` fallback; watch frame rate where an animated layer overlaps glass; the phone matrix includes budget Android at 360px. |
| Light mode treated as a dark-mode reskin | Each mode gets its own polish pass + cold-watch capture; polish both modes in lockstep (Phase 1 §"Phase 9 discipline"), never "polish dark then translate." |
| Secondary `scale`-in tuned too hot → reads bouncy/cheap | Deferred eye-in-loop dial; the `weighted-settle` value curve never overshoots regardless, so the data stays honest even mid-tuning. |
| Sparkline curve decision stranded in the polish file while Phase 5 builds first | Locked at Phase 5 build time with a cross-ref to this honesty lock (cascade above) — not deferred to Phase 9 tuning. |

## Deferred to the watch-and-tune loop (genuinely eye-in-loop — do NOT pre-decide)

- Intensity of the hero `scale`-in flourish (and whether an underline draw is the better secondary channel than scale)
- Whether the stagger *feel* wants a nudge off the locked `0.08` / `0.06` token values for a given surface; the relative timing of the 2.4s counter vs the 0.8s supporting-line reveals (coordinated vs accidental)
- Gradient-breath period and amplitude — **and its mode-specific calibration**: the light palette's cream→cream delta (`#f7f1e3 → #efe6d0`) is far narrower than dark's teal range, so the same breath token may read static in light or jittery if over-amplified to compensate. Tune per mode.
- Whether the route cross-fade needs the `blur(2px)` mask at all
- AssetDonut DrawSVG duration ("a designer's pace"); final radius-role values; the `stat-highlight` gold "one moment per surface" placement

---

After Phase 9, run the [Verification checklist](README.md#verification).

← [Phase 8 — Deploy](phase-8-deploy.md) | [Index](README.md)
