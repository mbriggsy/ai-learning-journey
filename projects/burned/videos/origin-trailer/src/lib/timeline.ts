/**
 * TIMELINE — the trailer's single timing source of truth.
 *
 * Derived entirely from the VO pipeline's `out/vo/manifest.json` (written by
 * `scripts/generate-vo.ts` alongside the master WAV, so the two never drift).
 * Scenes time themselves against these frame ranges; nothing hardcodes seconds.
 *
 * PREREQUISITE: `pnpm tts:test` must have produced `out/vo/manifest.json` +
 * `out/vo/janet-vo-master.wav` before `pnpm studio` / render. Both are
 * gitignored build inputs (regenerable; speech is text-cached, so re-runs are
 * cheap and deterministic).
 */
import manifest from '../../out/vo/manifest.json'

export const FPS = 30
export const WIDTH = 1920
export const HEIGHT = 1080

export type CueKind = 'speech' | 'silence'

export interface RawCue {
  id: string
  beat: number
  kind: CueKind
  durationSec: number
  startSec: number
  text?: string
  ms?: number
  cached?: boolean
  nonVerbal?: boolean
}

interface Manifest {
  totalSec: number
  cues: RawCue[]
}

const data = manifest as Manifest

export const TOTAL_SEC = data.totalSec
export const TOTAL_FRAMES = Math.round(TOTAL_SEC * FPS)

const secToFrame = (sec: number): number => Math.round(sec * FPS)

/** A cue with frames resolved RELATIVE to its parent beat's start. */
export interface BeatCue extends RawCue {
  /** Frame offset from the beat's first frame. */
  startFrameRel: number
  /** Length in frames. */
  durFrames: number
}

export interface Beat {
  beat: number
  startSec: number
  /** Absolute frame of this beat's first frame (from the global timeline). */
  startFrame: number
  /** Length of this beat's sequence, in frames. Contiguous with the next beat. */
  durationFrames: number
  cues: BeatCue[]
}

function buildBeats(): Beat[] {
  // Group cues by beat number, preserving manifest order.
  const byBeat = new Map<number, RawCue[]>()
  for (const cue of data.cues) {
    const list = byBeat.get(cue.beat) ?? []
    list.push(cue)
    byBeat.set(cue.beat, list)
  }

  const beatNums = [...byBeat.keys()].sort((a, b) => a - b)

  // Boundaries: each beat starts at the min startSec of its cues; it ends where
  // the next beat starts (or at TOTAL_SEC for the last). Rounding both ends from
  // the same basis keeps every sequence contiguous and gap-free.
  const startSecs = beatNums.map(
    (n) => Math.min(...byBeat.get(n)!.map((c) => c.startSec)),
  )

  return beatNums.map((beatNum, i) => {
    const startSec = startSecs[i]
    const endSec = i + 1 < startSecs.length ? startSecs[i + 1] : TOTAL_SEC
    const startFrame = secToFrame(startSec)
    const durationFrames = secToFrame(endSec) - startFrame

    const cues: BeatCue[] = byBeat.get(beatNum)!.map((c) => ({
      ...c,
      startFrameRel: secToFrame(c.startSec) - startFrame,
      durFrames: secToFrame(c.startSec + c.durationSec) - secToFrame(c.startSec),
    }))

    return { beat: beatNum, startSec, startFrame, durationFrames, cues }
  })
}

export const BEATS: Beat[] = buildBeats()

/** The active speech cue at a beat-relative frame, or null during silence. */
export function activeSpeechCue(beat: Beat, frameRel: number): BeatCue | null {
  for (const cue of beat.cues) {
    if (cue.kind !== 'speech') continue
    if (frameRel >= cue.startFrameRel && frameRel < cue.startFrameRel + cue.durFrames) {
      return cue
    }
  }
  return null
}
