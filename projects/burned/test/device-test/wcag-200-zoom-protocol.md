---
title: "Phase 5 §2.3 — WCAG 1.4.4 200% browser zoom protocol results"
type: protocol-results
phase: 5
parent: docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md
date: 2026-05-06
status: partial — programmatic complete, canonical visual review PENDING
---

# Phase 5 §2.3 — WCAG 1.4.4 200% browser zoom protocol

## Methodology

Phase 5 §2.3.1 specifies a HUMAN protocol: desktop Chromium with browser
UI zoom (Ctrl + + or Settings → Zoom → 200%), then visually verify
no horizontal scroll, all text legible, all interactive elements
tappable, fluid `clamp()` floors engage.

Playwright/Chromium do not expose browser-UI-level zoom programmatically
(`chrome://settings/zoom` is UI-only — there is no DevTools Protocol
endpoint or Playwright API for it). The closest scriptable approximation
is `document.body.style.zoom = '200%'` — a non-standard Chrome CSS
property that scales the rendered output by the factor while leaving
the physical viewport unchanged.

This run captures **programmatic preliminary results** + **evidence
screenshots** for each screen. The canonical 1.4.4 verification still
requires human-run browser-UI zoom; this protocol's PENDING column is
the queue for that pass.

**Why both axes matter.** `body.style.zoom` doubles font sizes AND
layout box sizes uniformly. Real browser zoom doubles font sizes (via
`rem` resolution) and lets the layout adapt. The two diverge most where
the layout uses viewport-based sizing (`vw`/`svh`) — at real browser
zoom those don't scale, but at `body.style.zoom` they do. So:

- A pass at `body.style.zoom = '200%'` is STRONG evidence (the more
  aggressive scaling didn't break the layout).
- A fail at `body.style.zoom = '200%'` is a SOFT signal — it MAY
  represent a real WCAG 1.4.4 issue or an artifact of the proxy. The
  human-run canonical pass is needed to confirm.

## Programmatic results (this session)

**Spec:** `tests/e2e/wcag-zoom.spec.ts` (chromium-only).
**Evidence:** `temp/wcag-zoom/{phone,board}/<screen>-{100,200}.png`.
**Run:** `pnpm exec playwright test tests/e2e/wcag-zoom.spec.ts --project chromium`.

| # | Surface | Screen | Viewport | Programmatic overflow @ 100% | Programmatic overflow @ 200% | Visual review |
|---|---|---|---|---|---|---|
| 1 | phone | JoinScreen — empty | 375×667 | ✅ none | ✅ none | ⚠️ flagged (see notes) |
| 2 | phone | JoinScreen — name typed | 375×667 | ✅ none | ✅ none | ⚠️ flagged (see notes) |
| 3 | phone | NoRoomCode — bare /player.html | 375×667 | ✅ none | ✅ none | ✅ pass (single line of text) |
| 4 | phone | Lobby — 1 player joined | 375×667 | ✅ none | ✅ none | 📋 PENDING |
| 5 | board | Lobby — empty (QR + room code) | 1280×800 | ✅ none | ✅ none | 📋 PENDING |

### Notes on flagged screens (1, 2)

JoinScreen visual review at `body.style.zoom = '200%'` shows the input
field and Check In button pushed below the viewport (compare
`joinScreen-nameTyped-100.png` vs `-200.png`). The BURNED title and
AGENT CODE pill scaled up; layout did NOT reflow to keep the
interactive elements visible. This is a vertical-space concern, not a
horizontal-scroll concern (programmatic check passed because horizontal
overflow is what scrolls).

Whether this reproduces under real browser-UI zoom depends on whether
the JoinScreen container's `min-height: 100svh` + content centering
allow scroll on overflow. If yes, the user can scroll to reach the
input — flag passes WCAG 1.4.4 ("page-level scroll on the smallest
viewport's other axis" is allowed). If no (e.g., container has
`overflow: hidden`), the user cannot reach the input — fail.

**Action:** human-run verification needed. The HUMAN pass column will
record real browser-zoom result.

## Pending automation (next session, complex state setup)

These need 3-player game boot + state injection (arena-states harness
pattern). Listed for full §2.3.1 coverage but out of scope this
session:

| # | Surface | Screen | Why complex |
|---|---|---|---|
| 6 | phone | PlayingView with 10-card hand | Need optimistic state with full hand |
| 7 | phone | CardDetailSheet | Need active card detail open |
| 8 | phone | EliminatedView | Need a player eliminated |
| 9 | phone | DefusePlacement sheet | Need Burned-drawn pending state |
| 10 | phone | NameCard sheet | Need triple-steal pending |
| 11 | board | GameOver — winner reveal | Need game-over state |

Each of these can use the `__gameStore.applyOptimistic` /
`__testInjectEvent` pattern from `tests/e2e/arena-states.spec.ts`. The
spec template is reusable; a follow-up session adds 6 tests using the
same `captureZoomPair` helper.

## Canonical human-run protocol (when ready)

When Briggsy has 30 minutes at a desktop Chromium browser:

1. Open `http://localhost:5173/player.html?room=<code>` in a fresh
   Chromium window sized to **375×667** (Ctrl+Shift+I → device toolbar →
   "iPhone SE" or custom dimensions).
2. Set browser zoom to **200%**: View → Zoom → 200%, OR press Ctrl + +
   four times from baseline 100%.
3. For each row in the table above, navigate / drive state to the
   target screen and verify:
   - **No horizontal scroll** (page width still fits viewport).
   - **All text legible** (no truncation/clipping that wasn't there at 100%).
   - **All interactive elements remain tappable** (no button pushed off-
     screen unless vertical scroll reaches it).
   - **Text grew visibly** (the rem-based clamp floors engaged).
4. Mark the row's "Visual review" column ✅ pass / ❌ fail / 📋 deferred.

If any row fails, the fix lands at the owning phase per §7.4 of the
plan (Phase 2 for phone components, Phase 3 for board, Phase 1 for
token-level issues).

## §2.3.2 Acceptance thresholds

- [ ] All 9 target screens (5 captured this session + 4 deferred + 2
      complex-state phone screens not in original target list:
      NoRoomCode, Lobby phone) pass at 200% zoom at smallest viewport.
- [✅] Programmatic horizontal-overflow check ran for the 5 captured
      screens; all passed.
- [📋] Visual evidence captured for 5 screens (10 PNG files, 100% +
      200% pairs at `temp/wcag-zoom/`).
- [📋] Canonical browser-UI zoom verification PENDING (human-run).
- [📋] 6 complex-state screens deferred to follow-up session.

Phase 5 §8.1 / §8.2 spec checkbox flips await the human-run pass.
