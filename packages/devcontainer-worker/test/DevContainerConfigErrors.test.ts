import { beforeEach, expect, jest, test } from '@jest/globals'
import * as DevContainerConfig from '../src/parts/DevContainerConfig/DevContainerConfig.ts'

const stat = jest.fn<(path: string) => Promise<unknown>>()

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
      DevContainerConfig.detect({ workspaceFolder: '/workspace' }, stat),
    ).rejects.toBe(error)
    expect(stat).toHaveBeenCalledTimes(1)
  },
)

test.each(['ENOENT', 'ENOTDIR'])(
  'detect checks both candidates when stat returns %s',
  async (code) => {
    stat.mockRejectedValue(Object.assign(new Error('missing'), { code }))
    expect(
      await DevContainerConfig.detect({ workspaceFolder: '/workspace' }, stat),
    ).toMatchObject({ found: false })
    expect(stat).toHaveBeenCalledTimes(2)
  },
)
