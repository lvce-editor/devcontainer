import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const calls: unknown[][] = []
const stderr =
  'Original build output\n'.repeat(200) + 'ERROR: feature installation failed'
const result = {
  errorCode: 'DEVCONTAINER_CLI_ERROR',
  errorMessage:
    'DevContainerNode.cliUp failed with exit code 1\nAn error occurred setting up the container.\nCommand failed: docker buildx build --load --build-arg BUILDKIT_INLINE_CACHE=1 ' +
    'long-argument '.repeat(100),
  ok: false,
  stderr,
  stdout: '{"outcome":"error","message":"Command failed: docker buildx build"}',
}
mock.module('@lvce-editor/api', {
  namedExports: {
    closeUri: async (...args: unknown[]) => {
      calls.push(['closeUri', ...args])
    },
    createNodeRpc: async () => ({ invoke: async () => result }),
    executeCommand: async (...args: unknown[]) => {
      calls.push(args)
    },
    getWorkspaceUri: async () => 'file:///workspace',
    openUri: async (...args: unknown[]) => {
      calls.push(['openUri', ...args])
    },
    showNotification: async (...args: unknown[]) => {
      calls.push(['notification', ...args])
    },
  },
})
const Commands =
  await import('../src/parts/DevContainerCommands/DevContainerCommands.ts')

await test('failed build shows one short dialog with full logs accessible', async () => {
  await Commands.openWorkspace()
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'Dialog.show')
  assert.partialDeepStrictEqual(calls[0][1], {
    actionCommand: 'devcontainer.showLogs',
    actionLabel: 'Show Full Logs',
    message:
      'The container image could not be built. Run “Dev Containers: Show Full Logs” to see which build step failed.',
    title: 'Could not open devcontainer',
  })
})

await test('the log provider retains the complete output and is read only', async () => {
  const BuildError = await import('../src/parts/BuildError/BuildError.ts')
  const blob = await BuildError.fileSystem.readFile(
    'devcontainer-logs:///Dev Container.log',
  )
  assert.ok(blob instanceof Blob)
  const text = await blob.text()
  assert.ok(text.includes(stderr))
  assert.ok(text.includes(result.stdout))
  assert.ok(text.includes(result.errorMessage))
  assert.equal(await BuildError.fileSystem.isReadonly?.(), true)
  calls.length = 0
  BuildError.showLogs()
  assert.equal(calls.length, 0)
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.deepEqual(calls, [
    ['closeUri', 'devcontainer-logs:///Dev Container.log'],
    ['openUri', 'devcontainer-logs:///Dev Container.log'],
  ])
})
