/**
 * Custom event bus for Phase 5 audio synchronization.
 * Host view animations dispatch timing events; audio engine listens.
 */

export type TimingEvent =
  | 'vote-reveal-start'
  | 'vote-reveal-complete'
  | 'policy-flip-start'
  | 'policy-flip-complete'
  | 'power-overlay-enter'
  | 'power-overlay-exit'
  | 'game-over-reveal';

type TimingListener = (event: TimingEvent) => void;

const listeners: TimingListener[] = [];

function onTimingEvent(listener: TimingListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function emitTimingEvent(event: TimingEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}
