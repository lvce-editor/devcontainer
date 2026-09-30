import { defineConfig } from '@playwright/test'

export default defineConfig({
  globalTeardown: './scripts/cleanup-local-url.js',
  testDir: './test',
  outputDir: './.tmp/test-results',
  timeout: 400_000,
  workers: 1,
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev --prefix ../..',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
  },
})
