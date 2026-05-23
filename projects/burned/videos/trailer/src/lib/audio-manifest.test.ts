/**
 * Phase 4 Unit 4.1 — audio-manifest drift gates.
 *
 * Mirrors `visual-manifest.test.ts` for the AUDIO_ASSETS manifest:
 *   1. Forward: every AUDIO_ASSETS entry resolves to a real WAV under
 *      `<BURNED_ROOT>/public/<staticPath>`. Catches the class of bug
 *      that 4.1 turned up — Phase 2's prior staticPath prefix
 *      `audio/lines/` resolved to a non-existent path through the
 *      trailer's `setPublicDir('../../public')`, and Remotion 404'd
 *      on every cue at master-composition mount with no test catching
 *      it. The corrected prefix is `trailer/audio/lines/` per ADR #15.
 *   2. Forward-slash discipline (Remotion staticFile contract).
 *   3. Path prefix invariant: every entry begins with
 *      `trailer/audio/lines/` so future regenerations can't silently
 *      drift back to the broken pattern.
 *
 * The reverse gate (every WAV on disk under `trailer/audio/lines/` is
 * in the manifest) is intentionally NOT here — the WAV tree is owned
 * by `BURNED_TRAILER_LINES → cueFilename → generate-audio-manifest`,
 * and `script-coverage.test.ts` already pins the lines→WAVs coverage
 * after a pipeline run.
 */
import { existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { AUDIO_ASSETS } from './audio-manifest.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const BURNED_ROOT = resolve(HERE, '..', '..', '..', '..')
const PUBLIC_ROOT = resolve(BURNED_ROOT, 'public')

describe('audio-manifest forward drift gate (entry → disk)', () => {
  it('has at least one entry (catches accidental empty manifest)', () => {
    expect(AUDIO_ASSETS.length).toBeGreaterThan(0)
  })

  it('every staticPath resolves to a real file under public/', () => {
    const missing: string[] = []
    for (const asset of AUDIO_ASSETS) {
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
    const backslashed = AUDIO_ASSETS.filter((a) => a.staticPath.includes('\\'))
    expect(backslashed.map((a) => a.staticPath)).toEqual([])
  })

  it('every staticPath begins with trailer/audio/lines/ (ADR #15 path discipline)', () => {
    const offBrand = AUDIO_ASSETS.filter((a) => !a.staticPath.startsWith('trailer/audio/lines/'))
    expect(
      offBrand.map((a) => a.staticPath),
      `Per Phase 4 Unit 4.1 ADR #15: TTS WAVs live at trailer/audio/lines/. ` +
        `If you see this fail, the autogenerator's cueStaticPath helper has drifted.`,
    ).toEqual([])
  })
})
