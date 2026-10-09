import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const events: string[] = []
const pending = Promise.withResolvers<unknown>()
let startupResult: unknown = pending.promise
let lifecycle = {
  errorMessage: undefined as string | undefined,
  output: '',
  running: false,
}
mock.module('@lvce-editor/api', {
  namedExports: {
    closeUri: async () => {},
    createOutputChannel: () => ({
      appendLine: async (text: string) => {
        events.push(text)
      },
      replace: async (text: string) => {
        events.push(text)
      },
    }),
    executeCommand: async () => {},
    getPreference: async () => 'docker',
    openOutputView: async () => {
      events.push('output opened')
    },
    openUri: async () => {},
    showNotification: async (_type: string, message: string) => {
      events.push(message)
    },
  },
})
mock.module('../src/parts/Workspace/Workspace.ts', {
  namedExports: { getFolder: async () => 'file:///workspace' },
})
mock.module('../src/parts/Rpc/Rpc.ts', {
  namedExports: {
    invoke: async (method: string) => {
      if (method === 'DevContainer.getProgress') return 'Building layer 1\n'
      if (method === 'DevContainer.getLifecycleProgress') return lifecycle
      events.push('build started')
      return startupResult
    },
  },
})
const { openWorkspace } =
  await import('../src/parts/DevContainerCommands/DevContainerCommands.ts')

await test('reopen opens output and displays logs before the build finishes', async () => {
  const operation = openWorkspace()
  try {
    await new Promise((resolve) => setTimeout(resolve, 600))
    assert.ok(
      events.includes('output opened'),
      'Output must open while startup is pending',
    )
    assert.ok(events.indexOf('output opened') < events.indexOf('build started'))
    assert.ok(
      events.some((text) => text.includes('Building layer 1')),
      'Build output must appear before completion',
    )
  } finally {
    pending.resolve({ errorMessage: 'build failed', ok: false })
    await operation
    assert.ok(
      events.some((text) =>
        text.includes('Failed to open devcontainer workspace: build failed'),
      ),
    )
  }
})

await test('deferred lifecycle output and failures remain visible after startup releases its guard', async () => {
  const { run } = await import('../src/parts/Progress/Progress.ts')
  startupResult = { ok: true }
  lifecycle = {
    errorMessage: undefined,
    output: 'server started',
    running: true,
  }
  await run('DevContainer.openWorkspace', 'file:///workspace', 'docker')
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.ok(events.includes('server started'))
  lifecycle = {
    errorMessage: 'postStart failed',
    output: 'server started\nexit 7',
    running: false,
  }
  await new Promise((resolve) => setTimeout(resolve, 300))
  assert.ok(events.includes('postStart failed'))
  assert.ok(events.some((text) => text.includes('exit 7')))
  await run('DevContainer.openWorkspace', 'file:///workspace', 'docker')
})
