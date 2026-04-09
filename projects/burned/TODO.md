# BURNED — TODO

## Current State
- **167/167 tests, 0 lint errors, typecheck clean**
- **Game is functional** — staging, hand, board, all card types, nope chains, elimination all working
- Phone bundle: ~95KB gzipped (5KB headroom)

## Next Steps (in order)

### 1. Phone layout — kill dead space
The hand area has dead space below cards. Fix the staging/hand flex split so both zones fill their space. Small CSS tweak — screenshot on phone before and after.

### 2. Deploy to Cloudflare
- Client: Cloudflare Pages
- Server: Cloudflare Workers (Durable Objects)
- $0 free tier

### 3. Real device testing
- Test on actual phones (not just DevTools)
- Test on multiple screen sizes
- Party WiFi conditions

## Landmines
- Hand cards at height:100% + aspect-ratio OVERFLOWS the screen — don't do this again
- `overflow: hidden` on staging section clips the PLAY button if content exceeds bounds — always verify clearance
- CSS hover on touch devices fires sticky — all hover effects gated behind `@media (hover: hover)`
- Framer Motion `layoutId` between hand and staging causes z-index fight if used on the enlarge overlay — enlarge uses spring scale instead
- `game_over` phase still uses snake_case while all other phases use kebab-case
- NopeWindow stores full GameAction in persisted state — no versioning for hibernated payloads
