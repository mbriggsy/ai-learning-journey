import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  autoRecover?: boolean
  autoRecoverMs?: number
}

interface State {
  hasError: boolean
  crashCount: number
  errorMessage: string
}

const MAX_AUTO_RECOVER = 3

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, crashCount: 0, errorMessage: '' }
  private autoRecoverTimer: ReturnType<typeof setTimeout> | null = null

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, errorMessage: `${error.name}: ${error.message}` }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  override componentDidUpdate(_prevProps: Props, prevState: State): void {
    if (this.state.hasError && !prevState.hasError) {
      const crashCount = this.state.crashCount + 1
      this.setState({ crashCount })

      if (this.props.autoRecover && crashCount < MAX_AUTO_RECOVER) {
        if (this.autoRecoverTimer) clearTimeout(this.autoRecoverTimer)
        this.autoRecoverTimer = setTimeout(() => {
          this.autoRecoverTimer = null
          this.setState({ hasError: false })
        }, this.props.autoRecoverMs ?? 1000)
      }
    }
  }

  override componentWillUnmount(): void {
    if (this.autoRecoverTimer) {
      clearTimeout(this.autoRecoverTimer)
      this.autoRecoverTimer = null
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, crashCount: 0 })
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.autoRecover && this.state.crashCount < MAX_AUTO_RECOVER) {
        // TV-legible spy-thriller fallback. Previous "Recovering..." was
        // 16px grey-on-black, invisible from a couch across the room.
        // E2E audit 2026-04-23 C-04: board stayed permanently stuck in
        // this state when a bad event triggered repeat crashes, with
        // nothing on the TV reading as "something is happening."
        return (
          <div style={{
            position: 'fixed', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '2rem', gap: '1rem',
            background: 'var(--color-bg-surface, #0c0a12)',
            color: 'var(--color-fg-primary, #f5e6d3)',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-display, system-ui)',
              fontWeight: 900,
              fontSize: 'clamp(2rem, 6vw, 4rem)',
              letterSpacing: '-0.015em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-burned, #d0332b)',
              textShadow: '0 0 30px color-mix(in oklab, var(--color-accent-burned, #d0332b) 50%, transparent)',
              animation: 'ce-error-pulse 1.6s ease-in-out infinite',
            }}>
              COMMS SCRAMBLED
            </div>
            <div style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 'clamp(0.875rem, 1.8vw, 1.125rem)',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              opacity: 0.72,
            }}>
              Re-establishing secure channel
              <span style={{ display: 'inline-block', width: '1.5em', textAlign: 'left' }}>
                <span style={{ animation: 'ce-dot 1.4s infinite 0s' }}>.</span>
                <span style={{ animation: 'ce-dot 1.4s infinite 0.2s' }}>.</span>
                <span style={{ animation: 'ce-dot 1.4s infinite 0.4s' }}>.</span>
              </span>
            </div>
            <style>{`
              @keyframes ce-error-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.65; }
              }
              @keyframes ce-dot {
                0%, 80%, 100% { opacity: 0.25; }
                40% { opacity: 1; }
              }
            `}</style>
          </div>
        )
      }
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100svh', padding: 32,
          background: 'var(--color-bg-surface, #0c0a12)',
          color: 'var(--color-fg-primary, #f5e6d3)',
          textAlign: 'center', gap: '1.5rem',
        }}>
          <div style={{
            fontFamily: 'var(--font-display, system-ui)',
            fontWeight: 900,
            fontSize: 'clamp(2rem, 6vw, 4rem)',
            letterSpacing: '-0.015em',
            textTransform: 'uppercase',
            color: 'var(--color-accent-burned, #d0332b)',
            textShadow: '0 0 40px color-mix(in oklab, var(--color-accent-burned, #d0332b) 45%, transparent)',
          }}>
            Comms Down
          </div>
          <div style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.875rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            opacity: 0.72,
            maxWidth: '40ch',
          }}>
            The agency lost contact with this briefing.
          </div>
          {import.meta.env.DEV && this.state.errorMessage && (
            <pre style={{
              fontSize: 12, marginTop: '0.5rem', padding: 12, borderRadius: 8,
              background: 'rgba(255,0,0,0.1)', color: '#ff6b6b', textAlign: 'left',
              maxWidth: '90vw', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>{this.state.errorMessage}</pre>
          )}
          <button
            onClick={this.handleReset}
            style={{
              padding: '14px 36px',
              fontFamily: 'var(--font-display, system-ui)',
              fontSize: '1rem',
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              border: 'none', borderRadius: 2, cursor: 'pointer',
              background: 'var(--color-accent-burned, #d0332b)',
              color: 'var(--color-cream-12, #f5e6d3)',
              boxShadow: '0 3px 0 rgba(0,0,0,0.4), 0 0 30px color-mix(in oklab, var(--color-accent-burned, #d0332b) 50%, transparent)',
            }}
          >
            // Re-connect
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
