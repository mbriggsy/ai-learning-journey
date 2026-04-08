# Exploding Kittens Digital — TODO

## Current State
- **152/152 tests, 0 lint errors, typecheck clean, build succeeds**
- **Phone initial JS: ~99KB gzipped (<1KB headroom — budget is 100KB)**
- Player phone design overhaul complete (7 items from critique)
- Gauntlet v1 complete: 10 autonomous iterations, Board 5.7→6.9, Player 6.3→7.5
- Gauntlet skill lives at `.claude/skills/gauntlet/` with rubric, calibration, play-guide

## Next Steps (in order)

### Design Quality Round 2 — Art Direction Before Execution

1. **Establish art direction brief** — Before generating ANY imagery. Define the visual style for EK (playful? irreverent? bold line art? watercolor?). ONE test image, align with Briggsy, THEN batch. Budget: <$5 total for all assets. H&S lesson: $25 spent on ugly art. UMB lesson: <$3 for a masterpiece.

2. **Strip Impeccable Design skills, use Anthropic's `/frontend-design`** — The 20 Impeccable Design skills were never invoked by the Gauntlet. Dead weight eating context budget. One holistic design skill beats 20 fragmented ones.

3. **Recalibrate the Gauntlet evaluator** — Current scores are inflated. Briggsy says "far far away from UMB polish" at scores the evaluator rated 7.5. Needs: harder scoring, UMB screenshots as quality reference, force Imagen 4 usage for card art.

4. **Fix dev experience** — Replace popup window "Add Player" buttons with clickable links (like UMB had). Current popup approach is hostile for laptop testing. Need DevTools device mode support.

5. **Run Gauntlet round 2** — With recalibrated evaluator, `/frontend-design`, and Imagen 4 art direction. Target: 8.5+ on both views.

### After Design

6. Manual testing: real phones, WiFi toggle, screen lock/unlock
7. Set up GitHub secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID) — UMB has PartyKit secrets but no Cloudflare
8. First production deploy (wrangler deploy + Cloudflare Pages)
9. Room.ts test coverage (844 lines, zero tests — biggest risk factor)

## Landmines
- **Phone JS at ~99KB gzipped — <1KB headroom.** CardIllustration.tsx (17 SVGs) nearly blew the budget. Any new shared code must be lazy-loaded or something must be cut.
- Board entry: 38.89KB gzipped (up from 38.55KB). Fine for TV/laptop.
- Shared theme chunk grew 73.29→75.44KB from CardIllustration SVGs.
- `.agents/`, `.claude/skills/`, `skills/`, `skills-lock.json` are plugin infrastructure — not committed
- Combo validation still duplicated between engine (isValidCombo) and shared (isValidComboMatch)
- `game_over` phase uses snake_case while all other phases use kebab-case
- NopeWindow stores full GameAction in persisted state — no versioning for hibernated payloads
- playerSessions map not pruned on return-to-lobby
- Gauntlet only tested 2-player games — need 4-5 player testing for layout scaling
- Gauntlet evaluator scores inflated — "7.5" player view doesn't match human assessment
