import type { GameEventMap } from '../types/events';

type Listener<Args extends readonly unknown[]> = (...args: Args) => void;

export function createEmitter<TMap extends Record<string, readonly unknown[]>>() {
  const listeners = new Map<keyof TMap, Set<Listener<any>>>();

  return {
    emit<K extends keyof TMap>(event: K, ...args: TMap[K]) {
      const set = listeners.get(event);
      if (!set) return;
      for (const fn of [...set]) fn(...args); // copy-on-iterate
    },
    on<K extends keyof TMap>(event: K, fn: Listener<TMap[K]>) {
      let set = listeners.get(event);
      if (!set) { set = new Set(); listeners.set(event, set); }
      set.add(fn);
    },
    off<K extends keyof TMap>(event: K, fn: Listener<TMap[K]>) {
      listeners.get(event)?.delete(fn);
    },
    offAll() { listeners.clear(); },
  };
}

export type Emitter = ReturnType<typeof createEmitter<GameEventMap>>;
