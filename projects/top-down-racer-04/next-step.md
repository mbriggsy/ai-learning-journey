# Next Step

## Last Completed
Phase 4 Steps 1-4 complete on branch `feat/phase-4-ui-audio` — 2026-03-12 ~11:00 PM EDT

### Commits on branch (4 so far):
1. `feat(ui): add DOM overlay infrastructure + menu styles` — index.html #menu-overlay, dom-styles.ts, fonts
2. `feat(settings): add Settings module with per-field validation + tests` — Settings.ts + 13 tests
3. `feat(audio): replace SoundManager stub with 3-layer engine + full SFX` — 558 lines, all v02 SFX + checkpoint chime
4. `feat(filters): add setQualityTier() for low/medium/high graphics settings` — FilterManager updated

## Next
Continue Phase 4 on branch `feat/phase-4-ui-audio` — Steps 5-8 remain

### Step 5: DOM screens (DomMainMenu, DomTrackSelect, DomSettings)
- **Action:** `/workflows:work` on `docs/plans/2026-03-12-feat-phase-4-commercial-ui-audio-plan.md`
- Create `src/renderer/dom/DomMainMenu.ts`, `DomTrackSelect.ts`, `DomSettings.ts`
- No DomOverlay class (Fix #15), no DomScreen interface (Fix #16)
- AbortController for cleanup (Fix #25), focus management (Fix #26)
- Remove test tone (Fix #17), design polish (Fixes #20-24)
- Lap count wired via callback (Fix #36)

### Step 6: HUD upgrade (analog gauge, minimap, position)
- Replace vertical bar with analog semicircular gauge (270° arc)
- Container rotation for needle (Fix #7), cacheAsTexture (Fix #33)
- AI car dot on minimap, position indicator (P1/P2)
- Drop digital readout (Fix #18), drop checkpoint marks (Fix #19)
- layoutHud() resize handler (Fix #32)

### Step 7: ScreenManager rewrite (DOM hybrid)
- Remove menuContainer, wire DOM overlay show/hide
- Escape routing table (Fix #40), spectator guards (Fix #37/#38/#43/#44)
- Finish overlay Continue wiring (Fix #42)

### Step 8: RendererApp wiring + integration
- Remove PixiJS menu imports, wire SoundManager.update(prev,curr,alpha,race)
- Wire SFX triggers, keyboard (M=mute), document.fonts.ready (Fix #27)
- Remove ASSETS.ui.menuBg, run full test suite

### Test baseline: 420/421 pass (1 pre-existing stale shadow test — not P4's concern)
