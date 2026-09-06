import { test, expect } from '@playwright/test'
import { appendFile, rename } from 'node:fs/promises'
test('the real Node service and CLI create, execute in, and remove a container in browser Linux', async ({
  page,
}, testInfo) => {
  page.on('console', (message) => console.log(message.text()))
  page.on('pageerror', (error) => console.log(error.message))
  const requests: string[] = []
  page.on('request', (request) => {
    requests.push(request.url())
  })
  await page.goto('./')
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 })
  expect(requests.filter((url) => url.includes('/runtime/'))).toEqual([])
  if (!process.env.PLAYGROUND_BASE_URL) {
    // Actual 404 through the isolation service worker, followed by a full retry.
    const asset = new URL(
      '../../../../.tmp/playground/full-stack/runtime/load.js',
      import.meta.url,
    )
    const missing = new URL(
      '../../../../.tmp/playground/full-stack/runtime/load.js.disabled',
      import.meta.url,
    )
    await rename(asset, missing)
    try {
      await page.locator('#start').click()
      await expect(page.getByRole('status')).toContainText('failed', {
        timeout: 30_000,
      })
      await expect(page.locator('#start')).toBeEnabled()
    } finally {
      await rename(missing, asset)
    }
  }
  await page.locator('#start').click()
  await expect(page.getByRole('status')).toContainText(
    /Passed:|failed|timed out/,
    {
      timeout: 1_810_000,
    },
  )
  console.log(await page.getByRole('status').textContent())
  console.log(await page.getByRole('log').textContent())
  await expect(page.getByRole('status')).toContainText('Passed:')
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `${testInfo.project.name} full stack: ${await page.getByRole('status').textContent()}\n`,
    )
  }
})
