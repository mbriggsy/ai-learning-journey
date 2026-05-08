# 010-vibe-scn-favor-normal-01 — Favor exchange reads as silent database transaction on both phones

**Severity (triage):** P1
**Status:** ✅ RESOLVED 2026-05-01

## Resolution (2026-05-01)

All three gaps closed across two commits:

- **Gap 1 (TARGET undiscoverable staging gesture):** SKIPPED. Triage's
  Option A proposed adding "Double-tap" qualifier to the favor-empty hint
  copy, but BURNED's gesture vocabulary (single = peek, double = commit)
  is universal across hand / enlarged-card / StagingArea. Adding a
  per-mode qualifier was reclassified as first-time-friction with a
  coherent gesture, not a defect. See issue #006 resolution and commit
  `0b9a5cd9`.
- **Gap 2 (ACTOR waiting state):** commit `901ab99f`. SmartActionBox now
  derives a `favor-waiting` branch when ACTOR is mid-`favor-pending`,
  surfacing "Waiting for [TARGET] / to surrender a card" instead of the
  stale "Double-tap a card to stage it" hint that misled seat-1.
- **Gap 3 (no cinematic beat on transfer):** commit `38d4c7f0`. FavorReport
  hero overlay now fires on BOTH the ACTOR's and TARGET's phones with
  named card asset, EXTRACTED stamp for ACTOR (receiver), SURRENDERED
  stamp for TARGET (giver). Same dispatch vocabulary as StealReport
  (cream paper, typewriter header, ochre asset strip, rubber stamp,
  dog-ear) but Case 47-D for "Duress" and stamp variants reflecting
  trophy / loss. favor-given event extended with private cardType,
  visible only to giver+receiver via projection allowlist parallel to
  combo-steal.cardType. PROTOCOL_VERSION bumped 3→4. The interim
  small-toasts shipped during Gap-2 work (giver: "Card sent to X.";
  receiver: "Coerced a card from X.") were retired in the cinematic
  commit — toast + hero overlay competing for attention on the same
  event would dilute both.

Visual / vibe verification still pending — needs a live calibration
retry of SCN-FAVOR-NORMAL-01 with Briggsy eye-on-loop on a real device.
The wire contract is locked by a new `engine.pbt.test.ts` regression
parallel to the combo-steal and card-drawn privacy invariants.

---
**Seed kind:** vibe-check
**Source seats:** seat-1, seat-2
**Linked scenarios:** SCN-FAVOR-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-2's vibe-check at 2026-04-30T01:55:30Z:*
> "The interaction was too mechanical — I had no idea double-click was needed, and the nope window expired without any drama registered on my screen. The 'Card sent to Seat1' toast appeared but there was no cinematic beat acknowledging the coercion or my card leaving my hand. The favor resolution felt like a silent database transaction."

> *Quoted from seat-1's vibe-check at 2026-04-30T01:55:35Z:*
> "The exchange resolved correctly and the card arrived clean with no ghost staging, but the ~7 minute wait with a silent locked staging area felt like submitting a web form and refreshing to check if it processed. There was no drama, no tension, no Archer beat — just opacity about what was happening on the other end."

Both seats independently rated the same scenario `feltLikeArcher: no`. Seat-2 (TARGET) found the gesture undiscoverable and the card transfer cinematically inert. Seat-1 (ACTOR) had zero feedback for seven minutes that the game was even waiting for a response from Seat-2, leaving them staring at a disabled locked staging area with no explanation. The favor exchange — thematically, an operative coercing a colleague into surrendering intelligence — landed as a bureaucratic form submission on both phones.

## God-mode reality

From `server/events.jsonl` lines 1-5:

- stateVersion 2 (nowMs 1777513688113) — `card-played` (`call-in-a-favor`, playerId=Seat1, targetPlayerId=Seat2). Nope window opens (10s). Seat1 hand: 8→7.
- stateVersion 3 (nowMs 1777513698123) — `nope-window-expired` (windowGeneration=1). Nope window remainingMs=0. No nope played. pendingPrompt still null across all projections.
- stateVersion 4 (nowMs 1777513698432) — `nope-grace-expired` fires, triggering `nope-window-resolved {cancelled:false}` + `favor-requested {requesterId:Seat1, targetId:Seat2}`. subPhase transitions to `favor-pending`. pendingPrompt = `{type:'favor-response', playerId:Seat2, requesterId:Seat1}` for all viewers.
- stateVersion 5 (nowMs 1777514118894) — `favor-give` action from Seat2. Events: `favor-given {giverId:Seat2, receiverId:Seat1}`. subPhase returns to `turn-active`. Seat2 hand 8→7, Seat1 hand 7→8. pendingPrompt cleared.

The server executed the favor exchange correctly with no rule violations. The delta between stateVersion 4 and 5 is 420,462ms (~7 minutes) — the full wait seat-1 reported. The engine is not the problem; the presentation layer is entirely absent.

## Diagnosis

Three distinct presentation gaps compound into a single P1 vibe failure. All three are UI-layer issues; the engine produced correct output at every stateVersion.

**Gap 1 — Undiscoverable staging gesture for TARGET (`src/client/player/SmartActionBox.tsx:180-188`).**
In `favorMode`, when no card is staged, `deriveState` returns `key: 'favor-empty'`, `text: 'Stage a card\nto surrender to ${favorMode.requesterName}'`, `interactive: false`. The hint explains *what* to do but not *how*: the normal non-favor hint explicitly reads "Double-tap a card to stage it" (`SmartActionBox.tsx:213`). The favor-empty hint omits the "double-tap" qualifier, leaving the TARGET to discover the gesture through trial and error. Seat-2 tried single-tap (opens enlarged preview), then tapping the enlarged preview (dismisses without staging), before finding double-tap by accident. The gesture is correct and intentional (`Hand.tsx:46-56`: single=enlarge, double=stage via `useDoubleTap`; `useCardPlay.ts:29-31`: `maxStaged=1` auto-swaps on second card tap) — only the affordance is missing.

**Gap 2 — ACTOR has zero feedback during `favor-pending` subPhase (`src/client/player/SmartActionBox.tsx:196-215`).**
After the ACTOR plays Call in a Favor and the nope window expires, the game enters `subPhase: 'favor-pending'`. The ACTOR's `isFavorTarget` is false, so `favorMode` is null. `deriveState` reaches the "no cards staged" branch: `myTurn=true`, `sub='favor-pending'` (not `'turn-active'`), so it bypasses the draw button and falls through to `key: 'hint'`, `text: 'Double-tap a card to stage it'`, `interactive: false`. The ACTOR stares at a disabled hint that tells them to stage a card — but there is no card to stage, and no text explaining that Seat2 has received the request and the game is waiting for their response. This is the direct source of seat-1's "submitting a web form and refreshing" report.

**Gap 3 — No cinematic beat when the card transfers on either phone (`src/client/player/PlayerAlert.tsx:86-96`; `src/client/shared/DramaOverlay.tsx` — no favor mention).**
`PlayerAlert.tsx` handles `favor-given` for `giverId === myId` only, emitting a small `info`-tone toast: "Card sent to Seat1." The ACTOR (`receiverId`) receives nothing — the card count silently ticks 7→8. `DramaOverlay.tsx` has no `favor-given` case. The board's COMMS feed (`src/client/board/events.ts:97-101`) picks up one of two randomized lines ("reluctantly hands one over" / "got what they wanted"), but both phones are effectively silent on the most coercive moment in the exchange. A forced card surrender between operatives — the thematic heart of the mechanic — produces a small disappearing toast on the giver's phone and nothing on the receiver's.

The combined result: the favor arc has no discoverability signal at the start, no progress feedback during the wait, and no drama at the resolution. All three gaps must be addressed to pass the §2.2 acceptance test.

## Proposed fix paths

**Option A — Affordance + actor-feedback patch (effort: small / risk: low):** Two targeted copy changes in `SmartActionBox.tsx`. (1) Change the `favor-empty` hint to read "Double-tap a card\nto surrender to ${favorMode.requesterName}" — adding the gesture qualifier the normal hint already provides. (2) Add a new state branch for the ACTOR during `favor-pending`: when `!favorMode && sub === 'favor-pending' && myTurn`, return `key: 'favor-waiting'`, `text: 'Waiting for ${TARGET_NAME}\nto surrender a card'`, `interactive: false`. This requires threading the target's name (available from `pendingPrompt.playerId` cross-referenced to the player list) into `SmartActionBox` or computing it upstream in `Player.tsx` and passing as a prop. Fixes Gaps 1 and 2 with no motion work and no risk to the engine path.

**Option B — Receiver-side toast lift (effort: small / risk: low):** Extend `PlayerAlert.tsx`'s `favor-given` case to also fire for `receiverId === myId`, with `tone: 'urgent'` and copy such as "You extracted a card from ${nameOf(giverId)}." This gives the ACTOR tactile confirmation that the transfer landed. Can be shipped independently of Option A. Fixes Gap 3 partially — the giver's toast is already present; this completes the receiver side. Does not add cinematic weight, but closes the total-silence gap on the ACTOR's phone.

**Option C — Full cinematic favor arc via StealReport-pattern drama beats (effort: medium / risk: medium):** Add a `favor-given` queue path to the `StealReport` component (or a new `FavorReport` component following the same rubber-stamp pattern in `StealReport.tsx`). Give both phones a dramatic full-screen or banner beat when the transfer resolves: TARGET sees "You surrendered [card name] to [ACTOR]" with a disavowed-stamp treatment; ACTOR sees "You squeezed [card name] from [TARGET]" with an intel-extracted treatment. This is the full Archer beat — a spy coercing a colleague is a recurring comedic set piece that deserves visual weight comparable to a combo-steal. Risk: requires ordering the new drama beat against existing DramaOverlay beats, and the card type is redacted in projections (`src/shared/protocol.ts` scrubber), so the TARGET's beat can name the card type but the ACTOR may only know "a card" unless the `favor-given` event's private `cardType` is surfaced to the receiver (currently the event emits `giverId` and `receiverId` but not card identity — check `src/server/game/engine.ts` for `applyFavor` before implementing). This scope creep risk makes Option C a follow-on after A+B validate the beat's value.

## Recommended next step

Ship Option A (gesture affordance + actor feedback copy) and Option B (receiver-side toast) together as a single small PR to close the silence and discoverability gaps, then re-run SCN-FAVOR-NORMAL-01 to confirm the vibe-check passes before investing in Option C's full cinematic treatment.

---

**Triage seed kind:** vibe-check
**Triage agent session:** playtest-triage / seed 010-vibe-scn-favor-normal-01
