/**
 * src/ui/screens/ChartBoundary.tsx: one chart's own error boundary (Act 6 · RC4). Every Highcharts chart rides a lazy
 * chunk; a chunk that fails to load (or a chart that throws while it draws) must cost the reader that one picture, never
 * the page around it: the shell's own boundary (`ShellSlot.tsx`) would otherwise replace every page with its failure
 * page. The page's words stand without the chart (each chart's figures are also printed beside it or in its sentence),
 * so the fallback is one plain line saying the picture didn't load. Suspense has no error arm (insight 053), hence the
 * class.
 */
import { Component, type ReactNode } from 'react'

export class ChartBoundary extends Component<{ readonly fallback: ReactNode; readonly children: ReactNode }, { readonly failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
