import { describe, it, expect } from 'vitest'
import { formatTokens, pickTokenUnit, formatInt, formatBytes, formatModelList, padCounter } from './format'

const FS = ' ' // U+2007 figure space — must match the pad char in format.ts

describe('formatTokens', () => {
  it('formats billions with 2 decimals', () => expect(formatTokens(1_240_000_000)).toBe('1.24B'))
  it('formats millions with 1 decimal', () => expect(formatTokens(287_000_000)).toBe('287.0M'))
  it('formats thousands with 1 decimal', () => expect(formatTokens(12_400)).toBe('12.4K'))
  it('formats sub-1k as integer', () => expect(formatTokens(847)).toBe('847'))
  it('respects a forced unit so a tick-up never changes suffix', () => {
    expect(formatTokens(50_000_000, 'B')).toBe('0.05B')
    expect(formatTokens(0, 'B')).toBe('0.00B')
  })
  it('boundary: exactly 1e9 is B, 999_999_999 is M', () => {
    expect(pickTokenUnit(1e9)).toBe('B')
    expect(pickTokenUnit(999_999_999)).toBe('M')
  })
})

describe('formatInt', () => {
  it('thousands-separates', () => expect(formatInt(421633)).toBe('421,633'))
  it('handles zero', () => expect(formatInt(0)).toBe('0'))
})

describe('formatBytes', () => {
  it('GB with 1 decimal', () => expect(formatBytes(2_100_000_000)).toBe('2.1 GB'))
  it('MB with 1 decimal', () => expect(formatBytes(5_400_000)).toBe('5.4 MB'))
  it('KB with 0 decimals (distinct from GB/MB precision)', () => expect(formatBytes(5_400)).toBe('5 KB'))
  it('raw bytes below 1 KB', () => expect(formatBytes(500)).toBe('500 B'))
})

describe('formatModelList', () => {
  it('uppercases + joins with middot', () =>
    expect(
      formatModelList([
        { model: 'Opus 4.7', sessions: 1, tokensProcessed: 1 },
        { model: 'Sonnet 4.6', sessions: 1, tokensProcessed: 1 },
      ]),
    ).toBe('OPUS 4.7 · SONNET 4.6'))
  it('empty breakdown yields no clause', () => expect(formatModelList([])).toBe(''))
  it('drops a 0-token model (e.g. the <synthetic> parser sentinel)', () =>
    expect(
      formatModelList([
        { model: 'Opus 4.7', sessions: 39224, tokensProcessed: 10_719_704_867 },
        { model: '<synthetic>', sessions: 3, tokensProcessed: 0 },
      ]),
    ).toBe('OPUS 4.7'))
  it('all-zero breakdown yields no clause', () =>
    expect(formatModelList([{ model: '<synthetic>', sessions: 3, tokensProcessed: 0 }])).toBe(''))
})

describe('padCounter (constant-width counter frames)', () => {
  it('pads a short M-range frame to the final width with figure space', () =>
    expect(padCounter('8.5M', '847.0M'.length)).toBe(`${FS}${FS}8.5M`))
  it('pads the real B-range growth path (0.00B → 10.72B crosses 5→6 glyphs)', () =>
    expect(padCounter('0.00B', '10.72B'.length)).toBe(`${FS}0.00B`))
  it('the pad character is exactly U+2007 (encoding-swap guard)', () => {
    const padded = padCounter('0.00B', '10.72B'.length)
    expect(padded.codePointAt(0)).toBe(0x2007)
  })
  it('leaves a frame already at target width unchanged', () =>
    expect(padCounter('1.24B', '1.24B'.length)).toBe('1.24B'))
  it('every tick of an M-range tween renders the same length', () => {
    const finalLen = '847.0M'.length
    for (const v of [0, 8_470_000, 84_700_000, 847_000_000]) {
      expect(padCounter(formatTokens(v, 'M'), finalLen).length).toBe(finalLen)
    }
  })
})
