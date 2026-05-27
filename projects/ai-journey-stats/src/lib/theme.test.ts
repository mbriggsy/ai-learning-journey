import { describe, it, expect } from 'vitest'
import { resolveInitialTheme, nextTheme } from './theme'

describe('resolveInitialTheme', () => {
  it('URL override wins over a stored choice', () => {
    expect(resolveInitialTheme('dark', 'light')).toBe('dark')
    expect(resolveInitialTheme('light', 'dark')).toBe('light')
  })

  it('falls back to the stored choice when there is no override', () => {
    expect(resolveInitialTheme(null, 'dark')).toBe('dark')
    expect(resolveInitialTheme(null, 'light')).toBe('light')
  })

  it('returns null (→ follow the OS via @media) when neither is a valid theme', () => {
    expect(resolveInitialTheme(null, null)).toBeNull()
    expect(resolveInitialTheme('purple', 'huh')).toBeNull() // junk values never apply
    expect(resolveInitialTheme('', '')).toBeNull()
  })
})

describe('nextTheme', () => {
  it('flips between the two modes', () => {
    expect(nextTheme('dark')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
  })
})
