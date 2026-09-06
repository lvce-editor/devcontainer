import { expect, test } from '@playwright/test'
import { rm, writeFile } from 'node:fs/promises'

// The normal e2e case catches and asserts the structured error. This temporary
// case rethrows it so we can also verify the actual failure overlay and console.
test('missing Docker displays an actionable error code and message', async ({
  page,
}) => {
  const testFile = new URL(
    '../src/devcontainer.docker-not-installed-overlay.ts',
    import.meta.url,
  )
  await writeFile(
    testFile,
    `
import { testDockerNotInstalled } from '../helpers/testDockerNotInstalled.ts'
export const test = async (context) => { throw await testDockerNotInstalled(context) }
`,
  )
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  try {
    await page.goto('/tests/devcontainer.docker-not-installed-overlay.html')
    const overlay = page.locator('#TestOverlay')
    await expect(overlay).toContainText('test failed', { timeout: 60_000 })
    await expect(overlay).toContainText('DockerNotInstalledError')
    await expect(overlay).toContainText('E_DOCKER_NOT_INSTALLED')
    await expect(overlay).toContainText('Docker was not found. Install Docker')
    await expect(overlay).toContainText('PATH')
    await expect(overlay).not.toContainText('lastResult')
    await expect
      .poll(() => errors.join('\n'))
      .toContain('E_DOCKER_NOT_INSTALLED')
  } finally {
    await rm(testFile, { force: true })
  }
})
