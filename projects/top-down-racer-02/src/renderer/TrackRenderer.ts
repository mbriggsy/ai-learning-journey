import { Container, Graphics } from 'pixi.js';
import type { TrackState } from '../engine/types';

// Track surface colors (locked decisions from CONTEXT.md)
const COLOR_ROAD_SURFACE   = 0x3a3a3a; // Dark grey — safe
const COLOR_RUNOFF_BG      = 0xc2a87a; // Light tan — warning zone
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
 *   1. Runoff background (full outer polygon, light tan)
 *   2. Road surface (outer minus inner, dark grey)
 *   3. Wall boundary strokes (red-brown lines)
 *   4. Finish line (checkered strip at checkpoint[0])
 */
export function buildTrackGraphics(track: TrackState): Container {
  const container = new Container();

  // Helper: Vec2[] → flat number array [x0, y0, x1, y1, ...]
  function flatten(pts: readonly { x: number; y: number }[]): number[] {
    const arr: number[] = [];
    for (const p of pts) { arr.push(p.x, p.y); }
    return arr;
  }

  // 1. Runoff background — full outer boundary filled light tan
  const runoff = new Graphics();
  runoff.poly(flatten(track.outerBoundary)).fill(COLOR_RUNOFF_BG);
  container.addChild(runoff);

  // 2. Road surface — outer polygon filled dark grey, inner polygon cut out
  //    .cut() punches a hole using the winding rule
  const road = new Graphics();
  road.poly(flatten(track.outerBoundary)).fill(COLOR_ROAD_SURFACE);
  road.poly(flatten(track.innerBoundary)).cut();
  container.addChild(road);

  // 3. Wall boundary strokes — both inner and outer edges, red-brown
  const walls = new Graphics();
  walls.poly(flatten(track.outerBoundary)).stroke({ width: WALL_STROKE_WIDTH, color: COLOR_WALL_STROKE });
  walls.poly(flatten(track.innerBoundary)).stroke({ width: WALL_STROKE_WIDTH, color: COLOR_WALL_STROKE });
  container.addChild(walls);

  // 4. Finish line — checkered strip at checkpoint[0] (VIS-05)
  //    The finish gate has .left and .right defining the gate endpoints.
  if (track.checkpoints.length > 0) {
    const finishLine = buildFinishLine(track);
    container.addChild(finishLine);
  }

  // Cache entire track as GPU texture — never redrawn
  container.cacheAsTexture(true);

  return container;
}

/** Build the checkered finish line strip at checkpoint[0]. */
function buildFinishLine(track: TrackState): Graphics {
  const gate = track.checkpoints[0];
  const g = new Graphics();

  for (let i = 0; i < FINISH_SQUARES; i++) {
    const t0 = i / FINISH_SQUARES;
    const t1 = (i + 1) / FINISH_SQUARES;

    // Interpolate across the gate left → right
    const x0 = gate.left.x + (gate.right.x - gate.left.x) * t0;
    const y0 = gate.left.y + (gate.right.y - gate.left.y) * t0;
    const x1 = gate.left.x + (gate.right.x - gate.left.x) * t1;
    const y1 = gate.left.y + (gate.right.y - gate.left.y) * t1;

    // Gate direction perpendicular (the "thickness" of the strip along the track)
    // gate.direction is the unit vector along the track centerline at this gate
    const perpX = -gate.direction.y;
    const perpY =  gate.direction.x;
    const halfThick = 5.0; // Half-thickness of the checkered strip in world units

    // Quad corners for this square
    const qx0 = x0 + perpX * halfThick;
    const qy0 = y0 + perpY * halfThick;
    const qx1 = x1 + perpX * halfThick;
    const qy1 = y1 + perpY * halfThick;
    const qx2 = x1 - perpX * halfThick;
    const qy2 = y1 - perpY * halfThick;
    const qx3 = x0 - perpX * halfThick;
    const qy3 = y0 - perpY * halfThick;

    const color = i % 2 === 0 ? COLOR_FINISH_WHITE : COLOR_FINISH_DARK;
    g.poly([qx0, qy0, qx1, qy1, qx2, qy2, qx3, qy3]).fill(color);
  }

  return g;
}
