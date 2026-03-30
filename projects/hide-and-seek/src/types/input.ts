export type FacingDirection = 'up' | 'down' | 'left' | 'right';

export interface InputState {
  readonly moveX: number;  // -1 to 1, normalized
  readonly moveY: number;  // -1 to 1, normalized
  readonly interact: boolean;  // true on frame first pressed
  readonly pause: boolean;     // true on frame first pressed
}
