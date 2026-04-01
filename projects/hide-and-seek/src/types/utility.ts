/**
 * Recursive readonly. Prevents renderer from mutating nested game state.
 * Shallow Readonly<T> does NOT protect arrays or nested objects.
 */
export type ReadonlyDeep<T> =
  T extends readonly (infer U)[]
    ? readonly ReadonlyDeep<U>[]
    : T extends Map<infer K, infer V>
      ? ReadonlyMap<ReadonlyDeep<K>, ReadonlyDeep<V>>
      : T extends Set<infer U>
        ? ReadonlySet<ReadonlyDeep<U>>
        : T extends object
          ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
          : T;
