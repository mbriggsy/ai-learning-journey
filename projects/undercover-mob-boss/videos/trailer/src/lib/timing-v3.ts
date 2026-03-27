export const FPS = 30;

/**
 * V3 Trailer — "The Origin Story"
 * Scene durations in frames (at 30fps).
 * Audio durations measured from generated WAVs.
 */
export const V3_SCENES = {
  S01: 140,  //  4.7s — Cold Open (audio: 3.97s / 119f)
  S02: 630,  // 21.0s — The Origin (audio: 18.9s / 566f)
  S03: 300,  // 10.0s — The Spec (audio: 8.2s / 245f)
  S04: 690,  // 23.0s — The Swarm (audio: 20.7s / 621f)
  S05: 540,  // 18.0s — The Code (audio: 16.1s / 483f)
  S06: 590,  // 19.7s — The Tests (audio: 15.8s / 474f + 1.2s / 35f)
  S07: 330,  // 11.0s — The Art (audio: 9.6s / 288f)
  S08: 440,  // 14.7s — The Punchline (audio: 8.7s / 261f + 1.2s / 35f + 0.9s / 26f)
  S09: 780,  // 26.0s — The Finale (HTP scroll + reveal + SDD + CTA + fade to black)
} as const;

export const V3_TOTAL_FRAMES = Object.values(V3_SCENES).reduce(
  (a, b) => a + b,
  0,
);
// = 4440 frames = 148.0s ≈ 2:28

/** Cumulative scene start frames (for absolute audio positioning). */
const cumulative = Object.values(V3_SCENES).reduce<number[]>(
  (acc, dur) => [...acc, (acc[acc.length - 1] ?? 0) + dur],
  [0],
);
const keys = Object.keys(V3_SCENES) as (keyof typeof V3_SCENES)[];

export const V3_SCENE_STARTS = Object.fromEntries(
  keys.map((key, i) => [key, cumulative[i]]),
) as Record<keyof typeof V3_SCENES, number>;

/**
 * Audio timeline — absolute frame positions.
 * Each entry places a narrator WAV at an exact frame in the composition.
 * Frames calculated from scene starts + offset for breathing room.
 *
 * Scene starts: S01=0, S02=140, S03=770, S04=1070, S05=1760,
 *   S06=2300, S07=2890, S08=3220, S09=3660
 */
export const V3_AUDIO_TIMELINE: Array<{ file: string; frame: number }> = [
  // S01 (0): cold-open — 119f audio, 10f lead-in for tension
  { file: 'audio/v3-cold-open.wav', frame: 10 },

  // S02 (140): origin — 566f audio, 15f into scene for image fade-in
  { file: 'audio/v3-thesis.wav', frame: 140 + 15 },

  // S03 (770): spec — 245f audio, 20f into scene for scroll to start
  { file: 'audio/v3-spec.wav', frame: 770 + 20 },

  // S04 (1070): swarm — 621f audio, 15f into scene
  { file: 'audio/v3-swarm.wav', frame: 1070 + 15 },

  // S05 (1760): code — 483f audio, 15f into scene
  { file: 'audio/v3-code.wav', frame: 1760 + 15 },

  // S06 (2300): tests — 474f audio, 10f into scene
  { file: 'audio/v3-tests.wav', frame: 2300 + 10 },
  // nothing-broke — 35f audio, after tests + 30f beat
  { file: 'audio/v3-nothing-broke.wav', frame: 2300 + 10 + 474 + 30 },

  // S07 (2890): art — 288f audio, 15f into scene
  { file: 'audio/v3-art.wav', frame: 2890 + 15 },

  // S08 (3220): punchline — human (261f), then hes-fine (35f), beat, probably (26f)
  // Stats cascade starts immediately, human narration plays over it
  { file: 'audio/v3-human.wav', frame: 3220 + 15 },
  // hes-fine — after human + 20f beat
  { file: 'audio/v3-hes-fine.wav', frame: 3220 + 15 + 261 + 20 },
  // probably — after hes-fine (30f) + 45f comedic beat
  { file: 'audio/v3-probably.wav', frame: 3220 + 15 + 261 + 20 + 30 + 45 },

  // S09 (3660): finale — HTP scroll with layered narration
  // reveal — 138f audio, 20f into scene
  { file: 'audio/v3-reveal.wav', frame: 3660 + 20 },
  // cta — 224f audio, after reveal + 40f beat (frame 238 in scene)
  { file: 'audio/v3-cta.wav', frame: 3660 + 238 },
  // cta-tag — 91f audio, after cta + 40f beat (frame 502 in scene)
  { file: 'audio/v3-cta-tag.wav', frame: 3660 + 502 },
  // cta-closer — 56f audio, 10f into fade to black (frame 690 in scene)
  { file: 'audio/v3-cta-closer.wav', frame: 3660 + 690 },
];
