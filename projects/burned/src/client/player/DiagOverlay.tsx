/**
 * DiagOverlay — Dev-only layout diagnostic tool.
 *
 * Shows live computed DOM values for the phone layout chain so you can SEE
 * what changes when a card is staged, instead of guessing at CSS fixes.
 *
 * Toggle: Ctrl+Shift+D (starts hidden)
 * Workflow: Show overlay → Snap → stage a card → see what turned red
 *
 * POSITIONING DEVIATION: Uses position:fixed, violating the WebKit bug 297779
 * convention in player-hardening.css. Acceptable because:
 *   1. Dev-only — tree-shaken in production
 *   2. Chrome DevTools only — never on real iOS Safari
 *   3. position:absolute would make this a flex participant in the layout
 *      chain being diagnosed (observer effect)
 */

import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react'

// --- Types ---

interface ElementSnapshot {
  scrollTop: number
  clientHeight: number
  rectTop: number
  offsetHeight: number
  display: string
  visibility: string
  overflow: string
  transform: string
  opacity: string
}

interface DiagEvent {
  time: number
  type: string
  target: string
}

interface TrackedElement {
  label: string
  selector: () => Element | null
}

// --- Constants ---

const POLL_MS = 500
const MAX_EVENTS = 20

const TRACKED: TrackedElement[] = [
  { label: 'html', selector: () => document.documentElement },
  { label: 'body', selector: () => document.body },
  { label: '#root', selector: () => document.getElementById('root') },
  { label: '.view', selector: () => document.querySelector('[data-diag="view"]') },
  { label: 'TitleBar', selector: () => document.querySelector('[data-diag="view"]')?.firstElementChild ?? null },
  { label: 'StatusBar', selector: () => document.querySelector('[data-diag="statusbar"]') },
]

// --- Snapshot helpers ---

function snapshot(el: Element): ElementSnapshot {
  const rect = el.getBoundingClientRect()
  const style = getComputedStyle(el)
  return {
    scrollTop: (el as HTMLElement).scrollTop ?? 0,
    clientHeight: (el as HTMLElement).clientHeight ?? 0,
    rectTop: Math.round(rect.top * 10) / 10,
    offsetHeight: (el as HTMLElement).offsetHeight ?? 0,
    display: style.display,
    visibility: style.visibility,
    overflow: style.overflow,
    transform: style.transform === 'none' ? '' : style.transform,
    opacity: style.opacity === '1' ? '' : style.opacity,
  }
}

function labelTarget(target: EventTarget | null): string {
  if (!target || !(target instanceof Element)) return '?'
  const tag = target.tagName
  const cls = target.className
  const firstCls = typeof cls === 'string' ? cls.split(' ')[0] : undefined
  const clsStr = firstCls
    ? '.' + (firstCls.split('_')[0] ?? firstCls)
    : ''
  return `${tag}${clsStr}`
}

function numChanged(a: number, b: number): boolean {
  return Math.abs(a - b) > 0.5
}

// --- Component ---

export default function DiagOverlay() {
  const [visible, setVisible] = useState(false)
  const [, setTick] = useState(0)

  const currentRef = useRef<Record<string, ElementSnapshot | null>>({})
  const prevRef = useRef<Record<string, ElementSnapshot | null>>({})
  const baselineRef = useRef<Record<string, ElementSnapshot | null> | null>(null)
  const eventsRef = useRef<DiagEvent[]>([])

  // --- Keyboard toggle ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'D' && e.ctrlKey && e.shiftKey) {
        e.preventDefault()
        setVisible(v => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // --- Polling loop ---
  useEffect(() => {
    if (!visible) return

    const poll = () => {
      prevRef.current = { ...currentRef.current }
      const next: Record<string, ElementSnapshot | null> = {}

      for (const t of TRACKED) {
        const el = t.selector()
        if (!el) {
          next[t.label] = null
          continue
        }
        const snap = snapshot(el)
        next[t.label] = snap

        // Console warn on change from previous poll
        const prev = prevRef.current[t.label]
        if (prev) {
          if (numChanged(snap.scrollTop, prev.scrollTop))
            console.warn(`[DiagOverlay] CHANGED: ${t.label} scrollTop ${prev.scrollTop} → ${snap.scrollTop}`)
          if (numChanged(snap.clientHeight, prev.clientHeight))
            console.warn(`[DiagOverlay] CHANGED: ${t.label} clientHeight ${prev.clientHeight} → ${snap.clientHeight}`)
          if (numChanged(snap.rectTop, prev.rectTop))
            console.warn(`[DiagOverlay] CHANGED: ${t.label} rectTop ${prev.rectTop} → ${snap.rectTop}`)
          if (numChanged(snap.offsetHeight, prev.offsetHeight))
            console.warn(`[DiagOverlay] CHANGED: ${t.label} offsetHeight ${prev.offsetHeight} → ${snap.offsetHeight}`)
          if (snap.display !== prev.display)
            console.warn(`[DiagOverlay] CHANGED: ${t.label} display "${prev.display}" → "${snap.display}"`)
          if (snap.visibility !== prev.visibility)
            console.warn(`[DiagOverlay] CHANGED: ${t.label} visibility "${prev.visibility}" → "${snap.visibility}"`)
          if (snap.transform !== prev.transform)
            console.warn(`[DiagOverlay] CHANGED: ${t.label} transform "${prev.transform}" → "${snap.transform}"`)
        }
      }

      currentRef.current = next
      setTick(t => t + 1)
    }

    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [visible])

  // --- Event listeners ---
  useEffect(() => {
    if (!visible) return

    const push = (type: string, target: EventTarget | null) => {
      const evt: DiagEvent = {
        time: performance.now(),
        type,
        target: labelTarget(target),
      }
      eventsRef.current = [evt, ...eventsRef.current].slice(0, MAX_EVENTS)
      console.info(`[DiagOverlay] EVENT: ${type} → ${evt.target}`)
    }

    const onScroll = (e: Event) => push('scroll', e.target)
    const onFocusIn = (e: Event) => push('focusin', e.target)
    const onPointerUp = (e: Event) => push('pointerup', e.target)
    const onResize = () => push('resize', null)

    document.addEventListener('scroll', onScroll, { capture: true })
    document.addEventListener('focusin', onFocusIn, { capture: true })
    document.addEventListener('pointerup', onPointerUp, { capture: true })
    window.addEventListener('resize', onResize)

    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true })
      document.removeEventListener('focusin', onFocusIn, { capture: true })
      document.removeEventListener('pointerup', onPointerUp, { capture: true })
      window.removeEventListener('resize', onResize)
    }
  }, [visible])

  // --- Actions ---
  const handleSnap = useCallback(() => {
    baselineRef.current = { ...currentRef.current }
    setTick(t => t + 1)
  }, [])

  const handleClear = useCallback(() => {
    baselineRef.current = null
    setTick(t => t + 1)
  }, [])

  if (!visible) return null

  // --- Render helpers ---
  const baseline = baselineRef.current
  const current = currentRef.current

  function cellColor(label: string, prop: keyof ElementSnapshot, value: number | string): string {
    if (!baseline) return '#aaa'
    const base = baseline[label]
    if (!base) return '#aaa'
    const baseVal = base[prop]
    if (typeof value === 'number' && typeof baseVal === 'number') {
      return numChanged(value, baseVal) ? '#f87171' : '#4ade80'
    }
    return value !== baseVal ? '#f87171' : '#4ade80'
  }

  // Global diagnostics
  const vv = window.visualViewport
  const activeEl = document.activeElement
  const activeLabel = activeEl ? labelTarget(activeEl) : 'null'

  const formatTime = (ms: number) => {
    const d = new Date(performance.timeOrigin + ms)
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // --- Styles ---
  const containerStyle: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    background: 'rgba(0, 0, 0, 0.88)',
    color: '#aaa',
    fontFamily: 'monospace',
    fontSize: '10px',
    lineHeight: '14px',
    padding: '6px 8px',
    pointerEvents: 'auto',
    maxHeight: '45vh',
    overflowY: 'auto',
    borderTop: '1px solid #333',
  }

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '11px',
  }

  const btnStyle: CSSProperties = {
    background: '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '3px',
    padding: '2px 8px',
    fontSize: '10px',
    cursor: 'pointer',
    marginLeft: '4px',
  }

  const tableStyle: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
  }

  const thStyle: CSSProperties = {
    textAlign: 'right',
    padding: '1px 4px',
    color: '#888',
    fontWeight: 'normal',
    borderBottom: '1px solid #222',
  }

  const labelCellStyle: CSSProperties = {
    textAlign: 'left',
    padding: '1px 4px',
    color: '#ddd',
    fontWeight: 'bold',
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span>DiagOverlay {baseline ? '(snap active)' : ''}</span>
        <span>
          <button style={btnStyle} onClick={handleSnap}>Snap</button>
          <button style={btnStyle} onClick={handleClear}>Clear</button>
          <button style={btnStyle} onClick={() => setVisible(false)}>Hide</button>
        </span>
      </div>

      {/* Primary metrics table */}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left' }}></th>
            <th style={thStyle}>scrT</th>
            <th style={thStyle}>cliH</th>
            <th style={thStyle}>rTop</th>
            <th style={thStyle}>offH</th>
            <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '8px' }}>css</th>
          </tr>
        </thead>
        <tbody>
          {TRACKED.map(({ label }) => {
            const snap = current[label]
            if (!snap) {
              return (
                <tr key={label}>
                  <td style={labelCellStyle}>{label}</td>
                  <td colSpan={5} style={{ padding: '1px 4px', color: '#f87171' }}>---</td>
                </tr>
              )
            }
            const cssExtras = [
              snap.display !== 'flex' && snap.display !== 'block' ? `d:${snap.display}` : '',
              snap.visibility !== 'visible' ? `v:${snap.visibility}` : '',
              snap.transform ? `t:${snap.transform.slice(0, 20)}` : '',
              snap.opacity ? `o:${snap.opacity}` : '',
            ].filter(Boolean).join(' ')

            return (
              <tr key={label}>
                <td style={labelCellStyle}>{label}</td>
                <td style={{ textAlign: 'right', padding: '1px 4px', color: cellColor(label, 'scrollTop', snap.scrollTop) }}>
                  {snap.scrollTop}
                </td>
                <td style={{ textAlign: 'right', padding: '1px 4px', color: cellColor(label, 'clientHeight', snap.clientHeight) }}>
                  {snap.clientHeight}
                </td>
                <td style={{ textAlign: 'right', padding: '1px 4px', color: cellColor(label, 'rectTop', snap.rectTop) }}>
                  {snap.rectTop}
                </td>
                <td style={{ textAlign: 'right', padding: '1px 4px', color: cellColor(label, 'offsetHeight', snap.offsetHeight) }}>
                  {snap.offsetHeight}
                </td>
                <td style={{ textAlign: 'left', padding: '1px 4px', paddingLeft: '8px', color: '#888', fontSize: '9px' }}>
                  {cssExtras || '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Global diagnostics */}
      <div style={{ marginTop: '4px', borderTop: '1px solid #222', paddingTop: '3px', color: '#888', fontSize: '9px' }}>
        <span style={{ color: '#ddd' }}>focus:</span> {activeLabel}
        {' | '}
        <span style={{ color: '#ddd' }}>vvH:</span> {vv ? Math.round(vv.height) : '?'}
        {' '}
        <span style={{ color: '#ddd' }}>vvTop:</span> {vv ? Math.round(vv.offsetTop) : '?'}
        {' | '}
        <span style={{ color: '#ddd' }}>innerH:</span> {window.innerHeight}
      </div>

      {/* Event log */}
      {eventsRef.current.length > 0 && (
        <div style={{ marginTop: '3px', borderTop: '1px solid #222', paddingTop: '3px' }}>
          {eventsRef.current.slice(0, 5).map((evt, i) => (
            <div key={i} style={{ color: evt.type === 'scroll' || evt.type === 'focusin' ? '#fbbf24' : '#666' }}>
              {formatTime(evt.time)} {evt.type} {'\u2192'} {evt.target}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
