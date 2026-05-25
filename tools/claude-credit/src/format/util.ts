/** Format integer with thousands separators. */
export function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}

/** Format bytes as human-readable (KB, MB, GB). */
export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)} ${units[i]}`;
}

/** Pad string to width (right-pad). */
export function padRight(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

/** Pad string to width (left-pad, for numeric columns). */
export function padLeft(s: string, width: number): string {
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

/** Em-dash used for "not measured" (null) values per the null discipline. */
export const DASH = '—';

/** Format an ISO timestamp as YYYY-MM-DD, or em-dash when null. */
export function fmtDateOrDash(iso: string | null): string {
  return iso ? iso.slice(0, 10) : DASH;
}

/** Format a number with separators, or em-dash when null (NEVER coerce null to 0). */
export function fmtNumOrDash(n: number | null): string {
  return n === null ? DASH : fmtNum(n);
}
