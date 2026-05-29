import React from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { Audio } from '@remotion/media'
import { BEATS } from './lib/timeline'
import { BeatPlaceholder } from './scenes/BeatPlaceholder'
// Trailer-OWN asset: the locked Janet VO master. Imported (not staticFile) so it
// stays in the trailer package — the pinned publicDir is the GAME's public/, and
// a 17 MB wav there would ship with the Cloudflare build. See remotion-env.d.ts.
import voMaster from '../out/vo/janet-vo-master.wav'

/**
 * ORIGIN TRAILER v2 — master composition.
 *
 * The VO bed is the timing spine: Janet's master WAV plays start-to-finish and
 * every beat is a <Sequence> placed at the exact frame the manifest says that
 * beat's first cue begins. Scenes are currently placeholders; each gets replaced
 * by its real visual one beat at a time, always timed to these same ranges.
 */
export const OriginTrailer: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#08181a' }}>
      <Audio src={voMaster} />

      {BEATS.map((beat) => (
        <Sequence
          key={beat.beat}
          from={beat.startFrame}
          durationInFrames={beat.durationFrames}
          name={`Beat ${beat.beat}`}
        >
          <BeatPlaceholder beat={beat} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
