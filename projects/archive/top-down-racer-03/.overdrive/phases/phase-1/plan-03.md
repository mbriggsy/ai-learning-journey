## Plan 3

**Wave:** 1
**Commit Message:** `feat(phase1): redesign Track 3 (gauntlet) geometry — mixed-radius technical circuit with zero repeated corners`

### Task Description

Replace the v02 Track 3 control points in `src/tracks/track03.ts` with a completely new gauntlet geometry that is 50–60% longer than v02, features minimum 6 unique-radius corners, one decreasing-radius corner, one chicane, and variable-width sections. Update the track registry entry and write comprehensive tests including a unique-radius verification test.

**Context the coder needs:**

Same engine context as described for Track 2. The engine is FROZEN. You edit DATA only.

**TrackControlPoint interface** (from `src/engine/types.ts`):
```typescript
interface TrackControlPoint {
  position: Vec2;  // { x: number, y: number }
  width: number;   // half-width of track at this point
}
```

**How buildTrack works:** Catmull-Rom spline interpolation, closed loop, boundaries offset ±width. Self-intersection = bad. Narrow widths at tight corners prevent boundary crossing.

**v02 Track 3 reference data:**
- 43 control points
- Width varies: `W = 20` (standard), `C = 16` (corners), `H = 13` (hairpin)
- Approximate bounding box: x ∈ [-410, 260], y ∈ [-220, 410]
- Total circuit length: ~2700 units (run `buildTrack(TRACK_03_CONTROL_POINTS, 30).totalLength`)
- Features: start/finish straight, 90° right, short straight, 90° left, hairpin 180°, S-bend, return sweep

**v03 Track 3 design requirements** (from ADR-12):
1. **50–60% longer circuit** than v02 (~4050–4320 units total length)
2. **Minimum 6 distinct corners**, no two with the same geometric radius
3. **One genuinely decreasing-radius corner** (tightens mid-corner — punishes late apex). This means a sequence of 3+ control points where each successive pair is closer together angularly, creating a tightening spiral.
4. **One chicane** (two direction changes in quick succession — left-right or right-left)
5. **Variable width:** narrower in technical sections (~14–16 half-width), wider on straights (~22–26 half-width)
6. **Approximate size:** 50–60% larger circuit length than v02
7. **The memorization test:** An AI that memorized v02 Track 3 should fail this track — geometry must be fundamentally different

**Corner radius verification approach:**

A corner's "radius" can be estimated from control points by fitting a circle to three consecutive points in a curved section. For each distinct corner (a sequence of control points that form a turn), compute the approximate radius as:

```
R = |AB| * |BC| * |AC| / (4 * area_of_triangle_ABC)
```

where A, B, C are three consecutive control points in the corner. Two corners have "the same" radius if their estimated radii are within 10% of each other. The test must verify that NO two corners share a radius within that tolerance.

**Decreasing-radius corner design:**

A decreasing-radius corner has 4+ control points where the angular spacing between successive pairs decreases while the direction continues turning the same way. Concretely: if you measure the angle subtended between each pair of adjacent points relative to an estimated center, those angles should decrease. The practical effect is the car needs to keep tightening its steering — a late apex is punished.

**Chicane design:**

A chicane is a quick left-right (or right-left) sequence. Typically 4–6 control points creating an S-shape over a short distance. The key constraint is keeping it tight enough to force direction changes but not so tight that boundaries self-intersect. Use narrower widths (H = 13 or 14) through the chicane.

**Implementation approach:**

Design the circuit section by section. Label each section clearly in comments. Suggested layout:

1. Start/finish straight (heading east, ~400 units)
2. Corner 1: Medium right-hander (~90°, radius ~120)
3. Short straight
4. Corner 2: Tight left-hander (~90°, radius ~60)
5. Back straight (~300 units)
6. Corner 3: Long sweeping right (~135°, radius ~200) — the big swooper
7. Corner 4: DECREASING-RADIUS left (starts ~radius 150, tightens to ~80)
8. Connector straight
9. Corner 5: CHICANE (right-left, 4–6 points)
10. Corner 6: Wide right-hander (~120°, radius ~100)
11. Return section back to start

This gives 6 distinct corners with radii: ~120, ~60, ~200, ~150→80 (decreasing), chicane (not a single radius), ~100. All unique.

Adjust positions to achieve the 50–60% length increase while keeping geometry valid.

**Width assignments:**
- `W = 22` — straights
- `C = 16` — standard corners
- `N = 14` — technical sections (chicane, tight corners)
- `D = 15` — decreasing radius (gets narrower as it tightens)

**Update registry entry:**
- Keep `id: 'track-03'` and `name: 'Gauntlet'`
- Update `description` to: `'Championship — mixed corners, no two alike'`
- Par times: placeholder values (e.g., gold: 4800, silver: 6000, bronze: 7200)

**Test requirements:**

Create `tests/engine/track03-geometry.test.ts`:

1. **Build test:** `buildTrack(TRACK_03_CONTROL_POINTS, 30)` succeeds
2. **Length test:** `track.totalLength` between 3800 and 4800 units (50–60% longer than v02's ~2700)
3. **Checkpoint test:** All 30 checkpoints valid
4. **Boundary test:** Boundaries have positive length
5. **Corner count test:** Identify corners by finding sequences of control points where the direction changes significantly. Verify ≥ 6 distinct corners.
6. **UNIQUE RADIUS TEST (critical):** For each identified corner, estimate the radius using the three-point circle formula. Verify no two corners have radii within 10% of each other. — `Satisfies: R-004`
7. **Decreasing-radius test:** Find the decreasing-radius corner (identify by comment or by finding a corner where successive inter-point angles decrease). Verify it has ≥ 3 control points and the radius estimate tightens.
8. **Width variation test:** Verify that `min(widths)` ≤ 16 and `max(widths)` ≥ 20 (confirms variable width)
9. **Lap completion test:** Same approach as Track 2 — step simulation, verify checkpoint crossings

### File Targets
- `src/tracks/track03.ts` — Complete rewrite of `TRACK_03_CONTROL_POINTS` with new gauntlet geometry
- `src/tracks/registry.ts` — Update Track 3 description and par times
- `tests/engine/track03-geometry.test.ts` — NEW: comprehensive geometry + unique-radius tests

### Acceptance Criteria
- [ ] `buildTrack(TRACK_03_CONTROL_POINTS, 30)` succeeds without error — `Satisfies: R-003`
- [ ] `track.totalLength` is between 3800 and 4800 units (50–60% larger than v02's ~2700) — `Satisfies: R-010`
- [ ] Track has ≥ 6 distinct corners identified from geometry — `Satisfies: R-010`
- [ ] Zero repeated corner radii: no two corners have estimated radius within 10% of each other — `Satisfies: R-004`
- [ ] One corner is demonstrably decreasing-radius (≥ 3 points, tightening) — `Satisfies: R-010`
- [ ] One chicane present (two quick direction changes) — `Satisfies: R-010`
- [ ] Track width varies: minimum half-width ≤ 16, maximum ≥ 20 — `Satisfies: R-010`
- [ ] All 30 checkpoints have valid geometry — `Satisfies: R-003`
- [ ] `src/engine/` is completely untouched — `Satisfies: R-013`
- [ ] Existing `tests/engine/tracks.test.ts` still passes — `Satisfies: R-003`
- [ ] New `tests/engine/track03-geometry.test.ts` passes — `Satisfies: R-005`
- [ ] `pnpm test` passes with zero failures — `Satisfies: R-005`

### Dependencies
- **Depends on:** None — Wave 1
- **Needed by:** None directly (Phase 5 AI training will use these tracks)

### Locked Decisions
- Engine (`src/engine/`) is FROZEN — zero modifications (R-013)
- Track 1 (oval) geometry is FROZEN (R-014)
- Minimum 6 distinct corners, no two with same radius (ADR-12)
- One decreasing-radius corner required (ADR-12)
- One chicane required (ADR-12)
- Variable width: narrower in technical, wider on straights (ADR-12)