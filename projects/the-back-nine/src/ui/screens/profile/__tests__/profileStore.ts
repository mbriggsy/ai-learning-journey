/**
 * A store for the Profile tests: the real `createMemoryModel` over a seed draft, its engine never reached (`recompute` is
 * spied, so a test counts the recomputes a Save sends and none ever runs).
 */
import { vi } from 'vitest'
import { createMemoryModel, type MemoryModel, type ParamsBuilders, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'

export function profileStore(seed: ScenarioDraft): { readonly model: MemoryModel; readonly recompute: ReturnType<typeof vi.fn> } {
  const client = { runningInWorker: true, reset: () => {}, engine: {} } as unknown as EngineClient
  const builders: ParamsBuilders = { buildSpineParams: () => null, buildDateInput: () => null }
  const model = createMemoryModel({ client, builders, mintSeed: () => 7 })
  model.update(() => seed)
  const recompute = vi.fn(async () => true)
  ;(model as { recompute: unknown }).recompute = recompute
  return { model, recompute }
}
