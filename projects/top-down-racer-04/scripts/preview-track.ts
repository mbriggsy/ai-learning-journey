/**
 * Track Preview Tool — Development Aid
 *
 * Renders track boundaries to SVG for visual inspection during track design.
 * Output goes to $TEMP directory (per user preference).
 *
 * Usage:
 *   tsx scripts/preview-track.ts track02
 *   tsx scripts/preview-track.ts track03
 *   tsx scripts/preview-track.ts track01
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildTrack } from '../src/engine/track';
import type { Vec2, TrackControlPoint } from '../src/engine/types';

const TRACK_ARG = process.argv[2];
if (!TRACK_ARG || !['track01', 'track02', 'track03'].includes(TRACK_ARG)) {
  console.error('Usage: tsx scripts/preview-track.ts <track01|track02|track03>');
  process.exit(1);
}

const CHECKPOINT_COUNTS: Record<string, number> = {
  track01: 30,
  track02: 40,
  track03: 45,
};

async function main(): Promise<void> {
  // Dynamic import of the track module
  const trackModule = await import(`../src/tracks/${TRACK_ARG}`);
  const exportName = `TRACK_${TRACK_ARG.slice(-2)}_CONTROL_POINTS`;
  const controlPoints: TrackControlPoint[] = trackModule[exportName];

  if (!controlPoints) {
    console.error(`Export ${exportName} not found in src/tracks/${TRACK_ARG}.ts`);
    process.exit(1);
  }

  const checkpointCount = CHECKPOINT_COUNTS[TRACK_ARG];
  console.log(`Building ${TRACK_ARG} (${controlPoints.length} CPs, ${checkpointCount} checkpoints)...`);

  const track = buildTrack(controlPoints, checkpointCount);

  // Compute bounding box from all boundary points
  const allPoints = [...track.innerBoundary, ...track.outerBoundary];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of allPoints) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const bbWidth = maxX - minX;
  const bbHeight = maxY - minY;
  const margin = 60;

  // SVG coordinate space: add margin around bounding box
  const viewMinX = minX - margin;
  const viewMinY = minY - margin;
  const viewWidth = bbWidth + 2 * margin;
  const viewHeight = bbHeight + 2 * margin;

  // Build SVG
  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}" width="${Math.max(800, viewWidth)}" height="${Math.max(600, viewHeight)}">`);
  lines.push('<style>');
  lines.push('  .boundary { fill: none; stroke-width: 1.5; }');
  lines.push('  .outer { stroke: #2563eb; }');
  lines.push('  .inner { stroke: #dc2626; }');
  lines.push('  .road-outer { stroke: #93c5fd; stroke-dasharray: 4,4; }');
  lines.push('  .road-inner { stroke: #fca5a5; stroke-dasharray: 4,4; }');
  lines.push('  .cp { fill: #16a34a; }');
  lines.push('  .grid { stroke: #e5e7eb; stroke-width: 0.5; }');
  lines.push('  .label { font-family: monospace; font-size: 10px; fill: #6b7280; }');
  lines.push('  .bb-label { font-family: monospace; font-size: 12px; fill: #374151; font-weight: bold; }');
  lines.push('</style>');
  lines.push('<rect x="' + viewMinX + '" y="' + viewMinY + '" width="' + viewWidth + '" height="' + viewHeight + '" fill="#fafafa"/>');

  // Grid lines at 100-unit intervals
  const gridStart = Math.floor(viewMinX / 100) * 100;
  const gridEnd = Math.ceil((viewMinX + viewWidth) / 100) * 100;
  const gridStartY = Math.floor(viewMinY / 100) * 100;
  const gridEndY = Math.ceil((viewMinY + viewHeight) / 100) * 100;

  for (let gx = gridStart; gx <= gridEnd; gx += 100) {
    lines.push(`<line x1="${gx}" y1="${viewMinY}" x2="${gx}" y2="${viewMinY + viewHeight}" class="grid"/>`);
    lines.push(`<text x="${gx + 2}" y="${viewMinY + 12}" class="label">${gx}</text>`);
  }
  for (let gy = gridStartY; gy <= gridEndY; gy += 100) {
    lines.push(`<line x1="${viewMinX}" y1="${gy}" x2="${viewMinX + viewWidth}" y2="${gy}" class="grid"/>`);
    lines.push(`<text x="${viewMinX + 2}" y="${gy - 2}" class="label">${gy}</text>`);
  }

  // Bounding box annotation
  lines.push(`<rect x="${minX}" y="${minY}" width="${bbWidth}" height="${bbHeight}" fill="none" stroke="#9ca3af" stroke-width="1" stroke-dasharray="6,3"/>`);
  lines.push(`<text x="${minX}" y="${minY - 6}" class="bb-label">BB: ${bbWidth.toFixed(0)} × ${bbHeight.toFixed(0)} | Length: ${track.totalLength.toFixed(0)}u</text>`);

  // Polyline helper
  const polylineStr = (pts: readonly Vec2[]) => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Road edges (dashed, behind boundaries)
  lines.push(`<polyline points="${polylineStr(track.outerRoadEdge)}" class="boundary road-outer"/>`);
  lines.push(`<polyline points="${polylineStr(track.innerRoadEdge)}" class="boundary road-inner"/>`);

  // Boundaries (solid)
  lines.push(`<polyline points="${polylineStr(track.outerBoundary)}" class="boundary outer"/>`);
  lines.push(`<polyline points="${polylineStr(track.innerBoundary)}" class="boundary inner"/>`);

  // Control points as dots
  for (let i = 0; i < controlPoints.length; i++) {
    const cp = controlPoints[i];
    lines.push(`<circle cx="${cp.position.x}" cy="${cp.position.y}" r="3" class="cp"/>`);
    lines.push(`<text x="${cp.position.x + 5}" y="${cp.position.y - 5}" class="label">${i}</text>`);
  }

  // Start position marker
  lines.push(`<circle cx="${track.startPosition.x}" cy="${track.startPosition.y}" r="5" fill="none" stroke="#f59e0b" stroke-width="2"/>`);

  lines.push('</svg>');

  // Write to temp directory
  const tempDir = os.tmpdir();
  const outPath = path.join(tempDir, `${TRACK_ARG}-preview.svg`);
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`Preview written to: ${outPath}`);
  console.log(`  BB: ${bbWidth.toFixed(0)} × ${bbHeight.toFixed(0)} units`);
  console.log(`  Track length: ${track.totalLength.toFixed(0)} units`);
  console.log(`  Checkpoints: ${track.checkpoints.length}`);
}

main().catch((err) => {
  console.error('Preview failed:', err);
  process.exit(1);
});
