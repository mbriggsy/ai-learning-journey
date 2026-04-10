# BURNED — TODO

## Current State
- **167/167 tests, 0 lint errors, typecheck clean**
- **Game is functional** — staging, hand, board, all card types, nope chains, elimination all working
- **Visual layer is FRAGILE** — see `docs/VISUAL-LAYER-AUTOPSY.md` for full analysis

## New components from 2026-04-09 (functionally correct, CSS needs token rebuild)
- TitleBar — connection dot + player name + room code
- StatusBar — replaces TurnBanner, "YOUR TURN" / "Waiting for X — N in pile"
- SmartActionBox — single contextual element: draw, hint, ready, target, invalid states
- InterceptButton — replaces NopeButton, "INTERCEPT" not "NOPE"
- Combo validation: single Intercepted blocked, mismatch message prioritized over per-card exclusions
- Action text: all turn-enders prefixed with "End turn —" consistently

## Next Steps (in order)

### 1. CSS Token Foundation Rebuild
The visual layer has no design system. See `docs/VISUAL-LAYER-AUTOPSY.md` for the full autopsy. Fix:

1. **Add spacing + typography token scales to `theme.css`** using `clamp()` with `svh` (height is the constraining axis for a portrait controller)
2. **Unify card sizing** — ONE system (height-driven everywhere), kill the width-driven staging approach
3. **Replace rigid flex ratios** (42/58) with content-aware sizing (`auto` + `max-height: svh`)
4. **Migrate all component CSS** to use tokens instead of hardcoded px
5. **Remove all layout hacks** — no `max-width` on container, no `min(100svh, 900px)` height clamp
6. **Test on phone, iPad landscape, desktop** — must work at all three without breakpoint patches

### 2. Deploy to Cloudflare
- Client: Cloudflare Pages
- Server: Cloudflare Workers (Durable Objects)
- $0 free tier

### 3. Real device testing
- Test on actual phones (not just DevTools)
- Test on multiple screen sizes
- Party WiFi conditions

## Landmines
- Hand cards at height:100% + aspect-ratio OVERFLOWS the screen — don't do this again. Current fix: aspect-ratio on the SLOT wrapper, not the card.
- No global `box-sizing: border-box` — added manually to `.card` and `.hand`. Container queries measure content-box, so thresholds adjusted (115px and 177px instead of 140px and 200px).
- `overflow: hidden` on staging section clips absolutely-positioned elements — labels must be inside the box, not floating on the border.
- CSS `justify-content: center` on scroll containers clips left overflow — use `::before`/`::after` flex spacers + JS scroll centering instead.
- Framer Motion `layoutId` on staged cards causes border flash when siblings exit — removed. `transition: none` on `[data-selected]` prevents remaining flicker.
- `game_over` phase still uses snake_case while all other phases use kebab-case
- NopeWindow stores full GameAction in persisted state — no versioning for hibernated payloads
- **CSS Modules without tokens = organized chaos.** Each module makes independent sizing decisions. UMB worked because every dimension flows from shared clamp() tokens. See `docs/VISUAL-LAYER-AUTOPSY.md`.
