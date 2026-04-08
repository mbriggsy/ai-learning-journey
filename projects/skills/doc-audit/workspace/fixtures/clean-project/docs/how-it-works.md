# How Snapgrid Works

## Overview

Snapgrid captures the computed CSS grid layout of a container element and serializes it into a deterministic snapshot format. This snapshot can then be compared against a baseline to detect visual regressions.

## Capture Process

1. **Launch browser** — Snapgrid uses Puppeteer to launch a headless Chromium instance
2. **Navigate** — Load the page containing the grid container
3. **Compute layout** — Extract `getComputedStyle` and `getBoundingClientRect` for every grid item
4. **Serialize** — Convert layout data into a canonical JSON format (sorted keys, fixed precision)
5. **Hash** — SHA-256 hash of the serialized layout for fast comparison

## Snapshot Format

```json
{
  "container": {
    "gridTemplateColumns": "1fr 1fr 1fr",
    "gridTemplateRows": "auto auto",
    "gap": "16px"
  },
  "items": [
    {
      "selector": ".item-1",
      "gridArea": "1 / 1 / 2 / 2",
      "bounds": { "x": 0, "y": 0, "width": 400, "height": 200 }
    }
  ],
  "hash": "a1b2c3..."
}
```

## Comparison Algorithm

Snapgrid compares snapshots at two levels:

1. **Fast path** — Hash comparison. If hashes match, layouts are identical.
2. **Slow path** — If hashes differ, compare item-by-item. Each item's bounds are compared with a configurable threshold (default: 1% of viewport dimension). This catches subpixel rendering differences across platforms.

## Limitations

- Only captures CSS Grid properties, not Flexbox
- Requires a running browser (Puppeteer)
- Animated elements may produce inconsistent snapshots (use `waitForIdle` option)
