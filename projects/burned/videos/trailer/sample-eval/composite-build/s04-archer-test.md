# S04 Receipts Cascade — Archer Test

**Unit:** 4.5 — S04 Receipts Cascade Scene
**Date:** 2026-05-23 (R2, coupled audio re-pace + visual rewrite)
**Plan:** [`docs/plans/origin-trailer/phase-4-remotion-composite.md`](../../../../docs/plans/origin-trailer/phase-4-remotion-composite.md) §Unit 4.5
**Composition:** `PreviewS04ReceiptsCascade`
**Duration:** 990 frames / 33.0 s @ 30 fps
**Render output:** `videos/trailer/out/s04-receipts-cascade.mp4` (7.9 MB, H264 CRF 18)
**With-audio review build:** `videos/trailer/out/s04-with-audio.mp4` (7.1 MB; FFmpeg-muxed 8 VO cues at R2-shifted offsets — NOT shipped, review-only)
**Key stills:** `videos/trailer/out/s04-r2-stills/rel-{030,090,200,340,480,640,780,935,985}.png`

---

## Two-revision history

- **R1 (audio-overtalk caught 2026-05-23, no shipped build).** Load-bearing scene
  wired with 4 components: `HtpDossierHero` (linear scroll of htp-fullpage.png),
  `CardArtHalo` (6-card right-edge column), 4× `GoofyStatCaption`,
  `S04TailFadeToBlack`. Briggsy ear-checked the muxed review build and called
  audio over-talk between cues. Diagnosed as Phase 2 carry-forward — VO
  actualFrames overran script.ts expectedFrames slots; cumulative overlap
  cues 2-7 ≈ 90 frames. Briggsy chose source-level fix.
- **R2 (current, shipped — coupled audio re-pace + visual rewrite).** When
  Briggsy eye-checked the R1 visual approach he flagged: *"the scrolling in
  S04 almost looks like a conveyor belt, looks weird."* Diagnosed as deeper
  failure — linear HTP scroll is a foreign motion dialect inside an
  otherwise object-cascade-grammar trailer (S01 card flashes, S02 folder
  open, S03 operative cascade). R2 bundled the audio re-pace with a
  cascade-of-dossier-pages rewrite that rhymes with S03's motion vocabulary.

---

## VO content (verified against `src/lib/script.ts` post R2 re-pace)

R2 shifted 6 of 8 cue startFrames to absorb cumulative actualFrames overrun.
Cues 1-2 unchanged (no prior overrun); cues 3-8 shifted +21 to +115 frames.

| cue | abs frame | rel | actualFrames | text |
|---|---|---|---|---|
| S04-cue-01 | 1380 | 0   | 55  | "Operational planning." |
| S04-cue-02 | 1440 | 60  | 106 | "Fourteen thousand pages of forensic dossiers." |
| S04-cue-03 | 1551 | 171 | 132 | "Drafted at three AM, name redacted for compliance." |
| S04-stat-01 | 1688 | 308 | 137 | "Mission rehearsal: fourteen hundred and seven contingencies war-gamed." |
| S04-stat-02 | 1830 | 450 | 152 | "Six of them, deliberately unrehearsed — the 'memorable ones.'" |
| S04-stat-03 | 1987 | 607 | 133 | "Seventeen asset illustrations. Five of them with hats." |
| S04-stat-04 | 2125 | 745 | 174 | "Seven on the roster. Six in the deck. One on the research budget. Don't ask." |
| S04-payoff | 2304 | 924 | 63  | "They WERE the operation." |

Inter-cue gap: 5 frames between cues 1-7; cue 8 (payoff) lands 5f after cue 7 ends.
Payoff VO last 12f plays through the S04 tail-fade-to-black overlay (rel 975-990
= abs 2355-2370) — audio carries cinematically through the close.

---

## Beat-aligned visual choreography (R2)

Replaces R1's linear HTP scroll + 4 stat-caption overlays + 6-card halo column.
New model: 7 dossier pages tossed onto the briefing-room desk, one per VO beat,
chrome-decay landed pages to 55% so newest is focal. Same `EASE_OUT_EMIL` settle
+ entry-tilt-resolves-to-final grammar as S03's operative cascade.

| Scene-rel | Visual event | VO word landing |
|---|---|---|
| 0   | **P1 Cover** lands — Operation Pendleton crest + "TOP SECRET // EYES ONLY" stripe + "// FILE: PNDLT-Δ-001 // CLASSIFICATION: BLACK" footer | "Operational planning." |
| 60  | **P2 14,000** lands — massive Clash Display 700 numeral, "// FORENSIC DOSSIERS" header, marginalia "+ 6 sticky notes (recovered)"; P1 begins chrome-decay | "Fourteen thousand pages of forensic dossiers." |
| 171 | **P3 Redacted** lands — fat charcoal-1 redact bar across "DRAFTED BY:" prompt, "03:17 // SAT" date stamp, "// NAME REDACTED — COMPLIANCE §4.2(b)"; P2 chrome-decays | "Drafted at three AM, name redacted for compliance." |
| 308 | **P4 1,407** lands — massive numeral + 14×21 tick-mark grid (294 cells, scattered burned-fire highlights), "SCENARIOS A–Z"; P3 chrome-decays | "Mission rehearsal: fourteen hundred and seven contingencies war-gamed." |
| 450 | **P5 Memorable** lands — big italic "6" with burned-fire diagonal strike-through, "// 'THE MEMORABLE ONES'", marginalia "do NOT discuss in writing"; P4 chrome-decays | "Six of them, deliberately unrehearsed — the 'memorable ones.'" |
| 607 | **P6 Hats** lands — "17" big + 5 distinct inline-SVG hat glyphs (top hat, fedora, bowler, beret, cowboy), "// 5 W/ HATS"; P5 chrome-decays | "Seventeen asset illustrations. Five of them with hats." |
| 745 | **P7 Budget** lands — three rows "7 ON ROSTER / 6 IN DECK / 1 RESEARCH BUDGET — DON'T ASK" (the "1" + tail in burned-fire); P6 chrome-decays | "Seven on the roster. Six in the deck. One on the research budget. Don't ask." |
| 745–919 | `CommsTicker` text override "OPERATIVE [REDACTED] — METHOD REPEATABLE" | (during stat-04 174f duration) |
| 900 | P7 begins chrome-decay (anticipating payoff stamp) | (silence into payoff) |
| 924 | **R15 #3 PAYOFF STAMP** — `archerStampSlap('payoff')` envelope (overshoot 1.06), `stamp-3-asset-delivered` split-layer SVGs, slaps across the dimmed pile | "They WERE the operation." |
| 975–990 | `S04TailFadeToBlack` 15f overlay opacity 0→1; last 12f of payoff VO play through the fade | (audio carries through the close) |

---

## §2 Quality Bar (per BURNED CLAUDE.md + insight #050)

- [x] **Could this be from an Archer episode?** — Briggsy-eye approved on R2 ("way better than the conveyor belt!")
- [x] **Motion vocabulary rhymes with S03 cascade** — pages enter with EASE_OUT_EMIL + progressive tilt + stagger; same grammar as operative cards
- [x] **Each beat is a comedy unit** — page focal content (14,000 / redacted / 1,407 / 6 strike-through / hats / 7-6-1) carries the punchline; no caption layer needed
- [x] **Chrome-decay focal hierarchy** — newest page ~1.0 opacity, previous ~0.7 mid-decay, earlier ≤0.55; anti-pattern guard "no frame except payoff has >2 elements at full visual weight" holds
- [x] **Payoff stamp slaps the pile** — dimmed evidence pile reads as the visual antecedent of "they"; R15 stamp owns the focal slot
- [x] **Audio pauses land cleanly** — R1 over-talk resolved; ear-checked review build accepted

---

## Components

### New (R2)
- `DossierPage.tsx` — paper shell with anchor / landFrame / chromeDecayFromFrame props. Cream-12 paper + ochre-9 hairline outer + inset hairline at 45%, paper-edge box-shadow stack. Land envelope scale 0.78 → 1.05 → 1.0 (overshoot) + Y drop from -180 + entry-tilt resolves to anchored rot. Chrome decay opacity 1.0 → 0.55 + scale 1.0 → 0.98 over 30 frames.
- `DossierPageCascade.tsx` — orchestrator. 7 pages (P1 Cover, P2 14k, P3 Redacted, P4 1407, P5 Memorable, P6 Hats, P7 Budget). Per-page content composed in code from existing tokens (cream-12, ochre-9, charcoal-1, burned-fire, Clash Display 700, JetBrains Mono). Shared chrome bits: `HeaderLabel` + `FooterChrome` + `BigNumeral` + `SubLabel` + `Marginalia` + `BudgetRow` + `HatGlyph` (5 inline SVG variants).

### Re-used (unchanged)
- `BriefingRoomBackground.tsx` (S02 carry)
- `CommsTicker.tsx` (S02 carry, with 3 Sequence windows in S04)
- `R15Stamp.tsx` (S01 carry, `variant='payoff'`)
- `S04TailFadeToBlack.tsx` (unchanged from R1)

### Shelved, not deleted (R1 components — preserved for potential reuse)
- `HtpDossierHero.tsx` — linear-scroll wrapper around htp-fullpage.png
- `CardArtHalo.tsx` — 6-card right-edge column
- `GoofyStatCaption.tsx` — typographic punchline backdrop with burned-fire left border

The `htp-fullpage.png` asset (1920×19848, ~1.5MB) is untouched on disk.

### Music bed envelope (re-aligned)
`MusicBed.tsx` 15-anchor envelope re-anchored against R2 frames. New anchors at/after S04_START: 2125 (mid-cascade swell), 2214 (peak intensify), 2304 (STACKED_PAYOFF_FRAME peak hold), 2352 (sharp drop pre-silence), 2367 (PAYOFF_VO_END silence beat). Envelope shape relative to scene events preserved; absolute frames updated to follow VO landings.

### Timing constants
`STACKED_PAYOFF_FRAME` 2280 → 2304. `PAYOFF_VO_END_FRAME` 2340 → 2367. `PAYOFF_HOLD_FRAMES` 30 → 3 (audio-through-fade design — last 12f of VO play through `S04TailFadeToBlack`). `timing.test.ts` assertions updated.

---

## Verification

- `pnpm typecheck` — clean (root + videos/trailer subpackage)
- `pnpm test` — 220 / 220 trailer tests pass (11 files green)
- 9 PNG stills rendered at scene-rel 30/90/200/340/480/640/780/935/985 — each beat landed cleanly per visual inspection
- Full render `out/s04-receipts-cascade.mp4` 7.9 MB / 990 frames / 33.0s
- FFmpeg mux `out/s04-with-audio.mp4` 7.1 MB — 8 VO cues at R2 offsets (0/2000/5700/10267/15000/20233/24833/30800 ms)
- Briggsy eye-check on stills: approved
- Briggsy ear+eye on muxed review build: approved ("way better than the conveyor belt!")
