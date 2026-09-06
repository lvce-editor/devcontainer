import { defineConfig } from '@playwright/test'
export default defineConfig({
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
  reporter: 'list',
  retries: 0,
  testDir: './test',
  timeout: 950_000,
  use: {
    baseURL: 'http://127.0.0.1:4173/devcontainer/',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node ../scripts/serve.js',
    url: 'http://127.0.0.1:4173/devcontainer/',
  },
  workers: 1,
})
