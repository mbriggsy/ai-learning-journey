---
title: "Phase 1 — Foundation"
type: feat
phase: 1
parent: docs/plans/css-foundation-rebuild/roadmap.md
date: 2026-04-11
status: draft
---

# Phase 1 — Foundation

**Goal.** Stand up the complete token system — primitives, semantic layers (axis-independent + phone-forked + board-forked), motion TS/CSS twin, and CI test harness (CVD + contrast + motion-sync). Zero component migration in this phase. The foundation must exist as files that pass their own tests before any `.module.css` consumes them.

**Why this is Phase 1 and nothing else.** Per the autopsy's diagnosis — *"CSS Modules without shared tokens = organized chaos. The encapsulation creates an illusion of architecture."* — the single most important lesson from UMB vs. BURNED is that **the design system has to exist as deliverables before the components can be rewritten against it.** If Phases 2 and 3 start migrating files before the tokens are locked, every early migration will drift from every later migration, and we'll be back where we started. Phase 1 is the contract that Phases 2-5 execute against.

---

## §1 — Inputs (what this phase inherits)

From `roadmap.md`:
- **§2 Quality Bar** — every token value justifies itself against *"could this look like a frame from an Archer episode?"*
- **§3 Visual Reference** — Dreamland S8 as the reference season; verified Archer influences (Saul Bass, Kirby/Ditko, Mad Men, Bond 60, OSS 117, Pink Panther, mid-century furniture, deliberate anachronism); warm cocktail-lounge palette, NOT noir black; comedy wins over glamour.
- **§3.5 Form factors** — phone view scales against HEIGHT (`svh`), board view scales against WIDTH (`vw`/`cqw`), cross-view components use container queries. Do not mix axes.
- **§4 Technical foundation** — two-layer token system (primitive → semantic), role-based naming with fg/bg pairs, pure-CSS `[data-theme]` (no JS-applied theme), motion TS/CSS twin pattern, Utopia-derived clamp formulas with `rem` base for WCAG 1.4.4 compliance, iOS 26 `position: fixed` landmine.
- **§5 Token taxonomy shape** — 5 color scales (teal, ochre, cream, charcoal, cordovan, emerald)[^1] × 12 steps each, 4px-base spacing scale, 1.25 / 1.333 modular type scales, 5-step motion duration scale with 6 named easings, 7-step z-index scale.
- **§6 Device matrix** — phone brackets 375×667 → 1024×1366 portrait, board brackets 1280×800 → 3840×2160 landscape.

[^1]: Six scales total. The roadmap §5.1 listed "teal, ochre, cream, charcoal, cordovan, emerald" — six hues, six 12-step scales = 72 primitive color tokens. This phase confirms that count.

From `docs/specifications/PRODUCT-SPECIFICATION.md`:
- **ADR-04** — Framer Motion discipline must survive. Bundle budget 100KB gzipped (current ~95KB, 5KB headroom).
- **ADR-05** — visual consistency via shared tokens is the product decision Phase 1 delivers on.
- **§4 Goal #6** — CVD-safe palette is a **hard requirement**, not aspirational. Every color decision runs through the CVD CI gate.

From `project-burned-clean-slate-visual.md` (Claude memory):
- **Clean slate scope.** No existing token, color, timing, or `.module.css` must survive. Game logic / protocol / tests stay.

From `feedback-hallucinated-references.md` (Claude memory):
- **Every external reference gets a footnote.** Citation pattern demonstrated in `roadmap.md` §3.1 and used throughout this file.

---

## §2 — Deliverables

### §2.1 Directory structure

```
src/client/shared/tokens/
├── primitives.css              ← raw values: color scales, sizing scalars, duration numbers
├── semantic.css                ← axis-independent semantics (colors, fonts, radii, motion, z-index)
├── semantic.phone.css          ← phone-view dimensional semantics (svh-based)
├── semantic.board.css          ← board-view dimensional semantics (vw/cqw-based)
├── motion.ts                   ← TypeScript motion tokens (Framer Motion consumers)
└── __tests__/
    ├── palette-cvd.test.ts       ← Vitest: CVD distance check on critical pairs
    ├── palette-contrast.test.ts  ← Vitest: WCAG 2.1 AA + APCA contrast checks
    └── motion-token-sync.test.ts ← Vitest: TS motion tokens match CSS mirrors
```

Import order in entry points:

```tsx
// src/client/player/index.tsx
import '@client/shared/tokens/primitives.css';
import '@client/shared/tokens/semantic.css';
import '@client/shared/tokens/semantic.phone.css';

// src/client/board/index.tsx
import '@client/shared/tokens/primitives.css';
import '@client/shared/tokens/semantic.css';
import '@client/shared/tokens/semantic.board.css';
```

**Files to delete after Phase 1 lands:**
- `src/client/shared/theme.ts` (runtime `applyTheme()` pattern — replaced by pure-CSS `[data-theme]`)
- `src/client/shared/theme.css` (skeleton fallback — no longer needed)

The `theme.ts` → pure-CSS migration is a Phase 1 deliverable, not a Phase 2+ deliverable, because Phases 2 and 3 need `[data-theme]` available when they start migrating components.

### §2.2 `primitives.css` — raw values, six color scales + neon spot colors

**Extracted from Dreamland S8 reference frames on 2026-04-11.** All hex values below were sampled from actual Dreamland episode stills downloaded to `docs/plans/css-foundation-rebuild/dreamland-reference/images/` — see `dreamland-reference/README.md` for the full frame manifest, source attribution, and per-frame scene descriptions. The six palette-core frames used for extraction:

- **`dreamland-12-mother-window.webp`** — the canonical "Dreamland look." Amber light through venetian blinds onto deep mahogany paneling, sage-grey coat, teal-cast shadows. Source for: mahogany wood range (ochre 3–8), amber through-blinds light (ochre 11), teal shadow cast (teal 3–6), sage coat light (teal 10–11).
- **`dreamland-07-venetian-blinds.webp`** — tight crop of same vocabulary, amber stripe pattern across face. Cross-check for honey/mahogany/sage triad.
- **`dreamland-18-ngd-45.webp`** — max-chroma teal/amber dockyard night. Source for: saturated teal endpoints (teal 7–9), amber crate-light endpoints (ochre 9–11), fog-desaturated mids (teal 9–10).
- **`dreamland-13-mother-drink.webp`** — warm interior mahogany bookcase with cream book spines, whiskey amber, burgundy lipstick. Source for: mahogany shadow (ochre 1–3), cream highlights (cream 10–12), cordovan lipstick (cordovan 8–10), whiskey amber cross-check (ochre 9–11).
- **`dreamland-02-interior-bar.webp`** — warm cream walls, olive moss tie, auburn hair, herringbone grey vest. Source for: cream wall gradient (cream 5–12), olive/forest green for emerald scale (emerald 5–9).
- **`dreamland-01-title.webp`** — Dreamland neon sign + night sky + Art Deco facade. Source for: the two spot magenta-neon values (rose-neon), deep blue-teal night sky cross-check (teal 1–3).

**Note on methodology:** colors were sampled visually by reading the images in Claude's image-capable Read tool, cross-referencing multiple frames for each hue, and interpolating 12-step scales using Radix Colors' convention (step 1 = darkest in dark mode, step 12 = lightest). These values are **committed, not placeholder.** The CVD CI gate in `palette-cvd.test.ts` will iterate them against critical-pair distance thresholds during Phase 1 execution — any pair that fails the threshold gets tuned here, and the final values land in `primitives.css`. Expect minor adjustments (± 5–10 perceptual units on 1–3 values max) from the CVD pass; the overall palette character is locked.

**Teal scale** — Dreamland cool hue. Night sky, wood-shadow cast, sage coats at the light end. Sourced primarily from frame 18 (saturated endpoints) and frame 12 (desaturated shadow/sage mids).

| Step | Hex | Role hint (Radix convention) |
|---|---|---|
| 1 | `#08181a` | App background (darkest) |
| 2 | `#0c2024` | Subtle background |
| 3 | `#11292d` | UI element background |
| 4 | `#163338` | Hovered UI element background |
| 5 | `#1e3f45` | Active / selected UI element background |
| 6 | `#284c53` | Subtle borders and separators |
| 7 | `#335a62` | UI element border, focus rings |
| 8 | `#406972` | Hovered UI element border |
| 9 | `#4a7880` | Solid backgrounds (frame 12 wood-shadow, frame 18 sky) |
| 10 | `#5a8a90` | Hovered solid backgrounds (sage-adjacent) |
| 11 | `#7da3a8` | Low-contrast text (sage light — frame 12 coat) |
| 12 | `#abc7cb` | High-contrast text |

**Ochre scale** — Dreamland warm hue. Mahogany wood → amber through-blinds light → brightest honey highlight. This is a WIDE-RANGE scale because Dreamland's single "warm" hue spans from very dark wood to very bright honey — extracted from frame 12 (mahogany paneling at steps 3–8, amber light at step 11), frame 13 (mahogany shadow cross-check, whiskey amber), frame 02 (cream-wall warmth at step 12).

| Step | Hex | Role hint |
|---|---|---|
| 1 | `#1a0d05` | Deepest mahogany shadow |
| 2 | `#25160b` | Dark mahogany |
| 3 | `#321e10` | Mahogany mid-shadow (frame 12 panel shadow) |
| 4 | `#422818` | Mahogany base |
| 5 | `#553520` | Warm surface |
| 6 | `#6a4228` | Wood accent (frame 12/13 mid mahogany) |
| 7 | `#805032` | Wood highlight |
| 8 | `#98603e` | Brighter wood (frame 13 shelf edge) |
| 9 | `#b0754c` | Mid amber (transition to warm light) |
| 10 | `#c98a5c` | Honey warm (frame 13 whiskey decanter) |
| 11 | `#dea06f` | Amber light (frame 12 through-blinds) |
| 12 | `#f0c18c` | Brightest honey highlight (frame 02 wall warmth) |

**Cream scale** — warm neutral for text, highlights, paper-like surfaces. Sourced primarily from frame 02 (cream wall gradient, cream shirt) and frame 13 (book spines, skin mids).

| Step | Hex | Role hint |
|---|---|---|
| 1 | `#0e0c08` | Very deep warm shadow |
| 2 | `#19160f` | Dark |
| 3 | `#252016` | Dark mid |
| 4 | `#332c20` | Mid surface |
| 5 | `#433a2c` | Base |
| 6 | `#52483a` | Text shadow |
| 7 | `#655a4a` | Muted text |
| 8 | `#7b6f5d` | Subdued text |
| 9 | `#948772` | Low-contrast text |
| 10 | `#b0a38a` | Mid-contrast text |
| 11 | `#d0c3a5` | High-contrast text (frame 02 wall highlight, skin mids) |
| 12 | `#f0e4c4` | Brightest cream (frame 02 shirt, highlights) |

**Charcoal scale** — warm-neutral chrome for UI borders, secondary surfaces, and the iconic Archer black linework (step 1). Shifted warmer than standard "noir black" per the Dreamland observation that deep shadows are warm, not cool. Sourced from frame 12 paneling shadows and frame 01 trench-coat blacks.

| Step | Hex | Role hint |
|---|---|---|
| 1 | `#0a0906` | Near-black warm — Archer character linework |
| 2 | `#12100b` | Dark chrome |
| 3 | `#1a1812` | Surface |
| 4 | `#23211a` | Elevated |
| 5 | `#2d2a22` | Interactive base |
| 6 | `#38342b` | Subtle border |
| 7 | `#454138` | Strong border |
| 8 | `#534e45` | Hover border |
| 9 | `#665f55` | Solid bg |
| 10 | `#7b7467` | Hover solid |
| 11 | `#988f82` | Low-contrast text |
| 12 | `#c4bdae` | High-contrast text (frame 13 hair highlight) |

**Cordovan scale** — Dreamland crimson. Lipstick, warm blood/danger, wine. More burgundy than bright red, extracted from frame 12/13 lipstick and frame 13 whiskey-in-glass reflections. Critical CVD pair with emerald — see `palette-cvd.test.ts`.

| Step | Hex |
|---|---|
| 1 | `#15070a` |
| 2 | `#210b10` |
| 3 | `#2f1015` |
| 4 | `#40141b` |
| 5 | `#521820` |
| 6 | `#641c26` |
| 7 | `#78222d` |
| 8 | `#8d2936` |
| 9 | `#a33340` |
| 10 | `#b9404c` |
| 11 | `#d06566` |
| 12 | `#e99182` |

**Emerald scale** — muted forest green for success, Intercept card, Peek confirmation. Dreamland's greens lean olive/forest (frame 02 tie, sage coat undertones). Saturation biased slightly higher than pure Dreamland observation to maintain CVD distance from cordovan — the CI gate will confirm or push it further.

| Step | Hex | Role hint |
|---|---|---|
| 1 | `#081410` | Deepest forest shadow |
| 2 | `#0d1e18` | Dark forest |
| 3 | `#122a21` | Forest shadow |
| 4 | `#18362c` | Forest base |
| 5 | `#1f4336` | Warm surface |
| 6 | `#275043` | Interactive |
| 7 | `#2f5e4f` | Subtle borders |
| 8 | `#396d5a` | Strong borders |
| 9 | `#437d68` | Solid bg |
| 10 | `#529078` | Hover solid |
| 11 | `#70aa90` | Low-contrast text |
| 12 | `#a0c8ae` | High-contrast text |

**Rose-neon spot colors** — NOT a scale. Two spot values extracted from frame 01's iconic "Dreamland" neon sign. Exposed as single primitives, consumed via the `--color-accent-neon` semantic token defined in §2.3. Use sparingly — these are the highest-chroma values in the entire palette and should be reserved for drama moments and the brand marque.

| Token | Hex | Role hint |
|---|---|---|
| `--color-rose-neon` | `#e84a9c` | Hot magenta neon (frame 01 sign) |
| `--color-rose-neon-glow` | `#ff6fb8` | Brighter neon bloom (frame 01 sign corona) |

**Total: 72 scale-based primitive color tokens + 2 spot colors = 74 primitives.** Scale tokens named as `--color-{scale}-{step}` — e.g., `--color-teal-9`, `--color-cordovan-11`. Spot tokens named as `--color-rose-neon` and `--color-rose-neon-glow`.

**Spacing scalars** (axis-independent, 4px base):

```css
--space-0:  0;
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.25rem;   /* 20px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
```

**Radius scalars** (axis-independent):

```css
--radius-none: 0;
--radius-xs:   2px;
--radius-sm:   4px;
--radius-md:   8px;
--radius-lg:   12px;
--radius-xl:   16px;
--radius-2xl:  24px;
--radius-full: 9999px;
```

**Motion duration numbers** (axis-independent, mirror of `motion.ts`):

```css
--motion-duration-instant:  100ms;
--motion-duration-fast:     150ms;
--motion-duration-base:     250ms;
--motion-duration-slow:     400ms;
--motion-duration-dramatic: 800ms;
```

**Motion easing curves** (axis-independent, mirror of `motion.ts`):

```css
--motion-ease-standard:    cubic-bezier(0.4, 0, 0.2, 1);
--motion-ease-emphasized:  cubic-bezier(0.2, 0, 0, 1);
--motion-ease-decelerate:  cubic-bezier(0, 0, 0.2, 1);
--motion-ease-accelerate:  cubic-bezier(0.4, 0, 1, 1);
--motion-ease-anticipate:  cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

(Spring configs are TS-only — CSS has no spring primitive.)

**Z-index scalars:**

```css
--z-base:    0;
--z-raised:  10;
--z-sticky:  100;
--z-overlay: 1000;
--z-modal:   2000;
--z-toast:   3000;
--z-max:     9999;
```

### §2.3 `semantic.css` — axis-independent semantics

**Color semantic tokens** (role-based, with fg/bg pairs where applicable):

```css
:root[data-theme="dark"] {
  /* Surfaces */
  --color-bg-app:              var(--color-charcoal-1);
  --color-bg-surface:          var(--color-charcoal-3);
  --color-bg-elevated:         var(--color-charcoal-4);
  --color-bg-overlay:          color-mix(in srgb, var(--color-charcoal-1) 85%, transparent);
  --color-bg-interactive:      var(--color-teal-5);
  --color-bg-interactive-hover: var(--color-teal-6);
  --color-bg-interactive-active: var(--color-teal-7);

  /* Borders */
  --color-border-subtle: var(--color-charcoal-5);
  --color-border-strong: var(--color-charcoal-7);
  --color-border-focus:  var(--color-ochre-8);

  /* Text */
  --color-fg-primary:    var(--color-cream-12);
  --color-fg-secondary:  var(--color-cream-11);
  --color-fg-muted:      var(--color-cream-9);
  --color-fg-disabled:   var(--color-charcoal-8);
  --color-fg-on-accent:  var(--color-cream-12);

  /* Interactive */
  --color-fg-interactive:      var(--color-teal-12);
  --color-border-interactive:  var(--color-teal-7);

  /* Feedback */
  --color-fg-danger:  var(--color-cordovan-11);
  --color-bg-danger:  var(--color-cordovan-3);
  --color-border-danger: var(--color-cordovan-7);

  --color-fg-success: var(--color-emerald-11);
  --color-bg-success: var(--color-emerald-3);
  --color-border-success: var(--color-emerald-7);

  --color-fg-warning: var(--color-ochre-11);
  --color-bg-warning: var(--color-ochre-3);
  --color-border-warning: var(--color-ochre-7);

  --color-fg-info:    var(--color-teal-11);
  --color-bg-info:    var(--color-teal-3);

  /* Game-specific accents */
  --color-accent-burned:    var(--color-cordovan-9);
  --color-accent-intercept: var(--color-emerald-9);
  --color-accent-operative: var(--color-teal-9);
  --color-accent-drama:     var(--color-ochre-9);

  /* Brand / neon accent — use sparingly, highest chroma in the palette */
  --color-accent-neon:      var(--color-rose-neon);       /* hot magenta, Dreamland sign */
  --color-accent-neon-glow: var(--color-rose-neon-glow);  /* brighter bloom */
}

:root[data-theme="light"] {
  /* Phase 1 ships dark-mode complete. Light mode tokens are stubbed with dark-mode fallbacks. */
  /* Light mode is Phase 1.5 — deferred for post-Phase-5 polish if needed. */
}
```

**Typography family tokens** (axis-independent):

```css
:root {
  --font-display: 'Clash Display', 'Futura', 'Helvetica Neue', sans-serif;
  --font-body:    'General Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono:    'JetBrains Mono', 'SF Mono', Menlo, monospace;
}
```

**Note on `--font-display`:** starts as Clash Display per the 2026-04-11 Baveuse-wait-and-see decision. If Phase 1 visual review fails the Archer test on Clash Display, the one-line swap is: change the first entry in the `--font-display` value to `'Baveuse'` after purchasing + `@font-face`-installing the file.

**Radius semantic tokens:**

```css
:root {
  --radius-card:     var(--radius-md);  /* preserved from current theme */
  --radius-button:   var(--radius-sm);
  --radius-input:    var(--radius-sm);
  --radius-surface:  var(--radius-lg);
  --radius-modal:    var(--radius-xl);
  --radius-pill:     var(--radius-full);
}
```

**Elevation (shadow) semantic tokens:**

```css
:root {
  --shadow-none: none;

  --shadow-sm: 0 1px 2px 0 color-mix(in srgb, var(--color-charcoal-1) 60%, transparent);

  --shadow-md: 0 4px 8px -2px color-mix(in srgb, var(--color-charcoal-1) 50%, transparent),
               0 2px 4px -1px color-mix(in srgb, var(--color-charcoal-1) 40%, transparent);

  --shadow-lg: 0 10px 20px -4px color-mix(in srgb, var(--color-charcoal-1) 60%, transparent),
               0 4px 8px -2px color-mix(in srgb, var(--color-charcoal-1) 40%, transparent);

  --shadow-xl: 0 20px 40px -8px color-mix(in srgb, var(--color-charcoal-1) 70%, transparent),
               0 8px 16px -4px color-mix(in srgb, var(--color-charcoal-1) 50%, transparent);

  /* Accent glows — used by cards, intercept button, drama overlay */
  --shadow-glow-accent:  0 0 20px color-mix(in srgb, var(--color-accent-operative) 40%, transparent);
  --shadow-glow-danger:  0 0 24px color-mix(in srgb, var(--color-accent-burned) 50%, transparent);
  --shadow-glow-success: 0 0 20px color-mix(in srgb, var(--color-accent-intercept) 40%, transparent);
  --shadow-glow-drama:   0 0 40px color-mix(in srgb, var(--color-accent-drama) 60%, transparent);
}
```

**Note on `color-mix()`:** Baseline Widely Available since 2023 (Safari 16.2+, Chrome 111+, Firefox 113+). Current Browserslist targets per `package.json` support this. If any target falls back, the rebuild falls back to pre-computed `rgba()` values — this is a Phase 5 verification check, not a Phase 1 concern.

### §2.4 `semantic.phone.css` — phone-view dimensional tokens (svh-based)

**The svh-based clamp formula pattern** (since Utopia has no vertical-axis calculator, derived manually):

```
clamp(min_px, calc(min_px + (100svh - 667px) * ((max_px - min_px) / 699)), max_px)
```

Where `667` is the small-bracket viewport height (iPhone SE portrait), `1366` is the large-bracket viewport height (iPad Pro 12.9" portrait), and `699 = 1366 - 667`.

**Always include a rem-based minimum** for WCAG 1.4.4 compliance (text must respond to 200% browser zoom).

**Typography tokens (phone, svh-based):**

```css
:root[data-view="phone"] {
  /* Body text — 14px → 18px */
  --text-body: clamp(
    0.875rem,
    calc(0.875rem + (100svh - 667px) * (4 / 699)),
    1.125rem
  );

  /* Caption / small — 11px → 13px */
  --text-caption: clamp(
    0.6875rem,
    calc(0.6875rem + (100svh - 667px) * (2 / 699)),
    0.8125rem
  );

  /* Micro / label — 10px → 11px */
  --text-micro: clamp(
    0.625rem,
    calc(0.625rem + (100svh - 667px) * (1 / 699)),
    0.6875rem
  );

  /* Callout — 16px → 20px */
  --text-callout: clamp(
    1rem,
    calc(1rem + (100svh - 667px) * (4 / 699)),
    1.25rem
  );

  /* Title — 20px → 28px */
  --text-title: clamp(
    1.25rem,
    calc(1.25rem + (100svh - 667px) * (8 / 699)),
    1.75rem
  );

  /* Display — 32px → 48px */
  --text-display: clamp(
    2rem,
    calc(2rem + (100svh - 667px) * (16 / 699)),
    3rem
  );
}
```

**Sizing tokens (phone, svh-based):**

```css
:root[data-view="phone"] {
  /* Touch target minimum — per WCAG 2.5.5 this is 44px non-negotiable */
  --size-touch-target: 44px;

  /* Card — height-driven with 5:7 aspect ratio */
  --size-card-height: clamp(
    120px,
    calc(120px + (100svh - 667px) * (60 / 699)),
    180px
  );
  --size-card-width: calc(var(--size-card-height) * 5 / 7);

  /* Hand height — allocated vertical space for the hand strip */
  --size-hand-height: clamp(
    140px,
    calc(140px + (100svh - 667px) * (80 / 699)),
    220px
  );

  /* Staging height — allocated vertical space for the staging area */
  --size-staging-height: clamp(
    100px,
    calc(100px + (100svh - 667px) * (60 / 699)),
    160px
  );

  /* Floating action button (InterceptButton / NopeButton unified) */
  --size-fab: clamp(
    64px,
    calc(64px + (100svh - 667px) * (16 / 699)),
    80px
  );

  /* Root max-width — the "iPad in portrait = huge phone" cap */
  --size-root-max-width: 640px;
}
```

**Spacing fluid tokens (phone, for dimensions that need to flex with viewport height):**

```css
:root[data-view="phone"] {
  --space-fluid-tight: clamp(
    4px,
    calc(4px + (100svh - 667px) * (4 / 699)),
    8px
  );

  --space-fluid-base: clamp(
    8px,
    calc(8px + (100svh - 667px) * (8 / 699)),
    16px
  );

  --space-fluid-loose: clamp(
    16px,
    calc(16px + (100svh - 667px) * (16 / 699)),
    32px
  );
}
```

### §2.5 `semantic.board.css` — board-view dimensional tokens (vw-based)

**The vw-based clamp formula** (standard Utopia pattern):

```
clamp(min_px, calc(min_px + (max_px - min_px) * (100vw - min_vw) / (max_vw - min_vw)), max_px)
```

Simplified to the `X + Yvw` form Utopia generates:

```
clamp(min_px, calc(Arem + Bvw), max_px)
```

Where `A` and `B` are derived per-token from the small → large bracket (1280 → 3840). Phase 1 execution computes exact `A` and `B` values; the plan commits to the bracket range.

**Typography tokens (board, vw-based):**

```css
:root[data-view="board"] {
  /* Body text — 16px → 24px across 1280 → 3840 */
  --text-body: clamp(
    1rem,
    calc(1rem + (100vw - 1280px) * (8 / 2560)),
    1.5rem
  );

  /* Title — 24px → 42px */
  --text-title: clamp(
    1.5rem,
    calc(1.5rem + (100vw - 1280px) * (18 / 2560)),
    2.625rem
  );

  /* Display — 40px → 96px */
  --text-display: clamp(
    2.5rem,
    calc(2.5rem + (100vw - 1280px) * (56 / 2560)),
    6rem
  );

  /* Hero — 56px → 160px — DramaOverlay size */
  --text-hero: clamp(
    3.5rem,
    calc(3.5rem + (100vw - 1280px) * (104 / 2560)),
    10rem
  );
}
```

**Sizing tokens (board, vw-based):**

```css
:root[data-view="board"] {
  /* Card — width-driven with 5:7 aspect ratio */
  --size-card-width: clamp(
    96px,
    calc(96px + (100vw - 1280px) * (112 / 2560)),
    208px
  );
  --size-card-height: calc(var(--size-card-width) * 7 / 5);

  /* Player ring radius — the ellipse the player panels orbit */
  --size-player-ring-width: clamp(
    200px,
    calc(200px + (100vw - 1280px) * (200 / 2560)),
    400px
  );

  /* Draw pile — board-side card stack */
  --size-draw-pile-width: clamp(
    80px,
    calc(80px + (100vw - 1280px) * (80 / 2560)),
    160px
  );

  /* Arena — where cards "land" during play animations */
  --size-arena-min-width: clamp(
    200px,
    calc(200px + (100vw - 1280px) * (200 / 2560)),
    400px
  );
  --size-arena-min-height: clamp(
    140px,
    calc(140px + (100vw - 1280px) * (140 / 2560)),
    280px
  );
}
```

### §2.6 `motion.ts` — TypeScript motion tokens

```typescript
/**
 * Motion tokens — TypeScript source of truth for Framer Motion.
 *
 * CRITICAL: Framer Motion's transition.duration expects a Number, not a string.
 * You CANNOT write `transition={{ duration: 'var(--motion-duration-base)' }}`.
 * This file is the canonical motion-value source for React components.
 *
 * CSS custom properties in semantic.css mirror these values for plain-CSS consumers
 * (@keyframes, transition declarations). The `motion-token-sync.test.ts` file enforces
 * that the TS and CSS surfaces never drift.
 */

import type { Transition } from 'motion/react';

export const MOTION_DURATIONS = {
  instant:  0.1,
  fast:     0.15,
  base:     0.25,
  slow:     0.4,
  dramatic: 0.8,
} as const satisfies Record<string, number>;

export const MOTION_EASINGS = {
  standard:    [0.4, 0, 0.2, 1] as [number, number, number, number],
  emphasized:  [0.2, 0, 0, 1] as [number, number, number, number],
  decelerate:  [0, 0, 0.2, 1] as [number, number, number, number],
  accelerate:  [0.4, 0, 1, 1] as [number, number, number, number],
  anticipate:  [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
} as const;

export const MOTION_SPRINGS = {
  /** Snappy — quick responses, button presses, small UI state changes */
  snappy:     { type: 'spring', stiffness: 300, damping: 24 } as const satisfies Transition,

  /** Deliberate — card plays, panel transitions, mid-size movement */
  deliberate: { type: 'spring', stiffness: 250, damping: 25 } as const satisfies Transition,

  /** Punchy — dramatic pops (EliminatedView skull, DramaOverlay entrances) */
  punchy:     { type: 'spring', stiffness: 400, damping: 15 } as const satisfies Transition,

  /** Gentle — large-scale welcomes (GameOver winner reveal) */
  gentle:     { type: 'spring', stiffness: 200, damping: 20 } as const satisfies Transition,
} as const;

/** Named presets combining duration + easing for common cases */
export const MOTION = {
  /** Quick CSS transition equivalent */
  quickFade:   { duration: MOTION_DURATIONS.fast, ease: MOTION_EASINGS.standard } as const satisfies Transition,

  /** Standard enter transition */
  enter:       { duration: MOTION_DURATIONS.base, ease: MOTION_EASINGS.decelerate } as const satisfies Transition,

  /** Standard exit transition */
  exit:        { duration: MOTION_DURATIONS.fast, ease: MOTION_EASINGS.accelerate } as const satisfies Transition,

  /** Full attention — use sparingly for high-drama moments */
  dramatic:    { duration: MOTION_DURATIONS.dramatic, ease: MOTION_EASINGS.emphasized } as const satisfies Transition,

  /** Spring-based — consume directly */
  snappy:      MOTION_SPRINGS.snappy,
  deliberate:  MOTION_SPRINGS.deliberate,
  punchy:      MOTION_SPRINGS.punchy,
  gentle:      MOTION_SPRINGS.gentle,
} as const;
```

**CSS mirror** (already defined in `primitives.css` per §2.2 above — duration numbers and easing curves). The sync test verifies the names and values match.

**Reduced-motion fork:**

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-instant:  0ms;
    --motion-duration-fast:     0ms;
    --motion-duration-base:     0ms;
    --motion-duration-slow:     0ms;
    --motion-duration-dramatic: 0ms;
  }
}
```

The TS side handles reduced-motion via Framer Motion's native `useReducedMotion` hook, which individual components consume in Phase 2 when needed.

### §2.7 CI test harness (Vitest)

**`palette-cvd.test.ts`** — ensures critical semantic pairs remain distinguishable under simulated deuteranopia, protanopia, and tritanopia.

```typescript
import { describe, it, expect } from 'vitest';
import { differenceEuclidean, parse, filter } from 'culori';
import { COLORS } from '../palette';

const CRITICAL_PAIRS: Array<[keyof typeof COLORS, keyof typeof COLORS, string]> = [
  ['color-bg-danger',    'color-bg-success',     'danger vs success'],
  ['color-fg-danger',    'color-fg-success',     'danger vs success fg'],
  ['color-accent-burned','color-accent-intercept','Burned card vs Intercept card'],
  ['color-accent-burned','color-accent-operative','Burned card vs operative card'],
  ['color-border-focus', 'color-border-strong',   'focus ring vs static border'],
];

const MIN_DISTANCE = 0.15; // in oklch space — tuned in Phase 1 execution

const SIMULATIONS = [
  { name: 'deuteranopia', filter: filter('deuteranopia', 1) },
  { name: 'protanopia',   filter: filter('protanopia', 1) },
  { name: 'tritanopia',   filter: filter('tritanopia', 1) },
];

describe('palette CVD legibility', () => {
  for (const [a, b, label] of CRITICAL_PAIRS) {
    for (const { name, filter: sim } of SIMULATIONS) {
      it(`${label} remains distinguishable under ${name}`, () => {
        const simA = sim(parse(COLORS[a]));
        const simB = sim(parse(COLORS[b]));
        const distance = differenceEuclidean('oklch')(simA, simB);
        expect(distance, `${a} vs ${b} under ${name}`).toBeGreaterThan(MIN_DISTANCE);
      });
    }
  }
});
```

**`palette-contrast.test.ts`** — WCAG 2.1 AA + APCA checks for every semantic fg/bg pair.

```typescript
import { describe, it, expect } from 'vitest';
import { wcagContrast, parse } from 'culori';
import { APCAcontrast, sRGBtoY } from 'apca-w3';
import { COLORS } from '../palette';

const FG_BG_PAIRS: Array<[keyof typeof COLORS, keyof typeof COLORS, number, number]> = [
  // [fg, bg, minWcagRatio, minApcaLc]
  ['color-fg-primary',   'color-bg-app',      7.0, 75], // AAA / Lc 75 for primary body text
  ['color-fg-secondary', 'color-bg-app',      4.5, 60], // AA  / Lc 60 for secondary
  ['color-fg-muted',     'color-bg-app',      3.0, 45], // large-text fallback, Lc 45
  ['color-fg-danger',    'color-bg-app',      4.5, 60],
  ['color-fg-success',   'color-bg-app',      4.5, 60],
  // ... expand in execution
];

describe('palette contrast — WCAG 2.1', () => {
  for (const [fg, bg, minWcag] of FG_BG_PAIRS) {
    it(`${fg} on ${bg} meets WCAG ${minWcag}:1`, () => {
      const ratio = wcagContrast(parse(COLORS[fg]), parse(COLORS[bg]));
      expect(ratio).toBeGreaterThanOrEqual(minWcag);
    });
  }
});

describe('palette contrast — APCA', () => {
  for (const [fg, bg, , minApca] of FG_BG_PAIRS) {
    it(`${fg} on ${bg} meets APCA Lc ${minApca}`, () => {
      const fgY = sRGBtoY(parse(COLORS[fg]));
      const bgY = sRGBtoY(parse(COLORS[bg]));
      const lc = Math.abs(APCAcontrast(fgY, bgY));
      expect(lc).toBeGreaterThanOrEqual(minApca);
    });
  }
});
```

**`motion-token-sync.test.ts`** — ensures TS motion tokens match CSS custom properties.

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { MOTION_DURATIONS, MOTION_EASINGS } from '../motion';

const primitivesCss = readFileSync(
  resolve(__dirname, '../primitives.css'),
  'utf-8'
);

describe('motion token TS/CSS sync', () => {
  it('every TS duration has a matching CSS custom property', () => {
    for (const [name, value] of Object.entries(MOTION_DURATIONS)) {
      const expectedMs = `${value * 1000}ms`;
      const pattern = new RegExp(`--motion-duration-${name}:\\s*${expectedMs}`);
      expect(
        primitivesCss,
        `CSS missing --motion-duration-${name}: ${expectedMs}`
      ).toMatch(pattern);
    }
  });

  it('every TS easing has a matching CSS cubic-bezier', () => {
    for (const [name, bezier] of Object.entries(MOTION_EASINGS)) {
      const [a, b, c, d] = bezier;
      const pattern = new RegExp(
        `--motion-ease-${name}:\\s*cubic-bezier\\(\\s*${a}\\s*,\\s*${b}\\s*,\\s*${c}\\s*,\\s*${d}\\s*\\)`
      );
      expect(
        primitivesCss,
        `CSS missing --motion-ease-${name}: cubic-bezier(${a}, ${b}, ${c}, ${d})`
      ).toMatch(pattern);
    }
  });
});
```

### §2.8 Dreamland S8 reference frame extraction — COMPLETE

**Status:** Done on 2026-04-11 as part of plan authoring, not execution. Per `feedback-plans-are-baking-recipes.md`: research happens at plan-time, not execution-time. The Phase 1 palette values in §2.2 are extracted directly from the Dreamland frames, not speculative.

**Output location:** `docs/plans/css-foundation-rebuild/dreamland-reference/`
- `README.md` — full frame manifest with source attribution, episode references, scene descriptions, and fair-use posture warning.
- `images/` — 18 Dreamland S8 frames downloaded from Archer Wiki (Fandom), `.webp` format, ~1.1 MB total.

**Frames used for extraction (6 of 18):**

| File | Role | Sourced colors |
|---|---|---|
| `dreamland-12-mother-window.webp` | Canonical "Dreamland look" | ochre 3–8, 11; teal 3–6, 10–11 |
| `dreamland-07-venetian-blinds.webp` | Tight crop cross-check | ochre/mahogany/sage triad validation |
| `dreamland-18-ngd-45.webp` | Max-chroma teal/amber dockyard | teal 7–9; ochre 9–11 |
| `dreamland-13-mother-drink.webp` | Warm mahogany interior | ochre 1–3; cream 10–12; cordovan 8–10 |
| `dreamland-02-interior-bar.webp` | Warm cream walls + olive tie | cream 5–12; emerald 5–9; ochre 12 |
| `dreamland-01-title.webp` | Dreamland neon sign + night sky | rose-neon spot values; teal 1–3 cross-check |

**Fair-use posture:** These frames are FX/FXX copyrighted material (fan-uploaded to Archer Wiki, not from official press kits). Allowed use: internal palette extraction and art direction reference. **NOT allowed: publication, marketing use, public-repo commits.** If the BURNED repo ever goes public, `dreamland-reference/images/` must be added to `.gitignore`. The `README.md` (with URLs and descriptions) is fine to publish; the actual image files are not.

**What Phase 1 execution still does:**
- Cross-references the extracted hex values against the CVD CI gate thresholds. Minor adjustments (± 5–10 perceptual units on 1–3 values max) are expected if any critical pair fails the distance check — commit those adjustments to `primitives.css` during step 13 of the execution order.
- Runs the palette through the WCAG + APCA contrast tests. Same adjustment budget.
- Visually reviews the rendered token system at token-grid size against the Dreamland frames — not individual components, just the token swatches — as the first pass of the §4.6 Archer acceptance test.

---

## §3 — Step-by-Step Execution Order

Phase 1 tasks, in dependency order. Each step has a commit point.

1. **Create directory structure.** `src/client/shared/tokens/` + `__tests__/` subdirectory.
2. **Install dependencies.** `pnpm add -D culori apca-w3` for CVD + contrast testing.
3. **Author `primitives.css`** with all six color scales (initial values from §2.2), spacing, radius, motion duration, motion easing, z-index.
4. **Author `motion.ts`** with TS motion tokens per §2.6.
5. **Author `semantic.css`** with axis-independent semantic tokens per §2.3.
6. **Author `semantic.phone.css`** with svh-based dimensional tokens per §2.4.
7. **Author `semantic.board.css`** with vw-based dimensional tokens per §2.5.
8. **Author `palette.ts`** — a TypeScript file that re-exports the CSS custom property values as a plain object, so the test harness can read them without parsing CSS. This is the Single Source of Truth for CVD + contrast tests.
9. **Author `palette-cvd.test.ts`** per §2.7. Run it. It should FAIL initially (some pairs won't pass the CVD threshold with initial hex values) — those failures drive the first round of palette adjustments in step 13.
10. **Author `palette-contrast.test.ts`** per §2.7. Run it. Same — failures drive adjustments.
11. **Author `motion-token-sync.test.ts`** per §2.7. This should PASS immediately — if it doesn't, fix the TS/CSS drift before proceeding.
12. **~~Frame-extract Dreamland S8 references~~** — ALREADY DONE at plan-authoring time. Frames live at `docs/plans/css-foundation-rebuild/dreamland-reference/images/`. The §2.2 hex values are Dreamland-extracted, not placeholder. Skip this step in execution; proceed to step 13.
13. **Palette CVD + contrast adjustment pass.** Run `palette-cvd.test.ts` and `palette-contrast.test.ts`. For any critical pair that fails the distance threshold or any fg/bg pair that fails WCAG/APCA, tune the relevant primitive hex values in `primitives.css` and re-run until green. Expected budget: ± 5–10 perceptual units on at most 1–3 values. If more than 3 values need tuning, that's a sign the palette direction is wrong and deserves a debate with Briggsy before continuing. Commit.
14. **Update `src/client/player/main.tsx`** (or whatever the phone entry point is) to import `primitives.css` + `semantic.css` + `semantic.phone.css` and set `data-view="phone"` + `data-theme="dark"` on the root element.
15. **Update `src/client/board/main.tsx`** (or equivalent) to import `primitives.css` + `semantic.css` + `semantic.board.css` and set `data-view="board"` + `data-theme="dark"` on the root element.
16. **Delete `src/client/shared/theme.ts` + `src/client/shared/theme.css`** — remove the runtime `applyTheme()` pattern. Update any import sites in `MotionProvider.tsx` or `main.tsx` to drop the `applyTheme()` call. Typecheck + lint.
17. **Bundle size check.** Run `pnpm build` and verify phone entry stays under 100KB gzipped. If it regressed beyond +5KB, investigate before shipping Phase 1.
18. **Run full test suite** — `pnpm test` + `pnpm typecheck` + `pnpm lint`. Everything green.
19. **Visual smoke test.** Open the dev server, load the existing (pre-migration) phone and board views, confirm nothing crashed. The existing components still use hardcoded values, so they won't look different — that's expected. The test is that they don't blow up.
20. **Commit + tag.** `feat(css-foundation): Phase 1 — token system foundation` with reference to `docs/plans/css-foundation-rebuild/phase-1-foundation.md`.

---

## §4 — Acceptance Criteria

Phase 1 is done when **all** of the following are true:

### §4.1 Files exist and are wired

- [ ] `src/client/shared/tokens/primitives.css` exists and defines every token in §2.2.
- [ ] `src/client/shared/tokens/semantic.css` exists and defines every token in §2.3.
- [ ] `src/client/shared/tokens/semantic.phone.css` exists and defines every token in §2.4.
- [ ] `src/client/shared/tokens/semantic.board.css` exists and defines every token in §2.5.
- [ ] `src/client/shared/tokens/motion.ts` exists and exports `MOTION_DURATIONS`, `MOTION_EASINGS`, `MOTION_SPRINGS`, `MOTION`.
- [ ] `src/client/shared/tokens/palette.ts` exists and exports the dark-mode semantic color values as a plain object for test consumption.
- [ ] `primitives.css` + `semantic.css` + `semantic.phone.css` imported by the player entry point.
- [ ] `primitives.css` + `semantic.css` + `semantic.board.css` imported by the board entry point.
- [ ] `src/client/shared/theme.ts` and `src/client/shared/theme.css` deleted. No import sites reference them.

### §4.2 Purity checks

- [ ] `primitives.css` has zero hardcoded hex outside the color-scale definitions.
- [ ] `semantic.css` has zero hardcoded hex — every color value is a `var(--color-...)` reference.
- [ ] `semantic.phone.css` has zero `vw`/`cqw`/`vh` usage (phone is svh-only).
- [ ] `semantic.board.css` has zero `svh`/`dvh`/`vh` usage for dimensional sizing (board is vw/cqw-only).

### §4.3 Tests pass

- [ ] `pnpm test` — all existing tests still pass (167/167).
- [ ] `palette-cvd.test.ts` — every critical pair passes the minimum CVD distance threshold under all three simulations.
- [ ] `palette-contrast.test.ts` — every semantic fg/bg pair passes both WCAG 2.1 AA and APCA Lc minimums.
- [ ] `motion-token-sync.test.ts` — every TS motion token has a matching CSS custom property with the correct value.
- [ ] `pnpm typecheck` — clean.
- [ ] `pnpm lint` — clean.
- [ ] `pnpm build` — succeeds. Phone entry ≤100KB gzipped (current ~95KB + Phase 1 headroom).

### §4.4 Dreamland reference gate

- [x] `docs/plans/css-foundation-rebuild/dreamland-reference/` exists with 18 reference frames (done 2026-04-11).
- [x] `dreamland-reference/README.md` documents frame source attribution, scene descriptions, and fair-use posture (done 2026-04-11).
- [ ] The final primitive hex values in `primitives.css` match the Dreamland-extracted values in §2.2, with any CVD-driven adjustments documented in a `primitives.css` comment block at the top of the file explaining why each adjusted value diverged from the §2.2 extraction.
- [ ] `.gitignore` updated to exclude `dreamland-reference/images/**` if the repo goes public. (Not a Phase 1 blocker; flag for Phase 5 pre-deploy check.)

### §4.5 Visual smoke test

- [ ] Dev server starts (`pnpm dev` + `pnpm dev:server`).
- [ ] `http://localhost:5173/player.html?room=TEST` loads without console errors — existing phone components render using their current hardcoded values (Phase 1 doesn't migrate them).
- [ ] `http://localhost:5173/board.html?room=TEST` loads without console errors — existing board components render.
- [ ] `data-view="phone"` and `data-theme="dark"` are present on the phone root element, confirmed via devtools.
- [ ] `data-view="board"` and `data-theme="dark"` are present on the board root element, confirmed via devtools.

### §4.6 Archer acceptance test (token system in isolation)

- [ ] Side-by-side: Dreamland S8 reference frames + a rendered swatch grid of the primitive color scales + a rendered type sample using `--font-display` and `--font-body` at multiple sizes.
- [ ] **"Could this look like a frame from an Archer episode?"** — applied to the swatch grid + type sample as a system. If no: iterate on the palette, possibly switch `--font-display` to Baveuse ($30 Typodermic purchase + install), re-run. If yes: Phase 1 ships.

---

## §5 — Landmines

Phase 1 is foundation work, so the landmines are mostly about **not creating new ones** for Phases 2-5.

1. **Don't hardcode a fallback hex in a `var()`.** Every `var(--color-whatever)` in `semantic.css` must chain to another var, not to a literal hex. If the primitive doesn't exist, add it to `primitives.css` — don't paper over with a fallback.
2. **Don't use `svh` in cross-view components.** `MinimalCard.module.css` (rewritten in Phase 2) will use `cqi` / `cqb` — phase 1 doesn't touch `MinimalCard` but it establishes the rule.
3. **`color-mix()` must work on Browserslist targets.** Phase 5 verifies. If any target fails, fall back to pre-computed `rgba()` values — the `--shadow-*` tokens are the only consumers.
4. **`@media (prefers-reduced-motion: reduce)` globally zeroing motion durations is aggressive.** Some animations need to keep playing (loading spinners, the breathing glow on active turn indicators). Phase 4 handles exceptions via TS-side `useReducedMotion` overrides on a per-component basis.
5. **Light mode is stubbed.** `:root[data-theme="light"]` in `semantic.css` is empty (falls through to dark defaults). Light mode is deferred. If Briggsy wants light mode for post-Phase-5 polish, that's a Phase 1.5 follow-up.
6. **The `color-teal-*` naming collides with the existing `--teal` token in the current `theme.css`.** Since Phase 1 deletes `theme.css`, the collision is resolved by deletion. But if any component still imports from `theme.ts` after Phase 1 (which it shouldn't — verify with `pnpm lint`), the build will silently succeed and then blow up at runtime. **Run `git grep "from.*theme"` after deleting `theme.ts` and fix every stale import** before shipping Phase 1.

---

## §6 — Out of Scope

Phase 1 **does not** include:

- Migrating any `.module.css` file to consume the new tokens. That's Phases 2 and 3.
- Rewriting any component. That's Phases 2 and 3.
- Deleting `TurnBanner.tsx` (dead code). That's Phase 2.
- Consolidating `NopeButton.tsx` and `InterceptButton.tsx`. That's Phase 2.
- Resolving the `feltBranding` retheme gap. That's Phase 3.
- Unifying the 22 Framer Motion inline literals. That's Phase 4 (though Phase 1 defines the tokens they'll consume).
- Real iOS 26 device testing. That's Phase 5.
- The Playwright viewport regression matrix. That's Phase 5.
- Light mode theme. Deferred to Phase 1.5 post-Phase-5.
- Card-type accent tokens (`--card-accent-burned`, etc., currently in `theme.ts` as a `cardAccent(type)` function). These stay in `palette.ts` (or a new `card-accents.ts`) as a TS-side derivation, consumed via inline style on individual card elements — the current pattern. Phase 2 migrates `MinimalCard` to reference them.

---

## §7 — Cross-Phase Dependencies

**Phases 2-5 depend on Phase 1 for:**
- Every token they consume. Phase 1 is the contract.
- The `[data-theme]` and `[data-view]` root attributes. Phase 1 sets them.
- The motion TS/CSS twin. Phase 4 migrates components to consume it.
- The CVD + contrast test harness. Phase 5 expands the test coverage.

**Phase 1 depends on:**
- `roadmap.md` for the decisions it inherits.
- Memory file `project-burned-clean-slate-visual.md` for the clean-slate authorization.
- The Dreamland S8 frame extraction (the one sub-task in §2.8) for palette validation.

**If deepening Phase 1 surfaces a contradiction with another phase, resolve in this order:**
1. If the contradiction is about a token shape (e.g., "Phase 2 needs a token Phase 1 doesn't define"), add the token to Phase 1 — don't create parallel tokens elsewhere.
2. If the contradiction is about a value (e.g., "Phase 3 needs `--size-card-width` that breaks on 1920px boards"), adjust the Phase 1 clamp formula, not the Phase 3 override.
3. If the contradiction is about naming (e.g., "Phase 4 wants `--motion-duration-quick` but Phase 1 has `fast`"), Phase 1 wins — rename the Phase 4 reference.

---

## §8 — Bundle Budget Impact

**Expected additions** (phone entry):
- `primitives.css` — ~2KB raw, ~600 bytes gzipped (repetitive, compresses well)
- `semantic.css` — ~1.5KB raw, ~500 bytes gzipped
- `semantic.phone.css` — ~1KB raw, ~400 bytes gzipped
- `motion.ts` — ~800 bytes raw, ~350 bytes gzipped (imported once, tree-shaken where unused)
- `palette.ts` — ~400 bytes raw, ~200 bytes gzipped (test-only, not in phone bundle)
- **Test files** — not in the phone bundle.

**Expected removals:**
- `theme.ts` runtime `applyTheme()` — ~1.2KB raw, ~500 bytes gzipped
- `theme.css` fallback — ~500 bytes raw, ~250 bytes gzipped

**Net expected delta: +1KB to +2KB gzipped.** Should comfortably stay under the 100KB budget with 3-4KB headroom.

**If the budget is tight after Phase 1**, the first optimization is to move `primitives.css` from being imported into both phone and board entries to being inlined via a Vite plugin that strips unused primitives per-entry. Not a Phase 1 concern — flag for Phase 5 if needed.

---

## §9 — Sources

- **Radix Colors 12-step scale convention**: https://www.radix-ui.com/colors/docs/palette-composition/scales (primary source)
- **Utopia fluid typography calculator**: https://utopia.fyi/ — width-based only; svh variant derived manually in this phase.
- **`culori` CVD simulation**: https://culori.js.org/api/#filter (Brettel-Viénot-Mollon algorithm, primary source)
- **APCA for web**: https://www.myndex.com/APCA/ (APCA-W3 specification, primary source)
- **WCAG 2.1 AA contrast**: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html (primary source)
- **WCAG 1.4.4 resize text**: https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html (primary source — informs the `rem` base requirement)
- **Framer Motion `Transition` type**: Motion 11.x official docs — `duration` is `number`, not parseable string.
- **`color-mix()` browser support**: https://caniuse.com/mdn-css_types_color_color-mix — Baseline Widely Available since 2023.
- **Archer Dreamland S8**: see `roadmap.md` §10 Sources[^1][^2][^3] for production-team citations.

[^1]: Neal Holman, Art of the Title, May 2016. Verified 2026-04-11. Same citation as `roadmap.md`.
[^2]: Neal Holman, Salon 2016 (Wayback archive). Same as `roadmap.md`.
[^3]: Adam Reed, A.V. Club 2011 (Wayback archive). Same as `roadmap.md`.

---

*Phase 1 is ready for `/deepen-plan` once the roadmap and all 5 phase files are drafted. Deepening will run against this file to find contradictions with Phases 2-5 and with the roadmap. No `/ce:work` invocation until all 5 phases are deepened and the cross-phase contradiction map is resolved.*
