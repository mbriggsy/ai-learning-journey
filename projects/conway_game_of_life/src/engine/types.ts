/** Callback for animation frame — uses number, not DOMHighResTimeStamp, to stay DOM-free */
export type FrameCallback = (timestamp: number) => void

/** Dependency-injected timer — browser provides rAF, tests provide manual stepping */
export interface TimerProvider {
  requestFrame(callback: FrameCallback): number
  cancelFrame(handle: number): void
}

/** Per-frame timing data delivered to onTick subscribers */
export interface TickData {
  readonly deltaTime: number
  readonly elapsed: number
  readonly fps: number
}

/** Aggregated stats across all steps in a single frame (for max-speed batching) */
export interface FrameStats {
  readonly stepsThisFrame: number
  readonly frameBirthCount: number
  readonly frameDeathCount: number
  readonly liveCellCount: number
}

export type OnTickCallback = (data: TickData, stats: FrameStats) => void
