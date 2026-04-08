# API Reference

## `snapGrid(selector, options?)`

Captures a grid layout snapshot.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `selector` | `string` | Yes | CSS selector for the grid container |
| `options.viewport` | `{ width, height }` | No | Viewport size (default: 1280x720) |
| `options.threshold` | `number` | No | Comparison threshold (default: 0.01) |
| `options.waitForIdle` | `boolean` | No | Wait for animations to complete (default: false) |
| `options.baseUrl` | `string` | No | Base URL if testing a running server |

**Returns:** `Promise<GridSnapshot>`

**Example:**

```javascript
const snapshot = await snapGrid('.dashboard-grid', {
  viewport: { width: 1920, height: 1080 },
  waitForIdle: true,
});
```

## `GridSnapshot`

### `.toMatchBaseline(name?)`

Compares the snapshot against a stored baseline. If no baseline exists, creates one.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | No | Baseline name (default: auto-generated from selector) |

**Returns:** `{ match: boolean, diff?: DiffReport }`

### `.toJSON()`

Serializes the snapshot to the canonical JSON format.

**Returns:** `string`

### `.hash`

The SHA-256 hash of the serialized snapshot.

**Type:** `string`

## `DiffReport`

| Property | Type | Description |
|----------|------|-------------|
| `added` | `GridItem[]` | Items in snapshot but not baseline |
| `removed` | `GridItem[]` | Items in baseline but not snapshot |
| `changed` | `ChangedItem[]` | Items with different bounds |
| `containerChanged` | `boolean` | Whether grid container properties differ |

## Configuration

See [README.md](../README.md#configuration) for configuration file options.
