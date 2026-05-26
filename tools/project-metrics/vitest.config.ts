import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Git-fixture tests shell out to `git init` + commits; Windows is slow.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
