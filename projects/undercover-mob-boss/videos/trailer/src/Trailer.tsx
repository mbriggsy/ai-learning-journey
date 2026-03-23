import React from 'react';
import { AbsoluteFill, Html5Audio, Sequence, Series, staticFile } from 'remotion';
import { SCENES, SCENE_STARTS } from './lib/timing';
import { NOIR } from './lib/colors';
import { FilmGrain } from './components/FilmGrain';
import { S01_ColdOpen } from './scenes/S01_ColdOpen';
import { S02_TheCity } from './scenes/S02_TheCity';
import { S03_TheRoles } from './scenes/S03_TheRoles';
import { S04_TheTable } from './scenes/S04_TheTable';
import { S05_TheVote } from './scenes/S05_TheVote';
import { S06_TheStakes } from './scenes/S06_TheStakes';
import { S07_TheQuestion } from './scenes/S07_TheQuestion';
import { S08_TheReveal } from './scenes/S08_TheReveal';
import { S09_TheConcept } from './scenes/S09_TheConcept';
import { S10_TheBlueprint } from './scenes/S10_TheBlueprint';
import { S09_TheCode } from './scenes/S09_TheCode';
import { S12_TheAudit } from './scenes/S12_TheAudit';
import { S13_TheStats } from './scenes/S13_TheStats';
import { S11_TitleCard } from './scenes/S11_TitleCard';

/**
 * Audio timeline — absolute frame positions.
 * Scene starts: S01=0, S02=120, S03=390, S04=750, S05=930, S06=1200,
 * S07=1590, S08=1740, S09=1980, S10=2220, S11=2580, S12=2880, S13=3150, S14=3510
 *
 * Audio durations:
 *   intro: 344f           trailer-day-job: 129f     trailer-qa: 261f
 *   trailer-stakes: 235f  trailer-vision: 301f      trailer-timeline: 118f
 *   trailer-tagline: 124f trailer-build-stats: 292f  trailer-closing: 195f
 *   vote-open: 218f       trailer-bridge: 90f
 *   execution: 198f       mob-wins-election: 192f
 */
const AUDIO_TIMELINE: Array<{ file: string; frame: number }> = [
  // === ACT 1 ===

  // S02(120): intro — 344f, ends 464 (spans into S03, intentional)
  { file: 'audio/intro.wav', frame: 120 },

  // S03(390)+120=510: stakes — 235f, ends 745 (just before S04 at 750)
  { file: 'audio/trailer-stakes.wav', frame: 510 },

  // S04(750)+20=770: tagline — 124f, ends 894 (S05 at 930, 36f gap)
  { file: 'audio/trailer-tagline.wav', frame: 770 },

  // S05(930): vote-open — 218f, ends 1148
  { file: 'audio/vote-open.wav', frame: 930 },

  // S06(1200): execution — 198f, ends 1398
  { file: 'audio/execution.wav', frame: 1200 },

  // S06+210=1410: mob-wins — 192f, ends 1602 (S07 at 1590, 12f bleed but S07 is silent)
  { file: 'audio/mob-wins-election.wav', frame: 1410 },

  // === ACT 2 ===

  // S08(1740): bridge "8 nights" — 90f, ends 1830
  { file: 'audio/trailer-bridge.wav', frame: 1740 },

  // S08+100=1840: day-job — 129f, ends 1969 (S09 at 1980, 11f gap)
  { file: 'audio/trailer-day-job.wav', frame: 1840 },

  // S09(1980): silent — "This is the one" is text-only

  // S10(2220)+10=2230: vision — 301f, ends 2531 (S11 at 2580, 49f gap)
  { file: 'audio/trailer-vision.wav', frame: 2230 },

  // S11(2580): build-stats — 292f, ends 2872 (S12 at 2880, 8f gap)
  { file: 'audio/trailer-build-stats.wav', frame: 2580 },

  // S12(2880)+10=2890: qa — 261f, ends 3151 (S13 at 3150, 1f bleed — fine)
  { file: 'audio/trailer-qa.wav', frame: 2890 },

  // S13(3150)+100=3250: timeline — 118f, ends 3368
  { file: 'audio/trailer-timeline.wav', frame: 3250 },

  // S14(3510)+30=3540: closing — 195f, ends 3735 (total 3780, 45f fade)
  { file: 'audio/trailer-closing.wav', frame: 3540 },
];

export const Trailer: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* === VISUAL TIMELINE === */}
      <Series>
        {/* ACT 1: THE GAME */}
        <Series.Sequence durationInFrames={SCENES.S01}>
          <S01_ColdOpen />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.S02}>
          <S02_TheCity />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.S03}>
          <S03_TheRoles />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.S04}>
          <S04_TheTable />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.S05}>
          <S05_TheVote />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.S06}>
          <S06_TheStakes />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.S07}>
          <S07_TheQuestion />
        </Series.Sequence>

        {/* ACT 2: THE BUILD */}
        <Series.Sequence durationInFrames={SCENES.S08}>
          <S08_TheReveal />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.S09}>
          <S09_TheConcept />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.S10}>
          <S10_TheBlueprint />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.S11}>
          <S09_TheCode />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.S12}>
          <S12_TheAudit />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.S13}>
          <S13_TheStats />
        </Series.Sequence>

        {/* TITLE + CTA */}
        <Series.Sequence durationInFrames={SCENES.S14}>
          <S11_TitleCard />
        </Series.Sequence>
      </Series>

      {/* === AUDIO TIMELINE (absolute positions, never clipped) === */}
      {AUDIO_TIMELINE.map(({ file, frame }, i) => (
        <Sequence key={i} from={frame}>
          <Html5Audio src={staticFile(file)} />
        </Sequence>
      ))}

      <FilmGrain />
    </AbsoluteFill>
  );
};
