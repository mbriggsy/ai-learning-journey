/** A React `useId` value made safe inside an SVG `url(#…)` reference (React's ids carry characters a fragment does not). */
export function svgId(raw: string, prefix: string): string {
  return `${prefix}-${raw.replace(/[^A-Za-z0-9_-]/g, '')}`
}
