# 023-scn-intercepted-single-01 — Connection Status modal blocks Intercept tap during nope window

**Severity (triage):** P1
**Status:** ✅ RESOLVED
**Seed kind:** scripted-scenario
**Source seats:** seat-3
**Linked scenarios:** SCN-INTERCEPTED-SINGLE-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** 001-unknown-unknown-freeplay (same root cause)
**Resolution:** Fix landed 2026-05-09 — see 001-unknown-unknown-freeplay.md for full disposition. Implementation matches triage Option B intent: `<dialog showModal()>` now reserved for terminal `'gave-up'`; transient states render as a non-blocking `<div>` at `--z-overlay`. The CSS comment at `ConnectionOverlay.module.css:5` ("sits at `--z-overlay` — above sticky chrome, below modals") is now architecturally honest for the transient case. Contract pinned by `src/client/player/ConnectionOverlay.test.tsx`.

## Player-POV summary

> *Quoted from seat-3's suspicion log at 2026-05-09T01:23:23Z:*
> "ROOT CAUSE DISCOVERED: The reason ALL prior intercept button clicks failed with 'does not match any elements' was NOT a selector issue. When the button DID resolve (at 'Intercept · 0s'), the click failed because a Connection Status overlay was blocking pointer events. The earlier 'does not match' errors may have been the MCP timing out before resolving the locator during connection instability. The intercept button CLASS is `_intercept_1qohw_158` — a stable CSS class that could be used as an alternative selector if accessible name matching is unreliable during connection drops. The button's DOM selector path: `button._box_1qohw_20._intercept_1qohw_158._urgent_1qohw_177`."

> *Quoted from seat-3's ui-spec-divergence entry at 2026-05-09T01:23:23Z:*
> "Connection Status dialog appeared during an active nope window (Intercept · 0s). The dialog intercepted all pointer events, making the intercept button physically unclickable. Game actions (intercept) lost during reconnection — the nope window froze at 0s while the connection re-established. This is a real user-experience concern: a momentary network blip erases your ability to intercept."

> *Quoted from seat-3's suspicion log at 2026-05-09T00:49:41Z (earlier encounter, ACTOR perspective):*
> "Counter window button name includes the countdown ('Counter · 2s') which makes it unclickable via role=button[name=] before it expires. Need to use a different selector strategy for time-sensitive buttons."

The scenario fired correctly on the first encounter (00:49:41Z): Seat3 played a Neal Proctor pair steal, Seat2 intercepted it (nope-played at chainDepth=1), and the steal was cancelled — the engine state is correct. On the second encounter (01:23:23Z), Seat3 attempted to tap the Intercept button while in the nope window but was blocked by a Connection Status reconnection overlay appearing simultaneously. The player saw the countdown button, tried to tap it, and the overlay physically prevented the click — the window expired without the intercept registering.

## God-mode reality

From `server/events.jsonl` lines 22–23:
- `nowMs:1778287775156` (stateVersion 22) — `card-played` by Seat3 (`16916130`), `cardType:"neal-proctor"`, `comboSize:2`; then `nope-played` by Seat2 (`3c5a0afb`), `chainDepth:1`; nope window generation=7 opened with `remainingMs:9999`, `chainDepth:1`. Counter window active.
- `nowMs:1778287785161` (stateVersion 23) — `nope-window-expired` for generation=7 (server timer). No counter was played. Window expired clean. Seat3's pair steal was cancelled (discard pile shows both `neal-proctor` cards plus the `intercepted` card).

The server correctly recorded the first encounter: intercept fired, counter window opened (10s), no counter submitted, window expired, steal cancelled. The server has no record of the second encounter's attempted intercept click (01:23:23Z) — the click never reached the server because the client-side Connection Status dialog blocked the tap before it could submit the `nope` action.

## Diagnosis

The `ConnectionOverlay` component (`src/client/player/ConnectionOverlay.tsx:10`) renders a native `<dialog>` element and opens it via `dialog.showModal()` whenever `status !== 'connected'` (line 11). The HTML `showModal()` API places the dialog in the browser's **top layer** — a rendering layer that sits above all CSS z-index stacking contexts, including every BottomSheet, SmartActionBox, and game action button in the player view. Any element in the top layer captures all pointer events for the full viewport; there is no CSS `z-index` high enough to place game UI above a top-layer modal.

The `ConnectionOverlay.module.css` comment at line 6 states the overlay "sits at `--z-overlay` — above sticky chrome (TitleBar/StatusBar), below modals (BottomSheet)" — but this intent is violated by `showModal()`, which bypasses z-index entirely. The `::backdrop` pseudo-element (line 41) also captures pointer events and is separate from the dialog element itself.

When seat-3 experienced a micro-disconnect during an active nope window, `connectionStatus` flipped from `'connected'` to `'reconnecting'`, triggering `showModal()`. The Connection Status dialog (confirmed in seat log: `dialog._overlay_smo3b_18`, `aria-label="Connection status"`) covered the viewport and captured all taps. The Intercept button (`SmartActionBox.tsx:187-191`, rendered as `button` with class `_intercept_1qohw_158`) was visible in the a11y tree and even resolved by Playwright's locator at `"Intercept · 0s"`, but every tap landed on the top-layer dialog, not the button. The nope window expired with `remainingMs:0` while reconnection was in progress.

This is a product-level UX bug: a momentary network blip during the 7–10 second nope window silently strips the player of their legal Intercept play with no in-game explanation. The player sees the Intercept button, tries to tap it, and nothing happens. The Connection Status dialog does not explain that game interaction is blocked — it only shows a spinner and "Re-establishing channel...".

Secondary (P2, in-scope note): `SmartActionBox.tsx:189` builds button text as `` `${verb} · ${secondsLeft}s` `` where `secondsLeft` ticks every second via `setInterval`. This makes the accessible name change every second. For screen readers this is disruptive churn; for test agents it makes name-based selectors unreliable (the name advances from "Intercept · 7s" to "Intercept · 6s" between selector execution frames). This is separate from the overlay bug — the button DID resolve at "Intercept · 0s" in the final failure. The accessible-name issue is a secondary a11y / harness concern.

## Proposed fix paths

**Option A — `pointer-events: none` on the reconnecting state (small / medium risk):** In `ConnectionOverlay.module.css`, add `pointer-events: none` to the `.overlay[open]` rule when in the non-terminal reconnecting state, and `pointer-events: none` to `.overlay::backdrop` for the same state. Requires a CSS class toggle (e.g., `.overlay[open].reconnecting`) set by the component when `!isGaveUp`. This preserves `showModal()` (keeping the top-layer semantic) while allowing taps to pass through to game UI during transient reconnection. Risk: browser behavior of `pointer-events: none` on top-layer `<dialog>` elements is correct per spec but less commonly exercised than z-index stacking; the `::backdrop`'s pointer-events must also be disabled explicitly or clicks on the backdrop area remain blocked. The 'gave-up' state retains full modal behavior (Esc suppressed, pointer capture) because the player must take the Refresh action to continue.

**Option B — Split reconnecting from gave-up; use `position: fixed` div for transient state (medium / low risk):** Refactor `ConnectionOverlay.tsx` to render a plain `<div role="status" aria-live="polite">` with `position: fixed; inset: 0; z-index: var(--z-overlay)` for the 'connecting' and 'reconnecting' states, and keep the native `<dialog showModal()>` only for the 'gave-up' terminal state. This makes the implementation match the `ConnectionOverlay.module.css` comment ("sits at `--z-overlay` — below modals") for the transient states. The `position: fixed` div participates in normal stacking, so the SmartActionBox nope window button (which is likely at a lower z-index) would not be covered if game buttons are in their own stacking context. However, z-index ordering between the fixed overlay div and the nope window buttons must be verified — the intent is `--z-overlay` covers TitleBar/StatusBar (chrome) but not game action surfaces. Medium effort: component split + CSS rework. Low risk: standard DOM behavior, no reliance on top-layer pointer-events edge cases.

**Option C — Pause the nope window timer during reconnection (large / high risk):** When `connectionStatus !== 'connected'`, pause the client-side countdown display and suppress nope window expiry until reconnection completes. This is architecturally complex: the server timer runs independently and cannot be paused by the client; the client would need to request a window extension or the server would need a reconnection-aware pause mechanism. This contradicts the "all prompt-timeouts are gone" policy (only the nope window has a server timer). Likely requires server-side changes to `room.ts` and a new protocol message. This option trades an overlay-blocking UX bug for a more complex timing mechanism and is not recommended as first fix.

## Recommended next step

Implement Option B — render a plain `position: fixed` div for the 'connecting'/'reconnecting' states and reserve `showModal()` only for the terminal 'gave-up' state, making the overlay sit at `--z-overlay` as the CSS comment already documents and keeping game action buttons tappable during transient reconnection.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 023-scn-intercepted-single-01
