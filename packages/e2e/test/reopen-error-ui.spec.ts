import { expect, test } from '@playwright/test'

test('failed reopen renders an error dialog and contains the notification text', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  await page.goto('/tests/devcontainer.reopen-docker-not-installed.html')
  await expect(page.locator('#TestOverlay')).toContainText(
    /test (passed|failed)/,
    { timeout: 60_000 },
  )
  await expect(page.locator('#TestOverlay')).toContainText('test passed')
  const notification = page.locator('.Notification')
  await expect(notification).toBeVisible()
  for (const viewport of [
    { height: 720, width: 1280 },
    { height: 240, width: 320 },
  ]) {
    await page.setViewportSize(viewport)
    await expect
      .poll(async () =>
        notification.evaluate((element) => {
          const message = element.querySelector('.NotificationMessage')!
          const outer = element.getBoundingClientRect()
          const inner = message.getBoundingClientRect()
          return (
            inner.left >= outer.left &&
            inner.right <= outer.right &&
            inner.bottom <= outer.bottom &&
            outer.left >= 0 &&
            outer.top >= 0 &&
            outer.bottom <=
              element.ownerDocument.documentElement.clientHeight &&
            message.scrollWidth <= message.clientWidth
          )
        }),
      )
      .toBe(true)
  }
  expect(errors.join('\n')).not.toContain('getIcon')
})
