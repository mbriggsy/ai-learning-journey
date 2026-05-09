# 030-scn-falsify-intel-actor — Falsify Intel nope window shows "Intel Briefing" dialog (stale pendingFuture bleed-through)

**Severity (triage):** P2
**Status:** ✅ RESOLVED
**Resolution:** Fix landed 2026-05-09. Implementation matches triage Option A: `handleSingleCard` now spreads `pendingFuture: undefined` into the `withNope` state alongside opening the new nope window. Any prior Intel Briefing peek is cleared the moment a new single card is played, so Falsify Intel (or any other single card) starts its nope window with a clean private-state slate. `applyAlterTheFuture` re-reads `state.drawPile.slice(0, 3)` fresh when Falsify Intel resolves cleanly, so no functional regression for the rearrange path itself. Contract pinned by a new engine test reproducing the Intel-Briefing-then-Falsify-Intel sequence and asserting `pendingFuture` is undefined during the second card's nope window.
**Seed kind:** scripted-scenario
**Source seats:** seat-5
**Linked scenarios:** SCN-FALSIFY-INTEL-ACTOR
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-5's suspicion log at 2026-05-09T00:57:30Z:*
> "During the Falsify Intel nope window, the dialog title showed 'Intel Briefing' instead of 'Falsify Intel'. This may be intentional (showing the peek-portion before the nope window resolves) or it may be the Intel Briefing dialog persisting erroneously. After the nope window expired the title correctly switched to 'Falsify Intel'. If noped, would the Intel Briefing title leave a false impression about which card was played?"

Seat-5 played Intel Briefing (00:56:00Z) immediately before playing Falsify Intel on the same turn (00:57:16Z). During the Falsify Intel nope window, the actor's dialog was titled "Intel Briefing" with cards shown in read-only mode. After the 8s window expired, the dialog correctly re-titled to "Falsify Intel" and activated the tap-to-order rearrange interaction. The core concern is that if Falsify Intel were noped during that window, the actor would be left with a dialog labeled "Intel Briefing" that implies the Intel Briefing — not the Falsify Intel — was what got blocked.

## God-mode reality

From `server/events.jsonl` lines 2-4:

- `nowMs: 1778287063700` — `card-played` (`cardType: "falsify-intel"`, Seat1/e9a5...) — nope window opened (`remainingMs: 10000`, `generation: 1`). `pendingPrompt: null`. All projections carry stale `pendingFuture` from the prior Intel Briefing play (server state not yet cleared).
- `nowMs: 1778287073714` — `nope-window-expired` (`windowGeneration: 1`) — window `remainingMs: 0`, grace period begins. `pendingPrompt` still null. `subPhase` still `turn-active`.
- `nowMs: 1778287074016` — `nope-grace-expired` — `nope-window-resolved { cancelled: false }` emitted. `subPhase` transitions to `"future-rearrange-pending"`. `pendingPrompt: { type: "future-rearrange", playerId: "e9a5...", cardIds: [] }` arrives for the first time. All players see `nopeWindow: null`.

The server emitted `card-played` with `cardType: "falsify-intel"` at stateVersion 2 but did NOT set `pendingPrompt` until stateVersion 4. During stateVersions 2-3, `pendingFuture` from the prior Intel Briefing remained live in server state, causing `getPrivateData` to emit non-empty `futureCards` to the actor throughout the nope window.

## Diagnosis

Two-layer root cause:

**Layer 1 — Server (`src/server/game/engine.ts`):** `handleSingleCard` (lines 319-336) removes the played card from hand, adds it to discard, and opens the nope window — but does NOT spread `CLEAR_PENDING`. So when Falsify Intel is played, any existing `pendingFuture` (set by a prior Intel Briefing `applySeeTheFuture` call, engine.ts:452-454) persists in the nope-window-open state. `getPrivateData` in `src/server/projection.ts:102-112` checks `state.pendingFuture` unconditionally and emits `futureCards` to the matching player. Those stale cards travel over the wire to the actor during the entire nope window.

**Layer 2 — Client (`src/client/player/hooks/useActiveBottomSheet.ts`):** `deriveActiveBottomSheet` has two rendering branches. The primary branch (lines 22-46) fires when `pendingPrompt && pendingPrompt.playerId === myPlayerId` — this is absent during the nope window (`pendingPrompt` is null until `nope-grace-expired`). The fallback branch (lines 49-55) fires when `futureCards && futureCards.length > 0` and returns `{ sheet: 'future-peek', canRearrange: false }`. `FuturePeek` (`src/client/player/sheets/FuturePeek.tsx:50`) renders title as `canRearrange ? 'Falsify Intel' : 'Intel Briefing'`. With `canRearrange: false`, the title is "Intel Briefing".

The trigger condition for this bug is playing Falsify Intel immediately after Intel Briefing on the same turn (or across turns if `pendingFuture` survived the draw). Same-turn trigger is confirmed: seat-5's preObservation states "Previously peeked top 3 via Intel Briefing." The `futureDismissed` local-state flag in `Player.tsx` (line 365) would already be reset to `false` when the new `futureCards` arrived from the Intel Briefing play, so the fallback branch fires immediately.

**Noped case severity escalation:** If Falsify Intel is noped during this window, `applyAlterTheFuture` never runs, `pendingPrompt` never becomes `future-rearrange`, and `pendingFuture` would remain set (nope cancellation path does not call `CLEAR_PENDING`). The actor's screen stays on the "Intel Briefing" read-only dialog. The actor would need to click "Got it" to dismiss it, but "Got it" triggers `futureDismissed = true` (Player.tsx:627), which suppresses `futureCards` from the sheet derivation — mechanically functional but semantically wrong: the "Got it" implies acknowledging an Intel Briefing peek, not a noped Falsify Intel. This is a UX misinformation vector, not a rules violation.

## Proposed fix paths

**Option A — Server: clear `pendingFuture` in `handleSingleCard` before opening the nope window (tiny / low):** In `engine.ts:335`, change the `withNope` spread to include `pendingFuture: undefined`. This universally clears any prior peek state whenever any single card opens a nope window. Since `applyAlterTheFuture` re-reads from `state.drawPile.slice(0, 3)` directly (engine.ts:468), it does not depend on `pendingFuture` being set during the window — the fresh re-read at grace-expiry is sufficient. This is the most surgical and defensive fix: the nope window should not bleed prior private data from a different card's effect. Zero risk of behavior change for Intel Briefing alone (it has no nope window in the normal case since `applySeeTheFuture` clears `nopeWindow` at engine.ts:455). Risk: if a future card is designed to intentionally show prior peek data during its own nope window, this convention would need revisiting — but that is a speculative concern.

**Option B — Client: suppress the `futureCards` fallback branch when a nope window is active (small / low):** Pass `nopeWindow` to `deriveActiveBottomSheet` and add a guard — if `nopeWindow !== null`, return null from the fallback branch. This avoids showing the Intel Briefing dialog while any nope window is open. Tradeoff: it adds a new parameter to the pure `deriveActiveBottomSheet` function and its test; the fix is client-only and leaves stale server state unremedied (minor defense-in-depth concern). Does not fix the post-nope misinformation case (noped Falsify Intel leaves the actor with nothing on screen until the next state version arrives, rather than showing a misleading "Intel Briefing" dialog — arguably correct behavior).

**Option C — Client: add a `calledByCardType` field to the `future-peek` sheet descriptor (medium / low):** Extend `ActiveBottomSheet`'s `future-peek` variant with an optional `sourceCardType` field, populated from the last `card-played` event in `accumulatedEvents`. `FuturePeek` uses `sourceCardType` to render the title rather than relying solely on `canRearrange`. This decouples the title from the mode flag and gives exact naming regardless of state ordering. Tradeoff: larger surface change — requires touching `useActiveBottomSheet.ts`, its test, `FuturePeek.tsx`, and plumbing `accumulatedEvents` into the sheet derivation path. Does not fix the stale server-state root cause, making it a parallel mitigation rather than a cure.

## Recommended next step

Apply Option A — add `pendingFuture: undefined` to the `withNope` spread in `handleSingleCard` at `engine.ts:335`; it closes the root cause with a one-line change and leaves the client untouched.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 030-scn-falsify-intel-actor
