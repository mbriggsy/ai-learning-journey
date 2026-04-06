import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
  autoRecover?: boolean
  autoRecoverMs?: number
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  override componentDidUpdate(_prevProps: Props, prevState: State): void {
    if (this.state.hasError && !prevState.hasError && this.props.autoRecover) {
      setTimeout(() => {
        this.setState({ hasError: false })
      }, this.props.autoRecoverMs ?? 1000)
    }
  }

  private handleReset = () => {
    this.props.onReset?.()
    this.setState({ hasError: false })
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      if (this.props.autoRecover) return null // auto-recover: render nothing briefly
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
