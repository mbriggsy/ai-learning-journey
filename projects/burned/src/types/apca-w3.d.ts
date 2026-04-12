// src/types/apca-w3.d.ts
// apca-w3 v0.1.9 ships no TypeScript types. This declaration covers only the
// exports Phase 1 consumes. Algorithm is W3C-licensed and version-frozen at
// 0.0.98G-4g (Feb 2021) per Myndex — stale npm publish date is not a staleness
// signal, it's an algorithm-locked signal.
declare module 'apca-w3' {
  export function APCAcontrast(fgY: number, bgY: number, places?: number): number;
  export function sRGBtoY(rgba: [number, number, number, number] | [number, number, number]): number;
  export function displayP3toY(rgba: [number, number, number, number]): number;
  export function calcAPCA(txt: string | number[], bg: string | number[]): number;
  export function alphaBlend(fg: number[], bg: number[], round?: boolean): number[];
  export function fontLookupAPCA(lc: number): readonly number[];
}
