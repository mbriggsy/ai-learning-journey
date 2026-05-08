# 004-scn-favor-normal-01 — Favor-pending ACTOR information gap; scenario completed correctly but flagged as known product call (B-05)

**Severity (triage):** P2
**Status:** KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** scripted-scenario
**Source seats:** seat-1
**Linked scenarios:** SCN-FAVOR-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** SCN-FAVOR-NORMAL-01 → B-05

## Player-POV summary

> *Quoted from seat-1's suspicion log at 2026-04-30T01:52:30Z:*
> "Waited ~4.5 minutes for Seat2 to respond to the favor prompt. No response received. Game remains blocked on my turn pending Seat2's favor-response action. The UI shows no indication of what is happening — no pending message, no countdown, no spinner beyond the locked staging area. As ACTOR, there is no visibility into whether Seat2 has received the prompt."

> *Quoted from seat-1's vibe-check at 2026-04-30T01:55:35Z (feltLikeArcher: no):*
> "The exchange resolved correctly and the card arrived clean with no ghost staging, but the ~7 minute wait with a silent locked staging area felt like submitting a web form and refreshing to check if it processed. There was no drama, no tension, no Archer beat — just opacity about what was happening on the other end."

Seat-1 (ACTOR) played Call in a Favor targeting Seat2. The favor prompt was sent correctly but Seat2 took approximately 7 minutes to respond. During that wait, seat-1's phone showed only a locked staging area with no contextual status — no indication that a prompt was outstanding on Seat2's device. The exchange ultimately resolved cleanly, but the wait produced a vibe-check `no`.

## God-mode reality

From `server/events.jsonl` lines 2-5:
- `nowMs 1777513688113` (2026-04-30T01:48:08Z) — `card-played` (playerId=Seat1/20f8d740, cardType=`call-in-a-favor`); nope window opened, 10s
- `nowMs 1777513698123` (2026-04-30T01:48:18Z) — `nope-window-expired` (stateVersion 3); window elapsed with no Nope played
- `nowMs 1777513698432` (2026-04-30T01:48:18Z) — `nope-grace-expired` (stateVersion 4); `nope-window-resolved` (cancelled: false), `favor-requested` (requesterId=Seat1, targetId=Seat2/743313fe); subPhase=`favor-pending`; `pendingPrompt={type:'favor-response', playerId:Seat2, requesterId:Seat1}` broadcast to all viewers
- `nowMs 1777514118894` (2026-04-30T01:55:18Z) — `favor-give` dispatched by Seat2 (stateVersion 5); `favor-given` (giverId=Seat2, receiverId=Seat1); Seat2 hand 8→7, Seat1 hand 7→8; subPhase returned to `turn-active`

The server handled the favor exchange correctly. The gap between `favor-requested` (stateVersion 4) and `favor-given` (stateVersion 5) was 420,462ms (~7 minutes). No disconnect event occurred — Seat2 remained connected throughout; they simply took 7 minutes to respond. The projection at stateVersion 4 correctly broadcast `pendingPrompt` to all viewers including Seat1, but the ACTOR-side UI does not expose that status in a visible way.

## Diagnosis

This seed is matched as a known product call. The candidate duplicate field resolves to **B-05** (`favor-pending + target disconnects → room frozen`) in `docs/testing/E2E-ISSUE-LIST.md`. B-05 is part of the "Disconnect-wedge cluster — PRODUCT DECISION NEEDED" block, where the core tension is that the "game waits for you" policy (which removed all prompt timeouts) leaves the game stalled when the target is slow or disconnected, with no feedback mechanism for the waiting ACTOR.

In this session Seat2 did not disconnect — they eventually responded — but the UX experience for the ACTOR (Seat1) was identical to a disconnect scenario: silent locked staging area with no signal that a prompt was active on another device. The `pendingPrompt` field IS present in Seat1's projection at stateVersion 4 (`pendingPrompt.type='favor-response'`, `pendingPrompt.requesterId=Seat1`) but the ACTOR-side phone view does not surface this information to the requester in a human-readable form.

The ancillary vibe-check `no` (`feltLikeArcher: no`, stateVersion 4 window) independently confirms this is a product-quality issue, not just a mechanical one. See `docs/testing/E2E-ISSUE-LIST.md` B-05 and the associated cluster notes for fix options (disconnect-only auto-resolve vs. vote-to-kick vs. accept 15-min nuke).

## Proposed fix paths

See linked E2E entry B-05 and its cluster block for full fix-path options. No additional fix paths are proposed here — this triage seed adds the ancillary signal that the ACTOR-side UX gap is present even when the target does not disconnect (slow-but-connected human), reinforcing the recommendation toward option (b) in the cluster notes: a disconnect-only auto-resolve that preserves "game waits for slow human" while healing ghost-player stalls. The ACTOR-side status message (surfacing `pendingPrompt.requesterId` on the requester's own phone) is a complementary UX fix worth coupling with any B-05 resolution.

## Recommended next step

Promote the ACTOR-side status message (expose `pendingPrompt` context on the requester's phone when `subPhase='favor-pending'`) as a companion UX item alongside whichever B-05 disconnect-resolution option Briggsy selects.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 004-scn-favor-normal-01
