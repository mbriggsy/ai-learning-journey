# Undercover Mob Boss v2 — Brainstorm
*Started: March 23, 2026 (Harry) | Expanded: March 23-24, 2026 (Claude + Briggsy)*

**STATUS: DEBATE COMPLETE — Decisions locked in [SPEC.md](../spec/SPEC.md)**

---

## V2 Thesis

V1 is a faithful, polished Secret Hitler adaptation. V2 doesn't change the rules — it gives Millbrook City a soul. Every card, every sound, every moment after the game ends should make players feel like they're IN the city, not just playing a card game about it.

**One sentence:** Same game, richer world, more replayable, better atmosphere.

---

## 1. Thematic Identity — Named Policy Cards

### The Idea
Replace abstract "Good/Bad" policies with named civic actions. Players aren't enacting colored cards — they're passing the School Lunch Program or fast-tracking a Casino License.

| v1 | v2 |
| --- | --- |
| Good Policy | Virtuous Policy |
| Bad Policy | Corrupt Policy |
| Color-coded cards | Named + illustrated cards |

### Why This Works
- **Emotional reaction.** Named cards create groans, laughs, accusations — the named card IS the moment.
- **Memorable stories.** Players remember "the Casino License game" not "the game with 4 bad policies."
- **Replayability.** Draw 17 from a pool of 20+ unique cards. Different cards each game = different stories.
- **Zero mechanical change.** All Virtuous cards are mechanically identical. All Corrupt cards are mechanically identical. The name is pure flavor. No game engine changes needed — only card rendering and the narrative layer.

### Card Pool (Harry's starting list — needs rework for noir-fictional tone)

**Virtuous (Citizens win these):**
New Public Library, Broadband Expansion, School Lunch Program, Pothole Repair Initiative, Community Health Clinic, Affordable Housing Fund, Youth Recreation Center, Teacher Pay Raise, Clean Water Initiative, Public Transit Expansion, After-School Programs, Street Light Upgrade, Park Renovation, Senior Center Funding, Recycling Program

**Corrupt (Mob wins these) — TO BE REWRITTEN:**
Harry's original list had real-world political names (Voter ID Suppression, Citizens United, etc.). Decision: rewrite as noir-fictional corruption. Think "Dockside Kickback Scheme," "Judge Malone's Early Retirement," "Cement Contract for the Mayor's Brother-in-Law."

### Debate Outcomes

| Question | Decision |
| --- | --- |
| Card tone | **Noir-fictional only.** No real-world political hot buttons. Millbrook City corruption, not Washington politics. |
| Card pool | **Randomized draw from 20+.** Cosmetic only — deck math unchanged (6V + 11C). Different names/art each game for freshness. |
| Flavor text | **Gazette only.** No flavor text during gameplay (speed matters). Flavor text appears in the post-game Gazette. |

---

## 2. Commissioner Rename

### The Change
Police Chief → **Commissioner**

### Why
- More authority weight — Commissioner outranks Chief
- More politically corruptible — sounds like someone who makes deals in back rooms
- Better parallel to Chancellor in the source game
- Fits the Millbrook City power structure: Mayor proposes, Commissioner executes

### Impact
Touches UI text, narrator audio lines, tests, and the spec. Batched with narrator variant pool work — all audio gets regenerated anyway, so the rename is free.

---

## 3. Audio Atmosphere

### 3a. Narrator Variant Pool — LOCKED

**Currently:** 39 game narrator lines, one per trigger. Same every game.
**V2:** 8-10 variants per trigger, randomly selected. Built incrementally within Gemini API daily limits (~100/day).

Examples:
- Trigger: `vote-result-approved`
  - v1: *"The council has spoken."*
  - v2 pool: *"The council has spoken." / "The ayes have it... for better or worse." / "Approved. God help this city." / "The vote is in. Someone at this table is smiling."* / ... (8-10 total)

### 3b. Ambient Music Layer — DEFERRED

Deferred until all other V2 features ship. Revisit then. The bar is "amazeballs or nothing." If we can't clear that bar, we ship without it.

### 3c. Sound Effects — POLISH

SFX pass (card flips, vote stingers, policy enact flourishes) + haptic patterns. Ships with core or fast-follow.

---

## 4. The Millbrook City Gazette — Post-Game Breakdown

### The Idea
When the game ends, the host screen transforms into a noir newspaper front page: **The Millbrook City Gazette**. It tells the story of what just happened.

### Decision: Level 3 — Full Send

**Content:**
- Full role reveal (who was Mob, who was Citizen, who was the Boss)
- Policy timeline — every named card enacted, in order
- Voting record — who voted YES/NO on each government
- Key moment highlights: "Turn 5: Mayor Briggs nominated the Mob Boss as Commissioner. Approved 4-3."
- Player superlatives with noir humor: "Dave 'The Rubber Stamp' Morrison — voted YES on every government, including the one that ended democracy"
- Newspaper CSS styling — aged paper, columns, noir typography
- Shareable screenshot mode
- The final outcome framed as a headline: *"CORRUPTION EXPOSED: Citizens Unmask Mob Boss in Dramatic Vote"*

### Design Principles
- **Fun, not accusations.** The Gazette roasts players, it doesn't attack them. Noir humor, not a report card.
- **Polish until water beads off it.** This is the V2 crown jewel. NASA standard applies.
- **Iterate on the humor.** First pass will be fine. Fifth pass will make people screenshot it and text the group chat.

### Technical Feasibility
Game state machine already tracks everything. Client-side view, no server changes. New "post-game" phase.

---

## 5. UI & Feel Polish

### Veto Drama
Screen shake/pulse, dramatic narrator line, slow-motion card flip.

### Dead Player Experience
Ghost/spectator view, mob boss identity reveal, "haunt" reaction system.

### Mobile Haptics
Varied vibration patterns per event type.

---

## 6. Art & Voice Assets

### Decision
- **Keep all V1 assets** — never delete, always preserve (backups/originals may be needed)
- **Full license to add and change** — new policy card art, new narrator lines, refreshed visuals where V2 demands it
- **Art budget goes to 30+ policy card illustrations** (Imagen 4, same pipeline as V1)

---

## 7. Technical Considerations

### Deployment
Same Vercel deploy, V2 replaces V1. V1 archived in git.

### Asset Pipeline
- **Card art:** 30+ unique illustrations via Imagen 4. Batch generation script.
- **Narrator audio:** Regenerate all lines (Commissioner rename) + 8-10 variants per trigger. ~320-400 audio files total. Gemini TTS, built incrementally.
- **Ambient music:** Deferred.

### Code Impact
- Named cards: card rendering + asset loading. Game engine untouched.
- Commissioner: string rename across UI, narrator prompts, tests, spec.
- Narrator variants: pool selection logic in `narrator-bridge.ts`, audio file naming convention.
- Gazette: new client-side phase + view. State machine already has the data.

---

## 8. Debate Results (Summary)

| # | Question | Decision |
|---|----------|----------|
| 1 | Card tone | Noir-fictional only |
| 2 | Card pool | Randomized draw from 20+, cosmetic only |
| 3 | Flavor text | Gazette only, polish to perfection, fun roasts |
| 4 | Ambient music | Deferred — amazeballs or nothing |
| 5 | Gazette depth | Level 3 full send |
| 6 | Art/voice | Keep V1 assets, full license to add/change, never delete |
| 6.1 | Narrator variants | 8-10 per trigger, build incrementally |
| 7 | Process | Full Compound Engineering |

---

*Debate complete. Locked decisions live in [SPEC.md](../spec/SPEC.md).*
