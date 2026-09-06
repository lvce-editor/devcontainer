import { expect, test } from '@playwright/test'

for (const first of ['full-stack/', './']) {
  test(`isolation stays usable when visiting ${first} first`, async ({
    page,
  }) => {
    const requests: string[] = []
    let navigations = 0
    page.on('request', (request) => {
      requests.push(request.url())
    })
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations++
    })
    await page.goto(first)
    await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 })
    expect(navigations).toBeLessThanOrEqual(2)
    for (let visit = 0; visit < 2; visit++) {
      const previousNavigations = navigations
      if (page.url().includes('/full-stack/')) {
        await page
          .getByRole('link', { name: '← Interactive Linux playground' })
          .click()
      } else {
        await page.locator('a[href="./full-stack/"]').click()
      }
      await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 })
      expect(navigations - previousNavigations).toBeLessThanOrEqual(2)
      expect(await page.evaluate(() => globalThis.crossOriginIsolated)).toBe(
        true,
      )
    }
    expect(requests.filter((url) => url.includes('/runtime/'))).toEqual([])
  })
}
