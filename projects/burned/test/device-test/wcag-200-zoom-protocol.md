---
title: "Phase 5 §2.3 — WCAG 1.4.4 200% browser zoom protocol results"
type: protocol-results
phase: 5
parent: docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md
date: 2026-05-06
status: programmatic complete (14/14 screens) — canonical visual review PENDING
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
| 6 | phone | PlayingView — baseline (3-player game, mid-turn) | 375×667 | ✅ none | ✅ none | 📋 PENDING |
| 7 | phone | DefusePlacement sheet | 375×667 | ✅ none | ✅ none | ⚠️ flagged (see notes) |
| 8 | phone | NameCard sheet (triple-steal target picker) | 375×667 | ✅ none | ✅ none | ⚠️ flagged (text truncation at 200%) |
| 9 | phone | Favor banner (inline, on staging area) | 375×667 | ✅ none | ✅ none | 📋 PENDING |
| 10 | phone | DramaOverlay ELIMINATED beat (over PlayingView) | 375×667 | ✅ none | ✅ none | 📋 PENDING |
| 11 | phone | PlayingView — 10-card hand (§2.3.1 row 3, most constrained) | 375×667 | ✅ none | ✅ none | 📋 PENDING |
| 12 | phone | EliminatedView — real component (skull + flavor + alive list) | 375×667 | ✅ none | ✅ none | 📋 PENDING |
| 13 | board | GameOver — winner reveal | 1280×800 | ✅ none | ✅ none | 📋 PENDING |
| 14 | phone | CardDetailSheet (long-press detail) | 375×667 | ✅ none | ✅ none | 📋 PENDING |

### Notes on flagged screens (1, 2)

JoinScreen visual review at `body.style.zoom = '200%'` shows the input
field and Check In button pushed below the viewport (compare
`joinScreen-nameTyped-100.png` vs `-200.png`). The BURNED title and
AGENT CODE pill scaled up; layout did NOT reflow to keep the
interactive elements visible. This is a vertical-space concern, not a
horizontal-scroll concern.

Verified at this audit: the JoinScreen container uses
`min-height: var(--size-viewport-safe)` (svh-based) with no
`overflow: hidden` on the container itself. Real browser-UI zoom would
let the page scroll vertically to reveal the input — WCAG 1.4.4 allows
page-scroll on the non-content axis. So the proxy flag is likely a
`body.style.zoom`-specific artifact, not a real WCAG violation.

**Action:** human-run verification still needed for definitive sign-off.

### Notes on flagged screens (7, 8) — DefusePlacement sheet, NameCard sheet

At `body.style.zoom = '200%'` the BottomSheet sheets render their
content scaled 2x but the container width still constrains layout. The
NameCard 14-card 2-column grid clips card-name text horizontally —
"Sable Ashworth" wraps fine at 100% but at 200% the card body shows
"Janet Broads..." / "Reass..." / "Go D..." truncated.

Honest assessment: this is partly a proxy artifact (real browser zoom
would scale the rem-based font but not the sheet's percentage-based
column widths, so the wrapping behavior would differ). At canonical
WCAG zoom each card name probably wraps to 3 lines instead of 2 —
which is fine, just taller. The sheet has internal scroll already
(visible in 100% capture — bottom rows clip with the BottomSheet's
overflow), so growth pushes more content below the fold but doesn't
break tappability.

**Action:** human-run verification needed to confirm wrap-vs-truncate
behavior at canonical zoom.

### Note on screen 10 — "EliminatedView" actually DramaOverlay beat

The capture labeled EliminatedView is actually the DramaOverlay
`player-eliminated` BEAT firing over PlayingView. The dedicated
EliminatedView component (with flavor line + alive-list) requires a
different state path than `__testInjectEvent` + optimistic
`eliminated: true` — it depends on how `Player.tsx` switches view
based on player.eliminated AND a separate render branch. Capturing
the actual EliminatedView component is deferred to a follow-up
session that drives a real elimination via the game flow.

The drama beat capture IS useful evidence of what overlays look like
during high-zoom — the BURNED title behind it is dimmed but
positioned naturally.

## Pending automation

All automation-eligible screens captured. CardDetailSheet (the only
deferred screen at the prior pass) closed in this session via
Playwright long-press emulation: `slot.hover()` → `mouse.down()` →
`waitForTimeout(700)` → `mouse.up()`, with `Hand.tsx`'s
`onPointerLeave`/`onPointerCancel` cancellation paths avoided by
holding the mouse stationary. Wait target is the `dialog[open]`
containing the dependent card name (`Dash Barlowe` from the prior
block's optimistic 10-card hand at slot[0]). Native `<dialog>` Escape
dismisses the sheet for clean teardown before the EliminatedView
flip.

The 10-card hand, real EliminatedView, GameOver winner, and now
CardDetailSheet screens were all added via `captureZoomPair` +
targeted state primers. The 13→14 expansion surfaced a P0 React bug
that was fixed inline (see "Surfaced bug" below).

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

## Surfaced bug — pre-existing P0 React Rules-of-Hooks violation (FIXED)

While automating the EliminatedView capture, the test tripped its
`assertHealthyRender` guard ("ErrorBoundary fallback is rendering").
Root-cause traced via `console.error` capture in the page:

> Rendered fewer hooks than expected. This may be caused by an
> accidental early return statement.
> The above error occurred in the <PlayingView> component.

`Player.tsx:494` had `if (!isAlive) return <EliminatedView />` and
`Player.tsx:499` called `useSortedHand(hand)` AFTER the early return.
Comment on line 492 even claimed "Conditional render AFTER all hooks"
— that contract was broken. When `isAlive` flipped true → false (every
elimination, mid-game), the next render had fewer hooks than the
previous, React threw, ErrorBoundary caught.

**Production symptom:** users saw a brief "// COMMS SCRAMBLED" flash
every time they got eliminated, before ErrorBoundary's auto-recover
re-rendered cleanly into EliminatedView. Subtle enough to miss in
playtest unless you were specifically watching for it.

**Fix:** hoisted `useSortedHand(hand)` above the `if (!isAlive)` early
return. `pnpm test` + `pnpm typecheck` clean. WCAG zoom suite (which
exposed the bug) re-ran green; EliminatedView now renders the real
component.

The `assertHealthyRender` helper in `tests/e2e/wcag-zoom.spec.ts` is
the regression-lock: any future hooks-violation in PlayingView's
elimination path trips it loudly.

## §2.3.2 Acceptance thresholds

- [✅] Programmatic horizontal-overflow check ran for 14 captured
      screens; all 14 passed at both 100% and 200%.
- [✅] Visual evidence captured (28 PNG files, 100% + 200% pairs at
      `temp/wcag-zoom/`).
- [📋] Canonical browser-UI zoom verification PENDING (human-run).
- [✅] All automation-eligible screens covered (CardDetailSheet
      closed via long-press emulation this session).
- [✅] **P0 React hooks bug surfaced + fixed** as a side effect.

Phase 5 §8.1 / §8.2 spec checkbox flips await the human-run pass.
