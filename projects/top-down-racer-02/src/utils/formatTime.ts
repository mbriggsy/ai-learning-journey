/**
 * Time formatting utilities for display purposes.
 *
 * Two formats for different contexts:
 * - formatRaceTime: M:SS.mmm precision for HUD and race results
 * - formatBestTime: compact centisecond precision for track select screen
 */

/** Format ticks into M:SS.mmm string. Returns '--:--.---' if ticks <= 0. */
export function formatRaceTime(ticks: number): string {
  if (ticks <= 0) return '--:--.---';
  const totalMs = Math.floor((ticks / 60) * 1000);
  const ms  = totalMs % 1000;
  const sec = Math.floor(totalMs / 1000) % 60;
  const min = Math.floor(totalMs / 60000);
  return `${min}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/** Format ticks into compact string with centisecond precision. e.g. "12.34s" or "1:02.34" */
export function formatBestTime(ticks: number): string {
  const totalSeconds = ticks / 60;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
  }
  return seconds.toFixed(2) + 's';
}
