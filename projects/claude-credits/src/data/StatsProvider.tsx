import { use, createContext, type ReactNode } from 'react'
import type { MultiProjectReport } from '@/types'
import { getStatsPromise } from './stats-resource'

// null only before the provider mounts; useStats() guards it so consumers get non-null.
export const StatsContext = createContext<MultiProjectReport | null>(null)

export function StatsProvider({ children }: { children: ReactNode }) {
  // use() suspends until the module-level promise resolves; the nearest <Suspense>
  // shows its fallback meanwhile. Children mount only AFTER data is present.
  const stats = use(getStatsPromise())
  return <StatsContext.Provider value={stats}>{children}</StatsContext.Provider>
}
