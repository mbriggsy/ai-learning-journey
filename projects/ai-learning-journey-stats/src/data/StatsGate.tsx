import { Suspense, type ReactNode } from 'react'
import { StatsErrorBoundary } from './StatsErrorBoundary'
import { StatsProvider } from './StatsProvider'

// Loading fallback = bare page surface (no spinner — a spinner is a slop signal).
// body bg paints from global.css immediately; this guards against any flash.
function PageHold() {
  return <div aria-hidden style={{ minHeight: '100svh', background: 'var(--surface-page)' }} />
}

export function StatsGate({ children }: { children: ReactNode }) {
  return (
    <StatsErrorBoundary>
      <Suspense fallback={<PageHold />}>
        <StatsProvider>{children}</StatsProvider>
      </Suspense>
    </StatsErrorBoundary>
  )
}
