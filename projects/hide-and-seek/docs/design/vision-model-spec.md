# Vision Model — Flashlight Tag Design

**Decision locked:** 2026-03-30
**Replaces:** fog-of-war-for-player (Phase 3 implementation)
**Implementation target:** Phase 5a (difficulty tiers)
**Status:** APPROVED — design decision, not yet implemented

## Core Principle

The player SEEING the seeker hunt is the core fun. This is hide-and-seek / flashlight tag, not a horror game. Tension comes from proximity, door decisions, and AI behavior — not blindness.

## The Seeker (unchanged across all tiers)

The seeker has a **directional flashlight cone** — visible as a rendered light beam.

| Difficulty | Cone Angle | Vision Range |
|-----------|-----------|-------------|
| Easy | 60° | Defined in Phase 5a |
| Medium | 90° | Defined in Phase 5a |
| Hard | 120° | Defined in Phase 5a |

The seeker's flashlight beam is:
- A visible graphic (rendered cone/wedge)
- Stops at closed doors (beam visually cut off)
- Floods through open doors (beam extends through)
- The detection mechanic: seeker only detects hider if hider is inside the cone

Implementation: existing `computeFOV` + angle filter (already planned for Phase 5a).

## The Hider (4 tiers)

Only the player's vision changes between difficulty tiers. Zero seeker code changes.

| Tier | Name | Player Vision | Feeling |
|------|------|-------------|---------|
| **Easy** | Omniscient | Full map visible | "I'm the security camera operator" |
| **Medium** | Lantern | Radius-based (~8-10 tiles), non-directional | "I can see around me but not far" |
| **Medium-Hard** | Flashlight | Directional cone tied to facing direction | "I see where I look — what's behind me?!" |
| **Hard** | Darkness | No light source. Navigate by memory from countdown. Only see seeker's beam. | "Where am I? Oh god is that a beam?" |

### Easy — Omniscient
- No fog, no vision restriction
- Player sees entire map at all times
- Seeker's flashlight beam is visible but purely aesthetic (player already sees everything)
- Best for: first-time players, AI training data generation, debugging
- This IS the debug mode — no separate debug toggle needed

### Medium — Lantern
- Player has radius-based vision (~8-10 tiles, tunable)
- Non-directional — 360° visibility within radius
- Explored areas remain dimly visible (alpha ~0.3-0.4)
- Seeker's flashlight beam visible from beyond player's lantern radius (light is visible in darkness)
- Key gameplay: you see the beam sweeping two rooms over before the seeker arrives

### Medium-Hard — Flashlight
- Player has a directional cone tied to their facing direction (WASD controls facing)
- Cone angle TBD (probably wider than seeker's — ~120° player vs 60-120° seeker)
- You must CHOOSE what to illuminate — walking backward into a room means you can't see behind you
- Reuses identical `computeFOV` + angle filter code as seeker vision
- Key gameplay: directional awareness, peeking around corners

### Hard — Darkness
- Player has NO light source
- During 10-second countdown: full map visible (memorize the layout)
- During hunt: player navigates by memory only
- Seeker's flashlight beam is the ONLY visible light — seeing it is both info and terror
- Key gameplay: pure memory + reading the seeker's beam movements

## Door Interaction with Flashlight

Doors create visible light/shadow interactions:
- **Closed door + seeker approaching:** beam hits door, stops. Player on other side sees NO light.
- **Open door + seeker approaching:** beam floods through doorway. Player on other side sees the beam enter.
- **Player closes door:** visually cuts off seeker's beam if it was shining through.
- **Strategic depth:** closing a door blocks the seeker's vision AND hides the beam. But the seeker knows someone closed it.

## Implementation Notes

- `computeFOV` already exists (symmetric shadowcasting, Uint8Array output)
- Phase 5a adds angle filtering for seeker vision cones — same code works for player flashlight (Medium-Hard tier)
- Seeker flashlight beam rendering: `Phaser.GameObjects.Graphics` wedge or a light sprite with masking
- Player vision tiers are a single config value selecting which FOV computation to use
- Fog overlay (Phase 3 `FogRenderer`) still used for Medium/Medium-Hard/Hard — just driven by different FOV data
- Easy mode: `FogRenderer` disabled entirely (current debug state)

## What This Replaces

The Phase 3 fog-of-war design treated fog as the primary tension mechanic:
- UNEXPLORED: fully black
- EXPLORED: 60% opacity
- VISIBLE: clear (within player FOV)

This created "scary dark" gameplay that conflicted with the core fun: watching the seeker hunt. The new model preserves fog as a DIFFICULTY KNOB while making the seeker's behavior the star of the show.

## AI Training Implications

- **Easy mode** produces the highest-quality training data (player makes fully informed strategic decisions)
- **Hard mode** produces interesting adversarial data (player makes memory-based decisions)
- Both are valuable for different training objectives
- The seeker learning to find a SMART hider (Easy mode) is a harder, more interesting problem than finding a panicked one (Hard mode)

## Future Consideration (NOT in scope)

**Hider flashlight visible to seeker AI:** If the hider has a flashlight (Medium-Hard), the seeker could potentially detect the hider's beam. This creates a "do I look and reveal myself?" mechanic. Requires a new perception system for the AI. Park for post-Phase 7 or a "Flashlight Tag" game mode.
