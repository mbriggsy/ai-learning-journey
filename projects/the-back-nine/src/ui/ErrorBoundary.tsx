/**
 * The calm last-resort boundary (ultramode review 2026-07-02). The entry tree mounts three
 * React.lazy chunks (IntakeApp / RecoveryFlow / RestoreFlow); Suspense catches only the PENDING
 * promise — a REJECTED chunk import (offline + SW-cache eviction, version skew after an update)
 * re-throws, and React.lazy CACHES the rejection for the session. Without a boundary the whole
 * tree unmounts to a blank screen, worst on the offline survivor's restore door. The vault on
 * disk is untouched by any render crash, so a reload — which re-runs the probe AND retries the
 * chunk fetch — is the honest remedy, framed calmly (never "damaged", never a stack trace).
 */
import { Component, type ReactNode } from 'react'
import { copy } from './copy'
import './styles/save.css'

interface State {
  readonly failed: boolean
}

export class AppErrorBoundary extends Component<{ readonly children: ReactNode }, State> {
  override state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  override render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="save">
        <section className="save-step">
          {/* h1: the boundary replaces the ENTIRE tree (including the sr-only app-title h1), so
              this fallback is the whole document — it owns the top-level heading. */}
          <h1 className="save-step__heading">{copy.appTitle}</h1>
          <p className="save-step__note" role="alert">
            {copy.unlockGeneric}
          </p>
          <div className="save-actions">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              {copy.restoreRetry}
            </button>
          </div>
        </section>
      </main>
    )
  }
}
