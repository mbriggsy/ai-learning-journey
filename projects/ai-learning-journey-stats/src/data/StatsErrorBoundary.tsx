import { Component, type ErrorInfo, type ReactNode } from 'react'
import { resetStatsPromise } from './stats-resource'

export class StatsErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Dev aid only — never shown to a public visitor. In dev a 404 here usually means
    // stats.json hasn't been generated yet: run `pnpm refresh`.
    console.error(
      'Stats failed to load (run `pnpm refresh` if the data file is missing):',
      error.message,
      info.componentStack,
    )
  }
  private retry = () => {
    resetStatsPromise() // drop the cached (rejected) promise so use() refetches
    this.setState({ error: null }) // re-render children → StatsProvider re-suspends on a fresh fetch
  }
  override render() {
    if (this.state.error) {
      // Public-appropriate copy — a visitor can't "run pnpm refresh" (that hint lives in the
      // console for dev). Offer a real recovery path (retry works because resetStatsPromise
      // clears the cached rejection — see stats-resource.ts).
      return (
        <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 'var(--space-8)' }}>
          <div style={{ maxWidth: '40ch', textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-display-md)',
                color: 'var(--text-primary)',
              }}
            >
              Couldn’t load the stats right now.
            </p>
            <button
              type="button"
              onClick={this.retry}
              style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-2) var(--space-6)',
                fontFamily: 'var(--font-body)',
                color: 'var(--text-on-accent)',
                background: 'var(--accent-primary)',
                border: 'none',
                borderRadius: 'var(--radius-button)',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
