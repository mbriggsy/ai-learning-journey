export type ReadonlyDeep<T> =
  T extends (...args: any[]) => any ? T :
  T extends ReadonlyArray<infer U> ? ReadonlyArray<ReadonlyDeep<U>> :
  T extends Map<infer K, infer V> ? ReadonlyMap<ReadonlyDeep<K>, ReadonlyDeep<V>> :
  T extends Set<infer U> ? ReadonlySet<ReadonlyDeep<U>> :
  T extends object ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> } :
  T;

export type Mutable<T> =
  T extends ReadonlyArray<infer U> ? Array<Mutable<U>> :
  T extends ReadonlyMap<infer K, infer V> ? Map<Mutable<K>, Mutable<V>> :
  T extends ReadonlySet<infer U> ? Set<Mutable<U>> :
  T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } :
  T;
