# 039-burn-the-files-card-played-freeplay — StagingArea enlarge overlay not portalled to body (structural inconsistency with Hand.tsx)

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** free-play
**Source seats:** seat-1
**Linked scenarios:** (none)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's suspicion log at 2026-05-09T01:12:55Z:*
> "Discovered that single-clicking a staged card opens an enlarged preview overlay that intercepts all pointer events. The _enlargeBackdrop_ element blocks all underlying clicks until dismissed by clicking the backdrop itself."
> "Double-clicking a staged card successfully unstages it and returns to hand. Single-click = preview. Double-click = unstage. This matches the gesture vocabulary for hand cards (single-tap = preview, double-tap = stage/unstage)."

Seat-1 (Seat1) discovered the staged-card gesture vocabulary during their second ACTOR turn while playing Burn the Files and Go Dark. After staging a card, they found single-tap opens a full-screen preview overlay that intercepts all pointer events; double-tap unstages the card. The agent noted this correctly mirrors the hand-card gesture system (single=inspect, double=commit). No malfunction was observed — the overlay worked as intended and the overall burn-the-files turn resolved cleanly.

## God-mode reality

The suspicion has `relatedScenario: null` and was raised at 01:12:55Z, temporally after the burn-the-files play at 01:10:10Z. The events.jsonl confirms the burn-the-files play was clean: seat log documents hand (6)→(5), deck count stays 25, 7s nope window, no interception, shuffle committed. Seat1 then played Go Dark (hand 5→4, skip draw) in the same turn, consistent with deck count staying at 25 across both plays.

The free-play signal itself (the null-relatedScenario suspicion) is not about the Burn the Files mechanics — it is about the staged-card interaction model discovered incidentally during that turn's staging flow.

The burn-the-files mechanics (SCN-BURN-FILES-NORMAL-01, SCN-BURN-FILES-INVALIDATES-PEEK-01) have separate triage seeds (036, 038) and fired clean at tier-1.

## Diagnosis

The seat agent's observation is accurate and the behavior is intentional. `StagingArea.tsx` implements the double-tap gesture via `useDoubleTap`, where single-tap calls `handleSingleTap` (sets `enlargedId` → shows overlay) and double-tap calls `onUnstageCard` (returns card to hand). This correctly mirrors `Hand.tsx`'s gesture contract.

However, there is a structural inconsistency: `Hand.tsx` portals its enlarge overlay to `document.body` via `createPortal` (`Hand.tsx:174`), while `StagingArea.tsx` renders the same overlay inline — as a child of `.staging`, not portalled (`StagingArea.tsx:161–190`).

Both components use the identical CSS class `handStyles.enlargeBackdrop` from `Hand.module.css`. The CSS comment at `Hand.module.css:4–9` states explicitly:

> `.enlargeBackdrop is rendered via React portal to document.body — see Hand.tsx wrapping. position: absolute against <body> ... Achieves viewport-sized full-screen coverage WITHOUT position: fixed, dodging WebKit bug 297779 on iOS 26.`

The `.enlargeBackdrop` style is `position: absolute; inset: 0` — correct only when anchored to `<body>` (which is `position: relative; height: var(--size-viewport-safe); overflow: hidden` per `player-hardening.css:29–36`). In the StagingArea context, `position: absolute; inset: 0` resolves against the nearest positioned ancestor above `.staging`, not necessarily `<body>`.

Currently this works because no intermediate ancestor between `.staging` and `<body>` declares `position: relative` or `contain`. But the `.stagedSlot` already carries `transform: translateZ(0)` (`StagingArea.module.css:55`), which creates a stacking context. If the `.staging` wrapper or any layout ancestor in `Player.tsx`'s render tree acquires a `position: relative` (a common layout refactor), the backdrop will only cover that ancestor rather than the full viewport — the overlay will appear clipped and non-functional. This is the same class of trap documented in insight 013 (`contain: layout` trapping `position: fixed`) applied to `position: absolute`.

The `Hand.tsx` comment at lines 92–99 explicitly references prior triage issues #006/#007 as prior art on discoverability, confirming this pattern has been analyzed before. The gesture itself is correct; this is a structural maintenance landmine.

**Free-play assessment:**
- (a) Novel variant worth cataloguing: YES — the staged-card preview gesture has no named scenario entry. A Phase 1 scenario exercising single-tap-preview → backdrop-dismiss and double-tap-unstage on a staged card would lock in the interaction contract and catch the portal regression before it reaches players.
- (b) Bug: Not a live bug (works today). Latent structural risk from the non-portalled implementation of a CSS class designed for portal-anchored use.

## Proposed fix paths

**Option A — Portal StagingArea enlarge to `document.body` (effort: tiny / risk: low):** Apply `createPortal(..., document.body)` to the `AnimatePresence` block containing the `enlargeBackdrop` in `StagingArea.tsx`, matching the Hand.tsx pattern exactly. This eliminates the dependency on the ancestor positioning contract and dodges WebKit bug 297779 on iOS 26 for the staging enlarge path. No behavioral change for players. CSS class semantics become consistent with the documented contract. The `enlargedId` state and `setEnlargedId(null)` dismiss logic are unchanged — only the render location moves.

**Option B — Add a Phase 1 catalog scenario for staged-card preview (effort: small / risk: low):** Add `SCN-FREE-PLAY-STAGED-CARD-PREVIEW-01` to the scenario catalog. The scenario fires when a player single-taps a staged card and the `enlargeBackdrop` element appears; it verifies the overlay covers the full viewport (`inset: 0` against body, confirmed via playwright `evaluate_script` or bounding-rect check) and that a second tap on the backdrop dismisses it. Does not fix the structural inconsistency but turns this into a tested invariant that will catch the portal regression the moment it breaks. Complements Option A rather than replacing it.

**Option C — Gesture discoverability hint on first staged card (effort: medium / risk: medium):** Render a transient tooltip or gesture label on the first card a player stages in a session ("tap to preview / double-tap to unstage"), auto-dismissed after 2s or on any interaction. Addresses the user-discovery concern that prior issues #006/#007 identified. Does not fix the structural inconsistency. Medium risk because a tooltip in the staging area during an active play creates z-index competition with the nope-window overlay and the enlarge backdrop itself; sequencing and dismissal timing must be carefully coordinated.

## Recommended next step

Apply Option A (portal the StagingArea enlarge overlay to `document.body`) — it is a one-line structural fix that makes the implementation consistent with the documented CSS contract and eliminates the latent ancestor-positioning landmine before a layout refactor exposes it.

---

**Triage seed kind:** free-play
**Triage agent session:** playtest-triage / 039-burn-the-files-card-played-freeplay
