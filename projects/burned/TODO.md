# BURNED — TODO

## Current State
- **167/167 tests, 0 lint errors, typecheck clean**
- **Game is functional** — staging, hand, board, all card types, nope chains, elimination all working
- Phone bundle: ~99KB gzipped (1KB headroom)

## Next Steps (in order)

### 1. Phone layout redesign — title bar, status bar, smart action box
Sketch approved (see `temp/phone-sketch-v4.png` for reference). Four-zone layout:

**Title bar** (fixed ~28px): Player name + room code + connection dot.
**Status bar** (fixed ~32px): Replaces TurnBanner. Shows "YOUR TURN", "Waiting for X — N in pile", drama events ("Extraction!").
**Staging box** (flex ~42%): Bordered section with header. Cards + smart action box.
**Hand box** (flex ~58%): Bordered section with header. Height-driven cards.

**Smart action box** replaces Play button + invalid combo message. Single contextual element:
- **Info state** (dashed, muted): "Needs a pair or triple", "Cards must match"
- **Ready state** (teal, solid, glow): "End your turn without drawing", "Peek at the top 3 cards"
- **Target state** (amber, solid, arrow): "Steal a random card →", "Force someone to draw →"

Action descriptions needed per card type:
- `go-dark` → "End your turn without drawing"
- `intel-briefing` → "Peek at the top 3 cards"
- `reassign` → "Choose ANY card from discard"
- `scramble` → "Shuffle the draw pile"
- `direct-order` → "Force someone to draw →" (target)
- `call-in-a-favor` → "Take a card from someone →" (target)
- `intercept` → "Block the current action"
- Pair → "Steal a random card →" (target)
- Triple → "Name & steal a specific card →" (target)

Box edges 2px from device edge. 6px gap between staging and hand boxes.

### 2. Scroll bounce — hand not working on laptop
Staging bounce works, hand bounce doesn't. `useScrollBounce` hook is wired to both. Needs real device testing to determine if it's a DevTools emulation issue or a real bug. Tolerance already set to 2px.

### 3. Deploy to Cloudflare
- Client: Cloudflare Pages
- Server: Cloudflare Workers (Durable Objects)
- $0 free tier

### 4. Real device testing
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
