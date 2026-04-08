# Snapgrid

A CSS grid snapshot testing utility for visual regression detection.

## Installation

```bash
npm install snapgrid --save-dev
```

## Usage

```javascript
const { snapGrid } = require('snapgrid');

// Take a snapshot of a grid layout
const snapshot = await snapGrid('.my-grid-container', {
  viewport: { width: 1280, height: 720 },
  threshold: 0.01,
});

// Compare against baseline
expect(snapshot).toMatchBaseline();
```

## Configuration

Create a `snapgrid.config.js` in your project root:

```javascript
module.exports = {
  baselineDir: '__snapshots__',
  diffDir: '__diffs__',
  threshold: 0.01,
  viewports: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
  ],
};
```

## How It Works

See [docs/how-it-works.md](docs/how-it-works.md) for the technical details.

## API Reference

See [docs/api.md](docs/api.md) for the full API documentation.

## License

MIT
