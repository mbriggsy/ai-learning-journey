import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 1,
  workers: 2,
  use: {
    // 127.0.0.1 forces IPv4. `localhost` resolves to ::1 first on
    // Windows, where another local vite process can squat on IPv6
    // loopback (`[::1]:5173`) while BURNED's vite holds IPv4 and
    // dual-wildcard. Tests then connect to the wrong dev server and
    // silently fail at the first selector.
    baseURL: 'http://127.0.0.1:5173',
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
