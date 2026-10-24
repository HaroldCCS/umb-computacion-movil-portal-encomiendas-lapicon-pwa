import { defineConfig, devices } from '@playwright/test'

/**
 * E2E en celular (docs/10 §10.11): iPhone 13 (WebKit) y Pixel 7 (Chromium).
 * La API se simula con page.route (pruebas/e2e/api-falsa.ts) y la identidad y el
 * chat son falsos (`vite --mode e2e`): no dependen del backend ni de Firebase.
 */
export default defineConfig({
  testDir: './pruebas/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:5501', trace: 'retain-on-failure', locale: 'es-CO', timezoneId: 'America/Bogota' },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npx vite --mode e2e --port 5501 --host 127.0.0.1',
    url: 'http://localhost:5501',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
