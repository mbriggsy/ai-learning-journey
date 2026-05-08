# 008-scn-burned-draw-axis11-01 — ACTOR drama beat absent or imperceptible before DefusePlacement sheet

**Severity (triage):** P2
**Status:** ✅ RESOLVED-NO-FIX (2026-05-08)
**Seed kind:** scripted-scenario
**Source seats:** seat-1
**Linked scenarios:** SCN-BURNED-DRAW-AXIS11-01 (catalog: SCN-BURNED-DRAW-AUTO-DEFUSE-01)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-01-1654-3p
**Candidate duplicate:** Clusterer field populated as `B-03` — FALSE POSITIVE. Catalog entry `SCN-BURNED-DRAW-AUTO-DEFUSE-01` carries `Known product call: none` (SCENARIOS.md line 256). B-03 belongs to `SCN-CONN-NAME-CARD-PENDING-DISCONNECT-01` (the `name-card-pending` + stealer-disconnect wedge). The clusterer incorrectly cross-linked the disconnect-wedge tag to this seed. Catalog authority wins; this is a new finding, not a known product call.

## Player-POV summary

> *Quoted from seat-1's scenario-fire log at 2026-05-01T21:12:45Z:*
> "Burned card drawn. DefusePlacement sheet appeared immediately — 'Hide the Burned Card' with Top/Bottom/Random buttons and position stepper. Extraction consumed (removed from hand). [...] The DefusePlacement sheet landed as one beat — no phantom drama beat preceding it from my seat (no separate 'you drew burned' drama animation was observed on phone before the placement sheet)."

> *Quoted from seat-1's suspicion log at 2026-05-01T21:14:10Z (severity: low):*
> "No drama-beat overlay was visible on phone before the DefusePlacement sheet appeared — the spec says 'One-beat drama + DefusePlacement hero card'. The drama beat (DramaOverlay) may have shown on the board but not the phone."

> *Quoted from seat-1's vibe-check at 2026-05-01T21:14:00Z (feltLikeArcher: yes):*
> "The DefusePlacement sheet appeared immediately after drawing — no loading lag. The position stepper with descriptors like '3 safe draws' made it feel like a real tactical choice. The Burned card art (exploding ID badge) in the placement dialog added drama. It read as a clutch survival moment — not a UI interrupt."

The ACTOR (Seat1) drew a Burned card while holding Extraction, correctly entered the DefusePlacement flow, and placed the Burned card at position 3. The engine state resolved correctly on all counts. The finding is narrow: the one-beat `card` variant DramaOverlay — which should show the Burned card filling the ACTOR's phone for 2400ms before the DefusePlacement sheet opens — was either absent or indistinguishable from the sheet's own hero-card illustration. The overall vibe-check was `yes` (felt clutch, felt Archer), but the specific drama-beat before the prompt was not perceived as a discrete animation.

## God-mode reality

From `server/events.jsonl` line 18 (stateVersion 18, nowMs 1777669956701):
- `draw-card` action by Seat1 (`26b21187-f3a5-4e2f-81de-d4aa735738a9`)
- `burned-drawn` — playerId: Seat1
- `extraction-played` — playerId: Seat1
- Seat1 projection: `subPhase: 'defuse-pending'`, `pendingPrompt: { type: 'defuse', playerId: Seat1 }`, `myHand` 5 cards (Burned held for placement, Extraction removed), `drawPileCount: 19`, `isMyTurn: true`

From `server/events.jsonl` line 19 (stateVersion 19, nowMs 1777670026523):
- `defuse-place` action by Seat1, `position: 3`
- `turn-started` — playerId: Seat2
- Seat1 projection: `subPhase: 'turn-active'`, `pendingPrompt: null`, `cardCount: 4` (Burned reinserted), `drawPileCount: 20`, `isMyTurn: false`

The server sequence is exactly correct per the `SCN-BURNED-DRAW-AUTO-DEFUSE-01` catalog fire signature (`burned-drawn` → `extraction-played`, shape: strict). Projection assertions all pass: `pendingPrompt.type === 'defuse'`, Burned card in ACTOR hand for placement, hand count decremented by 1 for Extraction removal. The game state transitions cleanly through defuse-pending → turn-active.

## Diagnosis

Engine and projection are clean — this is a client-side drama-beat rendering question.

The `SCN-BURNED-DRAW-AUTO-DEFUSE-01` scenario's `ui-assertions` specify that the two-beat text sequence (BURNED → EXTRACTED) is suppressed for the ACTOR, replaced by one beat: a `card` variant that shows the Burned card filling the phone screen for 2400ms (`src/client/shared/DramaOverlay.tsx`, `getDramaBeats` function, `burned-drawn` branch at `myPlayerId === event.playerId`). The DefusePlacement sheet is gated on `showServerSheet = !dramaActive` (`src/client/player/Player.tsx:355`), so it should not open until the drama beat queue empties.

Two hypotheses for why the ACTOR did not observe a discrete drama beat:

**Hypothesis 1 — Lazy-load race condition (most likely if drama was fully absent):** `DramaOverlay` is lazy-loaded in `Player.tsx:28` via `lazy(() => import('@client/shared/DramaOverlay'))` wrapped in `<Suspense>`. If the `burned-drawn` event arrives and is processed before the lazy chunk has fully loaded and mounted, the `useEffect` inside `DramaOverlay` that queues beats and calls `setDramaActive(true)` (`src/client/shared/dramaState.ts:14`) has not yet run. `dramaActive` stays `false`. `showServerSheet` stays `true`. DefusePlacement opens immediately with no drama gate. This race is most likely to surface in early-game events on first load, but could also occur after a tab restore or slow network. By mid-game the chunk is almost certainly loaded; for this specific session it appears the chunk was loaded (the agent did see prior DramaOverlay text beats for other scenarios, e.g., Go Dark's "GONE DARK" toast), so this hypothesis is possible but less likely.

**Hypothesis 2 — Visual conflation (most likely given vibe-check `yes`):** The DramaOverlay `card` beat DID play — Burned card filled the phone for 2400ms — but the ACTOR perceived it as "the DefusePlacement sheet appearing," because the DefusePlacement sheet itself heroes the Burned card illustration at its top. The transition from the DramaOverlay's full-screen card beat → DefusePlacement sheet (which also shows the Burned card prominently) would read as a continuous single motion if there is no clear visual break between them. The `holdMs: 2400` card beat exits, then the DefusePlacement sheet slides up showing the same card art — making the drama beat feel like "the sheet is opening" rather than "a drama beat then the sheet."

The catalog entry's "Why this matters" section calls this "the canonical 'escape the bomb' beat" and states: "If the ACTOR's phone skips from draw-tap to sheet without a visible Burned + Extraction reveal, the game silently steals the best moment in the round." The vibe-check `yes` and `low` severity suspicion suggest the drama didn't feel absent — but the ACTOR explicitly noted no discrete animation. Severity is P2 because the overall experience passed the Archer quality bar, the engine is correct, and the suspicion is `low`. If reproduced on a second seat, upgrade to P1.

## Proposed fix paths

**Option A — Eager-load DramaOverlay to close the lazy-load race (medium / low):** Replace the lazy import in `src/client/player/Player.tsx:28` with a static import (`import { DramaOverlay } from '@client/shared/DramaOverlay'`). This ensures the component is mounted before the first game event can arrive, eliminating the race condition where `setDramaActive` is never called. Tradeoff: the DramaOverlay chunk (includes GSAP) is pulled into the initial player bundle. Current player initial gzipped JS is ~96 KB against a 100 KB budget (~4 KB headroom). If the DramaOverlay chunk adds more than 4 KB gzipped to the initial load, this blows the budget. Must measure before shipping. Lower risk on drama-beat correctness; higher risk on bundle budget.

**Option B — Strengthen the drama beat → DefusePlacement visual transition (small / low):** Keep the lazy load. Add an explicit visual break between the `card` variant exit and the DefusePlacement sheet opening — e.g., a brief fade-to-black or scale-down on the DramaOverlay card before `setDramaActive(false)` fires, and a matching different-color accent on the DefusePlacement sheet header so the two states read as distinct. The DramaOverlay card beat uses `holdMs: 2400` in `src/client/shared/DramaOverlay.tsx`; increasing this to 3000ms and adding a visible GSAP exit (scale down + fade out) before the sheet opens would also help differentiate the two surfaces. Zero bundle risk; may feel slow on fast playthroughs.

**Option C — Human eye-in-loop first (tiny / low):** Before any code change, ask Briggsy to draw a Burned card on a real phone during a dev session and observe whether the DramaOverlay card beat renders as a distinct fullscreen moment before the DefusePlacement sheet, or whether the two visually blur together. This resolves the Hypothesis 1 vs. 2 ambiguity. If the drama beat is confirmed absent → implement Option A. If the drama beat plays but blurs with DefusePlacement → implement Option B. Cost: one real-device playtest turn.

## Recommended next step

Option C: confirm on a real device whether the DramaOverlay `card` beat is visually absent or present-but-conflated with the DefusePlacement hero card, then route to A or B accordingly.

## Resolution — 2026-05-08

Closed via Option C from the recommended next step (real-device
eye-in-loop verification before A-vs-B fork). Briggsy ran the
forced-state harness in a real phone-viewport browser tab via the
dev console:

```js
const base = s => ({
  ...s, phase: 'playing', myPlayerId: 'self',
  players: [{id:'self', name:'You', color:'teal', cardCount:1, isAlive:true, isConnected:true}],
  myHand: [{id:'h1', type:'reassign'}],
  currentTurn: { currentPlayerId: 'self', turnsRemaining: 1 },
  drawPileCount: 20,
});
window.__gameStore.applyOptimistic(base);
setTimeout(() => {
  window.__testInjectEvent({type:'burned-drawn', playerId:'self'});
  window.__gameStore.applyOptimistic(s => ({...base(s), pendingPrompt:{type:'defuse', playerId:'self'}}));
}, 250);
```

**Eyeball verdict: Option (a) — distinct moments, no blur.**
The DramaOverlay BURNED card-flip plays as a discrete fullscreen
moment, briefly showing the arena/staging between, THEN the
DefusePlacement sheet rises. The transition reads with a clear
visual break — Hypothesis 2 (visual conflation between drama-beat
hero card and sheet hero card) is rejected.

Hypothesis 1 (lazy-load race) is also implicitly cleared — if the
DramaOverlay chunk hadn't loaded, the burned-drawn event would have
fallen through to no beat at all. The card-flip rendered cleanly,
which means the chunk was mounted before the event fired.

The agent's original "no drama beat visible" report was a perception
artifact, consistent with the broader pattern documented in
`memory/feedback-eye-in-loop-beats-calibration-for-motion.md` —
calibration agents poll DOM state and can't FEEL motion the way a
real-device viewer can.

No code change. The cinematic was working as designed; the agent's
self-report was wrong.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 008-scn-burned-draw-axis11-01
