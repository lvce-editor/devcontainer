import { expect, test } from '@jest/globals'
import { getProgress, run } from '../src/parts/Progress/Progress.ts'

test('progress is bounded, isolated by operation, and released after failure', async () => {
  const completed = Promise.withResolvers<void>()
  const started = Promise.withResolvers<void>()
  const pending = run('first', async (append) => {
    append('old output')
    append('x'.repeat(2 * 1024 * 1024))
    started.resolve()
    await completed.promise
    throw new Error('build failed')
  })
  const failed = await expect(pending).rejects.toThrow('build failed')
  try {
    await started.promise
    expect(getProgress('first')).toHaveLength(1024 * 1024)
    expect(getProgress('other')).toBe('')
    await expect(run('second', async () => {})).rejects.toThrow(
      'already in progress',
    )
  } finally {
    completed.resolve()
    await failed
  }
  await run('second', async (append) => {
    append('new output')
  })
  expect(getProgress('first')).toBe('')
  expect(getProgress('second')).toBe('new output')
})
