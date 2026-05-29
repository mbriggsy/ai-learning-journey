import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { activeSpeechCue, type Beat } from '../lib/timeline'

/**
 * Scaffold placeholder — NOT a final beat. Renders the beat label + the live VO
 * subtitle so a render check can confirm scene timing is locked to Janet's audio
 * before any real visuals exist. Each real beat scene replaces one of these.
 */

const BEAT_LABELS: Record<number, string> = {
  1: 'OPEN · WHAT IT IS',
  2: 'THE BET',
  3: 'THE DOUBLE-DOWN',
  4: 'THE BUILD · SCALE',
  5: 'THE GAUNTLET',
  6: 'THE PROOF · COST',
  7: 'RETURN · TAG',
}

export const BeatPlaceholder: React.FC<{ beat: Beat }> = ({ beat }) => {
  const frameRel = useCurrentFrame()
  const cue = activeSpeechCue(beat, frameRel)

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(130% 100% at 50% 40%, #16333899 0%, #0c2024 55%, #08181a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'monospace',
        color: '#cfe6e6',
      }}
    >
      <div style={{ position: 'absolute', top: 64, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 28, letterSpacing: '0.4em', opacity: 0.55 }}>
          BEAT {beat.beat}
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: '0.12em', marginTop: 12 }}>
          {BEAT_LABELS[beat.beat] ?? `BEAT ${beat.beat}`}
        </div>
      </div>

      {/* Live VO subtitle — proves the scene is timed to the right audio. */}
      <div
        style={{
          position: 'absolute',
          bottom: 96,
          left: '8%',
          right: '8%',
          textAlign: 'center',
          fontSize: 40,
          lineHeight: 1.4,
          color: cue ? '#f4e4c1' : '#3a5a5e',
          minHeight: 120,
          transition: 'color 0.1s',
        }}
      >
        {cue ? cue.text : '· · ·'}
      </div>
    </AbsoluteFill>
  )
}
