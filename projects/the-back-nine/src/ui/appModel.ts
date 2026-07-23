/**
 * The app's ONE memoryModel instance — module-level (outside any render path,
 * StrictMode-proof; phase-2 contract #1a) and the composition point where the
 * store-layer orchestrator meets the intake-layer param builders (ui may
 * import both; store never imports intake).
 */
import { createMemoryModel } from '@store/memoryModel'
import { engineClient } from '@store/engineClient'
import { buildDateInput, buildSpineParams } from '@intake/intakeMap'
import { buildSolveRequest } from '@intake/solveDispatch'
import { currentEpochDay } from './scenarioFromDraft'

export const appModel = createMemoryModel({
  client: engineClient,
  builders: {
    buildSpineParams,
    buildDateInput,
    // U16 §S1 — the recommend-second solve builder. The clock is injected HERE (the ui composition
    // layer reads `currentEpochDay()`), so the intake builder stays a deterministic function of the
    // draft + today, and the engine stays clock-free. `todayEpochDay` rides the ACA freshness clause
    // only; it is NOT in the run fingerprint, so a tick between build calls never spuriously invalidates.
    buildSolveDispatch: (draft) => buildSolveRequest(draft, currentEpochDay()),
  },
})
