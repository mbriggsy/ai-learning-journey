# Exploding Kittens Digital — Brainstorm

**Date:** 2026-04-05
**Status:** Complete

---

## What We're Building

A digital adaptation of the **Exploding Kittens Party Pack** — Jackbox-style, played in the same room. One shared screen (TV/laptop) shows the game table: draw pile, discard pile, player status, and all the drama. Each player uses their phone as a private controller to see their hand and play cards.

This is not online multiplayer. It's the card game you already play, but the table is a screen and your hand is your phone.

### Core Identity

- **Dark + premium visual direction.** Dark backgrounds, glowing card edges, neon accents. Cards feel expensive. Explosions are dramatic light shows. Think poker app meets cyberpunk.
- **Full theatrical drama.** Every Exploding Kitten draw is a mini-movie — slow card flip, screen goes red, particle effects, screen shake. Defuse saves get the relief moment. The shared screen is the spectacle.
- **Full Party Pack.** All 120 cards, all card types, 2-10 players. No artificial limits, no "we'll add this later."

---

## Why This Approach

### Jackbox Format Solves the Hard Problems

Hidden hands are the core challenge of digitizing a card game. Jackbox-style (shared screen + phone controllers) solves this naturally — your hand is on YOUR phone, private by default. The big screen is public by default. No hide-the-screen mechanics, no passing devices.

### Card Game = The Right Format for Us

Two previous games (Hide and Seek, Do Not Disturb) had solid architecture and test suites but embarrassing visuals. The lesson: **presentation beats systems.** A card game leans on typography, layout, transitions, and effects — all code-driven, no sprite art. 90% of budget goes to polish.

### Known Game, Directed from Experience

Briggsy plays Exploding Kittens in real life. Directing from experience, not theory. The rules are proven. Simple mechanics = deep polish.

---

## Key Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | **Format** | Jackbox-style (shared screen + phone controllers) | Hidden hands solved naturally. Big screen = spectacle. |
| 2 | **Players** | 2-10 (full Party Pack range) | No one gets turned away at game night. |
| 3 | **Card scope** | Full Party Pack (120 cards, all types) | It's the game we actually play. No half measures. |
| 4 | **Tech stack** | React + TypeScript + Vite + ~~Socket.IO~~ **PartyKit** + Framer Motion | React for UI, ~~Socket.IO~~ PartyKit for real-time sync (proven in UMB, cloud-native), Framer Motion for water-beads animation. *Updated during planning — PartyKit supersedes Socket.IO.* |
| 5 | **App architecture** | One app, two views (`/board` for TV, `/play` for phones) | Shared types, shared game logic, one codebase. |
| 6 | **Visual direction** | Dark + premium | Code-driven polish. Glowing edges, particles, dramatic light. No sprite art needed. |
| 7 | **Drama level** | Full theatrical | Slow reveals, screen shake, particle explosions, relief animations. Every draw is an event. |
| 8 | **Nope timing** | Smart (adaptive) | Every card play (except Exploding Kitten/Defuse) opens a Nope window. Window scales by game state: 3s when 5+ players remain, 5s when 3-4 remain, 7s when down to 2. Tension rises as the game tightens. |
| 9 | **Join flow** | QR code + room code fallback | QR for speed, room code for any device. First impression matters. |
| 10 | **Turn timer** | Gentle nudge (30s inactivity) | Phone vibrates + big screen shows "waiting on..." Social pressure, not enforcement. |
| 11 | **Audio** | Deferred to polish phase | Nail the visual experience first. |
| 12 | **AI opponents** | Maybe later | Only if it can hit the water-beads quality bar. Not in v1. |
| 13 | **Deck composition** | Auto per player count | Party Pack paw-print rules applied automatically — 2-3 players get paw-print cards, 4-7 get non-paw-print, 8-10 get all. |
| 14 | **Card art** | Prototype both, decide later | Build card component with swappable art direction. Typographic first (fastest), upgrade to illustrated if needed. |
| 15 | **Defuse placement** | Slider + numbered positions | Visual slider with tick marks showing deck positions. Drag for speed, numbers for precision. Phone-only, secret. |
| 16 | **Target selection** | Simple list | Scrollable list of player names (for Targeted Attack, Favor, steal combos). For Three of a Kind card naming, same pattern — list of card types to pick from. Tap to select. |
| 17 | **Eliminated players** | Game over screen | "YOU EXPLODED" with elimination rank. Phone is done. Watch the big screen. |
| 18 | **Player identity** | Name + pick a color | Type name, choose from available colors. ~10 seconds to join. Fast with personality. |
| 19 | **Hosting** | Deferred to plan phase | Implementation detail — how the server runs is a HOW question. |

---

## Card Types (Full Party Pack)

| Card | Count | Effect |
|------|-------|--------|
| Exploding Kitten | 9 (insert N-1 for N players) | You explode unless you Defuse. |
| Defuse | 3 paw + 7 non-paw | Save yourself. Reinsert Kitten secretly. |
| Attack | 2 paw + 3 non-paw | End turn, force next player to take 2 turns. Stacks. |
| Targeted Attack | 2 paw + 3 non-paw | End turn, choose ANY player to take 2 turns. Stacks. |
| Skip | 4 paw + 6 non-paw | End turn without drawing. |
| See the Future | 3 paw + 3 non-paw | Peek at top 3 cards (private, on phone). |
| Alter the Future | 2 paw + 4 non-paw | View top 3, rearrange in any order (private). |
| Shuffle | 2 paw + 4 non-paw | Randomize the draw pile. |
| Draw from the Bottom | 3 paw + 4 non-paw | Draw from bottom instead of top. |
| Favor | 2 paw + 4 non-paw | Force a player to give you 1 card (their choice). |
| Nope | 4 paw + 5 non-paw | Cancel any action. Playable any time, by anyone. Nope chains create Yups. |
| Cat Cards (5 types) | 3 paw + 4 non-paw each | Powerless alone. Pairs steal random card. Triples name a card to steal. |
| Feral Cat | 2 paw + 4 non-paw | Wild — counts as any Cat Card type. |

### Special Combos

- **Two of a Kind:** Any matching pair (not just cats) — steal a random card from any player.
- **Three of a Kind:** Any matching triple — name a card, steal it if they have it.

---

## Assumptions for Planning

- **Local network required.** All devices (board + phones) must be on the same WiFi. No internet needed, but WiFi is non-negotiable.
- **Phone reconnection.** Phones will disconnect (screen lock, battery, WiFi hiccup). Socket.IO handles reconnection, but the game state must survive — player rejoins where they left off, no lost turns.
- **Game start flow.** Board screen controls the lobby. Host sees players joining, hits "Start Game" when ready. No ready-up mechanic — the host decides when to go.
- **Screen orientation.** Board = landscape (TV/monitor). Phones = portrait (natural phone hold). Both views designed for their orientation.

---

## What This Is NOT

- **Not online multiplayer.** Everyone is in the same room.
- **Not an AI showcase.** AI opponents are a future maybe, not the point.
- **Not a clone of the official app.** This is OUR version with OUR art direction and OUR level of polish.
- **Not a systems-heavy engine.** Simple rules, deep polish. The complexity is in the feel, not the architecture.
