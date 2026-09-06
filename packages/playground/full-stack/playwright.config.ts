import { defineConfig } from '@playwright/test'
export default defineConfig({
  outputDir: './test-results',
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
  reporter: 'list',
  retries: 0,
  testDir: './test',
  timeout: 2_750_000,
  use: {
    baseURL:
      process.env.PLAYGROUND_BASE_URL ||
      'http://127.0.0.1:4173/devcontainer/full-stack/',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: process.env.PLAYGROUND_BASE_URL
    ? undefined
    : {
        command: 'node ../scripts/serve.js',
        url: 'http://127.0.0.1:4173/devcontainer/full-stack/',
      },
  workers: 1,
})
