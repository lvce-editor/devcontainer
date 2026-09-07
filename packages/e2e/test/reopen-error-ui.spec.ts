import { expect, test } from '@playwright/test'

test('missing Docker uses a structured dialog without a duplicate notification', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  await page.goto('/tests/devcontainer.reopen-docker-not-installed.html')
  const result = page.locator('#TestOverlay')
  await expect(result).toContainText(/test (passed|failed|skipped)/, {
    timeout: 60_000,
  })
  test.skip(
    (await result.getAttribute('data-state')) === 'skip',
    'Requires an editor release containing structured dialog support',
  )
  await expect(result).toContainText('test passed')
  await expect(page.locator('.Notification')).toHaveCount(0)
  expect(errors.join('\n')).not.toContain('getIcon')
})
