import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const events: string[] = []
const pending = Promise.withResolvers<unknown>()
mock.module('@lvce-editor/api', {
  namedExports: {
    createOutputChannel: () => ({
      appendLine: async (text: string) => events.push(text),
      replace: async (text: string) => events.push(text),
    }),
    executeCommand: async () => {},
    openOutputView: async () => events.push('output opened'),
    showNotification: async () => {},
  },
})
mock.module('../src/parts/Workspace/Workspace.ts', {
  namedExports: { getFolder: async () => 'file:///workspace' },
})
mock.module('../src/parts/Rpc/Rpc.ts', {
  namedExports: {
    invoke: async (method: string) => {
      if (method === 'DevContainer.getProgress') return 'Building layer 1\n'
      events.push('build started')
      return pending.promise
    },
  },
})
const { openWorkspace } =
  await import('../src/parts/DevContainerCommands/DevContainerCommands.ts')

test('reopen opens output and displays logs before the build finishes', async () => {
  const operation = openWorkspace()
  const result = assert.rejects(operation, /build failed/)
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
    pending.resolve({ ok: false, errorMessage: 'build failed' })
    await result
    assert.ok(
      events.some((text) =>
        text.includes('Failed to open devcontainer workspace: build failed'),
      ),
    )
  }
})
