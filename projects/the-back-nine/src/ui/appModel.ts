/**
 * The app's ONE memoryModel instance — module-level (outside any render path,
 * StrictMode-proof; phase-2 contract #1a) and the composition point where the
 * store-layer orchestrator meets the intake-layer param builders (ui may
 * import both; store never imports intake).
 */
import { createMemoryModel } from '@store/memoryModel'
import { engineClient } from '@store/engineClient'
import { buildDateInput, buildSpineParams } from '@intake/intakeMap'

export const appModel = createMemoryModel({
  client: engineClient,
  builders: { buildSpineParams, buildDateInput },
})
