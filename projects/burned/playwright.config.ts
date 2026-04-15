import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 1,
  workers: 2,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] }, timeout: 120_000 },
    { name: 'Mobile Safari', use: { ...devices['iPhone 13'] }, timeout: 120_000 },
  ],
  webServer: [
    { command: 'pnpm run dev:server', port: 8787, reuseExistingServer: true, timeout: 30_000 },
    { command: 'pnpm run dev', port: 5173, reuseExistingServer: true, timeout: 15_000 },
  ],
})
