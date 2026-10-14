import { expect, jest, test } from '@jest/globals'
import type {
  RunProcessOptions,
  RunProcessResult,
} from '../src/parts/RunProcess/RunProcess.ts'
import { createContainerFileSystem } from '../src/parts/ContainerFileSystem/ContainerFileSystem.ts'

const options = {
  containerId: 'container',
  operation: 'readFile',
  path: '/workspace/file',
  remoteWorkspaceFolder: '/workspace',
}
const success = { exitCode: 0, stderr: '', stdout: 'content' }

test('bounds simultaneous container file processes and drains queued reads', async () => {
  const runProcess =
    jest.fn<(options: RunProcessOptions) => Promise<RunProcessResult>>()
  const run = createContainerFileSystem(runProcess)
  const started: string[] = []
  const pending: ((result: RunProcessResult) => void)[] = []
  let active = 0
  let peak = 0
  runProcess.mockImplementation(async ({ args }) => {
    started.push(args.at(-1)!)
    active++
    peak = Math.max(peak, active)
    const result = await new Promise<RunProcessResult>((resolve) => {
      pending.push(resolve)
    })
    active--
    return result
  })
  const paths = Array.from({ length: 32 }, (_, i) => `/workspace/file${i}`)
  const reads = paths.map((path) => run({ ...options, path }))
  try {
    // Each completion admits the next waiting file operation.
    for (let i = 0; i < paths.length; i++) {
      await new Promise<void>((resolve) => setImmediate(resolve))
      pending.shift()!(success)
    }
    expect(await Promise.all(reads)).toEqual(paths.map(() => 'content'))
    expect(started).toEqual(paths)
    expect(peak).toBeLessThanOrEqual(8)
  } finally {
    runProcess.mockReset()
  }
})

test('failed operations release their capacity for subsequent reads', async () => {
  const runProcess =
    jest.fn<(options: RunProcessOptions) => Promise<RunProcessResult>>()
  const run = createContainerFileSystem(runProcess)
  runProcess.mockImplementation(async () => ({
    exitCode: 44,
    stderr: '',
    stdout: '',
  }))
  const results = await Promise.allSettled(
    Array.from({ length: 24 }, () => run(options)),
  )
  expect(results).toHaveLength(24)
  for (const result of results) {
    expect(result).toMatchObject({
      reason: { code: 'ENOENT' },
      status: 'rejected',
    })
  }
  runProcess.mockResolvedValue(success)
  expect(await run(options)).toBe('content')
  runProcess.mockReset()
})
