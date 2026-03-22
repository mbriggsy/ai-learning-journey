import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 1,
  workers: 4,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
      timeout: 120_000, // WebKit WebSocket connections are slower under parallel load
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      timeout: 120_000,
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
      timeout: 120_000,
    },
  ],
  webServer: [
    {
      command: 'npx partykit dev',
      port: 1999,
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      command: 'pnpm run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 15_000,
    },
  ],
});
