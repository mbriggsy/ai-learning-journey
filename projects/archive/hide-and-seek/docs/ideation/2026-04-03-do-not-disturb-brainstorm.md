# Brainstorm: Do Not Disturb

**Date:** 2026-04-03
**Status:** Design locked — ready for `/ce:plan`

## What We're Building

**Do Not Disturb** — a side-scrolling 2D playful horror game. You're a kid who wakes up in an abandoned hotel with no memory of how you got there. A phone rings. A voice gives you cryptic guidance. Then the monsters wake up.

Survive 5 nights. Each night adds a new monster with learnable rules. Master their behaviors, manage your tools, and reach the front door before it locks again.

## Core Identity

| Axis | Decision |
|------|----------|
| **Perspective** | Side-scrolling 2D |
| **Tone** | Playful horror — scary but you're grinning |
| **Round length** | 2-3 minutes per night |
| **Visibility** | Limited ambient light — moonlight, flickering lamps, monster light sources |
| **Art style** | Hand-drawn / sketchy — Don't Starve meets Bendy and the Ink Machine |
| **Progression** | Night-based (FNAF model). 5 nights. Clean start each night — no upgrades. |
| **Polish bar** | "So fucking slick water beads off it" |

## The Setting: An Abandoned Hotel

5 floors connected by stairs and a rickety elevator.

| Floor | Character | Lighting |
|-------|-----------|----------|
| **Attic** | Exposed beams, cobwebs, tight spaces | Moonlight through roof holes |
| **Floor 3** | Guest rooms, long corridor | Flickering hallway sconces |
| **Floor 2** | Guest rooms, laundry chute shortcut | Flickering sconces, dark rooms |
| **Lobby (Floor 1)** | Front desk, piano, tall windows | Moonlight — best visibility |
| **Basement** | Kitchen, freezer, boiler room | Near pitch black — lighter required |

**Environmental polish:** Dust in moonbeams, curtains sway when you run past, rain on windows, lightning flashes, creaky floorboards in specific spots, elevator cable groans.

**Elevator:** Fastest travel between floors but DINGS on arrival (attracts the Bellhop). High risk, high reward.

## The Kid (Player Character)

Small, resourceful, scared, full personality. Oversized hoodie, big eyes, sneakers. Hand-drawn sketchy style.

### Movement
| Action | Input | Noise Level |
|--------|-------|-------------|
| Run | Shift + direction | LOUD |
| Walk | Direction | Moderate |
| Sneak | Ctrl + direction | Near silent |
| Jump | Space | Landing thud |
| Slide | Down while running | Whoosh |
| Interact | E | Varies (doors creak) |

### Personality
The kid talks to themselves — inner monologue drives both charm and narrative:
- "How did I get here?"
- "Is that... humming?"
- "Oh GREAT, another floor."
- "I should NOT have come here."
- Reacts to monster cues before the player learns them (organic teaching)

### Hiding Spots
| Spot | View | Protection |
|------|------|------------|
| Under beds | See monster feet walk past | High — hold breath meter |
| Closets | Peek through slats | High — see silhouette |
| Behind furniture | Quick crouch | Low — can be spotted |
| Vents | Crawl between rooms | Safe but slow |
| Freezer (basement) | Door blocks view, cold breath visible | Time-limited |

**Hold Your Breath:** When hiding, a breath meter appears. Run out and you gasp — monsters hear. Tap a rhythm to calm breathing and extend the timer.

## The Monsters

Three monsters, each with distinct rules. Pac-Man ghost model — learn the patterns, exploit the weaknesses.

### The Bellhop 🔔
| Aspect | Detail |
|--------|--------|
| **Hunt pattern** | Follows SOUND — rushes toward footsteps, doors, elevator dings |
| **Visual** | Tall, lanky, skeletal frame in oversized bellhop uniform. Glowing eyes under cap |
| **Light** | Swinging lantern — shadows dance as it moves |
| **Weakness** | SILENCE. Can't find you if you're still. Decoyable with throwables |
| **Counter-tool** | Throwable objects (shoes, books, bottles) |
| **Personality** | Hums elevator music. Rings bell when alert. Tilts head when confused. Bows when it catches you |
| **Introduced** | Night 1 |

### The Housekeeper 🧹
| Aspect | Detail |
|--------|--------|
| **Hunt pattern** | METHODICAL PATROL — checks every room L-to-R, floor by floor. Opens doors, checks beds, checks closets |
| **Visual** | Round, shuffling, apron. Head rotates unnaturally far. Rhythmic waddle |
| **Light** | Cleaning cart with flickering fluorescent tube — see harsh light under doors |
| **Weakness** | PREDICTABLE. Count her pattern, stay one room ahead |
| **Counter-tool** | DND signs — hang on door, she skips that room (limited supply: 2-3 per round) |
| **Personality** | Mutters about "the mess." Tuts at open doors. Sighs when room is empty. Wags finger when she catches you |
| **Introduced** | Night 2 |

### The Guest 👤
| Aspect | Detail |
|--------|--------|
| **Hunt pattern** | AMBUSH — sits perfectly still in chairs, bathtubs, dark corners. Looks like furniture. Lunges when you're too close |
| **Visual** | Paper-thin, folded into impossible positions. Only eyes visible until it unfolds. Jerky stop-motion movement |
| **Light** | None — IS the darkness. Faint eye glow only |
| **Weakness** | DISTANCE. Only triggers within ~2 tiles. Spot the glow, back away. Can't chase far |
| **Counter-tool** | Lighter — illuminate dark areas, spot the glow before trigger range |
| **Personality** | Patient. Fold-unfold when resetting. Paper-rustling sound. Wraps around you like origami when it catches you |
| **Introduced** | Night 3 |

### Tool/Monster Matrix
| Tool | Bellhop | Housekeeper | Guest |
|------|---------|-------------|-------|
| **Throwables** | Creates decoy noise | No effect | No effect |
| **DND Signs** | No effect | Skips room | No effect |
| **Lighter** | No effect | No effect | Reveals position |

## Night Progression

| Night | Monsters | Twist | Escape Window |
|-------|----------|-------|---------------|
| **1** | Bellhop only | Learn sound rules. Phone call tutorial | 20 seconds |
| **2** | + Housekeeper | Learn patrol patterns. Two threats | 18 seconds |
| **3** | + Guest | Learn ambush tells. Full monster roster | 15 seconds |
| **4** | All three, faster | Pressure test | 12 seconds |
| **5** | All three + hotel layout changes | Everything you memorized is wrong | 10 seconds |

### The Escape Phase
Timer hits zero → front door unlocks for a LIMITED window. Sprint to the lobby. Miss it → door locks, back to the hunt for another cycle. Position matters — hiding in the basement means a longer sprint.

## Narrative

### The Mystery
You don't know why you're here. You just... ARE here. Matrix-style awakening — the phone call is what makes you aware.

### The Phone
- Rings at the start of each night (attracts the Bellhop — risk/reward)
- A mysterious voice gives cryptic hints about the monsters and the hotel
- Each night reveals more: why you're here, what this place is, who's calling
- By Night 5: the truth. Or maybe the truth raises more questions.

### The Kid's Arc (through self-talk)
- Night 1: "Where am I?" — Confusion
- Night 2: "Why can't I leave?" — Frustration
- Night 3: "Have I been here before?" — Déjà vu
- Night 4: "Is this real?" — Questioning reality
- Night 5: "I remember now." — The revelation

## Catch Animations

Each monster has a unique, signature catch — creepy-funny, not gory. 2-3 seconds, then restart.
- **Bellhop:** Bows. Rings bell. "Checking you in."
- **Housekeeper:** Wags finger. Tuts. Drags you off-screen by the hoodie.
- **Guest:** Wraps around you like origami. You fold into it.

## Sound Design

Sound is GAMEPLAY, not ambiance.

### Player Sounds (attract the Bellhop)
- Running: loud (varies by surface — carpet quiet, wood loud, tile echoes)
- Doors: creak open, thud closed
- Elevator: DING (loudest sound in the game)
- Slide: whoosh
- Jump: landing thud

### Monster Telegraphs
- Bellhop: bell jingle + humming + lantern creak
- Housekeeper: cart wheels + muttering + mop dragging
- Guest: silence... then paper rustling

### Ambient
- Rain on windows, occasional thunder + lightning flash
- Pipes groaning (basement), clock ticking (lobby)
- Elevator cable always groaning
- Music box melody — faint, gets louder with danger

## Art Direction

### Reference: Don't Starve × Bendy and the Ink Machine
- Thick, uneven outlines — nothing looks machine-made
- Tasteful crosshatch shading
- Per-area color palette (amber lobby, blue-grey guest floors, near-black basement)
- Squash and stretch animation — bouncy kid, unsettling monsters
- Sketch wobble effect — edges aren't perfectly clean
- 48-64px character height

### Camera
- Lead in movement direction (see what's ahead)
- Zoom in when hiding (claustrophobic)
- Screen shake on monster alerts
- Brief hold on monster when first spotted (horror beat)
- Parallax: foreground furniture, midground play area, background architecture

## Why This Approach

1. **Side-scrolling** — fresh for Briggsy (did top-down with racers), natural for hiding/running, cinematic
2. **Playful horror** — more replayable than pure dread, UMB-level charm
3. **FNAF-style nights** — proven progression model, clear scope, satisfying arc
4. **Three-monster / three-tool symmetry** — clean design, each mechanic teaches one thing
5. **Mystery narrative** — the phone + "why am I here?" drives you through all 5 nights
6. **Hand-drawn art** — coheres naturally, drips personality, achievable polish target
7. **Timed escape** — elegant tension between hiding spot safety and exit proximity

## Key Decisions (Locked)

1. Side-scrolling 2D, not top-down
2. Playful horror tone (Hello Neighbor / FNAF energy)
3. Hand-drawn sketchy art style (Don't Starve / Bendy)
4. 5 night-based levels, clean start each night
5. 3 monsters with distinct rules (Bellhop/sound, Housekeeper/patrol, Guest/ambush)
6. 3 counter-tools (throwables, DND signs, lighter) — one per monster
7. Timed escape door (miss it → back to hunt)
8. Kid has full personality (inner monologue)
9. Phone call tutorial with mysterious caller (narrative thread)
10. Night 5 hotel layout changes (memorization broken)
11. Unique catch animation per monster
12. Limited ambient light with monster light sources
13. Name: **Do Not Disturb**

## Open Questions

None — all major design axes locked through collaborative dialogue.
