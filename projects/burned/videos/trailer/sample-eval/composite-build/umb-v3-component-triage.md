# UMB v3 Component Triage — Phase 4 Unit 4.0a

**Date:** 2026-05-22
**Plan:** [`docs/plans/origin-trailer/phase-4-remotion-composite.md`](../../../../docs/plans/origin-trailer/phase-4-remotion-composite.md) §Unit 4.0a
**Source:** `projects/undercover-mob-boss/videos/trailer/src/components/` (12 components)
**Eval method:** Read each UMB v3 component file in full + map to BURNED Phase 4 needs per Phase 1 BEAT-SHEET, Phase 3 visual contracts, and existing `videos/trailer/src/components/` inventory. FilmGrain additionally evaluated via Briggsy visual review at `temp/film-grain-eval/` (s04 hero composite with grain at 0.06 / 0.15 + 2s motion clip).

---

## Triage table

| UMB v3 component | Phase 4 candidate use | Verdict | Reason |
|---|---|---|---|
| `FadeTransition.tsx` | Scene-end fade for hard-cut polish | **SUPERSEDED-BY-EXISTING** | `videos/trailer/src/components/SceneFadeToBlack.tsx` (Phase 0 spike artifact, 35 lines) already implements scene-internal fade-to-black with a CLEANER API (explicit `startFrame` + `durationFrames`, no `useVideoConfig().durationInFrames` dep). Plan's "CLONE-AND-ADAPT" prescription pre-dated grep of existing `src/components/`. Use SceneFadeToBlack everywhere FadeTransition would have applied (S02→S03, S03→S04, S06→end optional polish per Unit 4.9 perceptual review). Same deepening-miss family as insight 066. |
| `TextReveal.tsx` | R15 text-layer animation | **TAKE-AS-INSPIRATION** | Generic fade-in + translateY-20-to-0 primitive. BURNED's R15 chrome uses split-layer architecture per Phase 3 contract #10 — text.svg is a sibling Img to frame.svg inside the stamp wrapper, both share the `archerStampSlap` transform from `lib/animations.ts`. R15 text reveal IS the slap, not a separate fade. Don't vendor; pattern documented in R15Stamp docstring if relevant. |
| `DocumentScroll.tsx` | `HtpDossierHero` translateY | **TAKE-AS-INSPIRATION** | UMB scrolled dense MD with syntax-color rendering + top/bottom gradient fades; BURNED scrolls a single PNG (`htp-fullpage.png` 19848px tall) via translateY interpolate. Different mechanic. Borrow the overflow:hidden + top/bottom gradient fade shape if `HtpDossierHero` wants edge softening; rewrite specifics. |
| `StatsCounter.tsx` | `GoofyStatCaption` chyron | **TAKE-AS-INSPIRATION** | UMB rolling counter with spring entry + stagger; BURNED states a stat (e.g., "Fourteen thousand pages. Six sticky notes.") — no roll animation. `GoofyStatCaption` uses `statCaptionEnvelope` helper from `lib/animations.ts` (asymmetric 6/30+/12 frame envelope per Phase 1 lock). Borrow stagger pattern only. |
| `KenBurns.tsx` | Briefing-room background slow-pan | **TAKE-AS-INSPIRATION** | Scale 1.0→1.15 + configurable panX/panY interpolate. BURNED's `BriefingRoomBackground` is largely static with parallax venetian-blind motion already specified per Phase 3 Unit 3.3 ("translateX 1.5–2px/frame"). Ken Burns add-on if S02/S06 want subtle scale drift — defer to scene-time iteration. |
| `FilmGrain.tsx` | Trailer-wide grain overlay | **SKIP** | Visual eval 2026-05-22 (`temp/film-grain-eval/`): at UMB's default 0.06 opacity grain is invisible; at boosted 0.15 it dulls BURNED's warm palette punch (mahogany loses depth, burn-fire stamp mutes). Archer's visual grammar is vector flat-color, not filmstock — grain pushes toward "70s spy movie" texture which is *adjacent* to Archer vibe but not Archer's actual vocabulary. Briggsy call: SKIP. |
| `CardReveal.tsx` | S01 cold-open card flashes | **TAKE-AS-INSPIRATION** | Spring scale + opacity fade + drop-shadow framing. S01 card flashes will use `archerStampSlap` (per `lib/animations.ts`) for consistency with R15 chrome motion grammar. Borrow drop-shadow framing for dramatic isolation if needed. |
| `CompactTerminalStrip.tsx` | — | **SKIP** | UMB-terminal aesthetic (mac-style title bar, syntax-color monospace, code-panel chrome). BURNED is Pendleton briefing-room, not terminal/sim. |
| `MultiTerminal.tsx` | — | **SKIP** | Same — multi-pane terminals with mac chrome dots. |
| `SimulationChaos.tsx` | — | **SKIP** | Mulberry32 PRNG for UMB voting-card spawn chaos. UMB game-specific. |
| `SplitScreen.tsx` | — | **SKIP** | Generic side-by-side panes. Phase 1 BEAT-SHEET has no split-screen moments. If a future scene wants it, write fresh — primitive is trivial (3 divs in a row). |
| `TerminalSimulation.tsx` | — | **SKIP** | Typing-speed code rendering with output/success/thinking line types. UMB game-specific. |
| `GamesCounter.tsx` | — | **SKIP** | Counter freezing at target value (UMB end-game stat). BURNED has no end-game counter beat. |

---

## CLONE-AND-ADAPT decisions

**None.** The plan's tentative CLONE-AND-ADAPT entries (FadeTransition + possibly TextReveal) both downgraded after file-read:

- **FadeTransition** — SUPERSEDED-BY-EXISTING `SceneFadeToBlack.tsx`. Plan body amendments (lines 46, 84, 3094+) need SUPERSEDED markers. Phase 4 Unit 4.8 Step 5 ("FadeTransition vendored from UMB v3 (optional)") becomes "use SceneFadeToBlack."
- **TextReveal** — R15 split-layer + archerStampSlap architecture supersedes. Phase 4 R15 chrome already specified differently.

## TAKE-AS-INSPIRATION decisions

5 components: TextReveal, DocumentScroll, StatsCounter, KenBurns, CardReveal. None are vendored. Patterns are documented as docstring citations in the consuming BURNED-native component if/when relevant. The "inspiration" is the SHAPE (overflow+gradient pattern, stagger+spring entry, scale+pan slow-motion, drop-shadow framing) — specifics are BURNED-native.

## SKIP decisions

7 components: FilmGrain (visual eval), CompactTerminalStrip, MultiTerminal, SimulationChaos, SplitScreen, TerminalSimulation, GamesCounter. UMB-terminal/sim aesthetic doesn't apply to Pendleton briefing-room. None are vendored.

---

## Net Phase 4 component inventory

**ZERO** UMB v3 components vendored. All "Trailer-native shared building blocks" in `videos/trailer/src/components/` are BURNED-authored (Phase 0 spike-derived or Phase 4 unit-created). Existing components at 2026-05-22:

```
videos/trailer/src/components/
├── BurnedLogoPlate.tsx
├── CutBrightnessPop.tsx
├── OperativePortraitFlash.tsx
├── R15ChromeStamp.tsx
├── SceneFadeToBlack.tsx        ← supersedes UMB FadeTransition
├── SpikeFontWeightDemo.tsx     ← Phase 0 Unit 0.5
├── SpikeHtpCascade.tsx         ← Phase 0 Unit 0.5
├── SpikeIrisWipe.tsx           ← Phase 0 Unit 0.5
├── SpikeKineticType.tsx        ← Phase 0 Unit 0.5
├── SpikeStampSlap.tsx          ← Phase 0 Unit 0.5
└── burned-vocabulary/          ← Phase 3 Unit 3.0 vendored from BURNED howtoplay
```

Phase 4 Units 4.1–4.7 author NEW BURNED-native components per the plan's component inventory (R15Stamp split-layer, BriefingRoomBackground, DossierFolder, CommsTicker, HtpDossierHero, CardArtHalo, GoofyStatCaption, S04TailFadeToBlack, MusicBed) — none of these duplicate UMB precedent.

---

## Carry-forward to Phase 4 plan

Plan body has 17 FadeTransition references. Load-bearing ones (assertions, not "optional per Unit 4.0a" conditionals) need SUPERSEDED-BY-EXISTING-SceneFadeToBlack markers per the audit-trail pattern (insight 060). Conditional references already point at this triage doc and are honored by reading "SUPERSEDED" in the table above.

**Plan amendments shipped in same commit as this doc:**
- Line 46 (overview file inventory): mark FadeTransition entry SUPERSEDED
- Line 84 (Trailer-native shared component library): mark SUPERSEDED
- Line 3094+ (Unit 4.8 Step 5 vendoring code template): mark SUPERSEDED
- Line 3730 (Deferred to Implementation FadeTransition entry): mark RESOLVED-BY-EXISTING

## Insight cross-reference

This finding is the SECOND deepening-miss caught in the Phase 4 entry-trace session (2026-05-22). Same root pattern as insight 066 — deepening agents prescribed work that prior-phase artifacts had already done. Generalization: **before any plan amendment prescribes vendoring or new component creation, grep `videos/trailer/src/components/` first.** Phase 0 spike-era components are easy to miss because they predate Phase 4 deepening by weeks.

Insight 066 "Also Applies To" extended via this case — original insight covered prior-phase EXIT DISPOSITIONS; this case extends to prior-phase IMPLEMENTATION ARTIFACTS already on disk. Same trace pattern (grep prior-phase output before executing later-phase prescription).
