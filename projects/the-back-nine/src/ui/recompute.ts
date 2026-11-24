/**
 * The recompute cadences after an edit (`editorSheets.tsx`'s header names them): provisional then final, and the
 * route-aware cadence. Moved out of `editorSheets.tsx` by Act 6's RC0, unchanged.
 */
import { isDateRoute } from '@intake/intakeMap'
import type { MemoryModel } from '@store/memoryModel'

/** Provisional then final. A provisional that a newer recompute superseded before it settled sends NO final: the
 *  newer edit's own pair carries the household's latest inputs, provisional first (W9-R7, R6, KTD7). */
export async function recomputeBoth(model: MemoryModel): Promise<void> {
  if (!(await model.recompute('provisional'))) return
  await model.recompute('final')
}

/** The route-aware cadence after an edit (the ratified F6 policy): the date route's pair, or the spine's final
 *  alone. The route is read off the store's CURRENT draft, after the edit. */
export function recomputeAfterEdit(model: MemoryModel): void {
  if (isDateRoute(model.getSnapshot().draft)) void recomputeBoth(model)
  else void model.recompute('final')
}
