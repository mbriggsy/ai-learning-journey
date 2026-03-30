import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: false,
      restoreMocks: true,
      clearMocks: true,
      projects: [
        {
          extends: true,
          test: {
            name: 'game',
            include: ['tests/game/**/*.test.ts'],
            environment: 'node',
            pool: 'threads',
          },
        },
        {
          extends: true,
          test: {
            name: 'renderer',
            include: ['tests/renderer/**/*.test.ts'],
            environment: 'jsdom',
            pool: 'forks',
          },
        },
        {
          extends: true,
          test: {
            name: 'integration',
            include: ['tests/integration/**/*.test.ts'],
            environment: 'node',
            pool: 'forks',
            testTimeout: 30000,
          },
        },
      ],
      coverage: {
        provider: 'v8',
        enabled: false,
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.ts'],
        exclude: [
          'src/main.ts',
          'src/types/**',
          '**/*.d.ts',
        ],
      },
    },
  })
);
