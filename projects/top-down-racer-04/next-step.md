# Next Step

## Last Completed
Phase 4 Step 6 complete on branch `feat/phase-4-ui-audio` — 2026-03-13 ~9:12 AM EDT

## Next
Continue Phase 4 on branch `feat/phase-4-ui-audio` — Steps 7-8 remain

### Step 7: ScreenManager rewrite (DOM hybrid)
- Remove menuContainer, wire DOM overlay show/hide
- Escape routing table (Fix #40), spectator guards (Fix #37/#38/#43/#44)
- Finish overlay Continue wiring (Fix #42)

### Step 8: RendererApp wiring + integration
- Remove PixiJS menu imports, wire SoundManager.update(prev,curr,alpha,race)
- Wire SFX triggers, keyboard (M=mute), document.fonts.ready (Fix #27)
- Remove ASSETS.ui.menuBg, run full test suite

### Test baseline: 460/462 pass (2 pre-existing stale filter-manager tests — not P4's concern)
