import { expect, test } from '@playwright/test'

// Control response ordering explicitly; the startup test uses the real VM.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const scope = globalThis as any
    scope.testWorkers = []
    scope.Worker = class {
      onmessage: any
      onerror: any
      terminated = false
      constructor() {
        scope.testWorkers.push(this)
      }
      postMessage() {}
      terminate() {
        this.terminated = true
      }
    }
  })
  await page.goto('./')
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 })
})

test('repeated Start and late responses cannot revive a stopped session', async ({
  page,
}) => {
  await page.locator('#start').click()
  await page.evaluate(() =>
    globalThis.document.querySelector<HTMLButtonElement>('#start')!.click(),
  )
  expect(
    await page.evaluate(() => (globalThis as any).testWorkers.length),
  ).toBe(1)
  await page.locator('#stop').click()
  await page.locator('#start').click()
  await page.evaluate(() => {
    const [previous, current] = (globalThis as any).testWorkers
    previous.onmessage({ data: { message: 'FULL_STACK_PASS', type: 'log' } })
    previous.onerror({ preventDefault() {} })
    current.onmessage({
      data: { message: 'FULL_STACK_PHASE Running CLI exec', type: 'log' },
    })
  })
  await expect(page.getByRole('status')).toHaveText('Running CLI exec')
  await expect(page.locator('#start')).toBeDisabled()
  await page.locator('#stop').click()
  await page.evaluate(() => {
    ;(globalThis as any).testWorkers[1].onmessage({
      data: { message: 'FULL_STACK_PASS', type: 'log' },
    })
  })
  await expect(page.getByRole('status')).toContainText('Stopped')
  expect(
    await page.evaluate(() =>
      (globalThis as any).testWorkers.every((worker: any) => worker.terminated),
    ),
  ).toBe(true)
})

test('boot failure settles the session and retry creates a new worker', async ({
  page,
}) => {
  await page.locator('#start').click()
  await page.evaluate(() =>
    (globalThis as any).testWorkers[0].onmessage({
      data: { message: 'Boot failed', type: 'error' },
    }),
  )
  await expect(page.getByRole('status')).toContainText('Boot failed')
  await expect(page.locator('#stop')).toBeDisabled()
  await page.locator('#start').click()
  await page.evaluate(() =>
    (globalThis as any).testWorkers[1].onmessage({
      data: { message: 'FULL_STACK_PASS', type: 'log' },
    }),
  )
  await expect(page.getByRole('status')).toContainText('Passed:')
})

test('a hung boot times out and can retry', async ({ page }) => {
  await page.clock.install()
  await page.locator('#start').click()
  await page.clock.fastForward(1_800_001)
  await expect(page.getByRole('status')).toContainText('timed out')
  await expect(page.locator('#start')).toBeEnabled()
  await expect(page.locator('#stop')).toBeDisabled()
})
