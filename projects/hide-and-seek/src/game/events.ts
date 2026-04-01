import type { TypedEmitter } from '../types/events.js';

export function createTypedEmitter<TMap extends Record<string, unknown[]>>(): TypedEmitter<TMap> {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  return {
    emit<K extends keyof TMap & string>(event: K, ...args: TMap[K]): void {
      const handlers = listeners.get(event);
      if (!handlers || handlers.length === 0) return;
      const snapshot = [...handlers]; // copy-on-iterate: safe if handler calls off()
      for (const fn of snapshot) fn(...args);
    },
    on<K extends keyof TMap & string>(event: K, fn: (...args: TMap[K]) => void): void {
      let arr = listeners.get(event);
      if (!arr) { arr = []; listeners.set(event, arr); }
      arr.push(fn as (...args: unknown[]) => void);
    },
    off<K extends keyof TMap & string>(event: K, fn: (...args: TMap[K]) => void): void {
      const arr = listeners.get(event);
      if (!arr) return;
      const idx = arr.indexOf(fn as (...args: unknown[]) => void);
      if (idx !== -1) arr.splice(idx, 1);
    },
    offAll(): void { listeners.clear(); },
  };
}
