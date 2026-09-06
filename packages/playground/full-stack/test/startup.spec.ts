import { test, expect } from '@playwright/test'
test('the real Node service and CLI create, execute in, and remove a container in browser Linux', async ({
  page,
}) => {
  page.on('console', (message) => console.log(message.text()))
  page.on('pageerror', (error) => console.log(error.message))
  await page.goto('./')
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 })
  await page.locator('#start').click()
  await expect(page.getByRole('status')).toContainText(
    /Passed:|failed|timed out/,
    {
      timeout: 910_000,
    },
  )
  console.log(await page.getByRole('status').textContent())
  console.log(await page.getByRole('log').textContent())
  await expect(page.getByRole('status')).toContainText('Passed:')
})
