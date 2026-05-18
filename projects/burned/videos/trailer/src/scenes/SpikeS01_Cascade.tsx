import React from 'react'
import { Series } from 'remotion'
import { SpikeFontWeightDemo } from '../components/SpikeFontWeightDemo'
import { SpikeHtpCascade } from '../components/SpikeHtpCascade'
import { SpikeIrisWipe } from '../components/SpikeIrisWipe'
import { SpikeKineticType } from '../components/SpikeKineticType'
import { SpikeStampSlap } from '../components/SpikeStampSlap'

/**
 * Phase 0 Unit 0.5 — Composite Viability Spike S01.
 *
 * Sequences the five integration-point sub-clips back-to-back inside a
 * nested `<Series>`. Each sub-clip is render-validation only — Phase 4
 * owns ranking, ordering, and final visual treatment.
 *
 * Frame budget (30fps):
 *   - 0-30f  (1s): Font weight diagnostic (point c)
 *   - 30-90f (2s): HTP cascade (point d)
 *   - 90-120f (1s): Stamp slap (point e₁)
 *   - 120-150f (1s): Iris wipe (point e₂)
 *   - 150-180f (1s): Kinetic typography (point e₃)
 * Total: 180f = 6s
 */
const HTP_CASCADE_FRAMES = 60

export const SpikeS01_Cascade: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={30}>
        <SpikeFontWeightDemo />
      </Series.Sequence>

      <Series.Sequence durationInFrames={HTP_CASCADE_FRAMES}>
        <SpikeHtpCascade durationFrames={HTP_CASCADE_FRAMES} />
      </Series.Sequence>

      <Series.Sequence durationInFrames={30}>
        <SpikeStampSlap />
      </Series.Sequence>

      <Series.Sequence durationInFrames={30}>
        <SpikeIrisWipe />
      </Series.Sequence>

      <Series.Sequence durationInFrames={30}>
        <SpikeKineticType />
      </Series.Sequence>
    </Series>
  )
}
