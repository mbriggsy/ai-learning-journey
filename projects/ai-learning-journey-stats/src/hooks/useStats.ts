import { useContext } from 'react'
import { StatsContext } from '@/data/StatsProvider'
import type { MultiProjectReport } from '@/types'

// Returns a NON-NULL report: StatsProvider only renders children after use() resolved,
// so any consumer under <StatsGate> is guaranteed live data.
export function useStats(): MultiProjectReport {
  const stats = useContext(StatsContext)
  if (stats === null) throw new Error('useStats() must be used within <StatsGate>')
  return stats
}
