# BURNED Visual Layer Rebuild Plan

*Token-first CSS rebuild. ~8 files, one focused session.*

---

## Scope

Rebuild the CSS foundation for the player (phone) view. The game logic, React components, Framer Motion animations, and server are untouched. Only CSS modules and theme tokens change.

---

## Phase 0: Design Tokens

Add spacing and typography scales to `theme.css`. Use `svh` (small viewport height) as the scaling axis — the player view is portrait, height is the constraint.

```css
/* ─── Spacing scale ─── */
--space-xs:  clamp(2px, 0.3svh, 4px);
--space-sm:  clamp(4px, 0.6svh, 8px);
--space-md:  clamp(8px, 1.2svh, 14px);
--space-lg:  clamp(14px, 2svh, 24px);
--space-xl:  clamp(22px, 3svh, 36px);

/* ─── Typography scale ─── */
--text-xs:   clamp(9px, 1.3svh, 11px);
--text-sm:   clamp(10px, 1.6svh, 13px);
--text-base: clamp(12px, 2svh, 16px);
--text-lg:   clamp(14px, 2.5svh, 19px);
--text-xl:   clamp(17px, 3svh, 24px);
--text-2xl:  clamp(20px, 3.5svh, 28px);
```

### Why svh?

| Viewport | svh value | --space-sm result | --text-base result |
|----------|-----------|-------------------|--------------------|
| iPhone SE (667px) | 667px | 4px (min) | 13px |
| iPhone 14 (844px) | 844px | 5px | 16px (max) |
| iPad landscape (820px) | 820px | 5px | 16px (max) |
| iPad Pro landscape (1024px) | 1024px | 6px | 16px (max) |
| Desktop (1080px) | 1080px | 6.5px | 16px (max) |

Everything scales proportionally with the constraining dimension. Clamp prevents extremes.

---

## Phase 1: Unified Card Sizing

**One system. Height-driven everywhere.**

Currently staging uses width-driven (`clamp(130px, 42vw, 200px)`) and hand uses height-driven (`align-items: stretch`). These respond differently to viewport changes.

**New approach — both use height-driven:**
- Card slots use `align-items: stretch` in their parent (fill available height)
- Width derived from `aspect-ratio: 5/7`
- Container queries for internal text scaling (already exist, keep them)
- No `clamp(vw)` for card widths anywhere

The container decides how tall cards are. The cards figure out their own width. One system.

---

## Phase 2: Content-Aware Layout

Replace rigid 42/58 flex ratios with content-aware sizing.

**Current (rigid):**
```css
.stagingSection { flex: 42 1 0; }
.handSection    { flex: 58 1 0; }
```

**New (content-aware):**
```css
.stagingSection { flex: 0 1 auto; max-height: 45svh; }
.handSection    { flex: 1 1 0; min-height: 0; }
```

Staging takes what it needs (content-driven), caps at 45% of viewport height. Hand takes the rest. No fixed ratio — the layout adapts to actual content.

**Container:**
```css
.container {
  height: 100svh;  /* Full viewport, always */
  /* No max-width. No height clamp. */
  /* Cards self-constrain width via aspect-ratio. */
}
```

---

## Phase 3: Migrate Component CSS to Tokens

Every hardcoded px replaced with a token reference.

### Files to migrate:

| File | Key changes |
|------|-------------|
| `PlayingView.module.css` | gaps, padding → `--space-*` |
| `StagingArea.module.css` | card gap, padding → `--space-*` |
| `Hand.module.css` | gap, padding, min-width → `--space-*` |
| `SmartActionBox.module.css` | padding, min-height, font-size → tokens |
| `TitleBar.module.css` | padding, gap, font-size, dot size → tokens |
| `StatusBar.module.css` | padding, font-size → tokens |
| `InterceptButton.module.css` | size, position, font-size → tokens |
| `MinimalCard.module.css` | padding tiers → `--space-*` (container queries stay) |

### Migration pattern:
```css
/* Before */
padding: 8px 16px;
font-size: 12px;
gap: 6px;

/* After */
padding: var(--space-sm) var(--space-md);
font-size: var(--text-sm);
gap: var(--space-xs);
```

---

## Phase 4: Test Matrix

Verify on these viewports (DevTools is fine for initial pass, real devices for final):

| Device | Resolution | What to check |
|--------|-----------|---------------|
| iPhone SE | 375x667 | Smallest target — nothing clipped |
| Pixel 7 | 412x915 | Tall phone — sections proportional |
| iPhone 14 | 390x844 | Standard iOS |
| iPad Air landscape | 1180x820 | Tablet — no dead voids, no overflow |
| iPad Pro landscape | 1366x1024 | Large tablet — cards reasonable size |
| Desktop Chrome | 1920x1080 | Dev testing — usable, not absurd |

**Pass criteria:**
- Cards visible and readable at every viewport
- No overflow/clipping between sections
- SmartActionBox fully visible and tappable
- Section labels readable
- No dead white/dark voids > 20% of any section

---

## Anti-Patterns (Do NOT Do)

1. **Never add `max-width` to the player container.** Cards self-constrain via aspect-ratio.
2. **Never use `vw` for card sizing in a portrait layout.** Height is the constraint.
3. **Never hardcode flex ratios.** Use content-aware sizing.
4. **Never patch responsiveness.** If it breaks, the token system is wrong — fix the system.
5. **Never add a breakpoint without asking "why isn't clamp() enough?"** Breakpoints change layout direction. Scaling is continuous.

---

## What This Does NOT Change

- React component structure (all correct)
- Game logic / engine / protocol
- Framer Motion animation config
- Card art assets
- Test suite
- Server / Durable Objects
- Theme colors (already tokenized and good)
