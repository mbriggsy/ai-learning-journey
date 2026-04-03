Now I have all the data I need. Let me count the actual control points and write the strengthened plan.

The actual v02 Track 3 has: counting the entries in the array — 35 control points (not 43 as the original plan stated). Width constants are `W = 22, C = 20, H = 12` (not `W = 20, C = 16, H = 13`). Track 3 registry entry has no `shoulderSide` property. Existing test imports from `vitest` and uses relative paths.

Now I'll produce the complete synthesis output.

---

## 1. Strike Team Roster

```
STRIKE TEAM ROSTER
═══════════════════

Tier 1: Core Agents
  ✓ 01 The Surgeon          3 issues
  ✓ 02 The Architect        2 issues
  ✗ 03 The Profiler         NOT ACTIVATED
  ✓ 04 The Saboteur         7 issues
  ✗ 05 (unused slot)        NOT ACTIVATED

Tier 2: Specialists
  ✓ 06 The Skeptic          6 issues
  ✓ 07 The Accountant       5 issues
  ✓ 08 The Oracle           1 issue
  ✓ 09 The Simplifier       2 issues
  ✓ 10 The Researcher       4 issues

Tier 3: Governance
  ○ Not activated

Total: 8 agents ran | 30 findings | 17 accepted | 3 rejected | 10 merged
Review gaps: Performance profiling not reviewed (Agent 03 not activated).
  This is acceptable — plan is a data file rewrite, not a runtime-critical system.
```

## 2. Findings

| # | Severity | Finding | Fix | Found By | Resolution |
|---|----------|---------|-----|----------|------------|
| 1 | 🔴 CRITICAL | No chicane test exists. AC requires "one chicane present" but no test verifies it. A track with zero chicanes would pass all tests. | Add test: Chicane detection — identify a sequence where turning direction reverses within a short span. Use cross-product sign changes on consecutive direction vectors. | Agent 06 | ACCEPTED |
| 2 | 🔴 HIGH | Corner identification algorithm completely unspecified. Tests 5, 6, 7 depend on segmenting corners but no algorithm is defined. | Export corner metadata from track file (`TRACK_03_CORNERS` array with indices and declared radii). Tests verify labels are geometrically valid. | Agents 04, 06, 09 | MERGED — Agent 09's metadata approach adopted over Agents 04/06's algorithmic detection. Simpler, more reliable, same coverage. |
| 3 | 🔴 HIGH | No boundary self-intersection test. Complex geometry with chicanes and narrow widths is most likely to self-intersect. `buildTrack` doesn't validate this. | Add boundary non-intersection test: verify inner and outer boundary polygons don't self-intersect using segment-segment intersection checks. | Agents 04, 06 | MERGED |
| 4 | 🔴 HIGH | Decreasing-radius test requires ≥3 points but proving "decreases" needs ≥2 radius estimates = ≥4 points. Plan body says "4+ points" but AC contradicts. | Change threshold from ≥3 to ≥4 control points. | Agent 07 | ACCEPTED |
| 5 | 🔴 HIGH | Decreasing-radius verification using "angles relative to an estimated center" is geometrically incorrect — a decreasing-radius corner has no single center. | Use successive-triplet circumradius: compute R for triplets (A,B,C), (B,C,D), etc. Verify each R is smaller than the previous. | Agent 04 | ACCEPTED |
| 6 | 🟡 MEDIUM | v02 reference widths wrong: plan says W=20, C=16, H=13 but actual values are W=22, C=20, H=12. | Correct all v02 references. | Agents 01, 02, 07, 10 | MERGED |
| 7 | 🟡 MEDIUM | Length test bounds (3800–4800) don't match 50–60% spec. 3800 = only 41% longer. | Tighten to 4000–4500 (48–67% tolerance). | Agents 04, 06, 07 | MERGED |
| 8 | 🟡 MEDIUM | "Identify by comment" path in decreasing-radius test is not geometric verification. | Remove comment-based identification. Test MUST use geometric detection via successive triplet radii. | Agent 06 | ACCEPTED |
| 9 | 🟡 MEDIUM | Lap completion test has no steering algorithm specified. Straight-line driving crashes on first corner. | Use low-speed centerline-following controller with proportional steering toward next checkpoint. Set 50,000 tick failsafe. | Agents 04, 06 | MERGED |
| 10 | 🟡 MEDIUM | Unique-radius test doesn't specify how to handle decreasing-radius corner which spans a range of radii. | Use tightest radius estimate for decreasing-radius corner in uniqueness check. | Agent 07 | ACCEPTED |
| 11 | 🟡 MEDIUM | Circumradius formula has no near-collinear guard. Near-collinear points produce R → ∞. | Add minimum-area guard: skip triplets where triangle area < 1.0 sq units. | Agent 04 | ACCEPTED |
| 12 | 🟡 MEDIUM | Par times are placeholders with no flag indicating they need tuning. | Add `// TODO(phase-5): tune par times after AI training` comment. | Agent 08 | ACCEPTED |
| 13 | 🟡 MEDIUM | ADR-12 table says "two chicanes" but constraints section says "one chicane." Spec contradiction unaddressed. | Follow constraints section (one chicane). Document the contradiction in code comment. | Agent 07 | ACCEPTED — constraints section is more specific and authoritative. |
| 14 | 🟡 MEDIUM | New test file must follow existing Vitest import patterns (`import { describe, it, expect } from 'vitest'`). | Explicitly specify import convention in plan. | Agent 10 | ACCEPTED |
| 15 | 🟡 MEDIUM | Four width constants (W=22, C=16, N=14, D=15) — D and N differ by 1 unit, visually indistinguishable. | Merge to three: W=22 (wide), C=16 (corners), N=14 (narrow/technical). | Agent 09 | ACCEPTED |
| 16 | 🟡 MEDIUM | 10% radius tolerance comparison doesn't specify denominator. | Use `min(R1, R2)` as denominator: `|R1 - R2| / min(R1, R2) < 0.10`. | Agent 04 | ACCEPTED |
| 17 | 🟡 LOW | v02 control point count stated as 43, actual is 35. | Correct to 35. | Agents 01, 10 | MERGED |

```
Findings requiring gate escalation: None
```

## 3. Implementation Specification

---

### Plan 3 — Strengthened Implementation Specification

**Wave:** 1
**Commit Message:** `feat(phase1): redesign Track 3 (gauntlet) geometry — mixed-radius technical circuit with zero repeated corners`

---

#### Context for the Implementer

**Engine is FROZEN.** You edit DATA files only (`src/tracks/track03.ts`, `src/tracks/registry.ts`). Zero changes to `src/engine/`.

**TrackControlPoint interface** (from `src/engine/types.ts`):
```typescript
interface TrackControlPoint {
  position: Vec2;  // { x: number; y: number } (readonly fields, satisfied by object literals)
  width: number;   // half-width of track at this point
}
```

**How buildTrack works:** Catmull-Rom spline interpolation, closed loop, boundaries offset ±width. Three smoothing passes (box filter, radius 10). Self-intersection = broken track. Narrow widths at tight corners prevent boundary crossing.

**v02 Track 3 reference data (verified):**
- 35 control points
- Width constants: `W = 22` (standard), `C = 20` (corners), `H = 12` (hairpin)
- Approximate bounding box: x ∈ [-410, 260], y ∈ [-220, 410]
- Total circuit length: ~2700 units (run `buildTrack(TRACK_03_CONTROL_POINTS, 30).totalLength`)
- Features: start/finish straight, 90° right, short straight, 90° left, hairpin 180°, S-bend, return sweep

**v03 Track 3 design requirements (from ADR-12):**
1. **50–60% longer circuit** than v02 (~4050–4320 units target, test range 4000–4500)
2. **Minimum 6 distinct corners**, no two with the same geometric radius (within 10% tolerance using `min(R1,R2)` denominator)
3. **One genuinely decreasing-radius corner** (tightens mid-corner, ≥4 control points, successive triplet radii decrease)
4. **One chicane** (two direction changes in quick succession — left-right or right-left)
5. **Variable width:** narrower in technical sections (~14 half-width), wider on straights (~22 half-width)
6. **The memorization test:** An AI that memorized v02 Track 3 should fail this track

---

#### File 1: `src/tracks/track03.ts` — Complete Rewrite

**Width constants** (three tiers, not four):
```typescript
const W = 22;   // wide — straights and open sections
const C = 16;   // corner — standard turns
const N = 14;   // narrow — technical sections (chicane, tight corners, decreasing-radius)
```

**Corner metadata export** — alongside the control points, export a corner metadata array:
```typescript
export interface TrackCornerInfo {
  name: string;           // human-readable label
  startIndex: number;     // index into TRACK_03_CONTROL_POINTS where corner begins
  endIndex: number;       // index where corner ends (inclusive)
  approxRadius: number;   // designed geometric radius (for uniqueness verification)
  type: 'standard' | 'decreasing-radius' | 'chicane';
}

export const TRACK_03_CORNERS: TrackCornerInfo[] = [
  // Populated by implementer — see circuit layout below
];
```

**Circuit layout — design section by section:**

Label each section clearly in comments. Suggested layout:

1. **Start/finish straight** (heading east, ~400 units, width W)
2. **Corner 1: Medium right-hander** (~90°, radius ~120, width C) — 4–5 control points
3. **Short straight** (~150 units, width W)
4. **Corner 2: Tight left-hander** (~90°, radius ~60, width N) — 4–5 control points
5. **Back straight** (~300 units, width W)
6. **Corner 3: Long sweeping right** (~135°, radius ~200, width C) — 6–8 control points (large radius needs more points for smoothness)
7. **Corner 4: DECREASING-RADIUS left** (starts ~radius 150, tightens to ~80, width N) — minimum 5 control points. Each successive pair of control points must be closer together angularly. The practical effect is the car must keep tightening its steering.
8. **Connector straight** (~200 units, width W)
9. **Corner 5: CHICANE** (right-left, 5–6 points, width N). Design constraint: minimum turning radius ≥ 50 units through chicane to prevent boundary self-intersection (based on `WALL_OFFSET=30` + `MIN_INNER_WALL=4` + margin). Keep points well-spaced at inflection points where curvature sign changes.
10. **Corner 6: Wide right-hander** (~120°, radius ~100, width C) — 4–5 control points
11. **Return section** — sweeping curves back to start (width W or wider)

**Target radii for uniqueness (all must differ by >10%):**
- Corner 1: ~120
- Corner 2: ~60
- Corner 3: ~200
- Corner 4: ~80 (tightest radius used for uniqueness check)
- Corner 5: chicane (excluded from radius uniqueness — verified separately)
- Corner 6: ~100

Verification: 60, 80, 100, 120, 200 — minimum pairwise ratio gap is 80/100 = 20%, well above 10%.

**TRACK_03_CORNERS metadata:** After designing the control points, populate `TRACK_03_CORNERS` with one entry per corner:
- `startIndex` / `endIndex` must point to actual control point indices
- `approxRadius` is the designed radius (for Corner 4 decreasing-radius, use the tightest radius ~80)
- `type` is `'chicane'` for Corner 5, `'decreasing-radius'` for Corner 4, `'standard'` for all others

**Geometry validation during design:**
- Run `buildTrack(TRACK_03_CONTROL_POINTS, 30)` after each section to verify no build errors
- Check `track.totalLength` approaches 4000–4500 range
- Visually verify boundary arrays don't cross (the test suite will catch this formally)

---

#### File 2: `src/tracks/registry.ts` — Update Track 3 Entry

Change only the Track 3 entry in the `TRACKS` array:
```typescript
{
  id: 'track-03',
  name: 'Gauntlet',
  description: 'Championship — mixed corners, no two alike',
  controlPoints: TRACK_03_CONTROL_POINTS,
  parTimes: { gold: 4800, silver: 6000, bronze: 7200 }, // TODO(phase-5): tune par times after AI training
},
```

**Notes:**
- `id` and `name` are unchanged
- `description` updated from `'Technical — tight hairpins, precision'`
- `shoulderSide` is NOT set on Track 3 and should remain unset
- No other entries in the `TRACKS` array are modified
- Add import for `TRACK_03_CONTROL_POINTS` from the new track file if the import path changes (it shouldn't — same file, same export name)

---

#### File 3: `tests/engine/track03-geometry.test.ts` — NEW

**File structure:**

```typescript
import { describe, it, expect } from 'vitest';
import { buildTrack } from '../../src/engine/track';
import { TRACK_03_CONTROL_POINTS, TRACK_03_CORNERS } from '../../src/tracks/track03';
// Import additional engine types as needed (Vec2, etc.)
```

**Utility functions defined within the test file:**

1. **Circumradius function** with collinear guard:
```typescript
function circumradius(a: Vec2, b: Vec2, c: Vec2): number | null {
  const area = Math.abs(
    (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)
  ) / 2;
  if (area < 1.0) return null; // near-collinear, skip
  const ab = Math.hypot(b.x - a.x, b.y - a.y);
  const bc = Math.hypot(c.x - b.x, c.y - b.y);
  const ac = Math.hypot(c.x - a.x, c.y - a.y);
  return (ab * bc * ac) / (4 * area);
}
```

2. **Radius uniqueness comparator** using `min(R1, R2)` denominator:
```typescript
function radiiAreTooSimilar(r1: number, r2: number): boolean {
  return Math.abs(r1 - r2) / Math.min(r1, r2) < 0.10;
}
```

3. **Segment intersection check** for boundary validation:
```typescript
function segmentsIntersect(
  p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2
): boolean {
  // Standard cross-product-based segment intersection test
  // Returns true if segments (p1,p2) and (p3,p4) cross
  // Exclude adjacent segments (shared endpoints)
}
```

**Test suite — 11 tests in a `describe('Track 03 geometry')` block:**

**Test 1: Build test**
```
buildTrack(TRACK_03_CONTROL_POINTS, 30) succeeds without throwing
```

**Test 2: Length test**
```
track.totalLength >= 4000 && track.totalLength <= 4500
```
Rationale: v02 ≈ 2700; 4000 = 48% longer (slight under-tolerance), 4500 = 67% longer (slight over-tolerance). Covers the 50–60% spec with engineering margin.

**Test 3: Checkpoint test**
```
track.checkpoints.length === 30
All checkpoints have valid left, right, center, direction vectors (non-zero)
```

**Test 4: Boundary test**
```
track.innerBoundary.length > 0
track.outerBoundary.length > 0
```

**Test 5: Boundary non-intersection test** *(NEW — not in original plan)*
```
For inner boundary polygon: no two non-adjacent segments intersect
For outer boundary polygon: no two non-adjacent segments intersect
```
Use O(n²) segment-segment intersection check. Skip adjacent segments (they share an endpoint). This is the most important geometry validity test for a complex circuit with chicanes and narrow sections.

**Test 6: Corner count test**
```
TRACK_03_CORNERS.length >= 6
Each corner's startIndex and endIndex are valid indices into TRACK_03_CONTROL_POINTS
startIndex < endIndex for each corner
```

**Test 7: Unique radius test** *(CRITICAL — Satisfies R-004)*
```
Filter TRACK_03_CORNERS to type !== 'chicane' (chicanes excluded from radius uniqueness)
For each non-chicane corner, get its approxRadius from metadata
For each pair of corners, verify: |R1 - R2| / min(R1, R2) >= 0.10
Additionally, for each corner, compute the geometric circumradius from the first, middle, and last control points (using startIndex/endIndex).
If circumradius returns non-null, verify it is within 50% of the declared approxRadius (sanity check — catches grossly mislabeled corners)
```

**Test 8: Decreasing-radius test**
```
Find the corner in TRACK_03_CORNERS with type === 'decreasing-radius'
Verify exactly one exists
Verify it has >= 4 control points (endIndex - startIndex + 1 >= 4)
Extract the control points for this corner
Compute circumradius for each consecutive triplet: (i, i+1, i+2)
Skip triplets where circumradius returns null (collinear guard)
Verify at least 2 valid radius estimates exist
Verify each successive radius is smaller than the previous (R[n+1] < R[n])
```

**Test 9: Chicane test** *(NEW — was missing entirely)*
```
Find the corner in TRACK_03_CORNERS with type === 'chicane'
Verify exactly one exists
Extract the control points for this corner
Compute direction vectors between consecutive points
Compute cross products between consecutive direction vectors
Verify at least one sign change in cross products (indicates direction reversal)
Verify the total arc length of the chicane section is < 300 units (it's "quick")
```

**Test 10: Width variation test**
```
const widths = TRACK_03_CONTROL_POINTS.map(p => p.width);
expect(Math.min(...widths)).toBeLessThanOrEqual(16);
expect(Math.max(...widths)).toBeGreaterThanOrEqual(20);
```

**Test 11: Lap completion test**
```
Build the track with 30 checkpoints
Implement a simple centerline-following controller:
  - Start at checkpoint 0 center, heading in checkpoint 0 direction
  - Each tick: steer proportionally toward the center of the next uncrossed checkpoint
  - Use low throttle (speed ≤ 30% of max) to ensure corners are navigable
  - Detect checkpoint crossing when car position passes through checkpoint gate
Set max ticks = 50,000 (failsafe against infinite loops)
Verify all 30 checkpoints are crossed in order (lap completed)
If implementing a full step-sim is too complex, use the alternative geometric approach:
  - For each pair of consecutive checkpoints, verify the centerline path between them
    doesn't require passing through a wall (the midpoint between their centers is inside
    the track boundaries)
  - This verifies "driveability" without a physics controller
```

---

#### Acceptance Criteria

- [ ] `buildTrack(TRACK_03_CONTROL_POINTS, 30)` succeeds without error — `Satisfies: R-003`
- [ ] `track.totalLength` is between 4000 and 4500 units (50–60% larger than v02's ~2700, with engineering tolerance) — `Satisfies: R-010`
- [ ] Track has ≥ 6 distinct corners declared in `TRACK_03_CORNERS` — `Satisfies: R-010`
- [ ] Zero repeated corner radii: no two non-chicane corners have `|R1-R2|/min(R1,R2) < 0.10` — `Satisfies: R-004`
- [ ] One corner is demonstrably decreasing-radius (≥ 4 points, successive triplet radii decrease) — `Satisfies: R-010`
- [ ] One chicane present (direction reversal detected geometrically) — `Satisfies: R-010`
- [ ] Track width varies: minimum half-width ≤ 16, maximum ≥ 20 — `Satisfies: R-010`
- [ ] All 30 checkpoints have valid geometry — `Satisfies: R-003`
- [ ] Inner and outer boundary polygons do not self-intersect — `Satisfies: R-003`
- [ ] `src/engine/` is completely untouched — `Satisfies: R-013`
- [ ] Existing `tests/engine/tracks.test.ts` still passes — `Satisfies: R-003`
- [ ] New `tests/engine/track03-geometry.test.ts` passes — `Satisfies: R-005`
- [ ] `pnpm test` passes with zero failures — `Satisfies: R-005`

---

#### File Targets

| File | Action | Description |
|------|--------|-------------|
| `src/tracks/track03.ts` | REWRITE | New `TRACK_03_CONTROL_POINTS` array + new `TRACK_03_CORNERS` metadata export |
| `src/tracks/registry.ts` | MODIFY | Update Track 3 description and par times (with TODO comment) |
| `tests/engine/track03-geometry.test.ts` | CREATE | 11 tests covering all acceptance criteria |

---

#### Dependencies

- **Depends on:** None — Wave 1
- **Needed by:** None directly (Phase 5 AI training will use these tracks)

---

#### Locked Decisions

- Engine (`src/engine/`) is FROZEN — zero modifications (R-013)
- Track 1 (oval) geometry is FROZEN (R-014)
- Minimum 6 distinct corners, no two with same radius (ADR-12)
- One decreasing-radius corner required (ADR-12)
- One chicane required (ADR-12, constraints section — see Strike Team Notes re: spec contradiction)
- Variable width: narrower in technical, wider on straights (ADR-12)

---

## 4. Strike Team Notes

**Rejected findings:**

- **Agent 10 #4 (LOW — readonly Vec2 imprecision):** Rejected. Object literals satisfy `readonly` interface fields. No runtime or compilation impact. Pure documentation noise that would add clutter to the plan.
- **Agent 01 #2 / Agent 10 #1 (MEDIUM — shoulderSide documentation):** Partially accepted as a note in the registry section. No code change needed — `shoulderSide` is not set on Track 3 and correctly remains unset. Adding explicit documentation of "don't add this" is covered in the plan text.
- **Agent 02 #2 (MEDIUM — test file organization):** Rejected as an issue. With 11 tests, a separate file is justified and follows the plan's original intent. The existing `tracks.test.ts` has a single parameterized test that covers all three tracks — the new file's detailed geometry tests are a different concern. No duplication risk since `tracks.test.ts` only tests basic build validity.

**Resolved conflicts:**

- **Corner detection approach (Agents 04/06 vs Agent 09):** Resolved in favor of Agent 09's metadata approach. The coder writes the control points and labels the corners — having tests algorithmically "discover" corners from raw geometry is over-engineering. The metadata approach is simpler (~20 lines vs ~80 lines of geometric analysis), equally rigorous (geometric sanity checks on declared radii prevent lying labels), and more maintainable. However, I incorporated Agents 04/06's geometric validation as sanity checks on the declared metadata rather than as the primary detection mechanism.

- **Length test bounds (Agents 04, 06, 07):** Resolved with 4000–4500. Agent 04 suggested 4000–4400 (tight), Agent 06 suggested computing from v02 actual length, Agent 07 suggested 4000–4500. The 4000–4500 range provides sufficient engineering tolerance (48–67%) around the 50–60% spec while being tighter than the original 3800–4800.

- **Chicane count — spec contradiction (Agent 07 #4):** ADR-12's track-by-track table says "two chicanes" but the constraints section says "One chicane." Resolved by following the constraints section (one chicane). The constraints section is more specific and detailed — the table is a summary that likely contains a typo. The plan documents this contradiction but does not add a second chicane.

**Review gaps:**

- Performance profiling (Agent 03) was not activated. This is acceptable — the plan modifies data files and creates tests. No runtime performance implications beyond what `buildTrack` already handles. The boundary self-intersection test uses O(n²) but runs only during testing, not at runtime.

**Observations for future plans:**

- The v03 spec document (ADR-12) has an internal contradiction on chicane count. This should be corrected in the spec to prevent confusion in future phases.
- The v02 reference data in the original plan had three factual errors (width constants, control point count). Future plans should verify reference data against source files before drafting.
- The `TrackCornerInfo` metadata export pattern established here could be reused for Track 2's plan if it has similar corner uniqueness requirements.