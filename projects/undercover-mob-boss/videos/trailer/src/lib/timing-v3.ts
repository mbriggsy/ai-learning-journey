export const FPS = 30;

/**
 * V3 Trailer — "The Origin Story"
 * Scene durations in frames (at 30fps).
 * Audio durations measured from generated WAVs.
 */
export const V3_SCENES = {
  S01: 140,  //  4.7s — Cold Open (audio: 3.97s / 119f)
  S02: 680,  // 22.7s — The Origin (audio: 21.4s / 641f)
  S03: 620,  // 20.7s — The Spec (audio: 19.25s / 577f)
  S04: 360,  // 12.0s — The Swarm (audio: 10.6s / 317f)
  S05: 510,  // 17.0s — The Code (audio: 15.5s / 465f)
  S06: 330,  // 11.0s — The Tests (audio: 7.6s + 1.2s = 8.8s)
  S07: 250,  //  8.3s — The Art (audio: 6.4s / 192f)
  S08: 370,  // 12.3s — The Punchline (audio: 8.7s + 1.9s = 10.6s)
  S09: 210,  //  7.0s — The Reveal (audio: 4.9s / 147f)
  S10: 300,  // 10.0s — Title + CTA (audio: 7.6s / 228f)
} as const;

export const V3_TOTAL_FRAMES = Object.values(V3_SCENES).reduce(
  (a, b) => a + b,
  0,
);
// = 3770 frames = 125.7s ≈ 2:06

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
 * Scene starts: S01=0, S02=140, S03=820, S04=1440, S05=1800,
 *   S06=2310, S07=2640, S08=2890, S09=3260, S10=3470
 */
export const V3_AUDIO_TIMELINE: Array<{ file: string; frame: number }> = [
  // S01 (0): cold-open — 119f audio, 10f lead-in for tension
  { file: 'audio/v3-cold-open.wav', frame: 10 },

  // S02 (140): origin — 641f audio, 15f into scene for image fade-in
  { file: 'audio/v3-thesis.wav', frame: 140 + 15 },

  // S03 (820): spec — 577f audio, 20f into scene for scroll to start
  { file: 'audio/v3-spec.wav', frame: 820 + 20 },

  // S04 (1440): swarm — 317f audio, 15f into scene
  { file: 'audio/v3-swarm.wav', frame: 1440 + 15 },

  // S05 (1800): code — 465f audio, 15f into scene
  { file: 'audio/v3-code.wav', frame: 1800 + 15 },

  // S06 (2310): tests — 228f audio, 10f into scene
  { file: 'audio/v3-tests.wav', frame: 2310 + 10 },
  // nothing-broke — 35f audio, after tests + 30f beat
  { file: 'audio/v3-nothing-broke.wav', frame: 2310 + 10 + 228 + 30 },

  // S07 (2640): art — 192f audio, 15f into scene
  { file: 'audio/v3-art.wav', frame: 2640 + 15 },

  // S08 (2890): punchline — human (261f), then fine (57f)
  // Stats cascade starts immediately, human narration plays over it
  { file: 'audio/v3-human.wav', frame: 2890 + 15 },
  // fine — after human + 20f beat
  { file: 'audio/v3-fine.wav', frame: 2890 + 15 + 261 + 20 },

  // S09 (3260): reveal — 147f audio, 20f into scene
  { file: 'audio/v3-reveal.wav', frame: 3260 + 20 },

  // S10 (3470): cta — 127f audio, 40f into scene (let title fade in first)
  { file: 'audio/v3-cta.wav', frame: 3470 + 40 },
  // cta-tag — 86f audio, after cta + 30f beat (dry, matter-of-fact callback)
  { file: 'audio/v3-cta-tag.wav', frame: 3470 + 40 + 127 + 30 },
];
