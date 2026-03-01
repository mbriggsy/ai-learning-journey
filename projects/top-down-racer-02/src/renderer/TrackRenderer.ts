import { Container, Graphics } from 'pixi.js';
import type { TrackState, Vec2 } from '../engine/types';

// Track surface colors (locked decisions from CONTEXT.md)
const COLOR_ROAD_SURFACE   = 0x3a3a3a; // Dark grey — safe
const COLOR_RUNOFF_BG      = 0xc2a87a; // Light tan — sand/gravel runoff
const COLOR_WALL_STROKE    = 0x7b3b2a; // Red-brown — danger
const COLOR_FINISH_WHITE   = 0xffffff;
const COLOR_FINISH_DARK    = 0x111111;

const WALL_STROKE_WIDTH    = 2.0;
const FINISH_SQUARES       = 8; // Number of alternating squares across finish line

/**
 * Build all track graphics and cache them as a single GPU texture.
 * Called once at startup. Returns a Container added to worldContainer.
 *
 * Layer order (back to front):
 *   1. Runoff background (wall-to-wall annular region, light tan)
 *   2. Road surface (road-edge annular region, dark grey)
 *   3. Finish line (checkered strip at checkpoint[0])
 *   4. Wall boundary strokes (red-brown lines)
 */
export function buildTrackGraphics(
  track: TrackState,
  shoulderSide: 'inner' | 'both' = 'inner',
): Container {
  const container = new Container();

  // Helper: Vec2[] → flat number array [x0, y0, x1, y1, ...]
  function flatten(pts: readonly { x: number; y: number }[]): number[] {
    const arr: number[] = [];
    for (const p of pts) { arr.push(p.x, p.y); }
    return arr;
  }

  // 1. Runoff/shoulder background — sand-colored annular fill between walls
  //    Shows as a sand strip (shoulder) between road edge and wall.
  const runoff = new Graphics();
  runoff.poly(flatten(track.outerBoundary)).fill(COLOR_RUNOFF_BG);
  runoff.poly(flatten(track.innerBoundary)).cut();
  container.addChild(runoff);

  // 2. Road surface — dark grey annular fill
  //    'both' shoulders: road stops at road edges, shoulder on both sides
  //    'inner' shoulder: road extends to outer wall, shoulder only on inner side
  const outerRoadPoly = shoulderSide === 'inner'
    ? flatten(track.outerBoundary)
    : flatten(track.outerRoadEdge);
  const road = new Graphics();
  road.poly(outerRoadPoly).fill(COLOR_ROAD_SURFACE);
  road.poly(flatten(track.innerRoadEdge)).cut();
  container.addChild(road);

  // 3. Finish line — BEFORE walls so walls render on top of edges
  if (track.checkpoints.length > 0) {
    const finishLine = buildFinishLine(track);
    container.addChild(finishLine);
  }

  // 4. Wall boundary strokes — both inner and outer edges, red-brown
  const walls = new Graphics();
  walls.poly(flatten(track.outerBoundary)).stroke({ width: WALL_STROKE_WIDTH, color: COLOR_WALL_STROKE });
  walls.poly(flatten(track.innerBoundary)).stroke({ width: WALL_STROKE_WIDTH, color: COLOR_WALL_STROKE });
  container.addChild(walls);

  return container;
}

/** Build the checkered finish line strip at checkpoint[0]. Two rows for classic look. */
function buildFinishLine(track: TrackState): Graphics {
  const gate = track.checkpoints[0];
  const g = new Graphics();

  const perpX = gate.direction.x;
  const perpY = gate.direction.y;
  const rowThick = 4.0;

  for (let row = 0; row < 2; row++) {
    const rowOffset = (row - 0.5) * rowThick;

    for (let i = 0; i < FINISH_SQUARES; i++) {
      const t0 = i / FINISH_SQUARES;
      const t1 = (i + 1) / FINISH_SQUARES;

      const x0 = gate.left.x + (gate.right.x - gate.left.x) * t0;
      const y0 = gate.left.y + (gate.right.y - gate.left.y) * t0;
      const x1 = gate.left.x + (gate.right.x - gate.left.x) * t1;
      const y1 = gate.left.y + (gate.right.y - gate.left.y) * t1;

      const ox0 = x0 + perpX * rowOffset;
      const oy0 = y0 + perpY * rowOffset;
      const ox1 = x1 + perpX * rowOffset;
      const oy1 = y1 + perpY * rowOffset;

      const qx0 = ox0 + perpX * (rowThick / 2);
      const qy0 = oy0 + perpY * (rowThick / 2);
      const qx1 = ox1 + perpX * (rowThick / 2);
      const qy1 = oy1 + perpY * (rowThick / 2);
      const qx2 = ox1 - perpX * (rowThick / 2);
      const qy2 = oy1 - perpY * (rowThick / 2);
      const qx3 = ox0 - perpX * (rowThick / 2);
      const qy3 = oy0 - perpY * (rowThick / 2);

      const color = (i + row) % 2 === 0 ? COLOR_FINISH_WHITE : COLOR_FINISH_DARK;
      g.poly([qx0, qy0, qx1, qy1, qx2, qy2, qx3, qy3]).fill(color);
    }
  }

  return g;
}
