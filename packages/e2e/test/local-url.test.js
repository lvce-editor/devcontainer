import { expect, test } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

test.beforeEach(async ({ page }) => {
  page.on('console', (message) => {
    if (message.text().includes('DEVCONTAINER_STARTUP_DIAGNOSTIC'))
      console.info(message.text())
  })
  page.on('pageerror', (error) => console.error('startup page error', error))
})

const capture = async (page, testInfo, phase) => {
  const data = await page.evaluate(
    () => globalThis['__devcontainerStartup'] || { missing: true },
  )
  const path = testInfo.outputPath(`startup-${phase}.json`)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(data))
  if (
    process.env.LVCE_STARTUP_DIAGNOSTIC &&
    (data.missing || !data.entries?.length)
  )
    throw new Error('Startup diagnostic capture is missing')
  await testInfo.attach(`startup-${phase}`, {
    path,
    contentType: 'application/json',
  })
}

test.afterEach(async ({ page }, testInfo) => {
  await capture(page, testInfo, 'final')
})

for (const fixture of ['javascript-node-24', 'ubuntu-24.04', 'dockerfile']) {
  test(`${fixture} runs by visiting its URL and reloading`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/tests/devcontainer.${fixture}.html`)
    const overlay = page.locator('#TestOverlay')
    await expect(overlay).toContainText(/test (passed|failed)/, {
      timeout: 180_000,
    })
    await expect(overlay).toContainText('test passed')

    await capture(page, testInfo, 'before-reload')
    await page.reload()
    await expect(overlay).toContainText(/test (passed|failed)/, {
      timeout: 180_000,
    })
    await expect(overlay).toContainText('test passed')
  })
}
