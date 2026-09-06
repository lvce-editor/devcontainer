import { defineConfig } from '@playwright/test'
import base from './playwright.config.ts'

export default defineConfig({
  ...base,
  reporter: 'list',
  testDir: './test/hosting',
  timeout: 90_000,
  use: {
    ...base.use,
    baseURL: process.env.PLAYGROUND_SITE_URL || base.use!.baseURL,
  },
  webServer: process.env.PLAYGROUND_SITE_URL ? undefined : base.webServer,
})
