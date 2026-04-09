# Exploding Kittens Party Pack — Canonical Rules Reference

> **Purpose:** Single source of truth for BURNED's game mechanics. This doc uses original EK terminology since it references the official rulebook. See mapping below.
> **Edition:** Exploding Kittens Party Pack (current 120-card version, 2-10 players).
> **Research date:** 2026-04-05
> **Primary source:** `docs/user/ekpp-instructions-english.pdf` (official Party Pack rulebook, 2025 print)
> **Secondary sources:** explodingkittens.com/how, Asmodee distributor rules, BoardGameGeek forums,
> Board & Card Games StackExchange, Exploding Kittens Wiki (Fandom), Reddit r/ExplodingKittens.
> **Audit (2026-04-05):** Where web sources conflict with the PDF, the PDF wins. Three corrections
> applied: 5-Different combo cut (not in Party Pack), dead player cards corrected, self-Nope disallowed.

### BURNED Terminology Mapping

| Original (EK) | BURNED | Code identifier |
|----------------|--------|-----------------|
| Exploding Kitten | Burned | `burned` |
| Defuse | Extraction | `extraction` |
| Attack | Ambush | `ambush` |
| Targeted Attack | Double Cross | `double-cross` |
| Skip | Ghost | `ghost` |
| See the Future | Surveillance | `surveillance` |
| Alter the Future | Deep Cover | `deep-cover` |
| Shuffle | Shakedown | `shakedown` |
| Draw from the Bottom | Back Channel | `back-channel` |
| Favor | Intel | `intel` |
| Nope | Intercepted | `intercepted` |
| Cat cards | Operatives | `dash`, `vera`, `otto`, `janet`, `neal` |
| — | Agent X (wild) | `agent-x` |

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [Complete Deck Composition (120 Cards)](#2-complete-deck-composition-120-cards)
3. [Deck Scaling by Player Count (Paw Print System)](#3-deck-scaling-by-player-count-paw-print-system)
4. [Game Setup](#4-game-setup)
5. [Turn Structure](#5-turn-structure)
6. [Card Effects Reference](#6-card-effects-reference)
7. [Special Combos (Cat Card Combinations)](#7-special-combos-cat-card-combinations)
8. [Feral Cat Rules](#8-feral-cat-rules)
9. [Nope Rules (Critical)](#9-nope-rules-critical)
10. [Attack and Turn Manipulation](#10-attack-and-turn-manipulation)
11. [Defuse and Reinsertion](#11-defuse-and-reinsertion)
12. [Edge Cases and Special Situations](#12-edge-cases-and-special-situations)
13. [Ambiguities and Design Decisions for Digital](#13-ambiguities-and-design-decisions-for-digital)

---

## 1. Game Overview

Exploding Kittens is a multiplayer card game of strategic Russian Roulette. Players take
turns drawing cards from a shared Draw Pile. If you draw an Exploding Kitten and cannot
Defuse it, you are eliminated. Last player standing wins.

- **Players:** 2-10
- **Cards:** 120 total
- **Win condition:** Be the last player alive
- **Core loop:** Play cards (optional) -> Draw a card (mandatory, ends your turn)

---

## 2. Complete Deck Composition (120 Cards)

| Card Type              | Count | Category        | Notes                                    |
|------------------------|------:|-----------------|------------------------------------------|
| Exploding Kitten       |     9 | Kitten           | Kills you unless Defused                |
| Defuse                 |    10 | Defuse           | Saves you from Exploding Kitten         |
| Nope                   |     9 | Action (Instant) | Cancels any action card                 |
| Attack (2X)            |     5 | Action           | End turn, next player takes 2 turns     |
| Targeted Attack (2X)   |     5 | Action           | End turn, CHOSEN player takes 2 turns   |
| Skip                   |    10 | Action           | End turn without drawing                |
| Favor                  |     6 | Action           | Force a player to give you a card       |
| Shuffle                |     6 | Action           | Shuffle the Draw Pile                   |
| See the Future (3X)    |     6 | Action           | Peek at top 3 cards                     |
| Alter the Future (3X)  |     6 | Action           | Peek at top 3 and rearrange them        |
| Draw from the Bottom   |     7 | Action           | Draw from bottom instead of top         |
| Feral Cat              |     6 | Cat (Wild)       | Wildcard -- acts as any Cat Card        |
| Taco Cat               |     7 | Cat              | No effect alone; used in combos         |
| Beard Cat              |     7 | Cat              | No effect alone; used in combos         |
| Rainbow-Ralphing Cat   |     7 | Cat              | No effect alone; used in combos         |
| Hairy Potato Cat       |     7 | Cat              | No effect alone; used in combos         |
| Cattermelon            |     7 | Cat              | No effect alone; used in combos         |
| **TOTAL**              | **120** |               |                                          |

> **Source:** Multiple retailer listings, unboxing videos, and community card counts
> all converge on these numbers. Earlier printings had 122 cards (1 extra Nope, 1 extra
> Attack); current edition is 120.

### Card Categories Explained

- **Kitten cards:** Exploding Kitten. Cannot be played from hand. Triggers on draw.
- **Defuse cards:** Played in response to drawing an Exploding Kitten. Cannot be played proactively.
- **Action cards:** Played on your turn (except Nope, which is instant/interrupt).
- **Cat cards:** Powerless alone. Combined in pairs/sets for Special Combos.
- **Wild Cat (Feral Cat):** Substitutes for any Cat Card in combos.

---

## 3. Deck Scaling by Player Count (Paw Print System)

The Party Pack uses a paw print icon in the card corner to determine which cards are
used at each player count tier.

### Tier Rules

| Players | Cards Used                     | Action Cards | Defuses Available | EKs Inserted |
|---------|--------------------------------|-------------:|------------------:|-------------:|
| 2-3     | Paw-print cards ONLY           |           41 |                 3 |        N - 1 |
| 4-7     | Non-paw-print cards ONLY       |           60 |                 7 |        N - 1 |
| 8-10    | ALL cards (paw + non-paw)      |          101 |                10 |        N - 1 |

> N = number of players. Unused Exploding Kittens are removed from the game entirely.

### Paw Print Distribution Per Card Type

| Card Type              | Paw Print | Non-Paw | Total |
|------------------------|----------:|--------:|------:|
| Taco Cat               |         3 |       4 |     7 |
| Beard Cat              |         3 |       4 |     7 |
| Rainbow-Ralphing Cat   |         3 |       4 |     7 |
| Hairy Potato Cat       |         3 |       4 |     7 |
| Cattermelon            |         3 |       4 |     7 |
| Attack (2X)            |         2 |       3 |     5 |
| Targeted Attack (2X)   |         2 |       3 |     5 |
| Skip                   |         4 |       6 |    10 |
| Favor                  |         2 |       4 |     6 |
| Shuffle                |         2 |       4 |     6 |
| See the Future (3X)    |         3 |       3 |     6 |
| Alter the Future (3X)  |         2 |       4 |     6 |
| Draw from the Bottom   |         3 |       4 |     7 |
| Feral Cat              |         2 |       4 |     6 |
| Nope                   |         4 |       5 |     9 |
| Defuse                 |         3 |       7 |    10 |
| Exploding Kitten       |       N/A |     N/A |     9 |

> Exploding Kittens do NOT have paw prints. They are handled separately during setup
> (always insert N-1 regardless of tier).

> **Source:** Detailed unboxing video analysis (YouTube), cross-referenced with
> community card counts on Reddit and BGG.

### Defuse and EK Distribution Per Player Count

| Players | Tier    | Defuses in Deck | Defuses Dealt | Extra in Draw Pile | EKs Inserted |
|--------:|---------|----------------:|--------------:|-------------------:|-------------:|
|       2 | Paw     |               3 |             2 |                  1 |            1 |
|       3 | Paw     |               3 |             3 |                  0 |            2 |
|       4 | Non-Paw |               7 |             4 |                  3 |            3 |
|       5 | Non-Paw |               7 |             5 |                  2 |            4 |
|       6 | Non-Paw |               7 |             6 |                  1 |            5 |
|       7 | Non-Paw |               7 |             7 |                  0 |            6 |
|       8 | All     |              10 |             8 |                  2 |            7 |
|       9 | All     |              10 |             9 |                  1 |            8 |
|      10 | All     |              10 |            10 |                  0 |            9 |

> **Balance note:** At 3, 7, and 10 players, there are ZERO extra Defuse cards in the
> Draw Pile. The only Defuses in the game are those dealt to players' hands.

---

## 4. Game Setup

1. Remove ALL Exploding Kittens (9) and ALL Defuse cards from the deck. Set aside.
2. Based on player count, select the correct card tier (paw / non-paw / all).
3. Shuffle the selected action cards.
4. Deal **7 cards** face-down to each player.
5. Deal **1 Defuse card** to each player (from the tier-appropriate Defuse pool).
   Each player now has **8 cards** in hand.
6. Shuffle any remaining (undealt) Defuse cards back into the Draw Pile.
7. Insert **(N - 1) Exploding Kittens** into the Draw Pile (N = player count).
   Remove unused Exploding Kittens from the game.
8. Shuffle the Draw Pile thoroughly.
9. Place Draw Pile face-down in the center. Start a face-up Discard Pile beside it.
10. Choose a starting player. Play proceeds clockwise.

> **Source:** Official rulebook, consistent across all reviewed sources.

---

## 5. Turn Structure

A turn has two phases:

### Phase 1: Play Cards (Optional)

- You may play **zero or more** cards from your hand.
- You may play cards in any order.
- Some cards end your turn immediately (Attack, Skip, Draw from Bottom).
- There is no hand size limit.
- You may play cards even if you have remaining turns from an Attack.

### Phase 2: Draw a Card (Mandatory)

- Draw **one card** from the **top** of the Draw Pile.
- This ends your turn.
- If you draw an Exploding Kitten, you must immediately reveal it and Defuse or die.
- If a card effect ends your turn (Attack, Skip), you skip the draw phase.

### Turn End

Your turn is over when you:
- Draw a card from the Draw Pile, OR
- Play a card that explicitly ends your turn without drawing (Attack, Skip, Draw from Bottom)

> **Critical:** You MUST draw if you have not played a turn-ending card. You cannot
> choose to just "not draw."

---

## 6. Card Effects Reference

### Exploding Kitten

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Type**        | Kitten (not playable from hand)                        |
| **Trigger**     | Drawn from Draw Pile                                   |
| **Effect**      | You must immediately show it. Play a Defuse or you are eliminated. |
| **Nopeable**    | NO                                                     |
| **Target**      | N/A (affects the drawer)                               |
| **Interactive** | Triggers Defuse prompt                                 |

> You cannot hold an Exploding Kitten in your hand. It triggers immediately on draw.

### Defuse

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Type**        | Defuse (reactive only)                                 |
| **Trigger**     | Played in response to drawing an Exploding Kitten      |
| **Effect**      | Prevents elimination. Defuse goes to Discard Pile. Player secretly reinserts the Exploding Kitten anywhere in the Draw Pile. Turn ends immediately. |
| **Nopeable**    | NO                                                     |
| **Target**      | N/A (self)                                             |
| **Interactive** | Triggers reinsertion prompt (choose position in deck)  |

> See [Section 11](#11-defuse-and-reinsertion) for detailed reinsertion rules.

### Nope

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Type**        | Action (Instant / Interrupt)                           |
| **Trigger**     | Played at ANY time, even on other players' turns       |
| **Effect**      | Cancels the target card/combo as if it were never played. Target card goes to Discard Pile with no effect. |
| **Nopeable**    | YES (Nope-on-Nope creates a "Yup")                    |
| **Target**      | Any card play or combo currently resolving             |
| **Interactive** | Triggers Nope window for all players                   |

> See [Section 9](#9-nope-rules-critical) for full Nope chain rules.

### Attack (2X)

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Type**        | Action                                                 |
| **Effect**      | Immediately end your turn(s) WITHOUT drawing. The next player in turn order must take 2 turns. |
| **Nopeable**    | YES                                                    |
| **Target**      | Next player in turn order (implicit)                   |
| **Interactive** | No prompt needed                                       |
| **Turn-ending** | YES -- you do NOT draw a card                          |

> If you are under Attack (multiple turns remaining) and play Attack, see
> [Section 10](#10-attack-and-turn-manipulation) for stacking rules.

### Targeted Attack (2X) -- PARTY PACK EXCLUSIVE

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Type**        | Action                                                 |
| **Effect**      | Immediately end your turn(s) WITHOUT drawing. Choose ANY player -- they must take 2 turns. |
| **Nopeable**    | YES                                                    |
| **Target**      | Any player (player chooses)                            |
| **Interactive** | Triggers target selection prompt                       |
| **Turn-ending** | YES -- you do NOT draw a card                          |

> Same stacking rules as Attack. The ONLY difference is you choose the target instead
> of it defaulting to the next player.

### Skip

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Type**        | Action                                                 |
| **Effect**      | Immediately end your current turn WITHOUT drawing.     |
| **Nopeable**    | YES                                                    |
| **Target**      | N/A (self)                                             |
| **Interactive** | No prompt needed                                       |
| **Turn-ending** | YES -- you do NOT draw a card                          |

> If you have multiple turns remaining (from Attack), Skip only ends ONE turn.
> You still must take remaining turns.

### Favor

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Type**        | Action                                                 |
| **Effect**      | Choose a player. They MUST give you one card from their hand. THEY choose which card to give. |
| **Nopeable**    | YES                                                    |
| **Target**      | Any other player                                       |
| **Interactive** | Triggers target selection prompt, then target's card selection prompt |

> If the target has 0 cards in hand, nothing happens (Favor still goes to Discard).
> The target chooses which card to give -- the Favor player cannot specify.

### Shuffle

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Type**        | Action                                                 |
| **Effect**      | Shuffle the Draw Pile randomly. Does NOT end your turn. |
| **Nopeable**    | YES                                                    |
| **Target**      | N/A (affects Draw Pile)                                |
| **Interactive** | No prompt needed                                       |
| **Turn-ending** | NO                                                     |

> Useful after See the Future reveals an Exploding Kitten on top, or after
> someone Defuses and you suspect they placed the EK near the top.

### See the Future (3X)

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Type**        | Action                                                 |
| **Effect**      | Privately view the top 3 cards of the Draw Pile. Put them back in the SAME order. Does NOT end your turn. |
| **Nopeable**    | YES                                                    |
| **Target**      | N/A (self -- private information)                      |
| **Interactive** | Shows top 3 cards to the playing player only           |

> Other players CANNOT see what you saw. You may lie about what you saw.
> Cards remain in the same order.

### Alter the Future (3X) -- PARTY PACK EXCLUSIVE

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Type**        | Action                                                 |
| **Effect**      | Privately view the top 3 cards of the Draw Pile, then REARRANGE them in any order you choose. Return them face-down to the top. Does NOT end your turn. |
| **Nopeable**    | YES                                                    |
| **Target**      | N/A (self -- private information)                      |
| **Interactive** | Shows top 3 cards, then prompts reordering             |

> Strictly better than See the Future. You can place an Exploding Kitten on top
> for the next player, or bury it to protect yourself.

### Draw from the Bottom -- PARTY PACK EXCLUSIVE

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Type**        | Action                                                 |
| **Effect**      | End your turn by drawing the BOTTOM card of the Draw Pile instead of the top card. |
| **Nopeable**    | YES                                                    |
| **Target**      | N/A (self)                                             |
| **Interactive** | No prompt needed                                       |
| **Turn-ending** | YES -- replaces your normal draw                       |

> If you have multiple turns remaining (from Attack), Draw from Bottom only ends
> ONE turn. You still must take remaining turns, drawing normally unless you play
> another turn-ending card.
>
> **Critical interaction:** If you play See the Future / Alter the Future and see an
> EK on top, you can then play Draw from Bottom to avoid it.

### Cat Cards (Taco Cat, Beard Cat, Rainbow-Ralphing Cat, Hairy Potato Cat, Cattermelon)

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Type**        | Cat                                                    |
| **Effect**      | NONE when played alone. Must be combined in Special Combos. |
| **Nopeable**    | N/A alone (combos are Nopeable)                        |
| **Target**      | Depends on combo                                       |
| **Interactive** | Depends on combo                                       |

> You cannot play a single Cat Card by itself for any effect. See
> [Section 7](#7-special-combos-cat-card-combinations).

### Feral Cat -- PARTY PACK EXCLUSIVE

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Type**        | Cat (Wild)                                             |
| **Effect**      | Acts as ANY Cat Card for combo purposes.               |
| **Nopeable**    | N/A alone (combos are Nopeable)                        |

> See [Section 8](#8-feral-cat-rules) for full wildcard rules.

---

## 7. Special Combos (Cat Card Combinations)

Combos are formed by playing sets of cards together. **When cards are played as a
combo, their individual printed effects are IGNORED.** Only the combo effect applies.

> **Important:** Combos work with ANY cards that share the same title, not just Cat
> Cards. You can pair two Skips, two Shuffles, etc. When you do, their printed action
> is ignored and the combo effect applies instead.

### Two of a Kind -- Steal a Random Card

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Cards needed** | 2 cards with the SAME title                           |
| **Effect**      | Choose a target player. Steal ONE random card from their hand. |
| **Nopeable**    | YES                                                    |
| **Target**      | Any other player                                       |
| **Interactive** | Target selection, then random card selection            |

**Mechanics:**
- Target player shuffles their hand face-down.
- You blindly pick one card.
- In digital: server picks a random card from target's hand.

### Three of a Kind -- Name and Steal

| Property        | Value                                                  |
|-----------------|--------------------------------------------------------|
| **Cards needed** | 3 cards with the SAME title                           |
| **Effect**      | Choose a target player. NAME a card type. If target has that card, you take ONE copy. If not, you get nothing. |
| **Nopeable**    | YES                                                    |
| **Target**      | Any other player                                       |
| **Interactive** | Target selection, card type naming, resolution          |

**Mechanics:**
- You name a specific card type (e.g., "Defuse", "Skip", "Taco Cat").
- If the target has one or more of that type, you take one.
- If the target does not have it, you get nothing. Tough luck.
- The 3 cards you played are still discarded regardless.

### Five Different Cards -- NOT IN PARTY PACK

> **SCOPE CUT.** The 5-Different combo (play 5 cards with different titles to take any card
> from the Discard Pile) exists in the **original base game** rules but is **NOT included
> in the Party Pack rulebook** (`docs/user/ekpp-instructions-english.pdf`). The Party Pack
> replaced it with the any-card combo expansion (Two/Three of a Kind work with ANY matching
> cards, not just Cat Cards). This was confirmed by cross-referencing the actual PDF against
> web sources during the rules audit (2026-04-05).
>
> Some web sources still list it because they mix base game and Party Pack rules.
> Our implementation follows the Party Pack edition exclusively.

---

## 8. Feral Cat Rules

The Feral Cat is a wildcard exclusive to the Party Pack (also found in the Imploding
Kittens expansion).

### What Feral Cat CAN Do

1. **Substitute for any Cat Card in combos.** A Feral Cat + Taco Cat = a pair of
   "Taco Cats" for Two of a Kind purposes.
2. **Be paired with another Feral Cat.** Two Feral Cats share the same title
   ("Feral Cat"), so they count as a matching pair for Two of a Kind.
3. **Be used in Three of a Kind.** Two Feral Cats + one Beard Cat = three
   "Beard Cats" for Three of a Kind.
4. ~~Count as one card in a Five Different combo.~~ **N/A -- 5-Different is not in Party Pack.**

### What Feral Cat CANNOT Do

1. **Cannot substitute for non-Cat cards.** A Feral Cat cannot act as a Skip,
   Attack, Shuffle, Defuse, Nope, or any Action card.
2. **Cannot be played alone.** Like all Cat Cards, it has no solo effect.
3. ~~Cannot count as two different cards in a Five Different combo.~~ **N/A -- 5-Different is not in Party Pack.**

### Feral Cat Combo Summary

| Combo             | Example                                    | Valid? |
|-------------------|--------------------------------------------|--------|
| Feral + Taco Cat  | Pair = Two of a Kind steal                 | YES    |
| Feral + Feral     | Pair = Two of a Kind steal                 | YES    |
| 2x Feral + Beard  | Triple = Three of a Kind named steal       | YES    |
| 3x Feral          | Triple = Three of a Kind named steal       | YES    |
| ~~Feral in 5-diff~~ | ~~Feral + 4 other unique titles~~       | ~~N/A -- 5-Different not in Party Pack~~ |
| ~~2x Feral in 5-diff~~ | ~~Two cards with same title~~        | ~~N/A~~ |
| Feral as Skip     | Trying to use as action card               | NO     |

> **Source:** Official rules, Fandom wiki, multiple Reddit/StackExchange confirmations.

---

## 9. Nope Rules (Critical)

The Nope card is the most complex mechanic in the game. This section is essential
for correct digital implementation.

### What CAN Be Noped

- Attack
- Targeted Attack
- Skip
- Favor (before the card is given)
- Shuffle
- See the Future
- Alter the Future
- Draw from the Bottom
- Any Special Combo (Two of a Kind, Three of a Kind)
- Another Nope card (creating a Nope chain)
- Any single card played for its action effect

### What CANNOT Be Noped

- **Exploding Kitten** (drawing it is not a "played card" -- it just happens)
- **Defuse** (playing a Defuse to survive an Exploding Kitten is immune)
- **Defuse reinsertion** (putting the EK back in the deck cannot be Noped)
- **Drawing a card** (the act of drawing to end your turn is not Nopeable)
- **A card played as part of a combo** individually (you Nope the whole combo, not one card in it)

### Nope Chains

Nopes can be played on top of Nopes, creating a chain:

| Chain Depth | Effect                                        | Name  |
|------------:|-----------------------------------------------|-------|
|           1 | Original action is CANCELLED                  | Nope  |
|           2 | Original action PROCEEDS (Nope was cancelled) | Yup   |
|           3 | Original action is CANCELLED again             | Nope  |
|           4 | Original action PROCEEDS again                 | Yup   |
|         ... | Pattern continues...                           | ...   |

**Rule:** Odd depth = cancelled. Even depth = proceeds.

There is **no limit** to how many Nopes can be chained.

### Nope Timing

- A Nope can be played **at any time** by **any player**, even when it is not
  their turn.
- A Nope must be played **before the action has resolved.** Once the effect has
  taken place (e.g., cards have been viewed for See the Future, deck has been
  shuffled), it is too late.
- ~~5-Different grab-quickly rule~~ **N/A -- 5-Different is not in Party Pack.**

### Can You Nope Your Own Card?

**NO.** The consistent official interpretation is that you cannot Nope your own
card play. Nopes are used to counter OTHER players' actions.

> **Source:** Official rules, StackExchange rulings, consistent Reddit consensus.
> While the literal text doesn't explicitly say "you cannot Nope yourself," every
> official example and the digital app implementation disallow it.

### Nope on Favor -- Timing Detail

- If a Favor is Noped BEFORE the target gives a card: the Favor is cancelled,
  no card changes hands.
- If the target has already handed over a card: too late to Nope. The action
  has resolved.

### Digital Implementation Note

In the physical game, Nope timing is informal ("before the action resolves"). For
digital, we need a **defined Nope window** -- a timer during which any player may
play a Nope after any Nopeable card is played. See
[Section 13](#13-ambiguities-and-design-decisions-for-digital).

---

## 10. Attack and Turn Manipulation

### Basic Attack Mechanics

When you play Attack (or Targeted Attack):
1. Your turn immediately ends. You do NOT draw a card.
2. The target player must take **2 consecutive turns.**
3. Each of those turns follows normal turn structure (play cards, then draw).

### Attack Stacking

Attacks **stack.** If the victim of an Attack plays an Attack during any of their
imposed turns, the new target inherits the remaining turns PLUS 2 more.

**Formula:** `new_target_turns = victim_remaining_turns + 2`

**Examples:**

| Scenario                                      | Result                    |
|-----------------------------------------------|---------------------------|
| A attacks B (2 turns). B plays Attack on turn 1 of 2. | C takes 1 + 2 = 3 turns |
| A attacks B (2 turns). B plays Attack on turn 2 of 2. | C takes 0 + 2 = 2 turns |
| A attacks B (2 turns). B plays Attack before taking any turns. | C takes 2 + 2 = 4 turns |
| C has 4 turns. C plays Attack on turn 1 of 4. | D takes 3 + 2 = 5 turns  |

> This applies to BOTH Attack and Targeted Attack identically.

> **Source:** Official rulebook explicitly states: "If the victim of an Attack Card
> plays an Attack Card on any of their turns, the new target must take any remaining
> turns plus the number of attacks on the Attack Card just played."

### Skip During Attack

Skip cancels **ONE turn only**, not all remaining turns.

**Example:**
- A attacks B (2 turns).
- B plays Skip on their first turn.
- B still has 1 remaining turn to take.
- To skip both turns, B would need to play 2 Skip cards.

### Draw from Bottom During Attack

Draw from Bottom also ends only **ONE turn** (the current one). Same behavior as
a normal draw -- it just draws from the bottom instead of top.

### Targeted Attack During Attack

Same stacking rules apply. The only difference is the target is chosen rather than
defaulting to next-in-order.

**Example:**
- A Targeted-Attacks B (2 turns).
- B Targeted-Attacks D (skipping C) on turn 1.
- D takes 1 + 2 = 3 turns.

---

## 11. Defuse and Reinsertion

### When You Draw an Exploding Kitten

1. Immediately reveal the Exploding Kitten to all players.
2. If you have a Defuse card, you may play it.
3. If you do NOT have a Defuse, you are **eliminated.** All your cards (including the
   Exploding Kitten) go to the Discard Pile. You are out of the game.
4. If you DO play Defuse:
   a. Place the Defuse card on the Discard Pile.
   b. **Secretly** reinsert the Exploding Kitten anywhere in the Draw Pile.
   c. Your turn ends immediately (even if you had remaining Attack turns).

### Reinsertion Rules

| Rule                        | Answer                                              |
|-----------------------------|-----------------------------------------------------|
| Can you look at the deck?   | **NO.** You cannot view or reorder other cards.     |
| Can you place on top?       | **YES.** Anywhere includes top.                     |
| Can you place on bottom?    | **YES.** Anywhere includes bottom.                  |
| Can you place in the middle?| **YES.** Any position.                              |
| Must it be secret?          | **YES.** Other players cannot see where you place it. |
| Can reinsertion be Noped?   | **NO.** Defuse and its reinsertion are Nope-immune. |
| Time limit?                 | No official time limit in physical game.            |

> **Physical game tip:** Some rulebooks suggest holding the deck under the table
> to ensure secrecy.

### Defuse During Multiple Turns (Attack)

If you are under Attack (multiple turns remaining) and draw an Exploding Kitten:
- You play Defuse, reinsert the EK.
- Your **current turn** ends.
- You still have remaining turns from the Attack and must continue taking them.

**Example:**
- A attacks B (2 turns).
- B draws an EK on turn 1, plays Defuse, reinserts.
- B still has 1 remaining turn.

---

## 12. Edge Cases and Special Situations

### Draw Pile Is Empty

The game is mathematically designed so this should not happen (N-1 Exploding Kittens
ensures all but one player will eventually explode). If it somehow occurs:
- The Discard Pile is **NOT** reshuffled into the Draw Pile.
- If a player must draw and cannot, the game has reached an undefined state.

> **Digital implementation:** This should be treated as a bug/impossible state. Log
> it and investigate if it ever occurs.

### Player Eliminated -- Card Disposal

When a player is eliminated (per official PDF):
- The Exploding Kitten that killed them goes **face up in front of the player** (visible to all, shows they are dead).
- The rest of their hand goes **face down in front of the player** (out of the game, NOT in the discard pile).
- Eliminated cards are **removed from play entirely** -- no player can access them.
- The eliminated player takes no further turns and plays no further cards.
- Eliminated players **cannot** play Nope (they have no cards).

> **CORRECTION:** Some web sources say eliminated cards go to the Discard Pile. The official
> Party Pack rulebook (PDF) says "put the rest of your cards face down in front of you." Phase 2's
> `deadCards` field correctly stores these out-of-game. The conservation invariant accounts for them.

### Favor on a Player with 0 Cards

- Nothing happens. The target cannot give a card they don't have.
- The Favor card is still discarded.
- The Favor player receives nothing.

### Playing Multiple Cards Before Drawing

- Yes, you can play as many cards as you want on your turn before drawing.
- There is no limit to the number of cards played per turn.
- You can play action cards, then combos, then more action cards, all before drawing.

### Simultaneous Card Plays (Physical Game)

In the physical game, disputes about who played a card "first" are resolved
informally (usually whoever's card hits the table first). This is not relevant
to digital -- the server enforces turn order and Nope windows.

### What Happens to Noped Cards?

A Noped card goes to the Discard Pile, but its effect does NOT occur. It is treated
as if it was never played (except it is now in the discard and no longer in hand).

### Can You Play Cards After Drawing?

**NO.** Drawing ends your turn. Once you draw, your turn is over. You cannot play
cards after drawing.

> Exception: If you draw an Exploding Kitten, you can (must) play Defuse. But this
> is a forced reaction, not a voluntary play.

### Last Two Players -- Sudden Death

When only 2 players remain and 1 Exploding Kitten is in the deck, the game becomes
intense one-on-one. No special rules apply -- normal gameplay continues.

### Hand Size

There is **no hand size limit.** You can hold as many cards as you accumulate.

---

## 13. Ambiguities and Design Decisions for Digital

These are areas where the official rules are vague, the physical game handles things
informally, or our digital adaptation needs explicit design choices.

### 13.1 Nope Window Timer

**Problem:** Physical game has no formal timer for Nope responses.

**Decision needed:** How long do players have to play a Nope after a card is played?

**Options:**
- Fixed timer (e.g., 5 seconds) for all Nopeable actions
- Variable timer based on card type
- "All players confirm / pass" system (explicit pass required)
- Timer with auto-pass if no Nope held

**Recommendation:** Short timer (3-5 seconds) with auto-pass if no player holds a
Nope card. If any player holds a Nope, extend the window. This prevents information
leakage (knowing someone has a Nope because the timer appeared).

### 13.2 Defuse Reinsertion UI

**Problem:** In the physical game, placement is fully secret. In digital, the server
must know the position. Other players must NOT see it.

**Decision needed:** How does the player select a position?

**Options:**
- Numeric position selector (1 = top, N = bottom)
- Visual deck representation with drag-and-drop
- "Top / Bottom / Random / Position X" selection

**Recommendation:** Visual representation showing deck thickness with position
indicator. Player taps/clicks to set position. Animation shows card being
inserted without revealing position to other players.

### 13.3 Self-Nope

**Decision:** NOT allowed. Consistent with official interpretation and digital app.

### 13.4 Nope After Favor Resolution

**Decision:** Nope window exists BEFORE the target gives a card. Once the target
has selected and given a card, the Favor has resolved and cannot be Noped.

### ~~13.5 Five Different Combo~~ REMOVED -- not in Party Pack

### ~~13.6 Exploding Kitten from Discard Pile~~ REMOVED -- relates to 5-Different which is not in Party Pack

### 13.7 Draw from Bottom During Attack

**Decision:** Ends ONE turn only (same as Skip). Player must still complete
remaining turns from Attack.

### 13.8 Targeted Attack -- Can You Target Yourself?

**Ambiguity:** Some sources mention you CAN target yourself with Targeted Attack.
This is a bizarre edge case with no strategic value.

**Recommendation:** Allow it (rules don't explicitly forbid it), but it is
equivalent to just taking your turns normally. Could be funny for trolling.

### 13.9 Combo with Action Cards

**Confirmed rule:** You CAN pair action cards for Two/Three of a Kind combos.
Example: Two Skip cards played as a pair = steal a random card (Skip's normal
effect is ignored). This is a legitimate, if expensive, play.

### 13.10 What Order Are Eliminated Player's Cards Discarded?

**Ambiguity:** Rules say "all cards go to discard" but don't specify order.

**Recommendation:** Place them on the discard pile in a defined order (e.g., the
Exploding Kitten on top, rest in random order).

> In digital, the entire discard pile is browsable, so order within it doesn't
> matter for gameplay -- just for display.

---

## Appendix A: Quick Reference Card Table

| Card                   | Qty | Nopeable | Ends Turn | Targets Player | Combo-Eligible |
|------------------------|----:|:--------:|:---------:|:--------------:|:--------------:|
| Exploding Kitten       |   9 |    No    |   N/A     |      No        |      No        |
| Defuse                 |  10 |    No    |   Yes*    |      No        |      No        |
| Nope                   |   9 |   Yes    |    No     |     Yes**      |      No***     |
| Attack (2X)            |   5 |   Yes    |   Yes     |    Next        |      Yes       |
| Targeted Attack (2X)   |   5 |   Yes    |   Yes     |    Choose      |      Yes       |
| Skip                   |  10 |   Yes    |   Yes     |      No        |      Yes       |
| Favor                  |   6 |   Yes    |    No     |    Choose      |      Yes       |
| Shuffle                |   6 |   Yes    |    No     |      No        |      Yes       |
| See the Future (3X)    |   6 |   Yes    |    No     |      No        |      Yes       |
| Alter the Future (3X)  |   6 |   Yes    |    No     |      No        |      Yes       |
| Draw from the Bottom   |   7 |   Yes    |   Yes     |      No        |      Yes       |
| Feral Cat              |   6 |   N/A    |    No     |      No        |     Yes****    |
| Taco Cat               |   7 |   N/A    |    No     |      No        |      Yes       |
| Beard Cat              |   7 |   N/A    |    No     |      No        |      Yes       |
| Rainbow-Ralphing Cat   |   7 |   N/A    |    No     |      No        |      Yes       |
| Hairy Potato Cat       |   7 |   N/A    |    No     |      No        |      Yes       |
| Cattermelon            |   7 |   N/A    |    No     |      No        |      Yes       |

\* Defuse ends your turn only in context of surviving an Exploding Kitten.
\*\* Nope targets another player's card play, not a player directly.
\*\*\* Nope should not be used in combos (it has no title-match value for combos in practice, though technically 2 Nopes could be a pair -- this would waste 2 Nopes for a random steal, which is terrible strategy but technically legal).
\*\*\*\* Feral Cat can substitute for any Cat Card in combos.

---

## Appendix B: State Machine Summary (for implementation)

```
GAME STATES:
  SETUP -> PLAYING -> GAME_OVER

TURN STATES:
  PLAY_PHASE -> DRAW_PHASE -> TURN_END
                    |
                    v
              DREW_EXPLODING_KITTEN -> DEFUSE_PROMPT -> REINSERTION -> TURN_END
                                            |
                                            v
                                       ELIMINATION -> (next player's turn)

NOPE WINDOW:
  CARD_PLAYED -> NOPE_WINDOW_OPEN -> (timer / all pass) -> RESOLVE or NOPED
                       |
                       v
                  NOPE_PLAYED -> NOPE_CHAIN_WINDOW -> RESOLVE_CHAIN

ATTACK TRACKING:
  Each player has a `remainingTurns` counter (default 1).
  Attack sets target's `remainingTurns` += 2, sets current player's to 0.
  Skip/DrawFromBottom decrements current player's `remainingTurns` by 1.
  Normal draw decrements by 1.
  When `remainingTurns` reaches 0, turn passes to next player (reset to 1).
```

---

## Appendix C: Source Citations

| Source                          | Type              | Used For                                    |
|---------------------------------|-------------------|---------------------------------------------|
| explodingkittens.com/how        | Official          | Core rules, setup, card effects             |
| Asmodee distributor rules (UK/CA)| Official (dist.) | Rulebook text verification                  |
| Exploding Kittens Wiki (Fandom) | Community (curated)| Card details, edge cases, FAQ               |
| BoardGameGeek forums            | Community         | Attack stacking, Nope chains, edge cases    |
| Board & Card Games StackExchange| Community (Q&A)   | Official rulings on Defuse, Nope, combos    |
| Reddit r/ExplodingKittens       | Community         | Edge cases, Feral Cat, house rules          |
| luckandstrategy.com             | Review site       | Detailed card count, paw print breakdown    |
| 64ouncegames.com                | Review site       | Rules summary, setup details                |
| themindcafe.com.sg              | Review site       | Card counts, paw print system               |
| ultraboardgames.com             | Review site       | Combo rules, Feral Cat details              |
| YouTube unboxing videos         | Community         | Paw print identification per card           |

---

*End of Rules Reference*
