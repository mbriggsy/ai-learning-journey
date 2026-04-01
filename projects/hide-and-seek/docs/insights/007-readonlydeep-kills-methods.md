---
title: ReadonlyDeep turns interface methods into uncallable {}
date: 2026-04-01
phase: 6a
modules: [src/types/utility.ts, src/renderer/systems/SoundEffects.ts]
tags: [typescript, readonlydeep, type-system, methods, GameMap]
---

## Problem

`state.map.isBlocking(x0, y0)` produced TS error: "This expression is not callable. Type '{}' has no call signatures." The code compiled fine with `PlayingState` but failed with `ReadonlyDeep<PlayingState>`.

## Root Cause

Our `ReadonlyDeep<T>` recursion has a catch-all for `object`:

```typescript
T extends object
  ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
  : T;
```

`GameMap.isBlocking` has type `(x: number, y: number) => boolean`. Functions ARE objects in TypeScript. `ReadonlyDeep<(x: number, y: number) => boolean>` maps over the function's keys (`.length`, `.name`, etc.) and produces `{}` — losing the call signature entirely.

## Fix

Cast the map back to its concrete type before calling methods:

```typescript
const map = state.map as PlayingState['map'];
if (map.isBlocking(x0, y0)) return true;
```

## Key Insight

`ReadonlyDeep` is safe for data (objects, arrays, maps, sets) but **destroys function call signatures**. Any interface with methods (not just data properties) will break when accessed through `ReadonlyDeep<T>`. This is a fundamental limitation of recursive mapped types — they can't distinguish "data property" from "method."

When a renderer system needs to call methods on game state objects, cast the specific field to its original type. Don't fight the type system.

## Also Applies To

Any future `ReadonlyDeep<T>` usage where `T` contains interfaces with methods. `GameMap` is the main one today (`isWalkable`, `isBlocking`). If we add method-bearing interfaces to other state fields, the same cast pattern applies.
