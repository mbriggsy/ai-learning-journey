export const FPS = 30;

// Scene durations in frames (at 30fps)
export const SCENES = {
  // ACT 1: THE GAME
  S01: 120,  //  4s — Cold Open
  S02: 270,  //  9s — The City
  S03: 360,  // 12s — The Roles
  S04: 180,  //  6s — The Table
  S05: 270,  //  9s — The Vote
  S06: 390,  // 13s — The Stakes
  S07: 150,  //  5s — The Question

  // ACT 2: THE BUILD
  S08: 240,  //  8s — The Reveal ("8 nights, day job")
  S10: 360,  // 12s — The Blueprint (plan scroll)
  S11: 300,  // 10s — The Code (split-screen)
  S12: 270,  //  9s — The Audit (multi-terminal QA)
  S13: 650,  // 21.7s — The Stats (roll-up + $2 + token bill + bar tab)

  // TITLE + CTA
  S14: 330,  // 11s — Title Card
} as const;

export const TOTAL_DURATION_FRAMES = Object.values(SCENES).reduce(
  (a, b) => a + b,
  0,
);
// = 3890 frames ≈ 130s ≈ 2:10

// Cumulative scene start frames (for absolute audio positioning)
const cumulative = Object.values(SCENES).reduce<number[]>(
  (acc, dur) => [...acc, (acc[acc.length - 1] ?? 0) + dur],
  [0],
);
const keys = Object.keys(SCENES) as (keyof typeof SCENES)[];

export const SCENE_STARTS = Object.fromEntries(
  keys.map((key, i) => [key, cumulative[i]]),
) as Record<keyof typeof SCENES, number>;
