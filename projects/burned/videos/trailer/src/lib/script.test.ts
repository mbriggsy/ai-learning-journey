/**
 * Trailer script invariants.
 *
 * Unit 1.2 lock: 14 VO cues across 6 scenes. These tests guard the
 * machine contract Phase 2 consumes — drift here means BEAT-SHEET.md
 * and `BURNED_TRAILER_LINES` have diverged.
 *
 * Insight #029: BEAT-SHEET.md uses `<!-- @line: ID -->` marker pattern
 * (NOT Markdown-table-cell parsing) so structural drift is caught by
 * grep, not by fragile cell-index counting.
 *
 * R6 vocabulary grep: Line.text bodies are scanned against the
 * full Pendleton-vocab block list (per plan Step 9). Permitted
 * in-character exception: 'Agent X' (proper noun, NOT raw "agent"
 * SDLC vocab).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  S01_END,
  S01_START,
  S02_END,
  S02_START,
  S03_END,
  S03_START,
  S04_END,
  S04_START,
  S05_END,
  S05_START,
  S06_END,
  S06_START,
  TOTAL_FRAMES,
} from './timing'
import { BURNED_TRAILER_LINES, type Line } from './script'

const SCENE_RANGES: Record<Line['scene'], readonly [number, number]> = {
  S01: [S01_START, S01_END],
  S02: [S02_START, S02_END],
  S03: [S03_START, S03_END],
  S04: [S04_START, S04_END],
  S05: [S05_START, S05_END],
  S06: [S06_START, S06_END],
}

const BEAT_SHEET_PATH = resolve(__dirname, '../../BEAT-SHEET.md')
const BEAT_SHEET_BODY = readFileSync(BEAT_SHEET_PATH, 'utf-8')

/**
 * Pendleton-vocab block list — 25 raw-SDLC terms across 9 categories
 * per plan §Step 9 doc-review rewrite. Word-boundary anchored. Match
 * iteration uses String.prototype.matchAll() (NOT RegExp.prototype.exec())
 * for iterator-friendly + reentrancy-safe scanning.
 *
 * Two patterns: case-INSENSITIVE for common SDLC words, and
 * case-SENSITIVE for uppercase acronyms. Acronyms like REST / API /
 * GraphQL / PR / LLM / AI must match exact case — otherwise the
 * case-insensitive sweep would false-positive on natural English
 * prose ("the rest help you survive" ≠ REST API). 'Agent X' and
 * 'Code-name' compounds are in-character carve-outs applied via
 * post-match filter.
 */
const R6_VOCAB_PATTERN_CI =
  /\b(code|source|implementation|tests?|testing|deploy(s|ment)?|ship(s|ping)?|commits?|merge|github|repo|specs?|specification|agents?|Claude|model|prompt|chat|build|pipeline|sprint(s)?|backlog|tickets?|issues?|microservice(s)?|frontend|backend|schema)\b/gi
const R6_VOCAB_PATTERN_CS = /\b(PR|LLM|AI|API|REST|GraphQL)\b/g

describe('BURNED_TRAILER_LINES integrity', () => {
  it('contains 16 lines (Unit 1.2 lock: S01×1 + S02×1 + S03×2 + S04×8 + S05×2 + S06×2)', () => {
    expect(BURNED_TRAILER_LINES.length).toBe(16)
  })

  it('every Line.id is unique', () => {
    const ids = BURNED_TRAILER_LINES.map((l) => l.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('every Line.frame is a non-negative integer inside [0, TOTAL_FRAMES)', () => {
    for (const line of BURNED_TRAILER_LINES) {
      expect(Number.isInteger(line.frame), `${line.id} frame must be integer`).toBe(true)
      expect(line.frame).toBeGreaterThanOrEqual(0)
      expect(line.frame).toBeLessThan(TOTAL_FRAMES)
    }
  })

  it('every Line.frame falls inside its declared scene range', () => {
    for (const line of BURNED_TRAILER_LINES) {
      const [start, end] = SCENE_RANGES[line.scene]
      expect(line.frame, `${line.id} frame ${line.frame} outside ${line.scene} range [${start},${end})`).toBeGreaterThanOrEqual(start)
      expect(line.frame).toBeLessThan(end)
    }
  })

  it('every line + expectedFrames stays inside its scene range', () => {
    for (const line of BURNED_TRAILER_LINES) {
      const [, end] = SCENE_RANGES[line.scene]
      expect(
        line.frame + line.expectedFrames,
        `${line.id} ends at frame ${line.frame + line.expectedFrames}, past ${line.scene} END ${end}`,
      ).toBeLessThanOrEqual(end)
    }
  })

  it('lines are ordered by frame ascending', () => {
    for (let i = 1; i < BURNED_TRAILER_LINES.length; i++) {
      const cur = BURNED_TRAILER_LINES[i]!
      const prior = BURNED_TRAILER_LINES[i - 1]!
      expect(
        cur.frame,
        `Line ${cur.id} (frame ${cur.frame}) must be >= prior ${prior.id} (frame ${prior.frame})`,
      ).toBeGreaterThanOrEqual(prior.frame)
    }
  })

  it('voice values are valid', () => {
    const validVoices: Line['voice'][] = ['dash', 'sable', 'janet', 'vera']
    for (const line of BURNED_TRAILER_LINES) {
      expect(validVoices).toContain(line.voice)
    }
  })

  it('cueType values are valid', () => {
    const validCueTypes: Line['cueType'][] = ['sustained', 'list', 'payoff', 'cold-open', 'scream']
    for (const line of BURNED_TRAILER_LINES) {
      expect(validCueTypes).toContain(line.cueType)
    }
  })

  it('scream cue is the only one with skipSilenceremove=true', () => {
    const screamCues = BURNED_TRAILER_LINES.filter((l) => l.cueType === 'scream')
    expect(screamCues.length).toBe(1)
    expect(screamCues[0]!.skipSilenceremove).toBe(true)
  })

  it('voice cast is 2 (Dash + Janet); no Sable/Vera VO in this trailer', () => {
    const voices = new Set(BURNED_TRAILER_LINES.map((l) => l.voice))
    expect(voices).toEqual(new Set(['dash', 'janet']))
  })

  it('S01 carries exactly one Janet cue (cold-open); all other voices are Dash', () => {
    const s01Lines = BURNED_TRAILER_LINES.filter((l) => l.scene === 'S01')
    expect(s01Lines.length).toBe(1)
    expect(s01Lines[0]!.voice).toBe('janet')
    expect(s01Lines[0]!.cueType).toBe('cold-open')

    for (const line of BURNED_TRAILER_LINES.filter((l) => l.scene !== 'S01')) {
      expect(line.voice, `${line.id} should be voiced by Dash, not ${line.voice}`).toBe('dash')
    }
  })
})

describe('BEAT-SHEET.md ⇄ script.ts marker pattern (insight #029)', () => {
  it('every Line.id appears exactly once in BEAT-SHEET.md via <!-- @line: ID --> marker', () => {
    for (const line of BURNED_TRAILER_LINES) {
      const marker = `<!-- @line: ${line.id} -->`
      const occurrences = BEAT_SHEET_BODY.split(marker).length - 1
      expect(occurrences, `marker "${marker}" should appear exactly once in BEAT-SHEET.md (found ${occurrences})`).toBe(1)
    }
  })

  it('every Line.text appears verbatim in BEAT-SHEET.md (drift check)', () => {
    for (const line of BURNED_TRAILER_LINES) {
      expect(BEAT_SHEET_BODY, `Line.text for ${line.id} not found verbatim in BEAT-SHEET.md`).toContain(line.text)
    }
  })

  it('every BEAT-SHEET.md marker has a corresponding Line', () => {
    const ids = new Set<string>()
    for (const match of BEAT_SHEET_BODY.matchAll(/<!-- @line: ([A-Za-z0-9-]+) -->/g)) {
      ids.add(match[1]!)
    }
    const lineIds = new Set(BURNED_TRAILER_LINES.map((l) => l.id))
    for (const id of ids) {
      expect(lineIds.has(id), `BEAT-SHEET.md marker "${id}" has no Line in BURNED_TRAILER_LINES`).toBe(true)
    }
  })
})

describe('R6 Pendleton-vocab discipline', () => {
  it('Line.text bodies contain zero raw SDLC vocab (in-character carve-outs permitted)', () => {
    for (const line of BURNED_TRAILER_LINES) {
      const matches: string[] = []

      const collect = (pattern: RegExp): void => {
        for (const match of line.text.matchAll(pattern)) {
          const fullMatch = match[0]
          const idx = match.index ?? 0

          // Carve-out (1): 'Agent X' in-character proper noun.
          if (fullMatch.toLowerCase() === 'agent' && line.text.substring(idx, idx + 7) === 'Agent X') {
            continue
          }

          // Carve-out (2): 'Code-name' / 'code-name' in-character spy
          // compound — operative pseudonym terminology, NOT raw SDLC
          // code. The hyphen-attached compound is the diagnostic
          // signal: 'code' is SDLC, 'code-name' is spy-craft.
          if (fullMatch.toLowerCase() === 'code' && line.text.substring(idx, idx + 9).toLowerCase() === 'code-name') {
            continue
          }

          matches.push(fullMatch)
        }
      }

      collect(R6_VOCAB_PATTERN_CI)
      collect(R6_VOCAB_PATTERN_CS)

      expect(matches, `${line.id} contains raw SDLC vocab: ${matches.join(', ')} in "${line.text}"`).toEqual([])
    }
  })
})

describe('per-cue wps validation', () => {
  // Per Critical Constraints §wps band:
  //   sustained 1.9–2.3, list 2.4–2.6 (ceiling), payoff 1.6–2.0,
  //   cold-open ~2.5, scream N/A (volume-discontinuous shape).
  //
  // This is a Phase 1 SANITY GATE not the Phase 2 drift gate. The
  // ceiling here catches catastrophic budget violations (the 8.0 wps
  // payoff-cue bug the plan doc-review rewrote); it does NOT enforce
  // the nominal 2.3-2.6 wps target. Phase 2 Unit 2.4 measures actual
  // TTS-delivered wps and triggers re-steer / re-time / line-trim
  // escalation per the cueType-band-firm-but-not-frozen-until-Phase-2
  // gate documented in Critical Constraints.
  //
  // Plan's S03 pacing math is internally inconsistent (claims 65w at
  // 2.4 wps ≈ 13.5s — actual would be 27s) and acknowledges drift
  // risk explicitly ("Tight against scene budget; if drift surfaces
  // in Phase 2 TTS render, drop one of the trailing clauses").
  // expectedFrames here represents allotted scene-time, not predicted
  // TTS duration; Phase 2 measures the actual and decides.
  const FPS = 30
  const WPS_CEILINGS: Record<Line['cueType'], number> = {
    sustained: 4.5, // sanity ceiling; nominal 2.4 +/- deadpan variance + plan-pacing drift headroom
    list: 4.5,
    payoff: 2.5, // strict — payoff IS deadpan by definition
    'cold-open': 3.5,
    scream: Infinity, // shape-paced, not wps-paced
  }

  /**
   * Strip [BEAT NNNms] / [BEAT N.Ns] markers before counting words.
   * Phase 2 expands these to per-engine pause primitives (SSML
   * `<break time="NNNms"/>`); they are not spoken words.
   */
  const stripBeatMarkers = (text: string): string => text.replace(/\[BEAT [^\]]+\]/g, ' ')

  it('no cue exceeds its cueType wps sanity ceiling', () => {
    for (const line of BURNED_TRAILER_LINES) {
      if (line.cueType === 'scream') continue
      const spokenText = stripBeatMarkers(line.text)
      const wordCount = spokenText.split(/\s+/).filter(Boolean).length
      const seconds = line.expectedFrames / FPS
      const wps = wordCount / seconds
      const ceiling = WPS_CEILINGS[line.cueType]
      expect(
        wps,
        `${line.id} delivers ${wordCount}w in ${seconds.toFixed(2)}s = ${wps.toFixed(2)} wps, over ${line.cueType} sanity ceiling ${ceiling}`,
      ).toBeLessThanOrEqual(ceiling)
    }
  })
})
