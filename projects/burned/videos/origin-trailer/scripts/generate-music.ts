/**
 * Trailer music bed — ElevenLabs Music (approved 2026-05-31; rides the existing
 * voice subscription, not a new music sub/license — see memory
 * project-burned-music-bed-budget).
 *
 * Hand-authored composition plans. Two cues, layered as two tracks in
 * Trailer.tsx and crossfaded at 45.8s (the gauntlet, masked by the brass crash):
 *
 *   `main` → trailer-bed.mp3 (85s, full arc). Only its 45.8s→end (ATTACK → WINK
 *            → FINALE → TITLE) is used in the trailer; that tail is Briggsy-
 *            approved and must NOT be regenerated.
 *   `intro` → trailer-bed-intro.mp3 (47s). Three distinct movements mapped to
 *            Janet's VO turns, replacing main's first ~46s with a narrative arc:
 *              0–14s     SETUP    — mysterious lounge ("a man who builds pipelines")
 *              14–24.5s  CURIOUS  — plucky, inquisitive ("a card game deserved a screen")
 *              24.5–47s  BUILDING — driving execution ("So he didn't" → the numbers)
 *
 * Archer-coded idiom (1960s spy-thriller jazz) described WITHOUT any proper
 * nouns — the Music API rejects prompts naming artists/composers/franchises
 * (bad_composition_plan). Both cues share a global sonic family so the
 * crossfade reads as one score evolving.
 *
 * Run from videos/origin-trailer/ (env auto-loads from repo-root + burned .env):
 *   npx tsx scripts/generate-music.ts intro          (generate the intro cue)
 *   npx tsx scripts/generate-music.ts main --force    (regenerate the main bed)
 */
import { existsSync, writeFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { assertEnv } from './lib/env.js'

const FORCE = process.argv.includes('--force')
const MODE = process.argv.find((a) => a === 'main' || a === 'intro' || a === 'execution') ?? 'main'

// NOTE: live API schema is snake_case and `lines` is an array of plain strings
// (the skill doc's camelCase / {text,type} example is stale — the 422 told the
// truth). positive_local_styles + negative_local_styles are required per section.
const NO_VOX = ['vocals', 'lyrics', 'singing']

const MAIN_PLAN = {
  positive_global_styles: [
    'instrumental',
    '1960s spy-thriller jazz',
    'mid-century cinematic lounge',
    'brassy orchestral spy score',
    'vibraphone',
    'muted trumpet',
    'walking upright bass',
    'brushed drum kit',
    'bossa nova undercurrent',
    'suave',
    'cinematic',
  ],
  negative_global_styles: [
    'vocals',
    'lyrics',
    'singing',
    'modern EDM',
    'lo-fi hip hop',
    'distorted electric guitar',
    'aggressive metal',
    'orchestral fantasy',
  ],
  sections: [
    {
      section_name: 'Cold Open',
      positive_local_styles: ['sparse', 'mysterious', 'suspenseful', 'quiet', 'solo vibraphone'],
      negative_local_styles: [...NO_VOX, 'busy', 'dense'],
      duration_ms: 8000,
      lines: [
        'A lone vibraphone and a distant muted trumpet float over soft brushed drums — mysterious and suspenseful, the hush of a covert briefing room before anyone speaks.',
      ],
    },
    {
      section_name: 'The Problem',
      positive_local_styles: ['smooth', 'noir', 'reflective', 'walking bass', 'smoky'],
      negative_local_styles: [...NO_VOX, 'upbeat', 'aggressive'],
      duration_ms: 16000,
      lines: [
        'A walking upright bass and brushed kit settle into a slow, smoky spy-lounge groove; reflective and a touch melancholy, with a lonely muted-trumpet line.',
      ],
    },
    {
      section_name: 'The Build',
      positive_local_styles: ['driving', 'rising', 'confident', 'bossa groove', 'organ', 'vibraphone'],
      negative_local_styles: [...NO_VOX, 'sparse', 'sleepy'],
      duration_ms: 22000,
      lines: [
        'The groove locks and gradually accelerates over a bossa-nova pulse; vibraphone and a warm organ stack layers, momentum and confidence steadily building.',
      ],
    },
    {
      section_name: 'The Gauntlet',
      positive_local_styles: ['tense', 'urgent', 'dramatic', 'brass stabs', 'tremolo strings'],
      negative_local_styles: [...NO_VOX, 'mellow', 'relaxed'],
      duration_ms: 10000,
      lines: [
        'Bold brass stabs and urgent tremolo strings crash in over a driving snare — tense, dramatic spy-thriller escalation pushing toward danger.',
      ],
    },
    {
      section_name: 'The Wink',
      positive_local_styles: ['playful', 'warm', 'suave', 'lighthearted', 'swing'],
      negative_local_styles: [...NO_VOX, 'tense', 'dark'],
      duration_ms: 18000,
      lines: [
        'Tension releases into a playful, suave lounge swing; a winking muted trumpet trades with vibraphone, warm and charming with a sly grin.',
      ],
    },
    {
      section_name: 'Finale Slam',
      positive_local_styles: ['punchy', 'building', 'accelerating', 'brass hits', 'timpani'],
      negative_local_styles: [...NO_VOX, 'sparse', 'quiet'],
      duration_ms: 6000,
      lines: [
        'Punchy brass hits land in rhythmic succession over rolling timpani, accelerating hard toward a climax.',
      ],
    },
    {
      section_name: 'Title Hit',
      positive_local_styles: ['climactic', 'bold', 'resolving', 'big brass chord'],
      negative_local_styles: [...NO_VOX, 'fade out', 'sparse'],
      duration_ms: 5000,
      lines: [
        'One final bold, brassy orchestral hit lands and resolves on a confident, sustained chord.',
      ],
    },
  ],
}

/**
 * INTRO cue — three deliberately CONTRASTING movements that narrate Janet's VO
 * turns (Briggsy's note 2026-05-31: "break up the music before the attack").
 * Same global sonic family as MAIN_PLAN so the 45.8s crossfade reads as one
 * score. Durations are exact (respect_sections_durations) so each movement lands
 * on its VO turn. The BUILDING tail (45.8–47s) overshoots the seam and is
 * enveloped out in Trailer.tsx.
 */
const INTRO_PLAN = {
  positive_global_styles: [
    'instrumental',
    '1960s spy-thriller jazz',
    'mid-century cinematic lounge',
    'vibraphone',
    'muted trumpet',
    'walking upright bass',
    'brushed drum kit',
    'suave',
    'cinematic',
  ],
  negative_global_styles: [
    'vocals',
    'lyrics',
    'singing',
    'modern EDM',
    'lo-fi hip hop',
    'distorted electric guitar',
    'aggressive metal',
    'orchestral fantasy',
  ],
  sections: [
    {
      section_name: 'Setup',
      positive_local_styles: ['mysterious', 'sparse', 'noir lounge', 'unhurried', 'solo vibraphone'],
      negative_local_styles: [...NO_VOX, 'busy', 'bright', 'upbeat'],
      duration_ms: 14000,
      lines: [
        'A hushed, mysterious spy-lounge opens: a lone vibraphone and a distant muted trumpet drift over soft brushed drums and a slow walking bass — intriguing and unhurried, the quiet before a story begins.',
      ],
    },
    {
      section_name: 'Curious',
      positive_local_styles: ['curious', 'playful', 'inquisitive', 'pizzicato', 'mischievous', 'bright-eyed'],
      negative_local_styles: [...NO_VOX, 'tense', 'dark', 'heavy', 'dramatic'],
      duration_ms: 10500,
      lines: [
        'Curious and playful: a pizzicato upright bass tip-toes, a light vibraphone and a questioning clarinet trade mischievous, quizzical phrases — the bright-eyed spark of an idea forming.',
      ],
    },
    {
      // Starts AT 24.5s ("So he didn't") — intensity must hit on the downbeat,
      // not ramp in late. The split into two sections + the 'slow build'/
      // 'gradual' negatives force a strong statement right at the boundary.
      section_name: 'Execution',
      positive_local_styles: ['driving', 'intense', 'propulsive', 'urgent', 'snapping drums', 'brass stabs', 'full energy'],
      negative_local_styles: [...NO_VOX, 'slow build', 'gradual', 'chaotic', 'frantic'],
      duration_ms: 11000,
      lines: [
        'Execution mode kicks in hard at the downbeat: a full, driving groove with urgent snapping drums and punchy brass stabs — intense and propulsive immediately, no slow build.',
      ],
    },
    {
      section_name: 'Drive',
      positive_local_styles: ['relentless', 'propulsive', 'sustained drive', 'organ', 'brass swells', 'momentum'],
      negative_local_styles: [...NO_VOX, 'calming', 'fade out', 'chaotic', 'frantic'],
      duration_ms: 11500,
      lines: [
        'The driving groove pushes relentlessly forward, warm organ and stacking brass swells sustaining the intensity, momentum locked in and pressing hard toward something big.',
      ],
    },
  ],
}

/**
 * EXECUTION cue — standalone, HARD-CUT into the trailer at 24.5s ("So he
 * didn't"). The model insists on ramping intensity ~10s into any driving section
 * (Briggsy heard the real shift at 35s, not 24.5s, across multiple intro
 * regens). A standalone cue has no preamble to ramp from, so its first beat IS
 * the intensity — described to slam in on the downbeat and forbidden any
 * intro/slow-start. Trailer.tsx kills the intro cue at 24.5s and cuts this in.
 */
const EXECUTION_PLAN = {
  positive_global_styles: [
    'instrumental',
    '1960s spy-thriller jazz',
    'mid-century cinematic',
    'driving',
    'intense',
    'urgent',
    'snapping drums',
    'brass stabs',
    'walking upright bass',
    'organ',
    'propulsive',
  ],
  negative_global_styles: [
    'vocals',
    'lyrics',
    'singing',
    'intro',
    'slow start',
    'gradual build',
    'sparse',
    'calm',
    'chaotic',
    'frantic',
    'distorted electric guitar',
  ],
  sections: [
    {
      section_name: 'Execution',
      positive_local_styles: ['full energy from the first beat', 'driving', 'intense', 'propulsive', 'urgent', 'relentless', 'brass stabs', 'snapping drums'],
      negative_local_styles: [...NO_VOX, 'intro', 'slow start', 'gradual', 'build-up', 'sparse', 'calm'],
      // 30s so Trailer.tsx can trim past the model's unavoidable soft intro
      // (~4-5s) and still cover 24.5→45.6s (21.1s) with margin.
      duration_ms: 30000,
      lines: [
        'Intense and driving from the first downbeat: a full propulsive groove, urgent snapping drums and punchy brass stabs locked in hard — relentless execution momentum, controlled not chaotic.',
      ],
    },
  ],
}

const PLANS: Record<string, { out: string; plan: typeof MAIN_PLAN }> = {
  main: { out: 'src/assets/audio/trailer-bed.mp3', plan: MAIN_PLAN },
  intro: { out: 'src/assets/audio/trailer-bed-intro.mp3', plan: INTRO_PLAN },
  execution: { out: 'src/assets/audio/trailer-bed-execution.mp3', plan: EXECUTION_PLAN },
}

async function main(): Promise<void> {
  const { out, plan } = PLANS[MODE]

  if (existsSync(out) && !FORCE) {
    console.log(`✓ ${out} already exists — pass --force to regenerate.`)
    return
  }

  const apiKey = assertEnv('ELEVENLABS_API_KEY')
  const totalMs = plan.sections.reduce((s, x) => s + x.duration_ms, 0)
  console.log(`Composing [${MODE}] ${(totalMs / 1000).toFixed(1)}s across ${plan.sections.length} sections → ${out}…`)

  const res = await fetch('https://api.elevenlabs.io/v1/music', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      composition_plan: plan,
      respect_sections_durations: true,
      model_id: 'music_v1',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Music API ${res.status}: ${body}`)
  }

  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(out, buf)
  console.log(`✓ wrote ${out} (${(buf.length / 1024).toFixed(0)} KB)`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
