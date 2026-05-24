# Per-Scene Archer Test Summary

**Unit:** 4.9 — Per-Scene §2 Archer Test Pass
**Date:** 2026-05-24 (R1 placeholder; live verdicts fill in as Briggsy reviews per-scene MP4s)
**Plan:** [`docs/plans/origin-trailer/phase-4-remotion-composite.md`](../../../../docs/plans/origin-trailer/phase-4-remotion-composite.md) §Unit 4.9
**Gate:** `pnpm verify:briggsy-sentinels` (Phase 4 scope) — must exit 0 before Unit 4.10 master-render entry.

---

## Scene roll-up

| Scene | Iter | Sentinel | Verdict | Notes |
|-------|------|----------|---------|-------|
| **S01 Cold Open** | 1 | `briggsy-review-4.2.signoff` ✓ | PASS | Compressed-Archer cold-open: 3 operative card flashes (Janet → Dash → Neal), R15 #1 OPERATION PENDLETON stamp slap at frame 150, BURNED card-art reveal via LOGO_SPRING_COLD at frame 180. |
| **S02 Briefing Setup** | 1 | `briggsy-review-4.3.signoff` ✓ | PASS | 12-second establishing shot: mahogany base + venetian-blind drift + dossier folder opens 30-90 EASE_DRAWER + Pendleton crest watermark + depth-plane brass nameplate + CommsTicker holds // CHANNEL OPEN. |
| **S03 Mission Background** | 3 | `briggsy-review-4.4.signoff` ✓ | PASS | R1 hard-zero (vertical thumbnail column) → R2 (cascade with bigger cards, Briggsy flagged dead time) → R3 (VO-beat-aligned across full 27s, "lock it"). Diagonal cascade, Agent X spotlight + paperwork marginalia, DeckStack, BurnedCardReveal, awkward-lean envelope. |
| **S04 Receipts Cascade** | 2 | `briggsy-review-4.5.signoff` ✓ | PASS | R1 linear HTP scroll + GoofyStatCaption flagged "conveyor belt" → R2 7-page DossierPageCascade with land-overshoot + chrome-decay envelope; coupled audio re-pace +21 to +115f against actualFrames. R3 patch (P2 14,000 numeral page-bleed) absorbed. |
| **S05 Gameplay Dissolve** | 1 | `briggsy-review-4.6.signoff` (pending) | (pending — placeholder build) | 18-second gameplay closer. R1 mechanical PASS; R2 placeholder vertical pan added. Full §2 verdict deferred to Phase 5 real-clip ship (placeholder = looped HTP fullpage, not representative). |
| **S06 Closing Directive** | 1 | `briggsy-review-4.7.signoff` (pending) | (pending) | 9-second close: IrisWipe-IN → dossier closes → BURNED wordmark settled (LOGO_SPRING_CLOSING) → R15 #4 OPERATION STATUS: FIELD-READY on Phrasing! second syllable → R15 #5 closing-card cold-decode "DRAFTED, RENDERED, AND / SHIPPED BY AUTONOMOUS AGENTS." + italic subhead bookending Janet's S01 kicker. R1.1 patch: dossier fades to 0 (not 0.15); R15 #5 SVG stroke + ink-halo for contrast. |

---

## Status

- ✓ 4 of 6 sentinels present + Briggsy-authored: S01, S02, S03, S04
- ◯ 2 of 6 sentinels pending: S05 (placeholder build — Briggsy may sign against placeholder OR defer to Phase 5 real-clip), S06 (R1.1 ready for eye-check)
- `pnpm verify:briggsy-sentinels` currently FAILS exit 1 with `MISSING: briggsy-review-4.{6,7}.signoff` — gates Unit 4.10 entry until Briggsy writes those two.

---

## Open R2 questions per scene archer-test docs

**S06** ([archer-test](s06-archer-test.md) §Verdict):
1. **CASE BANNER omission** — BEAT-SHEET specifies a CASE BANNER row at S06; R1 design judgment was to skip it (depth-plane + R15 stack already crowds bottom-third). Briggsy decides: reinstate as top-edge banner in R2, OR ratify the skip.
2. **R15 #5 italic subhead opacity 0.55** — BEAT-SHEET locked 0.30 but R1 bumped for legibility against the warm mahogany base. If full-HD viewer-experience eye-check says too hot, drop in R2.
3. **40-frame breathing-room hold (logo land → R15 #4 land)** — Phase 1 carry-forward note allowed 45-50; R1 ships at 40. Expand if BURNED wordmark hold feels rushed in master render.

**S05**: §2 verdict deferred to Phase 5 real-clip ship per Unit 4.6 scope note.

**S01-S04**: all clean per existing signoffs.

---

## Motion-shape spec deferral (Unit 4.9 R2)

Per Unit 4.9 plan Steps 5 + 5b: quantitative `tests/scene-timing-shape.spec.ts` (studio-stage) + `tests/scene-timing-shape-mp4.spec.ts` (encoded-MP4 pixel-diff) are part of the Unit 4.9 deliverable. R1 ships the foundational pieces (SafeSquareOverlay + verify-briggsy-sentinels + this summary). Motion-shape specs deferred to R2 — they require:

- Studio-stage spec: Playwright + Remotion studio dev-server lifecycle wiring (heavyweight; trailer subpackage doesn't have an existing Playwright config yet)
- Encoded-MP4 spec: ffmpeg frame-extraction + pixelmatch + snapshot baselines (snapshot bootstrap needs a Briggsy-approved render)

Either spec is its own ~half-day unit. Better isolated than wedged into 4.9 R1.

R2 entry signal: when Briggsy commits the missing 4.6 + 4.7 sentinels (or explicitly defers them), R2 picks up the spec work to fully close Unit 4.9.

---

## Unit 4.10 entry checklist

Gated on:
- [ ] `pnpm verify:briggsy-sentinels` exit 0 (currently FAILs — 4.6 + 4.7 sentinels missing)
- [ ] `pnpm verify:no-transition-series` exit 0 (PASSES — 65 src files clean, Unit 4.8 ship 2026-05-24)
- [ ] `pnpm verify:s05-head-fade` exit 0 (PASSES — overlay wired in S05)
- [ ] `pnpm verify:gameplay-clip <path>` exit 0 (PASSES against placeholder; re-check against real clip in Phase 5)
- [ ] Trailer subpackage `pnpm typecheck` clean (PASSES)
- [ ] Trailer subpackage `pnpm test` clean (PASSES — 220 tests)
- [ ] Root `pnpm typecheck` + `pnpm test` clean (PASSES — 1407 + 6 expected fail)
- [ ] `tests/scene-timing-shape.spec.ts` passes (deferred to Unit 4.9 R2)
- [ ] `tests/scene-timing-shape-mp4.spec.ts` passes (deferred to Unit 4.9 R2)

When all checked, run `pnpm render:full` to produce `out/trailer-scene-build.mp4` (Unit 4.10).
