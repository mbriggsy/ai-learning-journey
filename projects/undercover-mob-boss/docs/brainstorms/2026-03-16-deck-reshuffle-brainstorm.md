---
date: 2026-03-16
topic: deck-reshuffle
---

# Deck Reshuffle Mechanic

## What We're Building

A randomized deck reshuffle system that prevents card counting while preserving the dramatic moment of a reshuffle announcement.

In Secret Hitler, the deck reshuffles when fewer than 3 cards remain — a fixed, predictable threshold. Attentive players can card-count (6 good + 11 bad = 17 total, 3 consumed per session) and deduce what the Mayor will draw, giving analytical players an unfair edge in a party game.

UMB deviates from SH here intentionally.

## Why This Approach

**Approaches considered:**

- **A) Follow SH exactly (threshold = 3)** — Preserves card counting as a skill. Rewards analytical players. Rejected because it creates an uneven playing field in a social deduction party game.
- **B) Random threshold, silent reshuffle** — Fully eliminates card counting. But loses a natural tension beat and departs from how physical card games work (you always see the shuffle).
- **C) Random threshold, announced reshuffle** — Nerfs card counting from "reliable advantage" to "educated guess." Preserves the dramatic narrator moment. Keeps the social deduction beat of "the deck just reset."

**Chosen: Approach C.**

## Key Decisions

- **Random threshold range: 3–7** — chosen secretly each time the deck is created or reshuffled. Players never know the threshold.
- **Trigger timing:** Before a policy session starts, if `policyDeck.length < threshold`, reshuffle the discard pile back into the deck and pick a new random threshold.
- **Announced:** Narrator line plays on reshuffle + host board shows visual cue (deck refilling animation).
- **Narrator line suggestion:** *"The policy deck has been reshuffled. The city's memory... is short."*
- **Impact:** Reshuffle could happen after session 4 or 5 (1-session window of uncertainty). Enough to break reliable counting without feeling random.

## SH Rules as Fallback

For any game mechanic not explicitly specified in SPEC.md or RULES.md, Secret Hitler rules (docs/user/Secret_Hitler_Rules.pdf) are the authoritative fallback. As ambiguities are discovered during the build, they should be resolved and documented in RULES.md.

## Clarifications Resolved in This Session

| Topic | SH Rule | UMB Decision |
|---|---|---|
| Veto power | President + Chancellor can veto after 5 fascist policies | **Follow SH** — implement veto mechanic |
| Mob Boss election win threshold | Hitler elected Chancellor after 3+ fascist policies | **Follow SH** — 3+ bad policies required |
| Term limits by player count | 5-6 players: only Chancellor term-limited | **Follow SH** — vary by player count |
| Deck reshuffle | Fixed threshold of 3 | **Deviate** — random threshold 3-7, announced |

## Open Questions

- Exact narrator line for reshuffle (to be finalized during audio generation)
- Visual design of the deck counter / reshuffle animation on host board

## Next Steps

Update RULES.md with clarifications, then proceed to planning.
