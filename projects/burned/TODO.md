# BURNED — TODO

## Current State
- **152/152 tests, 0 lint errors, typecheck clean, build succeeds**
- **Retheme complete:** Source code + docs. All EK references removed or mapped. Rules reference retains original terminology with mapping table.
- Dev experience: popup buttons replaced with clickable links (Whiskers, Mittens, Tuna, Pickles)
- Impeccable Design skills stripped (never installed, doc + .impeccable.md deleted)
- Gauntlet skill lives at `.claude/skills/gauntlet/`

## Next Steps (in order)

### Finish Retheme Housekeeping

1. ~~**Rename project folder**~~ — DONE.
2. ~~**Update docs**~~ — DONE. README, CLAUDE.md, brainstorm, roadmap, gauntlet skill, play guide, rubric, insights, plan docs (retheme context headers), rules reference (mapping table).

### Art Direction + Visual Identity

3. **Establish art direction brief** — Mid-century modern, Saul Bass meets spy title sequences. Bold, saturated, geometric. Define palette.
4. **Imagen 4 test image** — ONE character (Dash Barlowe) to align on style. Budget <$5 total.
5. **Theme.ts palette overhaul** — Replace noir palette with BURNED mid-century modern colors.
6. **CardIllustration.tsx → external assets** — Replace inline SVGs with Imagen 4 PNGs/WebPs. Fixes bundle budget (~8-10KB savings).
7. **Recalibrate the Gauntlet evaluator** — Harder scoring, new visual reference, force Imagen 4 usage.
8. **Run Gauntlet round 2** — Target 8.5+ on both views.

### After Design

9. Manual testing: real phones, WiFi toggle, screen lock/unlock
10. First production deploy via PartyKit (same as UMB — secrets already exist, proven pipeline)
11. Room.ts test coverage (844 lines, zero tests — biggest risk factor)

## Landmines
- Phone JS at ~99KB gzipped — but CardIllustration SVG→PNG migration (step 6) will drop to ~90KB
- Combo validation reason strings renamed (`contains-ek` → `contains-burned`, `single-cat` → `single-operative`, etc.) — any external consumers would break
- `game_over` phase still uses snake_case while all other phases use kebab-case
- NopeWindow stores full GameAction in persisted state — no versioning for hibernated payloads
- playerSessions map not pruned on return-to-lobby
- Gauntlet only tested 2-player games — need 4-5 player testing for layout scaling
- Git history: old `exploding-kittens/` shows as delete+add (folder moved outside git, not `git mv`)
