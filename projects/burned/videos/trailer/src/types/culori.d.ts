// culori v4.0.2 ships no TypeScript types.
// Mirrors `src/types/culori.d.ts` in the root BURNED project — both
// describe the same library API. Duplicated rather than cross-package-
// imported because the trailer's tsconfig include is scoped to
// `videos/trailer/src/**` + `scripts/**`. If culori ever ships official
// types, delete both copies and `pnpm i --save-dev @types/culori`.
declare module 'culori' {
  export interface Color {
    mode: string
    r?: number
    g?: number
    b?: number
    alpha?: number
    l?: number
    a?: number
    [key: string]: unknown
  }

  export function parse(input: string): Color | undefined
  export function rgb(input: string | Color): Color | undefined
  export function formatHex(color: Color): string
  export function wcagContrast(a: string | Color, b: string | Color): number
  export function differenceEuclidean(mode: string): (a: Color, b: Color) => number
  export function converter(mode: string): (color: Color) => Color
  export function filterDeficiencyDeuter(severity?: number): (color: Color) => Color
  export function filterDeficiencyProt(severity?: number): (color: Color) => Color
  export function filterDeficiencyTrit(severity?: number): (color: Color) => Color
}
