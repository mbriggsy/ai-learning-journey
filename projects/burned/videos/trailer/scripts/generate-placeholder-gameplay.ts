/**
 * Generate `public/trailer/gameplay-placeholder.mp4` — 18s placeholder
 * gameplay clip for Phase 4 Unit 4.6 S05 standalone render.
 *
 * The real gameplay clip arrives in Phase 5 at `public/trailer/gameplay.mp4`.
 * Until then, S05 needs SOMETHING video-shaped to render against so the
 * scene typechecks, renders, and is reviewable end-to-end. This script
 * loops the HOW-TO-PLAY fullpage capture (Phase 3 Unit 3.1) into an 18s
 * 1920×1080 H264 audio-stripped MP4 that satisfies the Phase 5 handoff
 * contract shape (540 frames @ 30fps, 1920×1080, no audio track).
 *
 * Output is gitignored (see root .gitignore — `public/trailer/gameplay.mp4`
 * AND `public/trailer/gameplay-placeholder.mp4`). Regenerate locally
 * after any clone via `pnpm gen:gameplay-placeholder` from the trailer
 * package.
 *
 * Path resolution uses `fileURLToPath(import.meta.url) + resolve(...)`
 * per insight #057 (cwd-independent — matches audit-durations.ts +
 * capture-htp-scroll-burned.ts + build-*-composite-proof.ts).
 *
 * Uses `execFileSync` argv array (NOT shell) per project security
 * convention; matches lib/ffmpeg.ts.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// scripts/ -> videos/trailer/ -> videos/ -> BURNED root
const BURNED_ROOT = resolve(__dirname, '..', '..', '..')
const HTP_PNG = resolve(BURNED_ROOT, 'public', 'trailer', 'htp-fullpage.png')
const OUT = resolve(BURNED_ROOT, 'public', 'trailer', 'gameplay-placeholder.mp4')

if (!existsSync(HTP_PNG)) {
  console.error(`[gen-placeholder-gameplay] FAIL: source image not found`)
  console.error(`  expected: ${HTP_PNG}`)
  console.error(`  hint: run \`pnpm capture:htp\` first to generate htp-fullpage.png`)
  process.exit(1)
}

console.log(`[gen-placeholder-gameplay] source: ${HTP_PNG}`)
console.log(`[gen-placeholder-gameplay] output: ${OUT}`)
console.log(`[gen-placeholder-gameplay] target: 18.0s @ 30fps = 540 frames, 1920x1080, H264 CRF 18, no audio`)

// FFmpeg loops the still PNG into 18s of video at 30fps with a slow vertical pan
// through the tall HTP page (Ken Burns shape). htp-fullpage.png is 1920×19848 so
// there's ~18.4k px of vertical pan room — plenty for an 18s scroll.
//
// The `-loop 1 -t 18` of a still PNG renders the SAME pixels every frame; that read
// as broken even as a stand-in (Briggsy-eye 2026-05-23). Adding a time-varying crop
// y-offset (`(ih-1080)*t/18` walks 0→ih-1080 across the 18s window) gives the
// placeholder actual motion under the head-fade so transition mechanics feel right.
// Phase 5's real gameplay.mp4 overwrites this anyway; the pan is placeholder-only.
//
// scale + crop pattern: `force_original_aspect_ratio=increase` upscales the smaller
// dimension to match the 1920x1080 target (NOT the invalid `=cover` that Phase 6
// doc-review cross-phase amendment #3 caught), then the time-varying crop walks
// down the tall image.
// `-an` strips audio per Phase 5 contract (ffmpeg -an spirit).
//
// Keyframe + CFR discipline for Remotion seeking (caught during first render attempt):
//   `-r 30` BEFORE input sets input framerate (looped images need explicit input rate);
//   `-g 30 -keyint_min 30` forces a keyframe every second so OffthreadVideo can seek
//   mid-stream without "no frame found at position" errors; `-vsync cfr` forces constant
//   frame rate output (variable-rate produces unpredictable presentation timestamps that
//   Remotion's compositor rejects with the same compositor error).
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-loglevel',
    'error',
    '-loop',
    '1',
    '-r',
    '30',
    '-i',
    HTP_PNG,
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-t',
    '18',
    '-r',
    '30',
    '-pix_fmt',
    'yuv420p',
    '-g',
    '30',
    '-keyint_min',
    '30',
    '-vsync',
    'cfr',
    '-vf',
    // Time-varying crop: y-offset = (input_height - 1080) * t / 18, walks linearly
    // from 0 (top of HTP page) to (ih-1080) (bottom) across the 18s window.
    "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080:0:'(ih-1080)*t/18'",
    '-an',
    OUT,
  ],
  { stdio: 'inherit' },
)

const size = statSync(OUT).size
console.log(`[gen-placeholder-gameplay] wrote ${OUT} (${(size / 1024).toFixed(1)} KB)`)
