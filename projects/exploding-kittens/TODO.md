# BURNED — TODO

## Current State
- **152/152 tests, 0 lint errors, typecheck clean, build succeeds**
- **Retheme complete (source code):** All card types, categories, event types, UI text, config files, HTML titles renamed from Exploding Kittens → BURNED
- Dev experience: popup buttons replaced with clickable links (Whiskers, Mittens, Tuna, Pickles)
- Impeccable Design skills stripped (never installed, doc + .impeccable.md deleted)
- Gauntlet skill lives at `.claude/skills/gauntlet/`

## Next Steps (in order)

### Finish Retheme Housekeeping

1. **Rename project folder** — `projects/exploding-kittens/` → `projects/burned/`. Update git, memory paths, CLAUDE.md project mapping.
2. **Update docs** — README.md (full rewrite), CLAUDE.md, docs/rules/RULES-REFERENCE.md (add mapping note), rename brainstorm doc, update plan docs.

### Art Direction + Visual Identity

3. **Establish art direction brief** — Mid-century modern, Saul Bass meets spy title sequences. Bold, saturated, geometric. Define palette.
4. **Imagen 4 test image** — ONE character (Dash Barlowe) to align on style. Budget <$5 total.
5. **Theme.ts palette overhaul** — Replace noir palette with BURNED mid-century modern colors.
6. **CardIllustration.tsx → external assets** — Replace inline SVGs with Imagen 4 PNGs/WebPs. Fixes bundle budget (~8-10KB savings).
7. **Recalibrate the Gauntlet evaluator** — Harder scoring, new visual reference, force Imagen 4 usage.
8. **Run Gauntlet round 2** — Target 8.5+ on both views.

### After Design

9. Manual testing: real phones, WiFi toggle, screen lock/unlock
10. Set up GitHub secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
11. First production deploy (wrangler deploy + Cloudflare Pages)
12. Room.ts test coverage (844 lines, zero tests — biggest risk factor)

## Landmines
- Phone JS at ~99KB gzipped — but CardIllustration SVG→PNG migration (step 6) will drop to ~90KB
- Combo validation reason strings renamed (`contains-ek` → `contains-burned`, `single-cat` → `single-operative`, etc.) — any external consumers would break
- `game_over` phase still uses snake_case while all other phases use kebab-case
- NopeWindow stores full GameAction in persisted state — no versioning for hibernated payloads
- playerSessions map not pruned on return-to-lobby
- Gauntlet only tested 2-player games — need 4-5 player testing for layout scaling
- Folder is still `exploding-kittens/` until step 1 is done
