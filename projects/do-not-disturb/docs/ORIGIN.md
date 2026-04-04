# Origin

**Do Not Disturb** started as a vision pivot from `projects/hide-and-seek/` — a top-down 2D hide-and-seek game with a working engine (336 passing tests, AI FSM, A* pathfinding, shadowcasting FOV).

The design evolved into a side-scrolling 2D playful horror game. Side-scrolling needs gravity, platform-aware pathfinding, side-view visibility, and parallax depth — fundamentally different assumptions from a top-down engine. Retrofitting would mean fighting the old code at every layer.

**Decision (2026-04-03):** Start fresh. Carry wisdom and insight docs, not code. The old project is shelved at `projects/hide-and-seek/` for reference but nothing is inherited — tech stack, audio, art, and architecture are all evaluated from zero.
