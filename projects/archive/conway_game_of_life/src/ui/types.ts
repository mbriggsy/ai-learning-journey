export type BrushSize = 1 | 3 | 5 | 9

export type InputMode = 'draw' | 'navigate'

export interface ViewToggleState {
  readonly gridLines: boolean
  readonly ghostTrails: boolean
  readonly audio: boolean
}
