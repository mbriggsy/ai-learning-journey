---
title: Phaser flattens Tiled object properties to Record, not arrays
date: 2026-03-30
phase: 4
modules: [game/doors, game/map]
tags: [phaser, tiled, parsing, type-mismatch]
---

# Phaser Flattens Tiled Object Properties

## Problem

Door properties from Tiled JSON (like `isOpen`) weren't being read correctly. Code expected array-format properties but got `undefined`.

## Root Cause

Raw Tiled JSON stores object properties as arrays:
```json
"properties": [{ "name": "isOpen", "type": "bool", "value": true }]
```

But Phaser's tilemap parser flattens these into a plain `Record<string, unknown>`:
```typescript
{ isOpen: true }
```

Code that accessed `obj.properties[0].value` got nothing. The correct access pattern is `obj.properties?.isOpen`.

## Fix

Changed property access in `createDoorSystem()` to treat properties as `Record<string, unknown>`:
```typescript
const props = obj.properties as Record<string, unknown> | undefined;
const isOpen = props?.['isOpen'] === true;
```

## Key Insight

Phaser's Tiled parser is not a pass-through. It transforms the data structure. Always verify the shape of data AFTER Phaser processes it, not by reading the Tiled JSON spec directly.

## Also Applies To

Any Tiled object layer property — rooms, spawn points, triggers. If a future phase adds custom properties to Tiled objects, access them as `Record<string, unknown>`, not as arrays.
