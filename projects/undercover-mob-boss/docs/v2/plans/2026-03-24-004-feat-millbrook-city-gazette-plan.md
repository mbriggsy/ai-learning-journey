---
title: "feat: The Millbrook City Gazette — Post-Game Newspaper Breakdown"
type: feat
status: active
date: 2026-03-24
origin: docs/v2/ideation/BRAINSTORM.md
spec: docs/v2/spec/SPEC.md (ADR-V2-04)
---

## Enhancement Summary

**Deepened on:** 2026-03-24
**Agents used:** 8 (TypeScript reviewer, architecture strategist, code simplicity reviewer, performance oracle, pattern recognition specialist, spec flow analyzer, repo research analyst, framework docs researcher) + 3 web searches
**Codebase validated:** game-over.ts, host-router.ts, host-app.ts, protocol.ts, types.ts, projection.ts, phases.ts, room.ts, narrator-bridge.ts, all CSS files

### Key Improvements Discovered
1. **SanitizedGameEvent blindspot** — Accumulator receives sanitized events. `wasMobBoss` and investigation `result` are stripped. Plan types assumed full GameEvent.
2. **Server-side vs client-side history** — Fundamental architecture decision needed. Client-side accumulator loses all data on host reconnection. ~4 small server changes would eliminate the fragility entirely.
3. **Gazette transition unspecified** — Mount gazette WITHIN game-over overlay as "second act" (button trigger). No router/overlay system changes needed.
4. **Replace html2canvas with @zumer/snapdom** — Zero-dep, 30-148x faster, better CSS support. v2.1.0 released March 2026.
5. **CSS Grid, not CSS columns** — CSS columns don't render reliably in DOM capture libraries. Grid produces identical visual with safe screenshots.
6. **sessionStorage persistence** — Accumulator must persist to sessionStorage to survive host page refresh.
7. **File structure: 5 files, no prefix** — Consolidate from 8 proposed files. Drop `gazette-` prefix (directory is namespace).

### Decisions Locked
1. **DECIDED: Server-side history enrichment.** ~4 small changes to `phases.ts` + `projection.ts`. Add `voteHistory`, project `investigationHistory` at game-over, unsanitize events at game-over. Eliminates accumulator fragility entirely. The "no server changes" constraint is revised — these are minimal, high-payoff changes.
2. **DECIDED: Button trigger for V1.** "EXTRA! EXTRA! READ ALL ABOUT IT!" — no auto-timer. Simpler, no narrator race conditions. Auto-timer can be added as polish later.
3. **DECIDED: Player phone Gazette deferred.** Host-only for V2. Server-side history makes future phone Gazette trivial to add.

---

# feat: The Millbrook City Gazette — Post-Game Newspaper Breakdown

## Overview

When the game ends, the host screen transforms into a **noir newspaper front page: The Millbrook City Gazette**. It tells the story of what just happened — every vote, every policy, every betrayal — framed as breaking news with dark humor. This is the V2 crown jewel and the feature players will screenshot and share.

**Design principle:** Fun roasts, not accusations. The Gazette celebrates the chaos. Polish until water beads off it.

## Problem Statement

V1's game-over screen is functional but forgettable: winner text, win reason, role reveal grid, basic stats, Play Again button. There's no narrative payoff. Players had a dramatic social experience, then get a clinical results screen. The game ends with a whimper, not a bang.

The game state machine already tracks everything the Gazette needs — votes, policies, roles, nominations, events — but none of it is presented as a story.

### Research Insights — Data Availability Reality Check

**Codebase audit revealed significant data gaps.** The plan assumed full game data is available at game-over. In reality:

| Data | Available at Game-Over? | Source | Gap |
|------|------------------------|--------|-----|
| Winner + reason | YES | `state.winner`, `state.winReason` | None |
| Player roles | YES | `state.players` as `RevealedPlayer[]` | None |
| Policy counts | YES | `state.goodPoliciesEnacted/badPoliciesEnacted` | None |
| Current round's votes | YES | `state.votes` | Only LAST round — all previous overwritten |
| Previous rounds' votes | **NO** | Lost — server clears at each `transitionToNomination()` | **Must accumulate or add server-side** |
| Who was mayor/commissioner per round | PARTIAL | `election-passed` events have `mayorId/chiefId` | Failed elections don't record nominee |
| Round numbers on events | **NO** | Events have no round field | **Must track client-side** |
| Investigation results | **NO** | Stripped by `projection.ts` (line 44-46) + `investigationHistory` omitted (line 85) | **Derive from revealed roles at game-over** |
| `wasMobBoss` on executions | **NO** | Stripped by `projection.ts` (line 47-48) | **Derive from revealed roles at game-over** |
| Veto details | PARTIAL | `veto-enacted`/`veto-rejected` events exist | No metadata (no round, no proposer) |
| Policy card identities | NO (pre-V2-01) | `policy-enacted` has `policy: 'good'|'bad'` only | Named cards from ADR-V2-01 |

**Critical: `SanitizedGameEvent` is NOT `GameEvent`.** The accumulator's TypeScript types must match `SanitizedGameEvent` (what the host actually receives), not `GameEvent` (what the server stores internally). Accessing stripped fields will cause compile-time type errors.

### Research Insights — Architecture Decision: Server-Side vs Client-Side History

**DECIDED: Option A — Minimal server enrichment.**
Add ~4 small changes to `phases.ts` and `projection.ts`:
1. Add `voteHistory: GovernmentRecord[]` to `GameState` — append each election result with full vote breakdown
2. Project `voteHistory` to `HostState` at game-over only (not during play — preserves information hiding)
3. Project `investigationHistory` to `HostState` at game-over only (it already exists on the server, just not projected)
4. Unsanitize `investigation-result` and `player-executed` events at game-over (all roles are revealed anyway)

**Why:** Eliminates the entire accumulator's fragility problem. Host reconnection, tab background-kill, page refresh — none of these matter because the server holds the authoritative history. Also enables investigation-based key moments and future player-phone Gazette.

**Client-side accumulator retained as supplementary** — still captures round numbers (not in events) and failed election nominees (not in events). But the heavy lifting (vote history, investigation history) moves server-side. sessionStorage persistence still recommended as belt-and-suspenders for the supplementary data.

---

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

### Research Insights — Headline Generation

**Use a `GameOutcome` discriminated union**, not `winReason` string matching. The current `winReason` strings are fragile — one says "Chief" not "Commissioner" and will break with ADR-V2-02. Derive the union at gazette mount time:

```typescript
type GameOutcome =
  | { type: 'citizens-win-policy' }
  | { type: 'citizens-win-execution'; executedPlayerId: string; round: number }
  | { type: 'mob-wins-policy' }
  | { type: 'mob-wins-election'; mobBossId: string; round: number };
```

Filter headline variants by `GameOutcome.type`. Simple array filter + random pick. No scoring needed — headlines are simpler than superlatives.

**Handle game abandonment:** The inactivity timeout produces a non-standard winReason. Either skip the Gazette entirely or use a generic headline: "THE CITY SLEEPS: Millbrook's Leaders Abandon Their Posts."

**Handle auto-enact endings:** When the election tracker triggers auto-enact as the winning policy, the winReason is standard (`'6 bad policies enacted'`). But the narrative is different. Detect `auto-enact-triggered` followed by `game-over` in events for a special variant: "GRIDLOCK UNDOES MILLBROOK: Mob Wins as Citizens Can't Agree."

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

### Research Insights — Policy Timeline Data

**`policy-enacted` events carry no round number and no who-enacted.** The accumulator must:
1. Track `state.round` alongside events as they arrive
2. Pair policy-enacted events with the preceding `election-passed` event to know who was mayor/commissioner

**Named card fallback:** Use null coalescing (codebase convention): `card?.name ?? 'Corrupt Policy'`. One ternary, not dual render paths.

**PolicyCard type doesn't exist.** Use:
```typescript
interface PolicyRecord {
  round: number;
  policyType: PolicyType;        // 'good' | 'bad' — always available
  cardId: string | null;         // named card ID from V2, null pre-V2-01
  autoEnacted: boolean;
  governmentMayorId: string | null;
  governmentCommissionerId: string | null;
}
```

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

### Research Insights — Voting Record Data Gap

**This is the most critical data gap.** `HostState.votes` holds only the CURRENT round's votes — overwritten at every `transitionToNomination()`. At game-over, only the final election's votes survive.

Furthermore, `election-failed` events don't record who was nominated. The accumulator must capture `state.nominatedChiefId` during the `election-result` subPhase before it's cleared.

If server-side history is adopted (Option A above), this gap disappears entirely — `voteHistory` holds all elections with full vote breakdowns.

#### 5. Key Moments

Algorithmically detected turning points from the game event history:

- **Mob Boss almost caught:** "Round 3: Mayor Alice nominated the Mob Boss as Commissioner. Approved 4-2. The city had no idea."
- **Decisive vote:** "Round 5: Charlie's deciding vote blocked Eve's nomination. Was it wisdom... or something darker?"
- **Policy streak:** "Three consecutive corrupt policies enacted. The mob was on a roll."
- **Execution miss:** "Round 7: The Mayor executed Dave — a Citizen. The mob lived to fight another day."
- **Execution hit:** "Round 8: The Mayor executed the Mob Boss. Millbrook City sleeps safe tonight."
- **Veto drama:** "Round 6: The Commissioner proposed a veto. The Mayor refused."

Detection logic: scan events for patterns that make good narrative moments.

### Research Insights — Key Moment Gaps

**Use a `KeyMoment` discriminated union** for type-safe detection + rendering:

```typescript
type KeyMoment =
  | { type: 'mob-boss-almost-caught'; round: number; mayorId: string }
  | { type: 'decisive-vote'; round: number; decidingPlayerId: string; margin: number }
  | { type: 'policy-streak'; startRound: number; length: number; policyType: PolicyType }
  | { type: 'execution-miss'; round: number; executedId: string }
  | { type: 'execution-hit'; round: number }
  | { type: 'veto-drama'; round: number };
```

Each variant carries the data for its narrative copy. Renderer does exhaustive switch on `type`. Separates detection from rendering — testable.

**Investigation key moments require investigation results.** "Mayor investigated the Mob Boss" needs the result. If client-side only: derive from revealed roles at game-over (`targetId` in events + revealed `role`). If server-side: project `investigationHistory` at game-over.

**Sparse data handling (short games):** If fewer than 3 moments detected, use a placeholder: "The city's story was told in just [N] rounds. Every moment mattered." Don't render an empty section.

**Veto events carry no metadata.** Accumulator must infer from subPhase transitions (`policy-veto-propose` → `veto-enacted`/`veto-rejected`) and pair with the current round.

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

### Research Insights — Superlative System Design

**Use plain data array with function properties** (codebase convention — no class Strategy pattern):

```typescript
interface Superlative {
  id: string;
  label: string;                                           // "The Rubber Stamp"
  detect: (player: PlayerAnalysis, game: GameAnalysis) => number; // relative score, higher = better fit
  format: (playerName: string, stats: PlayerAnalysis) => { nickname: string; description: string };
}

const SUPERLATIVES: Superlative[] = [ ... ];
```

**Key design points:**
- `format()` returns **data** `{ nickname, description }`, NOT DOM elements. DOM construction belongs in the rendering module. Keeps templates as pure logic — testable.
- Scoring is relative (higher = better fit), not 0-100. Only ordering matters for the assignment algorithm.
- **Pre-compute PlayerAnalysis and GameAnalysis** before running templates. Templates should compare against pre-computed stats, not re-scan game history on every evaluation.
- **Minimum data thresholds:** "Voted YES on every government" across 3 elections is trivial. Templates must require minimum data volume before scoring above 0.
- **Fallback superlative for zero-match players:** "The Silent Partner" / "The Quiet Observer" — generic catch-all for players with no notable patterns. Essential for short games.
- **Start with 15-18 templates.** Add more after playtesting reveals gaps. Don't write 30 before seeing a single Gazette render.
- **Assignment algorithm:** Greedy best-match (evaluate all templates per player, assign highest-scoring unique match). No need for Hungarian algorithm with 5-10 players.

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

### Research Insights — CSS Implementation

**Use CSS Grid, NOT CSS columns.** CSS columns have known rendering issues in DOM-to-image capture libraries (html2canvas, snapdom). CSS Grid produces the identical visual with reliable screenshot output. Column rules become `border-left` on grid children.

**Drop caps via `<span>` elements, NOT `::first-letter`.** Pseudo-elements (`::first-letter`, `::before`, `::after`) may not serialize correctly in SVG foreignObject capture. Real DOM elements are safe everywhere.

**Aged paper effect — pure CSS, no external images:**
```css
.gazette-paper {
  background-color: #f4e8d3;
  background-image:
    radial-gradient(ellipse at center, transparent 50%, rgba(44, 24, 16, 0.15) 100%),
    radial-gradient(ellipse at 20% 80%, rgba(160, 130, 90, 0.15) 0%, transparent 50%);
}
```

**Font strategy:** Project uses Cinzel (display) + Cormorant Garamond (body). The Gazette could use the existing font system for consistency, or add Playfair Display (a purpose-built newspaper display font from Google Fonts). Gate screenshot capture behind `document.fonts.ready`. Preload gazette fonts in HTML `<head>`.

**Use `background-attachment: scroll`** (not `fixed`) for paper texture — `fixed` causes scroll jank on tablets.

Sources:
- [CSS Multi-Column Layout — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_multicol_layout)
- [80 Pure CSS Magazine Layout Examples](https://freefrontend.com/css-magazine-layouts/)
- [Drop Caps — CSS-Tricks](https://css-tricks.com/snippets/css/drop-caps/)

#### 8. Shareable Screenshot Mode

Render the Gazette to an image for sharing:
- Button: "Share the Gazette" or camera icon
- Renders the newspaper DOM to a canvas image via `html2canvas`
- Opens native share dialog (`navigator.share`) on mobile, or downloads as PNG
- Optimized for phone screenshot dimensions

### Research Insights — Screenshot Technology

**Replace `html2canvas` with `@zumer/snapdom`.** html2canvas is aging and has documented issues with the exact CSS features the Gazette needs (gradients, custom fonts, complex layouts).

| Library | Approach | Speed | Dependencies | Status (2026) |
|---------|----------|-------|--------------|---------------|
| html2canvas | Canvas re-render | Slow (300-2000ms) | Few | Stagnating |
| **@zumer/snapdom** | SVG foreignObject | **30-148x faster** | **Zero** | **Active (v2.1.0 Mar 2026)** |
| html-to-image | SVG foreignObject | Fast | Minimal | Active (fallback) |

**@zumer/snapdom API:**
```typescript
import { snapdom } from '@zumer/snapdom';

const snap = await snapdom.capture(gazetteElement);
const blob = await snap.toBlob();  // PNG blob for sharing
await snap.download({ format: 'png', filename: 'millbrook-gazette' });
```

**Web Share API implementation:**
```typescript
async function shareGazette(blob: Blob): Promise<void> {
  const file = new File([blob], 'millbrook-gazette.png', { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    // iOS quirk: files ONLY — no title/text/url alongside
    await navigator.share({ files: [file] });
  } else {
    // Fallback: trigger download (Firefox has NO Web Share support)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'millbrook-gazette.png'; a.click();
    URL.revokeObjectURL(url);
  }
}
```

**Lazy-load the capture library** — only import when Share button is clicked. Don't add to main bundle.

**Gate capture behind `document.fonts.ready`** — prevents fallback-font screenshots.

**Screenshot dimensions:** Cap gazette at `max-width: 900px`. Capture at `scale: 1`. For 10-player 15-round games (5000+ px tall), consider a "compact share" mode: headline + roles + superlatives only.

**Loading indicator required** — capture takes 300-2000ms. Show spinner on button press.

Sources:
- [@zumer/snapdom — npm](https://www.npmjs.com/package/@zumer/snapdom)
- [Web Share API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
- [Can I Use — Web Share](https://caniuse.com/web-share)

---

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

### Research Insights — Accumulator Architecture

**Location:** `src/client/host/history-accumulator.ts`, NOT inside `gazette/`. The accumulator is a **host-app lifecycle subscriber** that runs during the entire game — architecturally a peer of `narrator-bridge.ts`, not a child of the gazette. The gazette directory should contain only post-game rendering/presentation code.

**Pattern:** Module-level state + exported functions (match narrator-bridge convention). NOT a class:
```typescript
// Module-level state (like narrator-bridge.ts)
let governments: GovernmentRecord[] = [];
let policies: PolicyRecord[] = [];
// ...

export function captureStateUpdate(state: HostState | LobbyState): void { ... }
export function getHistory(): GameHistory { return { governments, policies, ... }; }
export function resetHistory(): void { governments = []; policies = []; ... }
```

**Direct call from host-app.ts** (alongside narrator bridge). No pub/sub — two direct calls is fine for two subscribers.

**sessionStorage persistence (if client-side approach chosen):**
```typescript
// On every captureStateUpdate():
sessionStorage.setItem('umb-gazette-history', JSON.stringify(getHistory()));

// On init:
const saved = sessionStorage.getItem('umb-gazette-history');
if (saved) hydrateHistory(JSON.parse(saved));
```
Key by room code. Clear on lobby transition. ~13KB payload, <1ms per write. Covers page refresh but NOT background-killed tabs.

**Type corrections from codebase audit:**
- `nomineeId` → use `nominatedCommissionerId` (codebase convention)
- `card: PolicyCard` → use `policyType: PolicyType` + `cardId: string | null` (PolicyCard doesn't exist)
- `wasMobBoss` on executions → NOT available from events (stripped). Derive from `RevealedPlayer` roles at game-over.
- `investigations` → `result` NOT available from events. Derive from `RevealedPlayer` roles at game-over.
- Add `electionTracker` to GovernmentRecord for detecting "third rejection triggers auto-enact" moments
- Add veto tracking: `vetoes: Array<{ round: number; enacted: boolean }>` — inferred from subPhase transitions

**Accumulator reset:** Must explicitly clear on game-over → lobby transition. Also clear sessionStorage entry.

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

### Research Insights — File Structure

**Consolidate from 8 files to 5.** Headline, roles, timeline, and votes are each <60 lines — too small for separate modules. The existing codebase has screens as single files; the gazette/ directory is already a justified deviation (first feature-based directory in the client tree).

```
src/client/host/gazette/
  index.ts           — main component + inline headline/roles/timeline/votes rendering
  moments.ts         — key moment detection (non-trivial pattern scanning)
  awards.ts          — superlative templates + detection + assignment (~200 lines)
  screenshot.ts      — capture + share logic (separate concern, separate dependency)
  gazette.css        — newspaper styling
```

**Drop `gazette-` prefix** — directory is the namespace. Convention: `screens/game-over.ts` not `screens/screen-game-over.ts`.

**Export mount/update/unmount** to match the `OverlayModule` interface used by every other overlay. Compute gazette data once at `mount()`, cache it. Don't recompute on `update()` calls.

#### Game Flow Integration

V1 flow: `game-over` phase → game-over screen → "Play Again" button.

V2 flow: `game-over` phase → game-over screen (brief winner announcement, 3-4 seconds) → **auto-transition to Gazette** → Gazette with "Play Again" at the bottom.

Alternatively: game-over screen gets a "Read the Gazette" button that opens the Gazette as an overlay or replaces the game-over screen. Either way, the Gazette is the PRIMARY post-game experience, not a hidden feature.

**Recommended:** The game-over screen stays as a brief dramatic reveal (winner + reason, 3-4s). Then it fades into the Gazette. The Gazette includes the full role reveal + everything else. The "Play Again" button lives at the bottom of the Gazette.

### Research Insights — Gazette Transition (CRITICAL)

**Mount the gazette WITHIN the game-over overlay** as its "second act." Don't create a separate screen, phase, or overlay. This is the simplest approach and requires zero changes to:
- `host-router.ts` (stays a pure function of server state)
- Overlay system (`syncOverlays` unchanged)
- Server phase model (no new phases or subPhases)

**Implementation:** `game-over.ts` imports the gazette module. After its GSAP entrance animation completes (winner reveal, role list), a prominent button appears: **"EXTRA! EXTRA! READ ALL ABOUT IT!"** styled in newspaper aesthetic. Button click:
1. Prefetch gazette chunk: `const { mountGazette } = await import('./gazette/index')`
2. Replace game-over overlay content with gazette content
3. "Play Again" button at the bottom of gazette

**Button over auto-timer (RECOMMENDED for V1).** Auto-timer introduces:
- Timer state management and cleanup
- Race conditions with narrator audio (game-over narrator lines still playing at 3-4s)
- An intermediate display state

A button is simpler, has zero race conditions, and is trivially upgradeable to auto-timer in a polish pass. Coordinate with narrator using the existing `timing-hooks.ts` event bus if auto-timer is added later.

**Lazy loading:** Prefetch the gazette chunk when phase transitions to `game-over` (during winner reveal animation). When user clicks the button, the chunk is already loaded — zero perceived delay:
```typescript
// On game-over mount:
const gazettePromise = import('./gazette/index');
// On button click:
const { mountGazette } = await gazettePromise;
```

**Long gazette: floating "Play Again" button.** If the gazette is very long (10-player games), the button at the bottom is below the fold. Add a sticky/floating button or place it at both top and bottom.

---

## Technical Considerations

### No Server Changes

The spec explicitly states: "Client-side view reading completed game state — no server changes." The `GameHistoryAccumulator` runs entirely on the host client. The server doesn't need to know about the Gazette.

However, the events emitted by the server are the Gazette's data source. If events are missing critical fields (e.g., vote breakdowns in election events), we have two options:
1. **Accumulate on client** (recommended) — capture `state.votes` at the right moment
2. **Enrich server events** — add vote data to `election-passed`/`election-failed` events

Option 1 is strongly preferred — it requires zero server changes and the host client already receives the full state on every update.

### Research Insights — Server Changes Reconsidered

**The "no server changes" constraint should be revisited.** The data audit revealed that the client-side accumulator approach has significant limitations:

| Limitation | Impact | Fixable Client-Side? |
|-----------|--------|---------------------|
| Host reconnection loses all accumulated data | Partial (sessionStorage survives refresh, not background-kill) | Partially |
| Investigation results inaccessible | Derive from revealed roles (limited narrative) | Yes, with limitation |
| Events have no round numbers | Must track client-side | Yes |
| Failed election nominee not in events | Must capture from state before cleared | Yes |
| Veto events carry no metadata | Must infer from subPhase transitions | Yes |

**~4 small server changes would eliminate ALL these limitations:**
1. Add `voteHistory: GovernmentRecord[]` to GameState
2. Project `voteHistory` to HostState at game-over only
3. Project `investigationHistory` to HostState at game-over only
4. Unsanitize events at game-over (all roles revealed anyway)

**DECIDED:** Server-side enrichment accepted. ~4 small changes, massive payoff. The "no server changes" constraint is revised for this specific, minimal set of additions.

### html2canvas Considerations

`html2canvas` renders DOM to canvas. Known issues:
- Custom fonts may not render (need font preloading or CSS fallback)
- CSS gradients and filters may render differently
- The Gazette must use standard CSS (no exotic features) for reliable screenshots
- Test on both Chrome and Safari/WebKit

**Alternative:** Use `dom-to-image-more` (better modern CSS support) or the native `element.toBlob()` (limited browser support).

### Research Insights — Screenshot Technology (Updated)

**Replace html2canvas with @zumer/snapdom.** See Section 8 above for full comparison. html2canvas has known issues with CSS columns, pseudo-elements, and custom fonts — exactly the features the Gazette needs. Snapdom is zero-dependency, actively maintained (v2.1.0 March 2026), and 30-148x faster.

**CSS safety rules for reliable screenshots:**
- Use CSS Grid for columns (not CSS `column-count`)
- Use `<span>` for drop caps (not `::first-letter`)
- Gate capture behind `document.fonts.ready`
- Cap at `max-width: 900px`, `scale: 1`
- Use PNG for text clarity (not JPEG — compression artifacts on sharp text)

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

### Research Insights — Superlative Pre-computation

**Pre-compute `PlayerAnalysis` and `GameAnalysis` BEFORE running templates:**

```typescript
interface GameAnalysis {
  totalRounds: number;
  winner: 'citizens' | 'mob';
  outcome: GameOutcome;
  mobBossId: string;
  mobSoldierIds: string[];
  citizenIds: string[];
  totalGoodPolicies: number;
  totalBadPolicies: number;
  governments: GovernmentRecord[];
  policies: PolicyRecord[];
}

interface PlayerAnalysis {
  playerId: string;
  playerName: string;
  role: Role;
  isAlive: boolean;
  timesAsMayor: number;
  timesAsCommissioner: number;
  approveCount: number;
  blockCount: number;
  votedSameAsMobBoss: number;
  totalVotes: number;
  wasExecuted: boolean;
  executedRound: number | null;
  policiesEnactedAsGovernment: PolicyRecord[];
}
```

Templates then make simple comparisons: `player.approveCount === player.totalVotes` for "The Rubber Stamp". No re-scanning game history on every template evaluation.

### Named Cards Dependency

The policy timeline is most impactful with named cards (ADR-V2-01). Without named cards, it falls back to "Virtuous Policy" / "Corrupt Policy" — functional but less engaging. The Gazette SHOULD ship after Named Policy Cards for maximum impact, but CAN ship before with graceful degradation.

### Performance

The Gazette renders once at game-over — no ongoing updates. The superlative detection and moment analysis are O(n) over game history (typically <100 events). html2canvas is the most expensive operation and only runs on user action (share button).

### Research Insights — Performance Confirmed

**All computational costs verified as negligible:**
- Accumulator per state update: ~10-20 comparisons, <0.1ms
- Accumulated data memory: ~13KB worst case (10-player game)
- Gazette DOM rendering: ~580 nodes, 5-50ms single render
- Superlative algorithm: ~3000 comparisons, sub-millisecond
- Key moment detection: pattern scan over ~37 records, microseconds

**The only expensive operation is screenshot capture** (300-2000ms). Show loading indicator. Lazy-load the capture library.

**Code splitting saves ~55-65KB** from main bundle. Gazette + capture library loaded only at game-over.

---

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

### Research Insights — Additional Acceptance Criteria

**Data Integrity:**
- [ ] Accumulator types match `SanitizedGameEvent` (not `GameEvent`)
- [ ] `wasMobBoss` derived from `RevealedPlayer` roles at game-over (not from events)
- [ ] Investigation results derived from revealed roles (if client-side approach)
- [ ] Accumulator persisted to `sessionStorage` on every update (survives page refresh)
- [ ] Accumulator state cleared on game-over → lobby transition
- [ ] Round numbers tracked by accumulator (events don't carry them)

**Screenshot Safety:**
- [ ] CSS Grid used for multi-column layout (not CSS `column-count`)
- [ ] Drop caps implemented with `<span>` elements (not `::first-letter`)
- [ ] Screenshot capture gated behind `document.fonts.ready`
- [ ] Loading indicator shown during capture (300-2000ms)
- [ ] Capture library lazy-loaded on Share click only

**Code Quality:**
- [ ] Gazette lazy-loaded via dynamic `import()` (prefetch at game-over, mount on button click)
- [ ] `GameOutcome` discriminated union used (not `winReason` string matching)
- [ ] Superlative `format()` returns data `{ nickname, description }`, not DOM
- [ ] Fallback superlative defined for players with zero template matches
- [ ] Game abandonment (inactivity timeout) handled gracefully

**Architecture:**
- [ ] Accumulator at `src/client/host/history-accumulator.ts` (peer of narrator-bridge)
- [ ] Gazette at `src/client/host/gazette/` (5 files, no prefix)
- [ ] Gazette mounts within game-over overlay (no router/overlay system changes)
- [ ] `host-router.ts` remains a pure function of server state

---

## Dependencies & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Superlative humor quality | High | Iterative refinement. First pass functional, fifth pass funny. Budget time for copy polish. |
| html2canvas rendering fidelity | Medium | Use standard CSS, test across browsers, have a fallback renderer. |
| Voting record gap (current state loses historical votes) | Medium | Client-side accumulator captures votes at election-result phase. |
| Named cards not yet available | Low | Graceful degradation — "Virtuous Policy" / "Corrupt Policy" labels. |
| Newspaper CSS complexity | Medium | Reference real newspaper CSS templates. Start with layout, then layer texture/typography. |
| Game history accumulator misses events | Medium | Unit test accumulator against full game replays. Verify every event type captured. |

### Research Insights — Updated Risk Table

| Risk | Severity | Mitigation | Source |
|------|----------|------------|--------|
| **Host reconnection destroys accumulated history** | **Critical** | sessionStorage persistence. Or: adopt server-side history (~4 changes). | arch, spec-flow |
| **SanitizedGameEvent blindspot — types assume full data** | **Critical** | Types must match SanitizedGameEvent. Derive wasMobBoss + investigation results from revealed roles. | TS, repo-research |
| **Gazette transition mechanism unspecified** | **High** | Mount within game-over overlay via button click. No router changes. | spec-flow, arch, pattern |
| Superlative humor quality | **High** | Iterative refinement. Start with 15-18 templates. Budget copy polish passes. | — |
| **Screenshot fidelity with newspaper CSS** | **High** | @zumer/snapdom instead of html2canvas. CSS Grid not columns. Span not ::first-letter. | perf, framework-docs |
| **winReason string fragility** | **Medium** | Use GameOutcome discriminated union, not string matching. | spec-flow, TS |
| **Font loading race condition in screenshots** | **Medium** | Gate capture behind `document.fonts.ready`. Preload fonts in HTML head. | perf |
| Voting record gap | **Medium** | Client-side accumulator + sessionStorage. Or: server-side voteHistory. | repo-research |
| **Sparse data — short games** | **Medium** | Minimum data thresholds for superlatives. Fallback moment text. Fallback superlative template. | spec-flow |
| **Long game screenshot (5000+ px)** | **Medium** | Cap at max-width: 900px, scale: 1. Consider compact share mode. | spec-flow, perf |
| **Game abandonment not handled** | **Low** | Skip gazette or use generic "The City Sleeps" headline. | spec-flow |
| Named cards not yet available | **Low** | Null coalescing fallback: `card?.name ?? 'Corrupt Policy'`. | — |
| Main bundle bloat | **Low** | Lazy-load gazette + capture library via dynamic import(). Saves ~55-65KB. | arch, perf |

---

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

### Research Insights — Updated Execution Order

**Pre-implementation steps (add before step 1):**
- **Step 0a:** Decide server-side vs client-side history (BLOCKING)
- **Step 0b:** If server-side: implement ~4 changes to phases.ts + projection.ts
- **Step 0c:** Add @zumer/snapdom (and optionally html-to-image fallback) to package.json

**Step modifications:**
- **Step 1:** Accumulator at `src/client/host/history-accumulator.ts` (module pattern, not class). Add sessionStorage persistence. Add to host-app.ts alongside narrator bridge.
- **Step 2:** Define `GameOutcome` discriminated union + `GameAnalysis` + `PlayerAnalysis` + `KeyMoment` union. Replace `PolicyCard` with `PolicyType + cardId`.
- **Step 8:** Start with 15-18 superlative templates. Add fallback template. `format()` returns data, not DOM.
- **Step 9:** CSS Grid for columns (not CSS columns). `<span>` for drop caps. Pure CSS paper effect.
- **Step 10:** Mount gazette WITHIN game-over overlay. Button trigger ("EXTRA! EXTRA!"). Prefetch gazette chunk at game-over, mount on click.
- **Step 11:** @zumer/snapdom (not html2canvas). Lazy-load on Share click. Gate behind `document.fonts.ready`. Loading indicator.

**Additional steps:**
- **Step 15a:** Test screenshot rendering (fonts, layout, Grid columns, drop caps)
- **Step 15b:** Test short game (5 rounds) — sparse data handling
- **Step 15c:** Test long game (10 players, 15 rounds) — screenshot dimensions
- **Step 15d:** Test host reconnection — sessionStorage hydration

---

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
- Projection layer: `src/server/projection.ts` (sanitization boundary — what host CANNOT see)
- Game phases: `src/server/game/phases.ts` (vote lifecycle, event emission)

### Dependencies
- **Requires:** Commissioner Rename (ADR-V2-02) — "Commissioner" in all text
- **Enhanced by:** Named Policy Cards (ADR-V2-01) — card names in policy timeline (graceful degradation without)
- **Independent of:** Narrator Variant Pool (ADR-V2-03) — no interaction

### Research References (from deepening)
- [@zumer/snapdom — npm](https://www.npmjs.com/package/@zumer/snapdom)
- [html-to-image — GitHub](https://github.com/bubkoo/html-to-image)
- [Capturing DOM as Image — Monday Engineering](https://engineering.monday.com/capturing-dom-as-image-is-harder-than-you-think-how-we-solved-it-at-monday-com/)
- [Web Share API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
- [Can I Use — Web Share](https://caniuse.com/web-share)
- [CSS Multi-Column Layout — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_multicol_layout)
- [80 Pure CSS Magazine Layout Examples](https://freefrontend.com/css-magazine-layouts/)
- [Drop Caps — CSS-Tricks](https://css-tricks.com/snippets/css/drop-caps/)
- [Vite Dynamic Imports](https://vite.dev/guide/features)
