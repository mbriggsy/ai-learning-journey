# Undercover Mob Boss

A digital social deduction game — our own take on the Secret Hitler formula.

## The Concept

Citizens vs. the Mob. Hidden roles, political maneuvering, and a city on the brink.

**Roles:**
- **Citizens** (Liberals) — trying to pass good policy and root out the mob
- **Mob Soldiers** (Fascists) — hiding in plain sight, sabotaging from within
- **Mob Boss** (Hitler) — the big fish; if elected Chancellor, the mob wins

**Mechanics:**
- **Mayor** (President equivalent) — nominates the Police Chief each round
- **Police Chief / DA** (Chancellor equivalent) — executes policy with the Mayor
- Win by passing enough good policy OR identifying and never electing the Mob Boss

## Theme

1940s/50s noir city. Smoke-filled rooms. Fedoras. Corruption runs deep.

## Why This Project

- Completely original IP (no Secret Hitler trademark issues)
- Rich game state = real engineering challenge
- AI players with bluffing/deduction = legitimately hard AI problem
- CE or MO v3 test bed

## Platform Vision

**Not a board game — a phone/tablet experience. Same room, modernized.**

Everyone's physically together (that's what makes it fun — the lying-to-your-face part). Phones and tablets replace the cards and policy tiles. The social interaction stays; the paper goes.

- **Role screen** = private on your own phone, never broadcast
- **Game board / policy track** = shared display (tablet or TV in the center of the room)
- **Voting** = each player submits on their own device simultaneously, reveal together
- **No app install** — browser-based PWA, join via QR code or room code (nobody wants to install an app for a party game)
- **Real-time multiplayer** — WebSockets, all devices synced

## The "Close Your Eyes" Problem — Solved

No more "everyone close your eyes" theater. Your phone handles the secret role reveal privately:

- Game starts → server assigns roles → your phone buzzes
- **Mob Soldier** sees: *"You are a Mob Soldier. Your fellow soldiers are Mike and Sarah. The Mob Boss is Dave. Don't let it show."*
- **Citizen** sees: *"You are a Citizen. Root out the mob."*
- **Mob Boss** sees their identity + their soldiers
- Then phones flip to game mode and the room starts playing

No honor system, no accidental peeking, no awkward theater. And it opens up stuff the physical game can't do — timed reveals, animated role cards, dramatic music on key moments.

## Architecture Notes

- Real-time state machine (well-defined rules, clean scope)
- Multiplayer sync via WebSockets
- Private view (your phone) + shared view (table/TV) split
- No ML required — pure game logic and state management
- Good candidate for MO v3 first real project

## Narrator Voice — The Wil Wheaton Energy

Secret Hitler has a Wil Wheaton voiceover for the "close your eyes" phase that is *chef's kiss* — slightly dramatic, slightly absurd, fully committed to the bit. We need that energy.

Instead of "everyone close your eyes..." our narrator guides every phase:

> *"Citizens of Millbrook City... your fate has been sealed. Check your phone. Know your allegiance. And whatever you do... don't let it show."*

> *"The Mayor has nominated the Police Chief. The city watches. The mob waits."*

- Full noir voiceover — gravelly, theatrical, a little menacing
- Narrates every phase transition: role reveal, nominations, voting, policy flip, game over
- ElevenLabs TTS for voice generation — nail the *type* without needing the actual celeb
- This is what makes it legendary. People will quote it for years.

## Status

Concept only. Parked until ready to build.
