/**
 * `pnpm verify:gameplay-clip <path>` — ffprobe gate for the Phase 5 →
 * Phase 4 gameplay-clip handoff (Phase 4 Unit 4.6 deliverable).
 *
 * Asserts the clip matches the S05 contract:
 *   - exactly 540 frames @ 30fps (18.000s ±0 frames)
 *   - 1920×1080 landscape
 *   - NO audio stream present (Phase 5 ships `ffmpeg -an`)
 *
 * Plus a soft frame-0 luminance check per Unit 4.6 amendment TIER 1 #5:
 * if mean YAVG > 76.5 (30% of 255) the S05HeadFadeFromBlack overlay is
 * load-bearing for the chapter-break fade. Soft warning, not hard fail —
 * the mandatory overlay handles it. Hard enforcement lives in
 * verify-s05-head-fade.ts (grep gate confirming the overlay is wired).
 *
 * Usage:
 *   pnpm verify:gameplay-clip ./public/trailer/gameplay.mp4.new
 *   pnpm verify:gameplay-clip ./public/trailer/gameplay-placeholder.mp4   # smoke-tests the placeholder
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — any hard check failed (with diagnostic listing each assertion)
 *   2 — file not found or ffprobe unreachable
 *
 * Uses `execFileSync` argv arrays (NOT shell) per project security
 * convention; matches lib/ffmpeg.ts.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const TARGET_FRAMES = 540
const TARGET_DURATION_SEC = 18.0
const TARGET_WIDTH = 1920
const TARGET_HEIGHT = 1080
const LUMA_THRESHOLD = 76.5 // 30% of 255 — head-fade load-bearing threshold

const arg = process.argv[2]
if (!arg) {
  console.error('Usage: tsx verify-gameplay-clip.ts <path-to-mp4>')
  process.exit(2)
}

const file = resolve(arg)
if (!existsSync(file)) {
  console.error(`[verify-gameplay-clip] FAIL: file not found: ${file}`)
  process.exit(2)
}

console.log(`[verify-gameplay-clip] target: ${file}`)

const failures: string[] = []

// 1. Video stream probe — dimensions, frame count, duration.
const videoProbe = execFileSync(
  'ffprobe',
  [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,nb_frames,duration,codec_name',
    '-of',
    'json',
    file,
  ],
  { encoding: 'utf-8' },
)
const videoStreams = (JSON.parse(videoProbe) as { streams?: Array<Record<string, unknown>> }).streams ?? []
if (videoStreams.length === 0) {
  failures.push('no video stream present')
} else {
  const v = videoStreams[0]
  const width = Number(v.width)
  const height = Number(v.height)
  const nbFrames = Number(v.nb_frames)
  const duration = Number(v.duration)
  const codec = String(v.codec_name)

  console.log(`  video: ${codec} ${width}x${height}, ${nbFrames} frames, ${duration.toFixed(3)}s`)

  if (width !== TARGET_WIDTH || height !== TARGET_HEIGHT) {
    failures.push(`dimensions ${width}x${height} != ${TARGET_WIDTH}x${TARGET_HEIGHT}`)
  }
  if (nbFrames !== TARGET_FRAMES) {
    failures.push(`nb_frames ${nbFrames} != ${TARGET_FRAMES} (${(nbFrames / 30).toFixed(3)}s @ 30fps vs target ${TARGET_DURATION_SEC.toFixed(3)}s)`)
  }
  // Allow ±1ms tolerance — H264 GOP boundaries can shift the reported duration slightly even at exact frame counts.
  if (Math.abs(duration - TARGET_DURATION_SEC) > 0.002) {
    failures.push(`duration ${duration.toFixed(3)}s != ${TARGET_DURATION_SEC.toFixed(3)}s (±2ms tolerance)`)
  }
}

// 2. Audio absence check — fails if ANY audio stream present.
const audioProbe = execFileSync(
  'ffprobe',
  ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type', '-of', 'json', file],
  { encoding: 'utf-8' },
)
const audioStreams = (JSON.parse(audioProbe) as { streams?: Array<Record<string, unknown>> }).streams ?? []
if (audioStreams.length > 0) {
  failures.push(`${audioStreams.length} audio stream(s) present — Phase 5 contract requires \`ffmpeg -an\` (no audio)`)
} else {
  console.log(`  audio: none (correct — Phase 5 -an contract)`)
}

// 3. Frame-0 mean luminance — soft warning (hard enforcement is the grep gate verify-s05-head-fade).
// Uses ffmpeg direct `-i` input rather than the lavfi `movie=` source — avoids the colon-escape
// footgun on Windows paths (e.g. `C:/...` would parse as a lavfi filter-argument separator).
// signalstats + metadata=print writes YAVG to STDERR; spawnSync captures both pipes.
try {
  const result = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'info',
      '-i',
      file,
      '-vframes',
      '1',
      '-vf',
      'signalstats,metadata=print',
      '-f',
      'null',
      '-',
    ],
    { encoding: 'utf-8' },
  )
  const stderr = String(result.stderr ?? '')
  const m = stderr.match(/lavfi\.signalstats\.YAVG=([\d.]+)/)
  if (m) {
    const yavg = Number(m[1])
    if (yavg > LUMA_THRESHOLD) {
      console.warn(`  frame-0 YAVG=${yavg.toFixed(1)} > ${LUMA_THRESHOLD} (30% threshold)`)
      console.warn(`    S05HeadFadeFromBlack overlay is LOAD-BEARING for the chapter-break fade — do NOT remove it.`)
      console.warn(`    (Hard enforcement: verify:s05-head-fade greps the scene file for the overlay.)`)
    } else {
      console.log(`  frame-0 YAVG=${yavg.toFixed(1)} ≤ ${LUMA_THRESHOLD} — natural fade-friendly`)
    }
  } else {
    console.warn(`  frame-0 luma: signalstats wrote no YAVG to stderr (skipped — not a hard fail)`)
  }
} catch (err) {
  // Soft check — if signalstats fails (e.g. weird codec), don't fail the gate.
  console.warn(`  frame-0 luma probe failed: ${(err as Error).message.split('\n')[0]} (skipped — not a hard fail)`)
}

if (failures.length > 0) {
  console.error(`[verify-gameplay-clip] FAIL: ${failures.length} assertion(s) violated:`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}

console.log(`[verify-gameplay-clip] PASS`)
