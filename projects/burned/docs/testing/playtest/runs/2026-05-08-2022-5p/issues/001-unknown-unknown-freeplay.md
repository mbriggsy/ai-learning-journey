# 001-unknown-unknown-freeplay — Connection Status modal blocks Intercept button during active nope windows

**Severity (triage):** P1
**Status:** ✅ RESOLVED
**Seed kind:** free-play
**Source seats:** seat-3
**Linked scenarios:** (none)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** 023-scn-intercepted-single-01 (same root cause)
**Resolution:** Fix landed 2026-05-09 — `ConnectionOverlay.tsx` split so `<dialog>.showModal()` runs only for terminal `'gave-up'` state. Transient `'connecting' | 'disconnected'` states render as a plain `<div role="status">` at `--z-overlay` with `pointer-events: none`, preserving the visual treatment but unblocking taps to game UI underneath. Contract pinned by `src/client/player/ConnectionOverlay.test.tsx` (six structural assertions). The action-drop secondary concern (`connection.ts:165` silently dropping `send()` while disconnected) is flagged as a separate follow-up — strictly improved by this fix because the player can now see the timer + retry within ms, which the dialog block previously prevented.

## Player-POV summary

> *Quoted from seat-3's suspicion log at 2026-05-09T01:17:56Z (HIGH):*
> "Structural blocker: The nope window Intercept button is unclickable by seat agents using any known Playwright selector strategy. The button exists in the DOM (visible in accessibility snapshot), the Playwright MCP acknowledges it in the tree, but ALL name-based selectors fail. Either the button uses a custom accessible name via an aria attribute that doesn't match the visible text exactly, or the Unicode middle dot character (·) is rendering differently in the aria tree vs what I'm sending in the selector. This needs investigation at the DOM level."

> *Quoted from seat-3's suspicion log at 2026-05-09T01:23:23Z (HIGH — root cause update):*
> "ROOT CAUSE DISCOVERED: The reason ALL prior intercept button clicks failed with 'does not match any elements' was NOT a selector issue. When the button DID resolve (at 'Intercept · 0s'), the click FAILED because a Connection Status overlay was blocking pointer events. [...] The real blocker for intercept clicks was the Connection Status overlay appearing during each nope window. Is there a correlated disconnection pattern during nope windows?"

Seat-3 spent the session unable to fire any Intercept action. What initially appeared to be a selector encoding problem (Unicode middle-dot in the button label causing Playwright name-matching to fail) was ultimately traced to the `ConnectionOverlay` dialog intercepting all pointer events during each reconnect event. Because the nope window is only 6-7 seconds wide, the Connection Status overlay appeared during every window seat-3 attempted to act in. The seat-3 log also notes a secondary signal: Seat5 was not visible in the lobby list before game start, but was confirmed present with 8 cards by turn 3 — a low-severity lobby rendering timing observation, not a game-state error.

## God-mode reality

From `server/events.jsonl` (grep confirmed 71+ `nopeWindow`-bearing events across the session; direct line extraction was not possible due to file size — all event references are corroborated by seat logs):

- `2026-05-09T00:39:52Z` — nope window opened (Seat1 played Back Channel); seat-3 detected "Intercept · 6s" button; click attempt failed with "does not match any elements"; window closed before retry
- `2026-05-09T00:49:27Z` — nope window opened (seat-3's pair steal); seat-3 saw "Counter · 2s"; role=button[name='Counter · 2s'] not found; counter window expired
- `2026-05-09T01:22:47Z` — nope window active; Intercept button resolved via `role=button[name="Intercept · 0s"]` as `button._intercept_1qohw_158`; click FAILED — `dialog._overlay_smo3b_18 aria-label=Connection status` intercepted pointer events
- `2026-05-09T01:23:00Z` (seat-1 suspicion corroboration) — "Connection status: Re-establishing channel..." dialog appeared during an active nope window (Seat1 playing Burn the Files); game state frozen at "Intercept window 0s"
- Session end ~01:23 UTC — Wrangler server stopped; all seats disconnected

The server correctly processed the nope window timeouts in all cases — no state corruption. The game outcomes (no intercepts fired) are valid from the engine's perspective. The loss of intercept opportunity was entirely client-side: the ConnectionOverlay blocked the button.

## Diagnosis

**Root cause:** `ConnectionOverlay.tsx` (line 18) calls `dialogRef.current.showModal()` whenever `connectionStatus !== 'connected'`. The HTML `<dialog>.showModal()` method promotes the element to the browser's **top layer** — above all normal stacking contexts, z-index values, and CSS positioning. The top layer is not orderable against regular DOM elements.

The nope window Intercept button is rendered by `SmartActionBox.tsx` (lines 186-193) in the normal DOM flow within `PlayingView`. When any WebSocket reconnect event fires (even a brief sub-second packet drop triggering a re-handshake), `ConnectionOverlay` calls `showModal()` and its full-viewport dialog enters the top layer with `pointer-events: auto` (the CSS in `ConnectionOverlay.module.css` applies no `pointer-events` override). This absorbs all touch/mouse events for the entire viewport, preventing any tap on the Intercept button from reaching the element.

The 6-7 second nope window duration is short enough that even a brief reconnect event can consume the entire available window. Seat-3 experienced this pattern on at least five separate nope windows across the session, losing intercept opportunity each time.

The CSS comment in `ConnectionOverlay.module.css` describes the overlay as sitting "above sticky chrome (TitleBar/StatusBar), below modals (BottomSheet) and toasts." This is architecturally incorrect for `showModal()` — the top layer has no positional relationship to normal-flow elements, and BottomSheet (if it also uses `showModal()`, which would need to be confirmed) would only be above it if opened after the ConnectionOverlay dialog.

The SmartActionBox Intercept button DOM selector identified by seat-3: `button._box_1qohw_20._intercept_1qohw_158._urgent_1qohw_177`. The Intercept button label format `"Intercept · Xs"` uses U+00B7 MIDDLE DOT (verified at `SmartActionBox.tsx:197`: `·`), which is a real factor for Playwright selector naming but was not the root blocker — the overlay was.

The Seat5 lobby-visibility secondary signal is consistent with a late join at the moment of game-start transition. Seat5 was actively receiving game state from the first observed event (00:37:50), confirming 5-player game integrity. No further investigation warranted.

## Proposed fix paths

**Option A — Gate `showModal()` on nope-window state (small / medium risk):** Thread a `nopeWindowActive: boolean` prop from `Player.tsx` into `ConnectionOverlay.tsx`. In the `useEffect` at line 15-23, guard `dialog.showModal()` with `!nopeWindowActive`. When a nope window is active and the connection drops, suppress the modal; instead rely on `TitleBar.tsx`'s existing `.dotConnecting` visual indicator (already rendering in the normal DOM outside the dialog). The modal appears as usual once the nope window resolves. Pro: preserves the player's legal intercept opportunity without blocking UX feedback. Con: if the WS is genuinely down, the player's Intercept tap may be submitted but fail to reach the server before the window expires — the action silently disappears. Requires auditing whether the gameStore queues and replays failed WS sends, or drops them. Risk is medium because this changes the modal's visibility contract; needs regression on the "gave-up" terminal state (that state should still always show).

**Option B — Show non-modal fallback during nope windows (medium / low risk):** Extract the reconnecting UI into a non-modal element (e.g., a fixed-position banner with `pointer-events: none` background and `pointer-events: auto` only on the banner strip itself). Render this banner unconditionally when `connectionStatus !== 'connected'`; render the `showModal()` full-screen overlay only when `connectionStatus === 'gave-up'`. The "gave-up" terminal state (Refresh to rejoin) still uses the full blocking modal. Interim reconnect states use the banner. Pro: cleanest separation — blocks nothing during transient reconnects, blocks everything on terminal disconnect. Con: medium effort; requires new CSS for the banner; the banner is less prominent and might be missed by players who need to know the connection is unstable. Addresses the P1 completely.

**Option C — Catalog as Phase 1 scenario, defer code fix (tiny / low risk):** Add `SCN-INTERCEPT-DURING-RECONNECT-01` to `docs/testing/playtest/SCENARIOS.md` as a known edge-case scenario: "active nope window + client reconnect event." No code change. Flag as product design debt requiring a reconnect-UX design pass. Pro: zero-risk, captures the finding formally, enables future harness coverage. Con: leaves real players exposed to silent intercept-opportunity loss on any network blip during a 6-7s nope window. Appropriate only as a supplement to A or B, not as a standalone resolution.

## Recommended next step

Implement Option A (gate `showModal()` on `nopeWindowActive`) as the minimal-effort fix, paired with Option C to add `SCN-INTERCEPT-DURING-RECONNECT-01` to the scenario catalog — then audit whether gameStore queues failed WS sends so the Intercept action can survive a brief mid-tap connection drop.

---

**Triage seed kind:** free-play
**Triage agent session:** playtest-triage / 2026-05-08-2022-5p / seed-001
