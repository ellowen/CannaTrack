import { defineConfig, devices } from '@playwright/test'

/**
 * Suite E2E de CultiTrack.
 *
 * - Proyecto `desktop` corre TODA la suite.
 * - Los proyectos mobile (iPhone SE / 15 / 15 Pro Max, Pixel, Galaxy)
 *   corren los specs responsive y de smoke mobile.
 * - El dev server se levanta solo (webServer). En CI usa el build previo.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'iphone-se',
      use: { ...devices['iPhone SE'] },
      testMatch: /(responsive|mobile)\.spec\.ts/,
    },
    {
      name: 'iphone-15',
      use: { ...devices['iPhone 15'] },
      testMatch: /(responsive|mobile)\.spec\.ts/,
    },
    {
      name: 'iphone-15-pro-max',
      use: { ...devices['iPhone 15 Pro Max'] },
      testMatch: /(responsive|mobile)\.spec\.ts/,
    },
    {
      name: 'pixel-7',
      use: { ...devices['Pixel 7'] },
      testMatch: /(responsive|mobile)\.spec\.ts/,
    },
    {
      name: 'galaxy-s9',
      use: { ...devices['Galaxy S9+'] },
      testMatch: /(responsive|mobile)\.spec\.ts/,
    },
  ],
})
