import { defineConfig } from '@playwright/test'

// Playwright 1.63+ leaves Firefox’s optimizing Wasm compiler enabled.
export default defineConfig({
  expect: { timeout: 130_000 },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
  retries: 0,
  testDir: './test/browser',
  timeout: 240_000,
  use: {
    baseURL: 'http://127.0.0.1:4173/devcontainer/',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run serve',
    reuseExistingServer: !process.env.CI,
    url: 'http://127.0.0.1:4173/devcontainer/',
  },
  workers: 1,
})
