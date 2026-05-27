import { describe, it, expect } from 'vitest'
import {
  formatTokens,
  pickTokenUnit,
  formatInt,
  formatBytes,
  formatModelList,
  padCounter,
  formatShortDate,
  formatAsOf,
  formatWindowClause,
} from './format'

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
  it('boundary: 1e6 is M / 999_999 is K, 1e3 is K / 999 is plain', () => {
    expect(pickTokenUnit(1e6)).toBe('M')
    expect(pickTokenUnit(999_999)).toBe('K')
    expect(pickTokenUnit(1e3)).toBe('K')
    expect(pickTokenUnit(999)).toBe('')
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
  it('seams: 1e3→KB, 1e6→MB; 999 stays bytes', () => {
    expect(formatBytes(1_000)).toBe('1 KB')
    expect(formatBytes(999)).toBe('999 B')
    expect(formatBytes(1_000_000)).toBe('1.0 MB')
  })
  // Documented quirk: the KB tier's toFixed(0) rounds 999_999/1000 = 999.999 → "1000 KB" rather
  // than rolling to "1.0 MB". Harmless in practice (no surface renders sub-MB byte counts), pinned
  // so a future change to formatBytes is a conscious one.
  it('KB rounding edge: 999_999 → "1000 KB" (intentional, pinned)', () =>
    expect(formatBytes(999_999)).toBe('1000 KB'))
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

describe('formatShortDate', () => {
  it('renders month-short + day, no year', () => expect(formatShortDate('2026-04-22')).toBe('Apr 22'))
  it('takes the date portion from a full ISO timestamp with offset', () =>
    expect(formatShortDate('2026-03-12T12:34:18-04:00')).toBe('Mar 12'))
  it('null → null', () => expect(formatShortDate(null)).toBeNull())
  it('non-date input → null (never "Invalid Date")', () => {
    expect(formatShortDate('not a date')).toBeNull()
    expect(formatShortDate('')).toBeNull()
  })
  // TZ guard: a bare date must NOT shift to the previous day for viewers west of UTC.
  // "2026-05-09" anchored at UTC midnight + rendered timeZone:'UTC' is always May 9.
  it('does not shift the calendar day under timezone', () =>
    expect(formatShortDate('2026-05-09')).toBe('May 9'))
  it('renders a window-range pair sensibly when joined by the caller', () =>
    expect(`${formatShortDate('2026-04-07')} → ${formatShortDate('2026-05-24')}`).toBe('Apr 7 → May 24'))
})

describe('formatAsOf (staleness date — month-short + day + YEAR)', () => {
  it('renders the year (unlike formatShortDate)', () =>
    expect(formatAsOf('2026-05-27')).toBe('May 27, 2026'))
  it('takes the date portion from a full ISO timestamp with offset', () =>
    expect(formatAsOf('2026-03-12T12:34:18-04:00')).toBe('Mar 12, 2026'))
  it('null → null', () => expect(formatAsOf(null)).toBeNull())
  it('non-date input → null (never "Invalid Date")', () => {
    expect(formatAsOf('not a date')).toBeNull()
    expect(formatAsOf('')).toBeNull()
  })
  // Same TZ guard as formatShortDate: UTC-anchored, no day-shift west of UTC.
  it('does not shift the calendar day under timezone', () =>
    expect(formatAsOf('2026-01-01')).toBe('Jan 1, 2026'))
})

describe('formatWindowClause (one honest clause across Hero/TokensBlock/Close — F5)', () => {
  it('null → null (unmeasured → caller omits the clause)', () =>
    expect(formatWindowClause(null)).toBeNull())
  it('0 → "across under a day" (spells out "<" for static HTML)', () =>
    expect(formatWindowClause(0)).toBe('across under a day of session retention'))
  it('1 → singular "day"', () =>
    expect(formatWindowClause(1)).toBe('across 1 day of session retention'))
  it('N → "across N days of session retention"', () =>
    expect(formatWindowClause(30)).toBe('across 30 days of session retention'))
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
