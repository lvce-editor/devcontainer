import { expect, test } from 'playwright/test'

for (const fixture of ['javascript-node-24', 'ubuntu-24.04', 'dockerfile']) {
  test(`${fixture} runs by visiting its URL and reloading`, async ({
    page,
  }) => {
    await page.goto(`/tests/devcontainer.${fixture}.html`)
    const overlay = page.locator('#TestOverlay')
    await expect(overlay).toContainText(/test (passed|failed)/, {
      timeout: 180_000,
    })
    await expect(overlay).toContainText('test passed')

    await page.reload()
    await expect(overlay).toContainText(/test (passed|failed)/, {
      timeout: 180_000,
    })
    await expect(overlay).toContainText('test passed')
  })
}
