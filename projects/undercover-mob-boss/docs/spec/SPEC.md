# Undercover Mob Boss — Product Specification
*Version 1.0 — March 15, 2026*
*Status: LOCKED for MO build*

---

## Executive Summary

**Undercover Mob Boss (UMB)** is a digital-physical social deduction game for 5–10 players in the same room. Players use their phones as private information devices while a shared screen (tablet, TV, or laptop) displays public game state. The game is a fully original adaptation of the CC BY-NC-SA 4.0 licensed Secret Hitler, reskinned as a 1940s/50s noir city infiltration story.

**The core innovation:** phones eliminate the "close your eyes" trust system. Role reveals, voting, and private information are all handled digitally. The social deduction and lying-to-your-face remains purely physical.

**Platform:** Browser-based PWA. No app install. Join via QR code or room code.

---

## Goals

1. Playable by non-technical users in under 2 minutes of setup
2. Full game loop functional with 5–10 players
3. Indistinguishable from a polished commercial party game in terms of experience
4. Narrator voice drives the atmosphere — every key moment has audio
5. Works on any modern mobile browser (iOS Safari, Android Chrome)
6. Zero server infrastructure cost at launch (ephemeral game state only)

---

## Out of Scope (v1)

- User accounts or persistent history
- Online play (remote players) — same room only
- AI players
- Custom role creation
- Monetization
- Native app (iOS/Android)
- Accessibility features beyond defaults

---

## Architecture

### Overview

```
Host device (browser)
  └── Game Server (PartyKit room)
        ├── Player 1 phone (browser)
        ├── Player 2 phone (browser)
        ├── ...
        └── Player N phone (browser)
```

### Views

| View | Device | Description |
| --- | --- | --- |
| **Host/Table View** | Tablet or laptop, visible to room | Policy tracks, election tracker, round status, vote results, game log |
| **Player View** | Each player's phone | Private role, private vote, private policy cards (during session), notifications |
| **Board View** | Any player's phone (optional) | Read-only mirror of the table view — for games without a shared screen |

> **Board View note:** Any player can switch to Board View on their phone at any time. It's always read-only — no actions are taken from it. Useful when no tablet/TV is available, or as a personal reference during play.

### Tech Stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| Frontend | TypeScript + Vite | Fast build, strong types, proven stack |
| UI | Vanilla CSS + minimal DOM | No framework overhead; mobile-first |
| Real-time | PartyKit | Purpose-built for multi-device party games; Cloudflare edge; ephemeral rooms |
| Audio/Voice | Gemini 2.5 Flash TTS (pre-generated) | Narrator voice lines generated ahead of time via Gemini TTS, served as WAV files |
| Music/SFX | Web Audio API | Layered ambient noir jazz, tension stings, no external dep |
| Assets | Gemini Imagen 4 API | AI-generated card art, backgrounds, UI elements |
| PWA | Vite PWA plugin | Installable, works offline for static assets |
| Hosting | Vercel | Auto-deploy on push, static assets, COOP/COEP headers |
| Testing | Vitest | Unit + integration tests |

---

## Architectural Decision Records (ADRs)

### ADR-01: PartyKit over custom WebSocket server
**Decision:** Use PartyKit for all real-time multiplayer state.
**Rationale:** Built specifically for multi-device party games. Cloudflare edge = low latency. Ephemeral rooms — no database needed. Game state lives in memory per room. `@levelsio` endorsement in production use. No infrastructure to manage.
**Alternatives rejected:** Socket.io (heavier, requires server), Supabase Realtime (overkill for ephemeral state).

### ADR-02: Pre-generated narrator audio over runtime TTS
**Decision:** Generate all narrator lines ahead of time with Gemini 2.5 Flash TTS, serve as static WAV files.
**Rationale:** Eliminates API calls during gameplay. No latency on audio cues. Predictable cost (free tier eligible). Consistent voice quality. Natural language style prompting controls noir delivery.
**Alternatives rejected:** ElevenLabs (requires paid plan for API voice access), runtime TTS calls (latency, cost per play), Web Speech API (no voice control, sounds robotic).

### ADR-03: No user accounts
**Decision:** Zero authentication. Room code only.
**Rationale:** Party game. Nobody wants to log in. State is ephemeral — game ends, room disappears. No GDPR surface area.

### ADR-04: Host device is authoritative
**Decision:** Host browser is the game master. All state changes validated server-side in PartyKit room.
**Rationale:** Prevents cheating/spoofing from player phones. Host rejoins their room if they refresh. PartyKit room persists independently of any single client.

### ADR-05: AI-generated assets
**Decision:** All visual assets generated via Gemini Imagen 4 API.
**Rationale:** Proven pipeline from racer-04. Consistent noir aesthetic from text prompts. Versioned prompts in codebase. No human art tools required.
**Constraint:** Requires billing-enabled Gemini API key. ~$0.06/image.

### ADR-06: Mobile-first layout
**Decision:** Player view designed for portrait phone. Host/table view designed for landscape tablet/laptop.
**Rationale:** Players hold phones in hand during play. Host screen is passive display.

### ADR-07: Haptic feedback on role reveal
**Decision:** Use `navigator.vibrate()` on private role reveal moment.
**Rationale:** Physical feedback reinforces the drama of the reveal. Free, no dependency. Supported on Android; graceful degradation on iOS.

---

## Board Layout by Player Count

The policy board changes shape based on player count — specifically which executive powers appear and when. This must be reflected in both the host view and the Board View.

| Bad Policies | 5–6 Players | 7–8 Players | 9–10 Players |
| --- | --- | --- | --- |
| 1 | — | — | Investigate |
| 2 | — | Investigate | Investigate |
| 3 | Policy Peek | Special Nomination | Special Nomination |
| 4 | Execution | Execution | Execution |
| 5 | Execution | Execution | Execution |
| 6 | Mob wins | Mob wins | Mob wins |

The board UI dynamically renders the correct power tiles based on `players.length` at game start. Power tiles are greyed out until unlocked.

---

## Game State Model

```typescript
type Role = 'citizen' | 'mob-soldier' | 'mob-boss';
type PolicyType = 'good' | 'bad';
type ExecutivePower = 'investigate' | 'special-nomination' | 'policy-peek' | 'execution';
type Phase = 'lobby' | 'role-reveal' | 'nomination' | 'election' | 'policy-session' | 'executive-power' | 'game-over';

interface GameState {
  phase: Phase;
  subPhase: SubPhase | null;
  round: number;
  players: Player[];
  mayorIndex: number;                        // index of current mayor (rotates clockwise)
  nominatedChiefId: string | null;
  electionTracker: number;                   // 0-3; at 3 auto-enact
  goodPoliciesEnacted: number;               // win at 5
  badPoliciesEnacted: number;                // win at 6; powers unlock at 3/4/5
  policyDeck: PolicyType[];                  // 6 good + 11 bad, shuffled (server-only)
  policyDiscard: PolicyType[];               // server-only
  votes: Record<string, 'approve' | 'block'>;
  mayorCards: PolicyType[] | null;           // 3 cards during mayor-discard (private)
  chiefCards: PolicyType[] | null;           // 2 cards during chief-discard (private)
  executivePower: ExecutivePower | null;
  winner: 'citizens' | 'mob' | null;
  winReason: string | null;
  reshuffleThreshold: number;                // random 3-7, intentional deviation from SH's fixed 3
  vetoProposed: boolean;
  events: GameEvent[];
  acknowledgedPlayerIds: string[];           // role-reveal acknowledgements
  investigationHistory: InvestigationRecord[]; // no repeat investigations
  peekCards: PolicyType[] | null;            // top 3 cards shown during policy-peek (server-only)
  specialNominatedMayorId: string | null;    // override for next mayor rotation
  resumeMayorIndex: number | null;           // after special election, rotation resumes from here + 1
  rngSeed: number;                           // reproducible games (server-only)
}

interface Player {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
  isMayor: boolean;
  isChief: boolean;
  wasLastMayor: boolean;   // term limit: set ONLY on successful election, not on rotation
  wasLastChief: boolean;   // term limit: set ONLY on successful election, not on rotation
  knownAllies: string[];   // player ids visible at role reveal (mob knowledge)
  // 5-6 players: mob soldiers know each other + mob boss; mob boss ALSO knows all soldiers
  // 7-10 players: mob soldiers know each other + mob boss; mob boss does NOT know soldiers
}
```

---

## Screens & Views

### Player View Screens (phone)

| Screen | Triggered By | Content |
| --- | --- | --- |
| **Lobby** | On join | Room code, player list, "Ready" toggle |
| **Role Reveal** | Game start | Animated card flip — role + allies (if known), haptic. Mob Boss at 7–10 players sees NO ally names — only "Your soldiers are out there. Find them." |
| **Waiting** | Between phases | Current phase status, what's happening |
| **Vote** | Election phase | Approve / Block buttons; escalating nudge if idle |
| **Mayor Hand** | Policy session (mayor only) | 3 cards — select 1 to discard |
| **Chief Hand** | Policy session (chief only) | 2 cards — select 1 to discard |
| **Power Activated — Policy Peek** | Mayor (after policy-peek power unlocks) | "You may secretly view the top 3 cards of the policy deck." |
| **Power Activated — Investigator** | Mayor (after investigate power unlocks) | "You have the power to investigate. Choose a player to learn their allegiance." |
| **Investigation Result — Investigator** | After target chosen | "You investigated [Name]. They are [Mob / Citizen]." Private — only you see this. |
| **Investigation Result — Target** | After being investigated | "The Mayor has investigated you. Your allegiance has been revealed to them." |
| **Power Activated — Special Nomination** | Mayor (after power unlocks) | "You have the power to choose the next Mayor. Choose wisely." |
| **Power Activated — Execution** | Mayor (after power unlocks) | "You have the power of elimination. Choose a player to remove from the game." |
| **Eliminated** | Target of execution | Full screen — skull & crossbones — *"You have been eliminated. Millbrook City has spoken."* Haptic. |
| **Eliminated — Spectator** | Ongoing after elimination | Read-only board view with spectator label — can still watch, can't act |
| **Board View** | Tap to toggle anytime | Read-only mirror of host/table view; player count-aware board layout |

### Host/Table View Screens (shared screen)

| Screen | Content |
| --- | --- |
| **Lobby** | QR code, room code, player list, start button |
| **Game Board** | Policy tracks, election tracker, player list with alive/dead, round number |
| **Nomination** | Current mayor, who they nominated, "Waiting on [name]" |
| **Election Results** | Reveal animation — each vote flipping, final tally |
| **Policy Enacted** | Card reveal animation — Good or Bad policy |
| **Executive Power** | Which power, who is using it, dramatic overlay |
| **Game Over** | Win condition, role reveal for all players, stats |

---

## Nudge System

No auto-actions. Players are physically present — if distracted, the active player's phone escalates nudges. The host screen shows who is being waited on.

### Player Nudge Escalation (client-side)

| Level | Delay | Effect |
| --- | --- | --- |
| 0 (silent) | 0–30s | No nudge |
| 1 (gentle) | 30s | Soft vibration (200ms) + 440Hz tone |
| 2 (firm) | 60s | Medium vibration (400,100,400ms) + 660Hz tone |
| 3 (urgent) | 90s+ | Strong vibration (800,200,800ms) + 880Hz tone, repeats every 15s |

- Driven by `isMyTurn` transitions — no server timer involved
- iOS (no vibration API): CSS shake fallback
- Tones play through `sfx` audio channel via Web Audio OscillatorNode

### Host "Waiting On" Display

- Game board status line appends "— Waiting on [name(s)]"
- Player strip highlights waiting players with pulsing gold outline

### Inactivity Timeout

- 15-minute game-level inactivity timeout (no actions from any player)
- Triggers game-over with abandonment message
- Uses PartyKit alarm (single alarm, no per-phase timers)

---

## Narrator Script

All lines pre-generated via Gemini 2.5 Flash TTS (Charon voice + noir style prompting). Voice: noir detective — gravelly, deliberate, theatrical.

### Required Lines

| ID | Trigger | Script |
| --- | --- | --- |
| `intro` | Game start | *"Citizens of Millbrook City... your fate has been sealed. Check your phone. Know your allegiance. And whatever you do... don't let it show."* |
| `round-start-{1..15}` | Each round | *"Round {N}. The city holds its breath."* (15 pre-generated variants with escalating tension) |
| `nomination` | Mayor nominates | *"The Mayor has nominated the Police Chief. The city watches. The mob waits."* |
| `vote-open` | Voting begins | *"Cast your vote. Approve... or block. No one will know. Until everyone knows."* |
| `vote-reveal` | Votes revealed | *"The votes are in. Democracy... has spoken. Or has it?"* |
| `approved` | Nomination passes | *"The nomination passes. The city has chosen."* |
| `blocked` | Nomination fails | *"Blocked. The people have spoken. For now."* |
| `tracker-advance` | Election tracker moves | *"Three failed nominations. The city cannot afford indecision."* |
| `auto-enact` | Tracker hits 3 | *"The deadlock ends. A policy is enacted without a vote."* |
| `good-policy` | Good policy enacted | *"A good policy for Millbrook City. The citizens breathe a little easier."* |
| `bad-policy` | Bad policy enacted | *"Another bad policy. The mob smiles."* |
| `policy-peek` | Policy peek power | *"The Mayor takes a look behind the curtain. What they see... is their business."* |
| `investigate` | Investigate power | *"The Mayor has demanded an investigation. Someone's cover is about to get a little thinner."* |
| `special-nomination` | Special nomination power | *"The Mayor will choose the next Mayor. Democracy takes a back seat."* |
| `execution` | Execution power | *"One player will be eliminated. Choose carefully. The mob is counting on your mistakes."* |
| `executed` | Player eliminated | *"A player has been eliminated. Whether they were friend or foe... you'll find out soon enough."* |
| `mob-boss-executed` | Mob Boss eliminated | *"The Mob Boss is dead. Millbrook City is saved."* *(triggers citizens-win-execution)* |
| `citizens-win-policy` | 5 good policies | *"Five good policies enacted. Millbrook City is saved. The mob has lost."* |
| `citizens-win-execution` | Mob Boss executed | *"The Mob Boss has been found and eliminated. The city is free."* |
| `mob-wins-policy` | 6 bad policies | *"Six bad policies enacted. Millbrook City belongs to the mob. Game over."* |
| `mob-wins-election` | Mob Boss elected chief | *"The Mob Boss has taken office. The city never saw it coming. Game over."* |
| `deck-reshuffle` | Policy deck reshuffled | *"The policy deck has been reshuffled. The city's memory... is short."* |
| `veto-proposed` | Police Chief proposes veto | *"The Police Chief has proposed a veto. The Mayor must decide."* |
| `veto-approved` | Mayor agrees to veto | *"The veto stands. Both policies are discarded. The clock ticks."* |
| `veto-rejected` | Mayor refuses veto | *"The Mayor refuses the veto. A policy must be enacted."* |

---

## Asset Requirements

All generated via Gemini Imagen 4 API. Prompts versioned in `scripts/asset-prompts.ts`.

| Asset | Description | Count |
| --- | --- | --- |
| Role card — Citizen | 1940s city worker, honest face, noir style | 1 |
| Role card — Mob Soldier | Shadowy figure, fedora, menacing | 1 |
| Role card — Mob Boss | Silhouette, power pose, backlit | 1 |
| Good Policy card | City seal, clean, official | 1 |
| Bad Policy card | Dark, cracked, corrupt | 1 |
| Game board background | Noir city skyline, night | 1 |
| Vote — Approve | Green, clean design | 1 |
| Vote — Block | Red, harsh design | 1 |
| Executive power cards | Investigate / Nominate / Execute | 3 |

---

## Project Structure

```
undercover-mob-boss/
├── src/
│   ├── client/           # Browser-side code
│   │   ├── views/        # Screen components (lobby, role-reveal, vote, etc.)
│   │   ├── audio/        # Audio engine, narrator, SFX
│   │   └── state/        # Client state management
│   ├── server/           # PartyKit server
│   │   ├── room.ts       # Room logic, game state, validation
│   │   └── game/         # Game rules engine
│   │       ├── roles.ts
│   │       ├── policies.ts
│   │       ├── phases.ts
│   │       └── powers.ts
│   └── shared/           # Types shared between client + server
├── public/
│   ├── assets/           # AI-generated images
│   ├── audio/            # Pre-generated narrator lines + SFX
│   └── fonts/
├── scripts/
│   ├── generate-assets.ts   # Imagen 4 asset pipeline
│   └── generate-narrator.ts # Gemini TTS narrator line generation
├── tests/
│   ├── unit/             # Game logic tests
│   └── integration/      # Full game flow tests
├── docs/
│   ├── SPEC.md           # This file
│   ├── RULES.md          # Player-facing rules
│   └── Secret_Hitler_Rules.pdf  # Reference (CC BY-NC-SA 4.0)
├── CLAUDE.md             # MO build instructions
├── vercel.json           # COOP/COEP headers for PWA
└── package.json
```

---

## Acceptance Criteria

### Phase 0 — Asset Generation
- [ ] All 11 visual assets generated and committed to `public/assets/`
- [ ] All narrator lines generated and committed to `public/audio/`
- [ ] Asset prompts versioned in `scripts/asset-prompts.ts`

### Phase 1 — Game Engine
- [ ] Full game state machine implemented and tested
- [ ] All win conditions trigger correctly
- [ ] Policy deck shuffle and deal logic correct
- [ ] Executive powers trigger at correct bad policy counts
- [ ] Election tracker logic correct (auto-enact at 3)
- [ ] Role distribution correct for all player counts (5–10)
- [ ] 80%+ test coverage on game logic

### Phase 2 — Multiplayer
- [ ] PartyKit room creates and destroys correctly
- [ ] Players can join via room code
- [ ] QR code generation works
- [ ] All state changes propagate to all connected clients within 200ms
- [ ] Host reconnect preserves game state
- [ ] Player disconnect handled gracefully (rejoin or AI placeholder)

### Phase 3 — Player View
- [ ] All player screens implemented
- [ ] Role reveal animation plays with haptic feedback
- [ ] Voting UI works with simultaneous reveal
- [ ] Private policy session (mayor/chief cards) works correctly
- [ ] Works on iOS Safari and Android Chrome

### Phase 4 — Host/Table View
- [ ] All table screens implemented
- [ ] Policy track animations play correctly
- [ ] Vote reveal animation shows each vote flipping
- [ ] Responsive to landscape tablet and laptop

### Phase 5 — Audio & Polish
- [ ] All narrator lines play at correct moments
- [ ] Ambient audio loops without clicks
- [ ] Volume controls accessible
- [ ] Smooth transitions between screens
- [ ] Game over screen shows all roles revealed

### Phase 6 — Deployment
- [ ] Vercel deployment live
- [ ] PWA installable on home screen
- [ ] COOP/COEP headers configured
- [ ] End-to-end test: 5-player full game completes without errors

---

## Attribution (CC BY-NC-SA 4.0)

Undercover Mob Boss is adapted from **Secret Hitler** by Goat, Wolf, & Cabbage LLC, licensed under CC BY-NC-SA 4.0. Changes made: complete reskin (theme, names, setting), digital implementation, phone-based private information layer, narrator voice system.

This project is released under the same CC BY-NC-SA 4.0 license.
Not for commercial use without approval from the original creators.

---

## Appendix A — Local Playtest Setup

### Servers (two separate PowerShell terminals)
```powershell
# Terminal 1
pnpm run partykit:dev   # PartyKit server (port 1999)

# Terminal 2
pnpm run dev            # Vite frontend (check output for port)
```

### URL Format
```
Host view:   http://localhost:<port>/host?room=<ROOM_CODE>
Player view: http://localhost:<port>/?room=<ROOM_CODE>&name=<PLAYER_NAME>
```

### Example — 10 Player Game (all dev names, 7 chars each)
```
http://localhost:5173/host?room=TEST
http://localhost:5173/?room=TEST&name=Vincenz
http://localhost:5173/?room=TEST&name=Carmine
http://localhost:5173/?room=TEST&name=Pauliee
http://localhost:5173/?room=TEST&name=Frankoo
http://localhost:5173/?room=TEST&name=Salliee
http://localhost:5173/?room=TEST&name=Donniee
http://localhost:5173/?room=TEST&name=Markiee
http://localhost:5173/?room=TEST&name=Tommiee
http://localhost:5173/?room=TEST&name=Benniee
http://localhost:5173/?room=TEST&name=Maxinee
```

> Port may vary — use whatever Vite reports on startup.
> Open host tab first, then player tabs. Minimum 5 players required.
> Player names are limited to 7 characters (silently truncated on join).

---

*Built with Maximum Overdrive. SDLC is the product.*
