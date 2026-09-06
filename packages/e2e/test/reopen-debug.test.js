import { expect, test } from '@playwright/test'

test('diagnose reopening the container workspace', async ({ page }) => {
  const logs = []
  page.on('console', (message) => logs.push(`${message.type()}: ${message.text()}`))
  page.on('pageerror', (error) => logs.push(`pageerror: ${error.message}`))
  await page.goto('/tests/devcontainer.reopen.html')
  try {
    await expect(page.locator('#TestOverlay')).toContainText(/test (passed|failed)/, { timeout: 180_000 })
    await expect(page.locator('#TestOverlay')).toContainText('test passed')
  } catch (error) {
    throw new Error(`${String(error)}\n[DEBUG-devcontainer-reopen] ${logs.join('\n')}\n${await page.locator('body').innerText()}`)
  }
})
