/**
 * Phase 3 Unit 3.7 — visual-manifest drift gates.
 *
 * Three invariants:
 *   1. Forward: every VISUAL_ASSETS entry resolves to a real file at
 *      `<BURNED_ROOT>/public/<staticPath>`. Catches renamed / removed
 *      assets BEFORE Phase 4 imports break.
 *   2. Reverse (Path B only): every file under `public/trailer/` —
 *      excluding documented Phase 0 spike + audition artifact dirs —
 *      appears in the manifest. Catches Phase 3 forgetting to manifest
 *      a deliverable (insight #027 presence-companion).
 *   3. Helper-export shapes: HTP_ASSET / R15_CHROME / BRIEFING /
 *      TITLE_SEQ / MUSIC_BED stay aligned with the inventory above.
 *
 * Path resolution uses `fileURLToPath(import.meta.url) + resolve(...)`
 * — cwd-independent, matches Unit 3.2 card-roster.test.ts (insight
 * #057 convention).
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  VISUAL_ASSETS,
  HTP_ASSET,
  R15_CHROME,
  BRIEFING,
  TITLE_SEQ,
  MUSIC_BED,
} from './visual-manifest.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const BURNED_ROOT = resolve(HERE, '..', '..', '..', '..')
const PUBLIC_ROOT = resolve(BURNED_ROOT, 'public')
const TRAILER_DIR = resolve(PUBLIC_ROOT, 'trailer')

/**
 * Directories under `public/trailer/` that are NOT trailer-composition
 * visual assets — Phase 0 ADR #5 spike artifacts + Phase 0 voice-audition
 * candidates left in place for reference, plus the Phase 2 TTS WAV tree
 * which is owned by `audio-manifest.ts` (see `audio-manifest.test.ts`
 * for that file's forward drift gate). If anything outside these dirs
 * ships to the trailer, MIGRATE it into the visual manifest first.
 */
const EXCLUDED_TRAILER_DIRS = new Set<string>([
  'trailer/spike',
  'trailer/cold-open',
  'trailer/audio/lines',
])

/** File extensions that the manifest is responsible for. */
const MANIFEST_EXTENSIONS = ['.svg', '.png', '.webp', '.mp3', '.wav', '.jpg', '.jpeg']

function walkFiles(dir: string, relFromPublic: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const childAbs = resolve(dir, entry.name)
    const childRel = posix.join(relFromPublic, entry.name)
    if (entry.isDirectory()) {
      out.push(...walkFiles(childAbs, childRel))
    } else if (entry.isFile()) {
      out.push(childRel)
    }
  }
  return out
}

describe('visual-manifest forward drift gate (entry → disk)', () => {
  it('has at least one entry (catches accidental empty manifest)', () => {
    expect(VISUAL_ASSETS.length).toBeGreaterThan(0)
  })

  it('every staticPath resolves to a real file under public/', () => {
    const missing: string[] = []
    for (const asset of VISUAL_ASSETS) {
      const abs = resolve(PUBLIC_ROOT, asset.staticPath)
      if (!existsSync(abs) || !statSync(abs).isFile()) {
        missing.push(asset.staticPath)
      }
    }
    expect(
      missing,
      `manifest entries with no file on disk:\n  ${missing.join('\n  ')}`,
    ).toEqual([])
  })

  it('every staticPath uses forward slashes (Remotion staticFile contract)', () => {
    const backslashed = VISUAL_ASSETS.filter((a) => a.staticPath.includes('\\'))
    expect(backslashed.map((a) => a.staticPath)).toEqual([])
  })
})

describe('visual-manifest reverse drift gate (Path B disk → entry)', () => {
  it('every file under public/trailer/ (minus excluded Phase 0 dirs) is in the manifest', () => {
    const manifestPaths = new Set(VISUAL_ASSETS.map((a) => a.staticPath))
    const onDisk = walkFiles(TRAILER_DIR, 'trailer')
      .filter((p) => MANIFEST_EXTENSIONS.some((ext) => p.toLowerCase().endsWith(ext)))
      .filter((p) => {
        // Skip files under excluded dirs (Phase 0 spike + audition).
        for (const excluded of EXCLUDED_TRAILER_DIRS) {
          if (p === excluded || p.startsWith(excluded + '/')) return false
        }
        return true
      })

    const unaccounted = onDisk.filter((p) => !manifestPaths.has(p))
    expect(
      unaccounted,
      `Path B trailer assets on disk but missing from VISUAL_ASSETS:\n` +
        `  ${unaccounted.join('\n  ')}\n\n` +
        `Add an entry in visual-manifest.ts OR add the parent dir to ` +
        `EXCLUDED_TRAILER_DIRS in this test (with a comment explaining why).`,
    ).toEqual([])
  })

  it('rejects the temp HTML composite-proof file leaking into the manifest tree', () => {
    // build-operative-card-composite-proof.ts (and the upcoming
    // build-safe-square-composites.ts) write a temp HTML under
    // public/trailer/ during composite generation. If a script crashes
    // mid-render the file can leak. This is a cleanup canary: it isn't
    // a manifest asset, so we want it to be absent at test time. Any
    // leak surfaces here loudly rather than silently polluting the
    // BURNED public/ tree.
    const tempPaths = readdirSync(TRAILER_DIR)
      .filter((name) => name.startsWith('__') && name.endsWith('.html'))
      .map((name) => `trailer/${name}`)
    expect(
      tempPaths,
      `composite-proof temp HTML leaked into public/trailer/:\n  ${tempPaths.join('\n  ')}`,
    ).toEqual([])
  })
})

describe('visual-manifest helper exports', () => {
  it('HTP_ASSET points to the Unit 3.1 fullpage capture', () => {
    expect(HTP_ASSET.category).toBe('htp')
    expect(HTP_ASSET.staticPath).toBe('trailer/htp-fullpage.png')
    expect(HTP_ASSET.tier).toBe('hero')
  })

  it('R15_CHROME has exactly 10 entries (5 instances × frame+text split-layer)', () => {
    expect(R15_CHROME.length).toBe(10)
    // Stamp-3 is the load-bearing PAYOFF — must be safe-square + hero.
    const stamp3Frame = R15_CHROME.find(
      (a) => a.staticPath === 'trailer/r15-chrome/stamp-3-asset-delivered-frame.svg',
    )
    expect(stamp3Frame?.safeSquareRole).toBe('safe-square')
    expect(stamp3Frame?.tier).toBe('hero')
    // R15 #5 closing-card cold-decode — Unit 4.7 ship — must be safe-square chrome.
    const subhead5Frame = R15_CHROME.find(
      (a) => a.staticPath === 'trailer/r15-chrome/subhead-5-closing-card-frame.svg',
    )
    expect(subhead5Frame?.safeSquareRole).toBe('safe-square')
    expect(subhead5Frame?.tier).toBe('chrome')
  })

  it('BRIEFING includes the 4 NEW Path B SVGs + 6 EXISTING Path A rasters (10 total)', () => {
    expect(BRIEFING.length).toBe(10)
    const newPathB = BRIEFING.filter((a) => a.staticPath.startsWith('trailer/briefing-room/'))
    expect(newPathB.length).toBe(4)
  })

  it('TITLE_SEQ includes 3 NEW Path B SVGs + 1 EXISTING Path A raster (4 total)', () => {
    expect(TITLE_SEQ.length).toBe(4)
    const newPathB = TITLE_SEQ.filter((a) => a.staticPath.startsWith('trailer/title-sequence/'))
    expect(newPathB.length).toBe(3)
    // BURNED logo is the S06 closing wordmark hero.
    const logo = TITLE_SEQ.find((a) => a.staticPath === 'trailer/title-sequence/burned-logo.svg')
    expect(logo?.tier).toBe('hero')
    expect(logo?.safeSquareRole).toBe('safe-square')
  })

  it('MUSIC_BED points to the Unit 3.5 Spy Glass procurement', () => {
    expect(MUSIC_BED.category).toBe('audio')
    expect(MUSIC_BED.staticPath).toBe('trailer/audio/music-bed.mp3')
  })
})

describe('visual-manifest schema invariants', () => {
  it('every entry has explicit safeSquareRole + tier (no defaults)', () => {
    const incomplete = VISUAL_ASSETS.filter(
      (a) => a.safeSquareRole == null || a.tier == null,
    )
    expect(incomplete.map((a) => a.staticPath)).toEqual([])
  })

  it('every staticPath is unique (no accidental duplicate entries)', () => {
    const paths = VISUAL_ASSETS.map((a) => a.staticPath)
    const dupes = paths.filter((p, i) => paths.indexOf(p) !== i)
    expect(dupes).toEqual([])
  })
})
