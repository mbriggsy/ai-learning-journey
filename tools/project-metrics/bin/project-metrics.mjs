#!/usr/bin/env node
import('../dist/cli.js').catch((err) => {
  console.error('project-metrics failed to start:', err);
  process.exit(1);
});
