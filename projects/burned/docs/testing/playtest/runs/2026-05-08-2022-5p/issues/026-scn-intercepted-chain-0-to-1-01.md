# 026-scn-intercepted-chain-0-to-1-01 — Chain counter-intercept UI gap (seat-3 / OTHER view)

**Severity (triage):** P2
**Status:** KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** scripted-scenario
**Source seats:** seat-3
**Linked scenarios:** SCN-INTERCEPTED-CHAIN-0-TO-1-01
**Viewer role (if ui-spec-divergence):** OTHER (alive)
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** SCN-INTERCEPTED-CHAIN-0-TO-1-01 + D-16

## Player-POV summary

> *Quoted from seat-3's suspicion log at 2026-05-09T00:54:12Z:*
> "When Seat4 played Back Channel, I expected to see 'Intercept · Xs' button (enabled). Instead I saw 'Counter · 8s' (disabled). This suggests another player had already played Intercept against Seat4's Back Channel play BEFORE my polling interval caught the initial nope window. The counter window was already in the chain and disabled for me (only the original intercepter can counter in the chain)."

> *Quoted from seat-3's ui-spec-divergence entry at 2026-05-09T00:54:12Z:*
> "Counter · 8s button appeared DISABLED. I could not intercept Seat4's Back Channel even though I had 2 Intercepted cards. The initial 'Intercept' window was missed between polling intervals. Counter window was for the chained intercepter only, not open to all players."

Seat-3 (role: OTHER alive) polled late into an active nope window that had already advanced to `chainDepth=1` via another player's Intercept. From that vantage the Counter CTA was correctly disabled — only the player who played the most recent Intercept may counter at chainDepth≥1 — but seat-3 had no UI indication explaining why the window was disabled or that the initial Intercept opportunity had already passed.

## God-mode reality

God-event log was not directly referenced in the suspicion signals for this seed (no events.jsonl line pointers provided in the seed signals; the suspicion's `relatedScenario` is `SCN-INTERCEPTED-CHAIN-0-TO-1-01`). The scenario catalog's fire signature requires:

- `card-played` (ACTOR)
- `nope-played { chainDepth: 1 }` (TARGET/another player)
- `nope-played { chainDepth: 2 }` (ACTOR counter)
- `nope-window-resolved { cancelled: false, chainDepth: 2 }`

Seat-3's observation (Counter button disabled, 8s remaining) is consistent with having polled at a point between the first and second `nope-played` events, after `chainDepth` had already advanced to 1. The engine's `canIntercept` gate as of commit `d9c40753` allows ACTOR to counter at `chainDepth≥1`, but OTHER players with Intercepted cards cannot enter a chain mid-depth — correct per rules, but the UI gives no "window already in progress" signal.

## Diagnosis

This is a **KNOWN-PRODUCT-CALL-CONFIRMED** match. The scenario catalog entry for `SCN-INTERCEPTED-CHAIN-0-TO-1-01` carries:

```
Known product call: D-16 (UI gap at chainDepth ≥ 1 — counter-counter may not surface clearly).
```

E2E-ISSUE-LIST.md D-16 (human-readable context, cited for prose only — not for matching authority):

> "Counter-counter-nope by original actor at chainDepth≥1: rules allow it but SmartActionBox only shows Intercept CTA for `!myTurn` — actor can't Intercept their own attacker's Intercept via UI. **Possible rule violation.** **Shipped 2026-04-29 in `d9c40753`** — `canIntercept` gate widened to `(!myTurn || nopeWindow.chainDepth >= 1)` so ACTOR can chain-counter once the chain has progressed."

D-16 is status 🟢 (shipped). The fix in `d9c40753` addressed the ACTOR's ability to counter-intercept at depth≥1. Seat-3's observation is the OTHER-player variant of the same class of issue: a late-polling OTHER player sees a disabled Counter button with no contextual message explaining that the initial Intercept window was missed and they are now a spectator to the chain. This is a secondary residual UX gap rather than a rule violation — the engine behavior is correct per rules (`engine.ts:955-1025` `handleNope`; chain-depth gating for non-chain participants is correct). The "why is this disabled?" communication gap is the remaining polish concern.

The scenario was not fully fired by seat-3 (no `nope-played{chainDepth:2}` from ACTOR observed in this session — seat-3 only witnessed the `chainDepth=1` Counter window and could not participate). The fire signature for `SCN-INTERCEPTED-CHAIN-0-TO-1-01` requires ACTOR to counter at depth 2; this playtest seed captures the OTHER-player information-gap sub-story of that scenario.

## Proposed fix paths

No full diagnosis required for a `KNOWN-PRODUCT-CALL-CONFIRMED` finding per harness protocol. The root issue (D-16) shipped. The residual is a polish gap in the disabled Counter button's communication to OTHER players:

**Option A — Add disabled-state tooltip / aria-description to Counter button (tiny / low):** When `nopeWindow.chainDepth >= 1` and the player is neither ACTOR nor the most-recent Interceptor, render the Counter button with a short contextual message (e.g., "Window started — you missed the initial intercept opportunity"). No engine changes required; pure UI. Risk: tooltip discoverability on mobile is low (no hover); may need a different affordance (inline status strip text).

**Option B — Status strip annotation during chain (small / low):** When `nopeWindow.chainDepth >= 1` and the viewer cannot participate, emit a status strip line: "Chain in progress — Seat4 vs Seat1." This surfaces chain context without requiring a tooltip and follows the existing status strip pattern (`StatusBar.tsx`). Adds a new `nopeWindow.chainDepth > 0 && !canCounter` branch to the status derivation logic.

**Option C — Accept as by-design; log in Phase 6 calibration (tiny / none):** The disabled Counter button with a countdown is factually correct. Real couch players learn the chain rule in one session. The agent's polling-delay miss is a harness artifact, not a product bug. Close as KNOWN-PRODUCT-CALL-CONFIRMED and monitor for recurrence in Phase 6 vibe-checks.

## Recommended next step

Close against D-16 (🟢 shipped); if the "OTHER player has no context during a chain" gap resurfaces in Phase 6 vibe-checks, open a fresh P2 targeting Option B (status strip annotation).

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** playtest-triage / 026-scn-intercepted-chain-0-to-1-01
