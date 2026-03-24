# Undercover Mob Boss v2 — Specification
*Locked: March 24, 2026*

---

## Overview

V2 is a presentation and atmosphere upgrade. Game rules are unchanged — same Secret Hitler mechanics, same deck math, same player counts, same win conditions. V2 gives Millbrook City a richer identity through named policy cards, expanded narrator audio, a post-game experience, and a role rename.

**Guiding principle:** Same game, richer world, more replayable, better atmosphere.

---

## ADR-V2-01: Named Policy Cards

### Decision
Replace abstract "Good Policy" / "Bad Policy" with named, illustrated **Virtuous** and **Corrupt** policy cards drawn from a randomized pool each game.

### Rules
- Deck math is unchanged: 6 Virtuous + 11 Corrupt = 17 cards per game
- All Virtuous cards are mechanically identical (count toward Citizen win)
- All Corrupt cards are mechanically identical (count toward Mob win)
- Each game: randomly select 6 from the Virtuous pool and 11 from the Corrupt pool
- Card names and art are cosmetic — no gameplay impact
- Card pool: minimum 15 Virtuous + 15 Corrupt unique cards (target 20+ each)

### Card Naming Convention
- **Noir-fictional only.** No real-world political references. All card names reference Millbrook City, its fictional characters, and its noir underworld.
- Virtuous examples: civic improvements recognizable as "good for the city"
- Corrupt examples: mob-flavored corruption — kickbacks, rigged contracts, bought judges
- Corrupt cards lean into dark humor, not partisan politics

### Visual Direction
- Each card gets a unique illustration (Imagen 4, noir aesthetic)
- Virtuous: clean civic imagery — books, roads, clinics, parks
- Corrupt: dark noir imagery — briefcases, back-room deals, stacks of cash, shadowy figures
- Cards must be readable at a glance — name and art, no flavor text during gameplay
- Flavor text appears only in the post-game Gazette

### Asset Requirements
- 30+ unique card illustrations (15+ Virtuous, 15+ Corrupt)
- Consistent art style across all cards
- Same noir aesthetic as V1 role art

---

## ADR-V2-02: Commissioner Rename

### Decision
Rename **Police Chief** to **Commissioner** across the entire application.

### Scope
- All UI text (player views, host views, how-to-play)
- All narrator audio lines referencing the role
- All test assertions
- Spec documentation
- The rename is batched with narrator variant pool work (ADR-V2-03) — all audio is regenerated anyway

### Rationale
Commissioner carries more political weight, implies corruptibility, and better parallels the Chancellor role in the source game. Fits the Millbrook City power structure: Mayor proposes, Commissioner executes.

---

## ADR-V2-03: Narrator Variant Pool

### Decision
Expand narrator audio from 1 line per trigger to **8-10 variants per trigger**, randomly selected each game.

### Rules
- Every narrator trigger gets a pool of 8-10 unique lines
- Each game randomly selects one line per trigger from its pool
- V1 lines are preserved in the pool (never deleted)
- New lines maintain the Charon voice + noir style established in V1
- All lines regenerated with Commissioner rename (ADR-V2-02)

### Build Strategy
- Gemini 2.5 Flash TTS, same pipeline as V1
- Built incrementally — ~100 API calls/day limit
- Target: ~320-400 total audio files (39 triggers x 8-10 variants)
- Prompts versioned in `scripts/` per V1 convention

### Code Impact
- Pool selection logic in `narrator-bridge.ts`
- Audio file naming convention: `{trigger-id}-{variant-number}.wav`
- Narrator prompts expanded in `narrator-prompts.ts`

---

## ADR-V2-04: The Millbrook City Gazette

### Decision
Add a **Level 3 post-game breakdown** styled as a noir newspaper front page.

### Content (all required)
1. **Headline** — outcome framed as breaking news. E.g., *"CORRUPTION EXPOSED: Citizens Unmask Mob Boss in Dramatic Vote"*
2. **Role reveal** — full reveal of all player roles (Mob Boss, Mob Members, Citizens)
3. **Policy timeline** — every named card enacted, in order
4. **Voting record** — who voted YES/NO on each government formation
5. **Key moments** — algorithmically detected turning points. E.g., "Turn 5: Mayor Briggs nominated the Mob Boss as Commissioner. Approved 4-3."
6. **Player superlatives** — noir-humor awards based on game data. E.g., "Dave 'The Rubber Stamp' Morrison — voted YES on every government, including the one that ended democracy"
7. **Newspaper styling** — aged paper texture, columns, noir typography, masthead
8. **Shareable screenshot mode** — render the Gazette to an image for sharing

### Design Principles
- **Fun roasts, not accusations.** The Gazette celebrates the chaos. Noir humor, never mean-spirited.
- **NASA standard.** Polish until water beads off it. This is the V2 crown jewel and the feature players will screenshot and share.
- **Iterate on humor.** The superlative copy gets refined until it's genuinely funny, not just functional.

### Technical Approach
- Client-side view reading completed game state — no server changes
- New "post-game" phase added to the client state machine
- Game state machine already tracks all required data (votes, policies, roles, nominations)
- Screenshot export via html2canvas or equivalent

---

## ADR-V2-05: Asset Preservation Policy

### Decision
All V1 assets (art, audio, originals, backups) are **permanently preserved**. V2 has full license to add new assets and modify existing ones, but nothing is ever deleted.

### Rationale
Assets may be needed for future versions, A/B comparisons, or rollback. Storage is cheap. Regret is expensive.

---

## Deferred to Post-V2

| Feature | Reason |
| --- | --- |
| Ambient music layer | Revisit after all V2 features ship. "Amazeballs or nothing" quality bar. |
| SFX pass + haptics | Polish tier — ships with core or fast-follow |
| Veto drama UI | Polish tier |
| Dead player / spectator mode | Lower impact, higher effort |
| Game configuration (house rules) | High effort, low urgency |

---

## Deployment

- Same Vercel deploy — V2 replaces V1 at `undercover-mob-boss.vercel.app`
- V1 preserved in git history
- PartyKit server updated in place

---

## Process

Full Compound Engineering workflow:
1. `/ce:brainstorm` — Complete (this spec is the output)
2. `/ce:plan` — Create per-phase implementation plans
3. `/deepen-plan` — Enhance plans with parallel research
4. `/ce:work` — Execute phases serially
5. `/ce:review` — Code review per phase
6. `/ce:compound` — Document learnings

Phases are planned and executed serially — no batch planning.

---

## Non-Goals

- No rule changes. Secret Hitler mechanics are untouched.
- No new player counts or role configurations.
- No real-time AI features (that's V3).
- No multiplayer infrastructure changes (PartyKit stays as-is).
- No mobile app. Still a PWA.

---

*This spec is LOCKED. Changes require explicit debate and approval.*
