import { beforeEach, expect, jest, test } from '@jest/globals'
import type { stat as Stat } from 'node:fs/promises'

const stat = jest.fn<typeof Stat>()
jest.unstable_mockModule('node:fs/promises', () => ({ stat }))
const DevContainerConfig =
  await import('../src/parts/DevContainerConfig/DevContainerConfig.ts')

beforeEach(() => {
  stat.mockReset()
})

test.each(['EACCES', 'EIO', 'ELOOP'])(
  'detect preserves %s instead of reporting missing configuration',
  async (code) => {
    const error = Object.assign(new Error(`${code}: cannot stat config`), {
      code,
    })
    stat.mockRejectedValue(error)
    await expect(
      DevContainerConfig.detect({ workspaceFolder: '/workspace' }),
    ).rejects.toBe(error)
    expect(stat).toHaveBeenCalledTimes(1)
  },
)

test.each(['ENOENT', 'ENOTDIR'])(
  'detect checks both candidates when stat returns %s',
  async (code) => {
    stat.mockRejectedValue(Object.assign(new Error('missing'), { code }))
    expect(
      await DevContainerConfig.detect({ workspaceFolder: '/workspace' }),
    ).toMatchObject({ found: false })
    expect(stat).toHaveBeenCalledTimes(2)
  },
)
