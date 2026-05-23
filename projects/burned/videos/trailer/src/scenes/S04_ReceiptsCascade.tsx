import React from 'react'
import { ScaffoldSceneFrame } from '../components/ScaffoldSceneFrame'

/**
 * S04 — Receipts Cascade (load-bearing payoff scene). Unit 4.1 SKELETAL
 * SCAFFOLD; replaced by Unit 4.5 (which also wires the
 * `scenePreviewStartFrame` prop pattern consumed by `Preview_S04Peak`).
 */
export const S04_ReceiptsCascade: React.FC<{ scenePreviewStartFrame?: number }> = () => (
  <ScaffoldSceneFrame
    sceneId="S04_ReceiptsCascade"
    label="Receipts Cascade"
    numericalLabel="04"
    accentColor="#be2e27" // burned-fire — load-bearing scene
  />
)
