---
title: "feat: The Millbrook City Gazette — Post-Game Newspaper Breakdown"
type: feat
status: active
date: 2026-03-24
origin: docs/v2/ideation/BRAINSTORM.md
spec: docs/v2/spec/SPEC.md (ADR-V2-04)
---

# feat: The Millbrook City Gazette — Post-Game Newspaper Breakdown

## Overview

When the game ends, the host screen transforms into a **noir newspaper front page: The Millbrook City Gazette**. It tells the story of what just happened — every vote, every policy, every betrayal — framed as breaking news with dark humor. This is the V2 crown jewel and the feature players will screenshot and share.

**Design principle:** Fun roasts, not accusations. The Gazette celebrates the chaos. Polish until water beads off it.

## Problem Statement

V1's game-over screen is functional but forgettable: winner text, win reason, role reveal grid, basic stats, Play Again button. There's no narrative payoff. Players had a dramatic social experience, then get a clinical results screen. The game ends with a whimper, not a bang.

The game state machine already tracks everything the Gazette needs — votes, policies, roles, nominations, events — but none of it is presented as a story.

## Proposed Solution

### The Gazette — Content Sections

All sections are required per spec (ADR-V2-04):

#### 1. Headline

Outcome framed as breaking news. Algorithmically generated based on game result.

```
CORRUPTION EXPOSED: Citizens Unmask Mob Boss in Dramatic Vote
MOB TIGHTENS GRIP: Sixth Corrupt Policy Seals Millbrook's Fate
THE FIX WAS IN: Mob Boss Elected Commissioner Under Citizens' Noses
JUSTICE SERVED: Citizens Execute the Mob Boss in Round 7
```

Multiple headline variants per win condition, randomly selected for variety.

#### 2. Role Reveal (Above the Fold)

Full reveal of all player roles, styled as a "ROGUES GALLERY" or dossier spread:
- Player name + role (Citizen, Mob Soldier, Mob Boss)
- Eliminated players marked with a crossed-out or "ELIMINATED" stamp
- Mob Boss highlighted dramatically (THE BOSS)

#### 3. Policy Timeline

Every named policy card enacted, in chronological order. Styled as a legislative record:

```
POLICY RECORD — MILLBROOK CITY COUNCIL

Round 1: School Lunch Program .......... ENACTED (Virtuous)
Round 2: Dockside Kickback Scheme ...... ENACTED (Corrupt)
Round 3: Casino License Fast-Track ..... ENACTED (Corrupt)
Round 4: [Auto-enacted] Evidence Locker
         "Reorganization" .............. ENACTED (Corrupt)
```

Uses named card data from ADR-V2-01 — if Named Policy Cards phase hasn't shipped yet, falls back to generic "Virtuous Policy" / "Corrupt Policy" labels.

#### 4. Voting Record

Who voted YES/NO on each government formation. Styled as a council vote log:

```
COUNCIL VOTE RECORD

Round 1: Mayor Alice → Commissioner Bob
  APPROVED (4-2)
  YES: Alice, Bob, Charlie, Dave
  NO: Eve, Frank

Round 2: Mayor Bob → Commissioner Eve
  REJECTED (2-4)
  YES: Bob, Eve
  NO: Alice, Charlie, Dave, Frank
```

#### 5. Key Moments

Algorithmically detected turning points from the game event history:

- **Mob Boss almost caught:** "Round 3: Mayor Alice nominated the Mob Boss as Commissioner. Approved 4-2. The city had no idea."
- **Decisive vote:** "Round 5: Charlie's deciding vote blocked Eve's nomination. Was it wisdom... or something darker?"
- **Policy streak:** "Three consecutive corrupt policies enacted. The mob was on a roll."
- **Execution miss:** "Round 7: The Mayor executed Dave — a Citizen. The mob lived to fight another day."
- **Execution hit:** "Round 8: The Mayor executed the Mob Boss. Millbrook City sleeps safe tonight."
- **Veto drama:** "Round 6: The Commissioner proposed a veto. The Mayor refused."

Detection logic: scan events for patterns that make good narrative moments.

#### 6. Player Superlatives

Noir-humor awards based on game data. Each player gets at least one:

```
SUPERLATIVES

Dave "The Rubber Stamp" Morrison
  Voted YES on every government, including the one that ended democracy.

Alice "The Kingmaker" Chen
  Cast the deciding vote three times. The real power behind the desk.

Eve "Ghost Vote" Park
  Voted the same way as the Mob Boss on 80% of governments.
  Coincidence? The Gazette thinks not.

Bob "Clean Hands" Johnson
  Never served as Mayor or Commissioner. Just an innocent bystander.
  That's what the mob WANTS you to think.
```

**Quality bar:** Superlatives must be genuinely funny, not just descriptive. First pass will be functional. Fifth pass will make people screenshot it.

**Superlative detection categories:**
- Voting pattern analysis (always yes, always no, always matches mob, always matches citizens)
- Government participation (most times as Mayor/Commissioner, never served)
- Policy outcomes (only enacted corrupt, only enacted virtuous)
- Decisive moments (cast the tiebreaker vote, was nominated by mob boss)
- Investigation results (investigated mob, was investigated and cleared)
- Survival (first eliminated, survived everything, eliminated as last citizen)

#### 7. Newspaper Styling

Full noir newspaper CSS:
- Aged paper background texture (parchment/sepia)
- Multi-column layout (CSS columns or grid)
- Noir typography: serif display font for headlines, newspaper body font
- Masthead: "THE MILLBROOK CITY GAZETTE" with art deco border
- Subhead: "Millbrook City's Most Trusted Source Since 1943"
- Column rules (vertical dividers between columns)
- Drop caps on first paragraph
- Ink-and-paper texture overlays

#### 8. Shareable Screenshot Mode

Render the Gazette to an image for sharing:
- Button: "Share the Gazette" or camera icon
- Renders the newspaper DOM to a canvas image via `html2canvas`
- Opens native share dialog (`navigator.share`) on mobile, or downloads as PNG
- Optimized for phone screenshot dimensions

### Architecture

#### Client-Side History Accumulator

The Gazette needs data the current game state doesn't retain. `HostState.votes` only holds the CURRENT round's votes — previous rounds' votes are lost when the game transitions.

**Solution:** A client-side `GameHistoryAccumulator` in the host app that captures ephemeral data as it flows by:

```typescript
// src/client/host/gazette/history-accumulator.ts

export interface GovernmentRecord {
  round: number;
  mayorId: string;
  nomineeId: string;  // nominated Commissioner
  passed: boolean;
  votes: Record<string, 'approve' | 'block'>;
}

export interface PolicyRecord {
  round: number;
  card: PolicyCard;       // named card (V2) or { type, cardId: 'generic' }
  autoEnacted: boolean;
  mayorId: string | null; // null if auto-enacted
  commissionerId: string | null;
}

export interface GameHistory {
  governments: GovernmentRecord[];
  policies: PolicyRecord[];
  executions: Array<{ round: number; targetId: string; wasMobBoss: boolean }>;
  investigations: Array<{ round: number; investigatorId: string; targetId: string }>;
}
```

**Capture points:**
- `subPhase === 'election-result'` → save `state.votes` + `nominatedCommissionerId` into `governments[]`
- `policy-enacted` event → save card identity + round into `policies[]`
- `player-executed` event → save into `executions[]`
- `investigation-result` event → save into `investigations[]`

The accumulator hooks into `onHostStateUpdate()` in the host app, running alongside the existing narrator bridge.

#### Gazette View Component

New screen in `src/client/host/screens/gazette.ts` (or a new directory `src/client/host/gazette/` for the multi-file component):

```
src/client/host/gazette/
  gazette.ts           — main screen component (mount/update/unmount)
  gazette-headline.ts  — headline generator
  gazette-roles.ts     — role reveal section
  gazette-timeline.ts  — policy timeline section
  gazette-votes.ts     — voting record section
  gazette-moments.ts   — key moment detection + rendering
  gazette-awards.ts    — superlative detection + rendering
  gazette-screenshot.ts — html2canvas screenshot export
  gazette.css          — newspaper styling
```

#### Game Flow Integration

V1 flow: `game-over` phase → game-over screen → "Play Again" button.

V2 flow: `game-over` phase → game-over screen (brief winner announcement, 3-4 seconds) → **auto-transition to Gazette** → Gazette with "Play Again" at the bottom.

Alternatively: game-over screen gets a "Read the Gazette" button that opens the Gazette as an overlay or replaces the game-over screen. Either way, the Gazette is the PRIMARY post-game experience, not a hidden feature.

**Recommended:** The game-over screen stays as a brief dramatic reveal (winner + reason, 3-4s). Then it fades into the Gazette. The Gazette includes the full role reveal + everything else. The "Play Again" button lives at the bottom of the Gazette.

## Technical Considerations

### No Server Changes

The spec explicitly states: "Client-side view reading completed game state — no server changes." The `GameHistoryAccumulator` runs entirely on the host client. The server doesn't need to know about the Gazette.

However, the events emitted by the server are the Gazette's data source. If events are missing critical fields (e.g., vote breakdowns in election events), we have two options:
1. **Accumulate on client** (recommended) — capture `state.votes` at the right moment
2. **Enrich server events** — add vote data to `election-passed`/`election-failed` events

Option 1 is strongly preferred — it requires zero server changes and the host client already receives the full state on every update.

### html2canvas Considerations

`html2canvas` renders DOM to canvas. Known issues:
- Custom fonts may not render (need font preloading or CSS fallback)
- CSS gradients and filters may render differently
- The Gazette must use standard CSS (no exotic features) for reliable screenshots
- Test on both Chrome and Safari/WebKit

**Alternative:** Use `dom-to-image-more` (better modern CSS support) or the native `element.toBlob()` (limited browser support).

### Responsive Layout

The Gazette is primarily viewed on the host device (tablet/laptop). But the screenshot should also look good when shared on phones. Design for:
- Primary: 1024px+ width (host screen)
- Screenshot: optimized for phone sharing (vertical, readable at phone width)

### Superlative Algorithm Quality

The superlative generator is the hardest part to get right. It needs to:
1. **Analyze game data** — voting patterns, policy outcomes, nomination history
2. **Match patterns to superlative templates** — "The Rubber Stamp" requires detecting a player who voted YES on every government
3. **Generate noir-flavored copy** — not just "Alice voted yes a lot" but "Alice 'The Rubber Stamp' Chen — voted YES on every government, including the one that ended democracy"
4. **Avoid duplicates** — each player should get a unique, relevant superlative
5. **Handle edge cases** — short games (5-6 rounds), lopsided games, games where one faction dominated

**Template-based approach:**
Define ~20-30 superlative templates with detection criteria and fill-in-the-blank copy. At game end, evaluate each player against all templates, rank by relevance/humor, assign best unique match per player.

```typescript
interface SuperlativeTemplate {
  id: string;
  name: string;      // e.g. "The Rubber Stamp"
  detect: (player: PlayerAnalysis, game: GameAnalysis) => number; // score 0-100
  render: (player: PlayerAnalysis) => string; // noir description
}
```

### Named Cards Dependency

The policy timeline is most impactful with named cards (ADR-V2-01). Without named cards, it falls back to "Virtuous Policy" / "Corrupt Policy" — functional but less engaging. The Gazette SHOULD ship after Named Policy Cards for maximum impact, but CAN ship before with graceful degradation.

### Performance

The Gazette renders once at game-over — no ongoing updates. The superlative detection and moment analysis are O(n) over game history (typically <100 events). html2canvas is the most expensive operation and only runs on user action (share button).

## Acceptance Criteria

### Content Sections
- [ ] Headline — generated based on win condition, multiple variants, noir framing
- [ ] Role reveal — all players with roles, mob boss highlighted, eliminated players marked
- [ ] Policy timeline — chronological list of all enacted policies with names (or generic labels)
- [ ] Voting record — per-government vote breakdown (who voted yes/no)
- [ ] Key moments — 3-5 algorithmically detected turning points with narrative copy
- [ ] Player superlatives — unique noir-humor award per player
- [ ] All sections populated from actual game data (no hardcoded content)

### Newspaper Styling
- [ ] Masthead: "THE MILLBROOK CITY GAZETTE" with art deco styling
- [ ] Aged paper background texture
- [ ] Multi-column layout for content sections
- [ ] Noir typography (serif headlines, newspaper body)
- [ ] Drop caps on first paragraph
- [ ] Column rules between columns
- [ ] Consistent with V1 noir aesthetic

### Screenshot / Share
- [ ] "Share the Gazette" button renders the newspaper to an image
- [ ] Screenshot renders correctly (fonts, layout, styling preserved)
- [ ] Native share dialog on mobile (`navigator.share`)
- [ ] PNG download fallback on desktop
- [ ] Screenshot readable at phone-sharing dimensions

### Data Pipeline
- [ ] `GameHistoryAccumulator` captures votes, policies, executions, investigations per round
- [ ] Accumulator hooks into host state update lifecycle
- [ ] All accumulated data available to Gazette at game-over
- [ ] Graceful handling of missing named card data (pre-ADR-V2-01 fallback)

### Game Flow
- [ ] Game-over briefly shows winner announcement (3-4s)
- [ ] Transitions to Gazette automatically (or via prominent button)
- [ ] "Play Again" button at the bottom of the Gazette
- [ ] Gazette is the primary post-game experience

### Superlative Quality
- [ ] 20+ superlative templates defined
- [ ] Each player gets a unique superlative
- [ ] Superlatives are genuinely funny (noir humor, not clinical)
- [ ] Edge cases handled: short games, lopsided games, early endings
- [ ] Multiple review passes on copy quality

### Verification Gate
- [ ] `pnpm run typecheck` — zero errors
- [ ] `pnpm run test` — all tests pass
- [ ] Manual playtest: Gazette renders correctly after different win conditions
- [ ] Manual playtest: voting records match actual game votes
- [ ] Manual playtest: key moments are relevant and narratively interesting
- [ ] Manual playtest: superlatives are funny and accurate
- [ ] Screenshot test: Gazette renders as shareable image correctly
- [ ] Screenshot shared via native share dialog (mobile)

## Dependencies & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Superlative humor quality | High | Iterative refinement. First pass functional, fifth pass funny. Budget time for copy polish. |
| html2canvas rendering fidelity | Medium | Use standard CSS, test across browsers, have a fallback renderer. |
| Voting record gap (current state loses historical votes) | Medium | Client-side accumulator captures votes at election-result phase. |
| Named cards not yet available | Low | Graceful degradation — "Virtuous Policy" / "Corrupt Policy" labels. |
| Newspaper CSS complexity | Medium | Reference real newspaper CSS templates. Start with layout, then layer texture/typography. |
| Game history accumulator misses events | Medium | Unit test accumulator against full game replays. Verify every event type captured. |

## Execution Order

1. **History accumulator** — `GameHistoryAccumulator` captures per-round data from host state updates
2. **Gazette data model** — Define `GazetteData` interface (all sections' input data)
3. **Headline generator** — Win-condition-based headline variants
4. **Role reveal section** — Styled dossier/rogues gallery
5. **Policy timeline section** — Chronological named card list
6. **Voting record section** — Per-government vote breakdown
7. **Key moment detection** — Pattern scanning + narrative copy generation
8. **Superlative system** — Template library + detection + assignment + rendering
9. **Newspaper CSS** — Masthead, columns, typography, texture, drop caps
10. **Game flow integration** — Wire Gazette into game-over transition
11. **Screenshot mode** — html2canvas integration + share/download
12. **Copy polish pass** — Refine headlines, moments, and superlatives for humor quality
13. **Visual polish pass** — Texture, spacing, responsive layout, animation
14. **Tests** — Accumulator tests, superlative detection tests, headline generation tests
15. **Verification gate** — typecheck, tests, multi-game playtest, screenshot test

## Sources & References

### Origin
- **Brainstorm:** [docs/v2/ideation/BRAINSTORM.md](../ideation/BRAINSTORM.md) — Section 4: The Millbrook City Gazette. Key decisions: Level 3 full send, fun roasts not accusations, polish until water beads off it.
- **Spec:** [docs/v2/spec/SPEC.md](../spec/SPEC.md) — ADR-V2-04 (LOCKED)

### Internal References
- Current host game-over: `src/client/host/screens/game-over.ts` (V1 — to be replaced/extended)
- Current player game-over: `src/client/views/game-over.ts` (V1 — player still sees this)
- Host state type: `src/shared/protocol.ts:HostState` (data source)
- Game events: `src/shared/types.ts:GameEvent` (event types for history accumulation)
- Narrator bridge pattern: `src/client/audio/narrator-bridge.ts` (model for state-driven hooks)
- Host router: `src/client/host/host-router.ts` (where Gazette screen integrates)

### Dependencies
- **Requires:** Commissioner Rename (ADR-V2-02) — "Commissioner" in all text
- **Enhanced by:** Named Policy Cards (ADR-V2-01) — card names in policy timeline (graceful degradation without)
- **Independent of:** Narrator Variant Pool (ADR-V2-03) — no interaction
