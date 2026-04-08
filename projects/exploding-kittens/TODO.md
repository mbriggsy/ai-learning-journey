# Exploding Kittens Digital — TODO

## Current State
- **152/152 tests, 0 lint errors, typecheck clean, build succeeds**
- **Phone initial JS: ~95KB gzipped (under 100KB budget, 5KB headroom)**
- Bug fix: "Maximum update depth exceeded" crash on player after playing a card — FIXED
- Board design critique complete — all 6 action items executed
- Player phone design critique complete — action plan ready for next session

## Next Steps (in order)

### Player Phone Design Overhaul (critique score: 17/40 → target 28+)

1. **[P0] Turn indicator on phone** — No visible "YOUR TURN" state. Add turn banner at top of PlayingView: full-width, amber accent, Clash Display, pulse animation. When NOT your turn: "Waiting for {name}..." in muted text.

2. **[P1] Draw button redesign** — Currently a flat rectangle. Needs red accent border, subtle red glow, "DRAW" in Clash Display uppercase, breathing animation. Intensify glow when few cards remain in pile. This is the highest-stakes action in the game — it should feel like pulling a grenade pin.

3. **[P1] JoinScreen redesign** — Match board Lobby energy. Clash Display title, room code with personality, animated waiting state. "Joined" state should show PlayerIcon + color + who else is in the lobby. Replace `.dot` with PlayerIcon.

4. **[P1] EliminatedView overhaul** — Currently 3 lines of text. Dramatic explosion entrance (scale + shake), personality variants ("BOOM. You're cooked." / "The kitten got you."), show remaining players with names/icons, keep them engaged with the game.

5. **[P2] Card descriptions** — Long-press card for detail sheet (card name, description, how it works). Also show description in CardConfirmBar when card selected ("Play Skip — End your turn without drawing"). First-time players have zero guidance on what 16 card types do.

6. **[Minor] Normalize sheets** — Clean up `rgba(255,255,255,0.1)` → `var(--border-subtle)` in sheets.module.css. Replace `.dot` with PlayerIcon in target selection. Add `font-family: var(--font-display)` to EliminatedView title.

7. **[Minor] Polish pass** — Move PlayingView inline styles to CSS module. Add `prefers-reduced-motion` to player components. Improve ConnectionOverlay (use spotlight gradient, add progress animation). Card count text too small (13px).

### After Player Phone Overhaul

8. Manual testing: real phones, WiFi toggle, screen lock/unlock
9. Set up GitHub secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
10. First production deploy (wrangler deploy + Cloudflare Pages)
11. Room.ts test coverage (844 lines, zero tests — biggest risk factor)

## Landmines
- Phone JS at ~95KB gzipped — only 5KB headroom before 100KB budget. Card description sheet adds weight.
- Board entry grew from 10KB→39KB gzipped from Lobby/GameOver/PlayerIcon/announcement variants. Fine for TV/laptop.
- `.agents/`, `.claude/skills/`, `skills/`, `skills-lock.json` are Impeccable Design plugin infrastructure — not committed to git
- Combo validation still duplicated between engine (isValidCombo) and shared (isValidComboMatch) — drift risk
- `game_over` phase uses snake_case while all other phases use kebab-case
- Inline styles in ~15 components bypass CSS modules convention
- NopeWindow stores full GameAction in persisted state — no versioning for hibernated payloads
- playerSessions map not pruned on return-to-lobby
- ReducedMotionProvider is a passthrough — context + hook stripped until consumer wired
- Remaining E2E Tier 2 scenarios (11-20) not yet written
