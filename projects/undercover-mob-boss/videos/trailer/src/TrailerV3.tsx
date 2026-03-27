import React from 'react';
import { AbsoluteFill, Html5Audio, Sequence, Series, staticFile } from 'remotion';
import { V3_SCENES, V3_AUDIO_TIMELINE } from './lib/timing-v3';
import { NOIR } from './lib/colors';
import { FilmGrain } from './components/FilmGrain';
import { V3S01_ColdOpen } from './scenes/V3S01_ColdOpen';
import { V3S02_TheThesis } from './scenes/V3S02_TheThesis';
import { V3S03_TheSpec } from './scenes/V3S03_TheSpec';
import { V3S04_TheSwarm } from './scenes/V3S04_TheSwarm';
import { V3S05_TheCode } from './scenes/V3S05_TheCode';
import { V3S06_TheTests } from './scenes/V3S06_TheTests';
import { V3S07_TheArt } from './scenes/V3S07_TheArt';
import { V3S08_ThePunchline } from './scenes/V3S08_ThePunchline';
import { V3S09_Finale } from './scenes/V3S09_Finale';

/**
 * Trailer V3 — "The Origin Story"
 *
 * The game's own narrator (Charon) tells the story of its creation.
 * Fully autonomous agentic SDLC showcase.
 *
 * 10 scenes, ~124 seconds at 30fps.
 */
export const TrailerV3: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* === VISUAL TIMELINE === */}
      <Series>
        <Series.Sequence durationInFrames={V3_SCENES.S01}>
          <V3S01_ColdOpen />
        </Series.Sequence>
        <Series.Sequence durationInFrames={V3_SCENES.S02}>
          <V3S02_TheThesis />
        </Series.Sequence>
        <Series.Sequence durationInFrames={V3_SCENES.S03}>
          <V3S03_TheSpec />
        </Series.Sequence>
        <Series.Sequence durationInFrames={V3_SCENES.S04}>
          <V3S04_TheSwarm />
        </Series.Sequence>
        <Series.Sequence durationInFrames={V3_SCENES.S05}>
          <V3S05_TheCode />
        </Series.Sequence>
        <Series.Sequence durationInFrames={V3_SCENES.S06}>
          <V3S06_TheTests />
        </Series.Sequence>
        <Series.Sequence durationInFrames={V3_SCENES.S07}>
          <V3S07_TheArt />
        </Series.Sequence>
        <Series.Sequence durationInFrames={V3_SCENES.S08}>
          <V3S08_ThePunchline />
        </Series.Sequence>
        <Series.Sequence durationInFrames={V3_SCENES.S09}>
          <V3S09_Finale />
        </Series.Sequence>
      </Series>

      {/* === AUDIO TIMELINE (absolute positions, never clipped) === */}
      {V3_AUDIO_TIMELINE.map(({ file, frame }, i) => (
        <Sequence key={i} from={frame}>
          <Html5Audio src={staticFile(file)} />
        </Sequence>
      ))}

      <FilmGrain />
    </AbsoluteFill>
  );
};
