/**
 * Engine worker ENTRY — the Comlink bootstrap. All testable logic lives in
 * engineProtocol.ts (pure, no `expose` side-effect); this module's only job is to
 * expose that API in the worker scope. Kept thin so importing the protocol for tests
 * never runs `Comlink.expose` (which needs the worker's `self`).
 *
 * Engine purity (ESLint-enforced): reads no clock/entropy/environment; the seed is
 * injected by the caller.
 */
import * as Comlink from 'comlink'
import { engineApi } from '@engine/engineProtocol'

export type { EngineApi } from '@engine/engineProtocol'

Comlink.expose(engineApi)
