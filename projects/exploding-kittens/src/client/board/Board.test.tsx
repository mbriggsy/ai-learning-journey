// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Board } from './Board'

describe('Board', () => {
  it('renders connecting state initially', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const root = createRoot(container)
    act(() => {
      root.render(<Board />)
    })

    // Before WebSocket connects, shows loading state
    expect(container.textContent).toContain('Creating room...')

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
