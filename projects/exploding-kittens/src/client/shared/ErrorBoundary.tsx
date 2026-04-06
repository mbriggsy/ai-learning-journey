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
}

const MAX_AUTO_RECOVER = 3

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, crashCount: 0 }
  private autoRecoverTimer: ReturnType<typeof setTimeout> | null = null

  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true }
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
        return (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100svh', background: 'var(--bg-primary, #0c0a12)',
            color: 'var(--text-secondary, #888)', fontSize: 16,
          }}>
            Recovering...
          </div>
        )
      }
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100svh', padding: 32,
          background: 'var(--bg-primary, #0c0a12)', color: 'var(--text-primary, #e8e8f0)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 18, marginBottom: 16 }}>Something went wrong</p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 32px', fontSize: 16, fontWeight: 600,
              border: 'none', borderRadius: 8, cursor: 'pointer',
              background: '#3498db', color: '#fff',
            }}
          >
            Rejoin
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
