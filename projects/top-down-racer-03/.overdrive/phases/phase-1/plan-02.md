## Plan 2

**Wave:** 1
**Commit Message:** `feat(phase1): redesign Track 2 (speedway) geometry — longer high-speed circuit with genuine braking zones`

### Task Description

Replace the v02 Track 2 control points in `src/tracks/track02.ts` with a completely new speedway geometry that is 30–40% longer than v02, features long straights requiring throttle discipline, genuine braking zones, and wider racing surface. Update the track registry entry and write comprehensive tests.

**Context the coder needs:**

The engine is FROZEN. You are editing DATA files only (`src/tracks/track02.ts`). The engine reads `TrackControlPoint[]` arrays and builds a track via Catmull-Rom spline interpolation through the control points.

**TrackControlPoint interface** (from `src/engine/types.ts`):
```typescript
interface TrackControlPoint {
  position: Vec2;  // { x: number, y: number } — centerline position
  width: number;   // half-width of track at this point
}
```

**How the engine uses control points:**
- `buildTrack(controlPoints, checkpointCount)` creates a `TrackState` with inner/outer boundaries, checkpoints, arc-length table
- The spline is a closed Catmull-Rom loop through all control points
- Boundaries are offset from the centerline by `±width` at each point
- Self-intersecting boundaries cause physics issues — the coder MUST ensure no boundary crossings
- Wider tracks (larger `width` values) need more gradual curves to avoid self-intersection
- The engine's `WALL_OFFSET` constant adds a buffer outside the road edge for the collision wall

**v02 Track 2 reference data:**
- 15 control points
- Width varies: 22–30 (half-width)
- Approximate bounding box: x ∈ [-590, 300], y ∈ [-340, 350]
- Total circuit length: ~2500 units (run `buildTrack(TRACK_02_CONTROL_POINTS, 30).totalLength` to get exact)
- Features: main straight (~700 units), tight Turn 1, Curva Grande, Lesmos, Ascari kink, back straight, Parabolica

**v03 Track 2 design requirements** (from ADR-12):
1. **30–40% longer circuit** than v02 (~3250–3500 units total length)
2. **At least one straight long enough** that the AI must decide when to lift (throttle discipline)
3. **2–3 genuine braking zones** — corners that require significant speed reduction
4. **No hairpins** — this is a high-speed track, not a technical one
5. **Wider than v02 tracks** — approximately 20% wider driveable surface (half-widths of ~26–36 instead of 22–30)
6. **Medium-radius sweepers** — flowing curves, not tight turns
7. **Visual identity:** banked feel, night lighting, stadium atmosphere (this affects track name/description, not geometry)

**Implementation approach:**

Create a new set of control points in `src/tracks/track02.ts`. Design a circuit with:
- A long main straight (800–1000 units) — the signature feature
- A secondary straight (400–600 units)
- 4–6 corners, all medium-to-large radius (no tight stuff)
- 2–3 corners with genuine braking zones (sharp enough that the car can't take them flat out)
- Track width: standard `W = 28` for straights, slightly narrower `N = 24` at corner apexes
- Total bounding box should be larger than v02 to accommodate the longer circuit

**Track design tips for avoiding self-intersection:**
- At corners, ensure control points are spaced closely enough that the spline doesn't wobble
- Narrower widths at tight corners prevent outer boundary from crossing inner boundary
- Test with `buildTrack()` — if it throws or produces boundaries with zero-length segments, the geometry is invalid
- Run the simulation for a few laps to verify cars can complete the circuit

**Update registry entry** in `src/tracks/registry.ts`:
- Keep `id: 'track-02'` and `name: 'Speedway'`
- Update `description` to reflect the new design character
- Par times will need retuning after playtesting — set reasonable placeholder values (e.g., gold: 3600, silver: 4500, bronze: 5400 for a longer track)

**Test requirements:**

Create or update `tests/engine/track02-geometry.test.ts`:

1. **Build test:** `buildTrack(TRACK_02_CONTROL_POINTS, 30)` succeeds without errors
2. **Length test:** `track.totalLength` is between 3000 and 4000 units (30–40% longer than v02's ~2500)
3. **Checkpoint test:** All 30 checkpoints generated, each with valid `left`, `right`, `center`, `direction`
4. **Boundary test:** `track.innerBoundary.length > 0` and `track.outerBoundary.length > 0`
5. **Width test:** All control point widths are ≥ 22 (minimum driveable width)
6. **Lap completion test:** Create a world with `createWorld(track)`, step the simulation with inputs that follow the track centerline (use checkpoint positions as waypoints), verify at least one checkpoint is crossed within 500 ticks
7. **No-hairpin test:** Verify no adjacent control points create an angle change > 120° (enforce the "no hairpins" constraint)

The existing `tests/engine/tracks.test.ts` already tests that all three tracks build successfully. Your new test file should provide deeper geometric validation specific to Track 2.

### File Targets
- `src/tracks/track02.ts` — Complete rewrite of `TRACK_02_CONTROL_POINTS` with new speedway geometry
- `src/tracks/registry.ts` — Update Track 2 description and par times
- `tests/engine/track02-geometry.test.ts` — NEW: comprehensive geometry validation tests

### Acceptance Criteria
- [ ] `buildTrack(TRACK_02_CONTROL_POINTS, 30)` succeeds without error — `Satisfies: R-003`
- [ ] `track.totalLength` is between 3000 and 4000 units (30–40% larger than v02's ~2500) — `Satisfies: R-009`
- [ ] Track has at least one straight segment ≥ 700 units (measured as distance between control points along a straight section) — `Satisfies: R-009`
- [ ] All control point half-widths ≥ 24 (wider than v02's minimum of 22) — `Satisfies: R-009`
- [ ] No adjacent control point pair creates an angle change > 120° (no hairpins) — `Satisfies: R-009`
- [ ] All 30 checkpoints have valid geometry (non-zero direction vectors, left/right on opposite sides of center) — `Satisfies: R-003`
- [ ] `src/engine/` is completely untouched — zero modifications — `Satisfies: R-013`
- [ ] Existing `tests/engine/tracks.test.ts` still passes — `Satisfies: R-003`
- [ ] New `tests/engine/track02-geometry.test.ts` passes with all tests green — `Satisfies: R-005`
- [ ] `pnpm test` passes with zero failures — `Satisfies: R-005`

### Dependencies
- **Depends on:** None — Wave 1
- **Needed by:** None directly (Phase 5 AI training will use these tracks)

### Locked Decisions
- Engine (`src/engine/`) is FROZEN — zero modifications (R-013)
- Track 1 (oval) geometry is FROZEN — do not touch `track01.ts` (R-014)
- Track geometry files are DATA, not engine code — safe to modify (CLAUDE.md)
- No hairpins on Track 2 (ADR-12)
- Wider surface than v02 (ADR-12)