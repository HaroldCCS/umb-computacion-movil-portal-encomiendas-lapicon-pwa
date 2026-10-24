import { defineConfig, devices } from '@playwright/test'

/**
 * E2E en celular (docs/10 §10.11): iPhone 13 (WebKit) y Pixel 7 (Chromium).
 * La API se simula con page.route: estas pruebas no dependen del backend.
 */
export default defineConfig({
  testDir: './pruebas/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:5500', trace: 'retain-on-failure' },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://localhost:5500',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
