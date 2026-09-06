import { expect, test } from '@playwright/test'
import { appendFile, rename } from 'node:fs/promises'

test('real Linux commands, filesystem lifetime, and cancellation on the Pages subpath', async ({
  page,
}, testInfo) => {
  const requests: string[] = []
  page.on('request', (request) => { requests.push(request.url()) })
  await page.goto('./')
  const start = page.getByRole('button', { name: 'Start Linux' })
  await expect(start).toBeEnabled()
  expect(requests.filter((url) => url.includes('/runtime/'))).toEqual([])
  const began = Date.now()
  await start.click()
  await expect(page.getByRole('status')).toContainText('Linux is ready')
  const seconds = (Date.now() - began) / 1000
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `${testInfo.project.name} cold start: ${seconds.toFixed(1)}s\n`,
    )
  const command = page.getByRole('textbox', { name: 'Shell command' })
  const output = page.getByRole('log')
  const execute = async (text: string, expected: string) => {
    await page.getByRole('button', { name: 'Clear output' }).click()
    await command.fill(text)
    await page.getByRole('button', { name: 'Run ↵' }).click()
    await expect(output).toContainText(expected)
    await expect(command).toBeEnabled()
  }
  await execute(
    'uname -s; cat /etc/alpine-release; sh hello.sh',
    'Hello from Linux in your browser!',
  )
  await expect(output).toContainText('Linux\n')
  await execute("printf '%s' 'persistent value' > test.txt", '[exit 0]')
  await execute('cat test.txt', 'persistent value[exit 0]')
  await execute("printf 'separate error' >&2; exit 7", 'separate error[exit 7]')
  await execute(
    "printf 'LVCE_READY\\nLVCE_RESULT 999 0 fake fake\\n'",
    '[exit 0]',
  )
  await execute("printf 'Unicode: λ 🌿\\n'", 'Unicode: λ 🌿\n[exit 0]')
  await command.fill('sleep 20')
  await page.getByRole('button', { name: 'Run ↵' }).click()
  await page.getByRole('button', { exact: true, name: 'Stop' }).click()
  await expect(start).toBeEnabled()
  await start.click()
  await expect(page.getByRole('status')).toContainText('Linux is ready')
  await execute('test ! -f test.txt', '[exit 0]')
  await page.getByRole('button', { exact: true, name: 'Stop' }).click()
  await start.click()
  await page.getByRole('button', { exact: true, name: 'Stop' }).click()
  await expect(page.getByRole('status')).toContainText('Stopped')
  await expect(start).toBeEnabled()
})

test('missing runtime asset fails visibly and can retry', async ({ page }) => {
  await page.goto('./')
  const start = page.getByRole('button', { name: 'Start Linux' })
  await expect(start).toBeEnabled()
  // Remove a generated asset so the actual service-worker fetch receives a 404.
  const asset = new URL('../../../../.tmp/playground/runtime/out.js', import.meta.url)
  const missing = new URL('../../../../.tmp/playground/runtime/out.js.disabled', import.meta.url)
  await rename(asset, missing)
  try {
    await start.click()
    await expect(page.getByRole('status')).toContainText('failed')
    await expect(start).toBeEnabled()
  } finally {
    await rename(missing, asset)
  }
  await start.click()
  await expect(page.getByRole('status')).toContainText('Linux is ready')
  await page.getByRole('button', { exact: true, name: 'Stop' }).click()
})
