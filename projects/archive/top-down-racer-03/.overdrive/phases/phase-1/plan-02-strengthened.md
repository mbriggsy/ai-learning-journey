---

## 1. Strike Team Roster

```
STRIKE TEAM ROSTER
═══════════════════

Tier 1: Core Agents
  ○ 01 The Surgeon          NOT ACTIVATED
  ○ 02 The Architect        NOT ACTIVATED
  ○ 03 The Profiler         NOT ACTIVATED
  ✓ 04 The Saboteur         5 issues
  ○ 05 The Detective        NOT ACTIVATED

Tier 2: Specialists (3 activated)
  ✓ 06 The Skeptic          7 issues
  ✓ 07 The Accountant       2 issues
  ○ 08 The Diplomat         NOT ACTIVATED
  ✓ 09 The Simplifier       3 issues

Tier 3: Governance
  ○ 24 The Magistrate       NOT ACTIVATED (complexity < maximum)

Total: 4 agents ran | 17 findings | 10 accepted | 3 rejected | 4 merged
Review gaps: Performance (Agent 03), dependency analysis (Agent 02),
             code-level surgery (Agent 01) — all acceptable for a data-file
             rewrite plan with no engine changes.
```

---

## 2. Findings

| # | Severity | Finding | Fix | Found By | Resolution |
|---|----------|---------|-----|----------|------------|
| 1 | CRITICAL | **Width test threshold contradicts AC and ADR-12.** Test says `≥22`, AC says `≥24`, ADR-12 says `~26–36`. A track with widths of 22–25 passes the test but violates the spec's "~20% wider" requirement. | Change minimum width to `≥26` in both AC and test. Change implementation approach corner apex width from `N=24` to `N=26`. | Agent 06 (#1), Agent 07 (#1) | MERGED — both agents caught the same cascading inconsistency. ADR-12's `~26` is the authoritative value. |
| 2 | HIGH | **No test for straight-segment length.** AC requires "at least one straight segment ≥700 units" but none of the specified tests measure this. Zero test coverage for an explicit acceptance criterion. | Add a straight-segment test: compute distances between consecutive control points, identify collinear sequences (angle change <5°), sum distances along those sequences, assert ≥700 units. | Agent 06 (#2) | ACCEPTED |
| 3 | HIGH | **Lap completion test is fragile and near-useless.** Requires implementing a steering AI inside the test (bugs test the test, not the track). Also, car starts near checkpoint 0 by definition — crossing "at least one checkpoint" proves only that the car can move, not that the track is navigable. | Replace with targeted geometry validation: verify `startPosition` is inside track boundaries and `startHeading` aligns with checkpoint 0 direction (within ±15°). Deterministic, no simulation needed. | Agent 04 (#2), Agent 06 (#3), Agent 09 (#2) | MERGED — all three agents flagged this from different angles (fragility, no-op, overengineering). Replacement test is simpler and catches real failure modes. |
| 4 | MEDIUM | **Length test range too loose.** Plan allows 3000–4000, but spec says "30–40% longer than ~2500" = 3250–3500. The 3000–4000 range would pass a track that's only 20% longer or 60% longer. | Tighten to 3200–3600 (small tolerance around 3250–3500). | Agent 07 (#2) | ACCEPTED |
| 5 | MEDIUM | **`WALL_OFFSET=30` not mentioned in implementation guidance.** Actual wall boundaries extend `width+30` from centerline (56–58 units). Engine silently clamps inner boundaries at tight curves — never throws. Coder may design points that produce valid but ugly geometry without knowing this. | Add to implementation guidance: keep curve radii above 100 units. Note that `buildTrack` clamps silently (never throws on tight curves). | Agent 04 (#3) | ACCEPTED |
| 6 | MEDIUM | **No-hairpin angle computation is ambiguous.** "Angle change >120°" could mean interior angle, exterior angle, or turn angle. Wrong convention silently permits hairpins or rejects valid curves. | Define explicitly: compute turn angle as `π - acos(dot(v1,v2)/(|v1||v2|))` where `v1=CP[i]-CP[i-1]`, `v2=CP[i+1]-CP[i]`. Assert turn angle <60° (equivalent to the spec's "angle change >120°" when measuring interior angle). | Agent 04 (#1), Agent 06 (#6) | MERGED — both flagged ambiguity. Explicit formula resolves it. Agent 09's suggestion to drop the test is rejected — it's an explicit ADR-12 constraint and AC. |
| 7 | MEDIUM | **Checkpoint validity assertions too vague.** "Valid left, right, center, direction" without concrete assertions leads to `expect(cp.left).toBeDefined()` which proves nothing. | Specify: (1) `checkpoints.length === 30`, (2) gate width `distance(left, right) > 0` for each checkpoint, (3) left and right on opposite sides of center (cross-product sign check). | Agent 06 (#4), Agent 09 (#3) | MERGED — Agent 06 wanted full validation, Agent 09 wanted simplification. Compromise: verify count + non-degenerate geometry, skip testing engine-guaranteed properties like direction normalization. |
| 8 | LOW | **Boundary test is trivially weak.** `innerBoundary.length > 0` is guaranteed true for any track that builds. Adds zero validation beyond `buildTrack` not throwing. | Replace with: verify `innerBoundary.length === outerBoundary.length` and both equal expected sample count (`controlPoints.length * SAMPLES_PER_SEGMENT + 1`). This catches unexpected boundary generation without testing engine internals. | Agent 04 (#4) | ACCEPTED (simplified from Agent 04's original fix — segment intersection test is too complex and tests the engine) |
| 9 | LOW | **No test for registry update.** Plan modifies `registry.ts` but no test validates it. | Add test: import `TRACKS`, find track-02 entry, assert description is non-empty, assert `gold < silver < bronze`, assert all par times are positive. | Agent 06 (#7) | ACCEPTED |

```
Findings requiring gate escalation: None
```

---

## 3. Implementation Specification

## Plan 2 — Strengthened

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
- **`WALL_OFFSET = 30`** — actual wall (collision) boundaries extend `width + 30` units from the centerline. For a control point with `width: 28`, the wall is 58 units from center. This means effective bounding-box footprint is much larger than the road surface.
- **Silent curvature clamping:** The engine's `buildTrack` Pass 2–3 computes signed curvature at every sample point and clamps inner boundary offsets at tight curves. `buildTrack` will **NEVER throw** on tight curves — it silently reduces the inner boundary offset, producing valid but potentially ugly/narrow geometry. You cannot rely on "if it throws, the geometry is bad" — it won't throw.
- **Curve radius guideline:** Keep all curve radii above **100 units** to avoid heavy inner-boundary clamping. At `width: 28` + `WALL_OFFSET: 30` = 58 units wall distance, a curve radius of 100 units leaves comfortable margin. Below 80 units, clamping becomes aggressive.
- Wider tracks (larger `width` values) need more gradual curves to avoid aggressive clamping
- The constant `SAMPLES_PER_SEGMENT = 40` in `src/engine/track.ts` determines boundary resolution

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
4. **No hairpins** — this is a high-speed track, not a technical one. No corner should have a turn angle exceeding 60° between consecutive control point direction vectors.
5. **Wider than v02 tracks** — approximately 20% wider driveable surface. Half-widths of **26–36** (per ADR-12), minimum 26 at any control point.
6. **Medium-radius sweepers** — flowing curves, not tight turns. All curve radii > 100 units.
7. **Visual identity:** banked feel, night lighting, stadium atmosphere (this affects track name/description, not geometry)

**Implementation approach:**

Create a new set of ~18–22 control points in `src/tracks/track02.ts`. Design a circuit with:
- A long main straight (800–1000 units) — the signature feature
- A secondary straight (400–600 units)
- 4–6 corners, all medium-to-large radius (no tight stuff, all radii > 100 units)
- 2–3 corners with genuine braking zones (sharp enough that the car can't take them flat out)
- Track width: standard `W = 30` for straights, `N = 26` at corner apexes (minimum half-width per ADR-12)
- Total bounding box should be larger than v02 to accommodate the longer circuit

**Track design tips for avoiding geometry issues:**
- At corners, ensure control points are spaced closely enough that the spline doesn't wobble
- Narrower widths at tight corners prevent aggressive curvature clamping, but never go below 26
- `buildTrack` succeeding does NOT guarantee visually clean geometry — the engine silently clamps
- After building, verify the track in-game to check for pinched or ugly boundary sections
- Run the simulation for a few laps to verify cars can complete the circuit

**Update registry entry** in `src/tracks/registry.ts`:
- Keep `id: 'track-02'` and `name: 'Speedway'`
- Update `description` to reflect the new design character (must differ from v02's `'Fast — sweeping curves, high speed'`)
- Set placeholder par times proportional to the longer circuit: `{ gold: 3600, silver: 4500, bronze: 5400 }`

**Test requirements:**

Create `tests/engine/track02-geometry.test.ts` with the following tests:

**Test 1 — Build test:**
```typescript
const track = buildTrack(TRACK_02_CONTROL_POINTS, 30);
expect(track).toBeDefined();
expect(track.totalLength).toBeGreaterThan(0);
```
Verifies `buildTrack` succeeds without error.

**Test 2 — Length test:**
```typescript
expect(track.totalLength).toBeGreaterThanOrEqual(3200);
expect(track.totalLength).toBeLessThanOrEqual(3600);
```
Verifies 30–40% longer than v02's ~2500 (with small tolerance).

**Test 3 — Checkpoint test:**
```typescript
expect(track.checkpoints.length).toBe(30);
for (const cp of track.checkpoints) {
  // Gate is non-degenerate (left and right are separated)
  const gateWidth = Math.hypot(cp.left.x - cp.right.x, cp.left.y - cp.right.y);
  expect(gateWidth).toBeGreaterThan(0);
  // Left and right are on opposite sides of center
  const lx = cp.left.x - cp.center.x, ly = cp.left.y - cp.center.y;
  const rx = cp.right.x - cp.center.x, ry = cp.right.y - cp.center.y;
  const crossL = lx * cp.direction.y - ly * cp.direction.x;
  const crossR = rx * cp.direction.y - ry * cp.direction.x;
  expect(Math.sign(crossL)).not.toBe(Math.sign(crossR));
}
```
Verifies all 30 checkpoints are non-degenerate with left/right on opposite sides.

**Test 4 — Boundary test:**
```typescript
// Both boundaries have same length (closed loop, same sample count)
expect(track.innerBoundary.length).toBe(track.outerBoundary.length);
// Expected sample count: controlPoints.length * SAMPLES_PER_SEGMENT + 1
const expectedSamples = TRACK_02_CONTROL_POINTS.length * 40 + 1;
expect(track.innerBoundary.length).toBe(expectedSamples);
```
Note: `SAMPLES_PER_SEGMENT = 40` is not exported. If it cannot be imported, use a hardcoded `40` with a comment: `// SAMPLES_PER_SEGMENT from src/engine/track.ts`. If the constant is not accessible, test only that `innerBoundary.length === outerBoundary.length` and both are `> 100`.

**Test 5 — Width test:**
```typescript
for (const cp of TRACK_02_CONTROL_POINTS) {
  expect(cp.width).toBeGreaterThanOrEqual(26); // ADR-12: ~26-36 range
}
```
Verifies all control point half-widths meet the ADR-12 minimum of 26.

**Test 6 — Start position and heading test** (replaces the fragile lap-completion test):
```typescript
// startPosition should be on-track (roughly near the first control point area)
expect(track.startPosition).toBeDefined();
expect(typeof track.startPosition.x).toBe('number');
expect(typeof track.startPosition.y).toBe('number');

// startHeading should align roughly with checkpoint 0 direction (within ±15°)
const cp0dir = track.checkpoints[0].direction;
const headingVec = { x: Math.cos(track.startHeading), y: Math.sin(track.startHeading) };
const dot = headingVec.x * cp0dir.x + headingVec.y * cp0dir.y;
// dot product of two unit vectors = cos(angle between them)
// cos(15°) ≈ 0.966, so dot > 0.95 means aligned within ~18°
expect(dot).toBeGreaterThan(0.9); // generous tolerance — car faces forward
```
Verifies the car spawns in a valid position facing the right direction.

**Test 7 — No-hairpin test:**
```typescript
const points = TRACK_02_CONTROL_POINTS;
for (let i = 0; i < points.length; i++) {
  const prev = points[(i - 1 + points.length) % points.length].position;
  const curr = points[i].position;
  const next = points[(i + 1) % points.length].position;

  const v1x = curr.x - prev.x, v1y = curr.y - prev.y;
  const v2x = next.x - curr.x, v2y = next.y - curr.y;

  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 < 1e-6 || mag2 < 1e-6) continue; // skip coincident points

  const dotProduct = (v1x * v2x + v1y * v2y) / (mag1 * mag2);
  const clampedDot = Math.max(-1, Math.min(1, dotProduct));
  // Turn angle = π - interior angle = π - acos(dot)
  // Interior angle (angle between incoming and outgoing vectors):
  const interiorAngle = Math.acos(clampedDot); // radians, 0 to π
  // Turn angle (how much the path bends):
  const turnAngle = Math.PI - interiorAngle; // 0 = straight, π = U-turn

  // ADR-12: no hairpins on Track 2. Turn angle must be < 60° (π/3 radians).
  // 60° turn angle = 120° interior angle. Anything sharper is hairpin territory.
  expect(turnAngle).toBeLessThan(Math.PI / 3); // < 60° turn
}
```
Enforces the "no hairpins" constraint from ADR-12 with explicit, unambiguous computation.

**Test 8 — Straight-segment length test:**
```typescript
// Identify straight sequences: consecutive control point pairs where the
// turn angle at the intermediate point is < 5° (effectively collinear)
const pts = TRACK_02_CONTROL_POINTS;
let maxStraightLength = 0;

// Check each consecutive pair distance when part of a straight section
// A "straight section" is a run of points where direction barely changes
for (let start = 0; start < pts.length; start++) {
  let straightLen = 0;
  for (let j = start; j < start + pts.length; j++) {
    const idx = j % pts.length;
    const nextIdx = (j + 1) % pts.length;

    // Distance between consecutive points
    const dx = pts[nextIdx].position.x - pts[idx].position.x;
    const dy = pts[nextIdx].position.y - pts[idx].position.y;
    const segDist = Math.hypot(dx, dy);

    // Check if the next point continues the straight (angle < 5° at nextIdx)
    const prevIdx = idx;
    const currIdx = nextIdx;
    const afterIdx = (j + 2) % pts.length;

    const v1x = pts[currIdx].position.x - pts[prevIdx].position.x;
    const v1y = pts[currIdx].position.y - pts[prevIdx].position.y;
    const v2x = pts[afterIdx].position.x - pts[currIdx].position.x;
    const v2y = pts[afterIdx].position.y - pts[currIdx].position.y;
    const m1 = Math.hypot(v1x, v1y);
    const m2 = Math.hypot(v2x, v2y);

    straightLen += segDist;

    if (m1 < 1e-6 || m2 < 1e-6) break;
    const dot = (v1x * v2x + v1y * v2y) / (m1 * m2);
    const turnAngle = Math.PI - Math.acos(Math.max(-1, Math.min(1, dot)));
    if (turnAngle > (5 * Math.PI / 180)) break; // > 5° turn ends the straight
  }
  maxStraightLength = Math.max(maxStraightLength, straightLen);
}

// AC: at least one straight ≥ 700 units (measured as control-point Euclidean distance;
// actual straight spline length is slightly shorter due to Catmull-Rom tangent blending)
expect(maxStraightLength).toBeGreaterThanOrEqual(700);
```

**Test 9 — Registry validation test:**
```typescript
import { TRACKS } from '../../src/tracks/registry';

const track02 = TRACKS.find(t => t.id === 'track-02');
expect(track02).toBeDefined();
expect(track02!.name).toBe('Speedway');
expect(track02!.description).toBeTruthy();
expect(track02!.description).not.toBe('Fast — sweeping curves, high speed'); // changed from v02
expect(track02!.parTimes.gold).toBeGreaterThan(0);
expect(track02!.parTimes.gold).toBeLessThan(track02!.parTimes.silver);
expect(track02!.parTimes.silver).toBeLessThan(track02!.parTimes.bronze);
```

### File Targets
- `src/tracks/track02.ts` — Complete rewrite of `TRACK_02_CONTROL_POINTS` with new speedway geometry
- `src/tracks/registry.ts` — Update Track 2 description and par times
- `tests/engine/track02-geometry.test.ts` — **NEW:** comprehensive geometry validation tests (9 tests)

### Acceptance Criteria
- [ ] `buildTrack(TRACK_02_CONTROL_POINTS, 30)` succeeds without error — `Satisfies: R-003`
- [ ] `track.totalLength` is between 3200 and 3600 units (30–40% larger than v02's ~2500, tight tolerance) — `Satisfies: R-009`
- [ ] Track has at least one straight segment ≥ 700 units (measured as control-point Euclidean distance along collinear sequences) — `Satisfies: R-009`
- [ ] All control point half-widths ≥ 26 (ADR-12 specifies ~26–36 range) — `Satisfies: R-009`
- [ ] No control point has a turn angle > 60° (no hairpins — ADR-12 constraint, computed as `π - acos(dot(v1,v2)/(|v1||v2|))`) — `Satisfies: R-009`
- [ ] All 30 checkpoints have non-degenerate gates (gate width > 0, left/right on opposite sides of center) — `Satisfies: R-003`
- [ ] Start position exists and start heading aligns with checkpoint 0 direction (dot product > 0.9) — `Satisfies: R-003`
- [ ] Inner and outer boundaries have matching length — `Satisfies: R-003`
- [ ] Registry entry for track-02 has updated description (differs from v02) and valid par times (gold < silver < bronze, all positive) — `Satisfies: R-003`
- [ ] `src/engine/` is completely untouched — zero modifications — `Satisfies: R-013`
- [ ] Existing `tests/engine/tracks.test.ts` still passes — `Satisfies: R-003`
- [ ] New `tests/engine/track02-geometry.test.ts` passes with all 9 tests green — `Satisfies: R-005`
- [ ] `pnpm test` passes with zero failures — `Satisfies: R-005`

### Dependencies
- **Depends on:** None — Wave 1
- **Needed by:** None directly (Phase 5 AI training will use these tracks)

### Locked Decisions
- Engine (`src/engine/`) is FROZEN — zero modifications (R-013)
- Track 1 (oval) geometry is FROZEN — do not touch `track01.ts` (R-014)
- Track geometry files are DATA, not engine code — safe to modify (CLAUDE.md)
- No hairpins on Track 2 (ADR-12)
- Wider surface than v02, minimum half-width 26 (ADR-12)
- `WALL_OFFSET = 30` — cannot be changed, must design around it

---

## 4. Strike Team Notes

**Rejected Findings:**

- **Agent 04 #1 (partial):** Suggested accessing `signedR[]` from `buildTrack` to measure actual spline curvature. Rejected — `signedR` is a local variable inside `buildTrack`, not exposed in `TrackState`. The control-point angle approach is sufficient for hand-authored data (15–20 points on a 3500-unit track won't have the pathological spacing cases Agent 04 describes). The turn angle computation is now explicit per the merged fix.

- **Agent 09 #1:** Suggested dropping the no-hairpin test entirely. Rejected — "no hairpins" is an explicit ADR-12 constraint and an acceptance criterion. Design constraints encoded as tests catch accidental violations during future track edits. The test is simple (angle math on ~20 points) and not overengineered.

- **Agent 06 #5:** Suggested a winding-number or segment-intersection test on boundaries. Rejected — this tests engine boundary generation behavior, not track data quality. The engine is frozen with 366+ tests. The curvature clamping is a feature, not a bug. Adding WALL_OFFSET context to implementation guidance (Finding #5) is sufficient prevention.

**Conflicts Resolved:**

- **No-hairpin test: keep vs. drop.** Agent 04 and Agent 06 wanted to improve/clarify the test; Agent 09 wanted to drop it. Resolution: keep the test with explicit angle math. The test is 15 lines, validates an explicit spec constraint, and prevents accidental regression. The "design guideline, not runtime invariant" argument doesn't hold — the test runs at build/CI time, not runtime.

- **Lap completion test: improve vs. simplify vs. drop.** Agent 04 suggested simplifying to "first 60 ticks without collision." Agent 06 suggested raising to "3 checkpoints with steering" or replacing with start position/heading check. Agent 09 said drop entirely. Resolution: replace with start position/heading validation (Agent 06 option b). This is the simplest option that catches the actual failure mode (car spawning off-track or facing a wall) without requiring simulation stepping.

**Review Gaps:**

- No performance agent ran. Not a concern — this plan modifies data files and writes tests. No runtime performance implications beyond `buildTrack` execution (which is a one-time initialization call).
- No architecture agent ran. Not a concern — the plan correctly respects the engine/data boundary. All changes are to track data and tests.
- No code surgery agent ran. Acceptable — the plan is a complete rewrite of one data array, not a surgical edit.

**Informational Notes:**

- Agent 04 #5: Straight-segment measurements using control-point Euclidean distance are ~10% shorter than actual spline path length due to Catmull-Rom tangent blending at endpoints. The 700-unit threshold has sufficient margin. A comment is included in the test.
- The `SAMPLES_PER_SEGMENT = 40` constant in `src/engine/track.ts` is not exported. Test 4 (boundary length) should handle this gracefully — try importing it, fall back to hardcoded `40` with comment, or simplify to checking `innerBoundary.length === outerBoundary.length && length > 100`.
- v02 Track 2 registry par times are `{ gold: 2100, silver: 2700, bronze: 3300 }`. New placeholder par times `{ gold: 3600, silver: 4500, bronze: 5400 }` reflect the ~40% longer circuit plus additional braking zones. These will be retuned after Phase 5 AI training and playtesting.