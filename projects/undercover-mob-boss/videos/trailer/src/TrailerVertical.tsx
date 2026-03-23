import React from 'react';
import { AbsoluteFill, Html5Audio, Sequence, Series, staticFile } from 'remotion';
import { NOIR } from './lib/colors';
import { FilmGrain } from './components/FilmGrain';
import { V01_Hook } from './scenes/V01_Hook';
import { S03_TheRoles } from './scenes/S03_TheRoles';
import { S08_TheReveal } from './scenes/S08_TheReveal';
import { V06_Credits } from './scenes/V06_Credits';
import { S11_TitleCard } from './scenes/S11_TitleCard';

/**
 * Vertical trailer (9:16) — 27 seconds / 810 frames
 * Hook-first structure for social media.
 *
 * Scene starts: V01=0, S03=60, S08=300, V06=510, S11=630, END=810
 *
 * Audio timeline:
 *   intro.wav (344f) at 60 → ends 404 (plays over roles)
 *   trailer-day-job.wav (129f) at 410 → ends 539 (plays over terminal)
 *   trailer-closing.wav (195f) at 615 → ends 810 (plays over title)
 */
const AUDIO_TIMELINE: Array<{ file: string; frame: number }> = [
  { file: 'audio/intro.wav', frame: 60 },
  { file: 'audio/trailer-day-job.wav', frame: 410 },
  { file: 'audio/trailer-closing.wav', frame: 615 },
];

export const TrailerVertical: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      <Series>
        <Series.Sequence durationInFrames={60}>
          <V01_Hook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <S03_TheRoles />
        </Series.Sequence>
        <Series.Sequence durationInFrames={210}>
          <S08_TheReveal />
        </Series.Sequence>
        <Series.Sequence durationInFrames={120}>
          <V06_Credits />
        </Series.Sequence>
        <Series.Sequence durationInFrames={180}>
          <S11_TitleCard />
        </Series.Sequence>
      </Series>

      {/* Audio timeline (absolute positions) */}
      {AUDIO_TIMELINE.map(({ file, frame }, i) => (
        <Sequence key={i} from={frame}>
          <Html5Audio src={staticFile(file)} />
        </Sequence>
      ))}

      <FilmGrain />
    </AbsoluteFill>
  );
};
