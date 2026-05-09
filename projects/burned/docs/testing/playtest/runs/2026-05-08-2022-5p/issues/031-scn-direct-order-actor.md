# 031-scn-direct-order-actor — Direct Order target-select dialog uses Reassign card vocabulary

**Severity (triage):** P2
**Status:** ✅ RESOLVED
**Seed kind:** scripted-scenario
**Source seats:** seat-5
**Linked scenarios:** SCN-DIRECT-ORDER-ACTOR
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** 032-scn-direct-order-normal-01 (paired Direct Order finding)
**Resolution:** Fix landed 2026-05-09. `Player.tsx:602` target-picker title for Direct Order changed from `"Choose who to reassign to"` to `"Direct your orders to..."` — Archer-tone copy that matches the card's spy-thriller flavor and removes the Reassign vocabulary contamination. Self-target inclusion in the eligible list (Finding 2) is working-as-intended per rules §13.8 — no change. Bundled with the protocol-additive fix from 032 (targetId on card-played) so the ACTOR's choice of target also surfaces on observer phones.

## Player-POV summary

> *Quoted from seat-5's suspicion log at 2026-05-09T00:59:20Z:*
> "Direct Order target selection dialog titled 'Choose who to reassign to' — the word 'reassign' is Reassign card terminology. Direct Order description says 'Choose ANY operative for 2 turns.' The dialog label mismatch could confuse players who know the card by name."

> *Also quoted from seat-5's suspicion log at 2026-05-09T00:59:20Z:*
> "Direct Order target list included the actor (Seat5 / myself) as a selectable option. Rules say 'Choose ANY operative' — self-targeting would waste the card but is technically legal per 'ANY'. Is this intentional? No rule says it must exclude self."

Seat-5 played Direct Order as ACTOR and opened the target-selection sheet. The sheet title read "Choose who to reassign to" — borrowing vocabulary from the Reassign card rather than Direct Order. Seat-5 also saw themselves in the target list and was uncertain whether self-inclusion was intentional. The vibe-check for the same scenario (at 2026-05-09T01:00:05Z) scored `yes`, with the prose noting the phrasing was "slightly off-brand" but the overall interaction was mechanically correct and read as Archer-tone.

## God-mode reality

From `server/events.jsonl` (lines 41–71 contain `"cardType":"direct-order"` entries; SCN-DIRECT-ORDER-NORMAL-01 matched):

- Tier-1 oracle: pass
- Tier-2 oracle: n/a (no projection assertions for this scenario)
- Tier-3 oracle: n/a
- Coverage verdict: `clean` (no divergence flags)
- Per `coverage.md` self-vs-detector note: "SCN-DIRECT-ORDER-NORMAL-01 (detector-without-self): FireRecord matched but no seat self-reported." (Seat-5 filed a scenario-fire for SCN-DIRECT-ORDER-ACTOR; the detected label was SCN-DIRECT-ORDER-NORMAL-01 — different ID, not a discrepancy in the mechanical outcome.)

The server correctly resolved: Direct Order discarded, turn transferred to Seat4, `turnsRemaining: 2`, no draw, pile count unchanged at 27. All mechanical behavior was correct.

## Diagnosis

**Finding 1 — Wrong dialog label (active bug, copy string):**

`src/client/player/Player.tsx:602` contains this ternary branch:
```
: localTargetMode.reason === 'direct-order' ? 'Choose who to reassign to'
```

The string "Choose who to reassign to" is Reassign card vocabulary. In BURNED's terminology mapping (`docs/RULES-REFERENCE.md` §1): Reassign = EK's Attack (default next-in-order), Direct Order = EK's Targeted Attack (chosen target). These are narratively distinct — the SCENARIOS.md scenario catalog for SCN-DIRECT-ORDER-NORMAL-01 explicitly calls this out: "TARGET must know it was DIRECTED, not passed via position — differs from Reassign narratively" and the vibe check asks "Does Direct Order feel personal in a way Reassign doesn't? It should. The target was chosen, not defaulted."

The moment the ACTOR opens the target-selection sheet is exactly the personalization beat. Having that sheet announce "reassign to" conflates it with the rotation-defaulted card, eroding the narrative distinction the catalog wants to land. The string is simply wrong — it names the wrong card mechanic.

**Finding 2 — Self-target inclusion (working as intended, not a bug):**

`src/client/player/Player.tsx:520-524`:
```js
const eligibleTargets = players.filter(p => {
  if (!p.isAlive) return false
  if (p.id !== myPlayerId) return true
  return localTargetMode?.reason === 'direct-order'
})
```

Self-inclusion for `direct-order` is deliberate. `src/server/game/engine.ts:401` carries the comment: "Self-target allowed per rules §13.8 — pointless, but legal and funny." `docs/RULES-REFERENCE.md §13.8` confirms the design decision: "Allow it (rules don't explicitly forbid it), but it is equivalent to just taking your turns normally. Could be funny for trolling." The catalog documents `SCN-DIRECT-ORDER-SELF-TARGET-01` as a separate scenario exercising this deliberately-legal comedy path. No action required.

## Proposed fix paths

**Option A — Minimal string fix (effort: tiny / risk: low):** Change `Player.tsx:602` from `'Choose who to reassign to'` to `'Choose your target operative'`. Accurate vocabulary, no Reassign bleed, no design discussion required. One-line change. Does not foreground the Archer comedy beat but is at least correctly branded.

**Option B — Archer-tone copy (effort: small / risk: low):** Replace with a line that leans into the Direct Order spy-thriller flavor — e.g., `'Issue orders to...'` or `'Who receives the directive?'`. Requires a brief product-voice decision but the copy surface is tiny (one string). Elevates the card's identity and makes the chosen-vs-defaulted distinction land harder on the ACTOR's phone. Highest vibe payoff for smallest engineering cost.

**Option C — Accept as known polish debt (effort: tiny / risk: none):** Seat-5's overall vibe-check was `yes`; the label didn't break play or confuse the outcome. Log it, defer to a copy-sweep pass alongside other UI string work. Risk is that the Reassign-vocabulary contamination persists into future testing rounds and accumulates player confusion.

## Recommended next step

Apply Option A immediately (one-line string change at `Player.tsx:602`) and flag to Briggsy for Option B copy upgrade if the Archer-tone bar warrants it — the fix is trivial and the wrong label is objectively incorrect regardless of vibe score.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 031-scn-direct-order-actor
