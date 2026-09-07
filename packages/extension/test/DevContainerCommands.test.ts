import assert from 'node:assert/strict'
import { beforeEach, mock, test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'

const calls: unknown[][] = []
let result: unknown
let terminalFailure = false
let installCommand = 'installer command'
mock.module('@lvce-editor/api', {
  namedExports: {
    closeUri: async () => {},
    createNodeRpc: async () => ({
      invoke: async (method: string) => {
        if (method === 'DevContainer.getDockerInstallCommand')
          return installCommand
        return result
      },
    }),
    executeCommand: async (...args: unknown[]) => {
      calls.push(args)
      if (terminalFailure && args[0] === 'Terminals.addTerminal')
        throw new Error('Terminal unavailable')
    },
    getPreference: async () => 'docker',
    getWorkspaceUri: async () => 'file:///workspace',
    openUri: async () => {},
    showNotification: async (...args: unknown[]) => {
      calls.push(['notification', ...args])
    },
  },
})
mock.module('../src/parts/Progress/Progress.ts', {
  namedExports: { appendLine: async () => {}, run: async () => result },
})
const Commands =
  await import('../src/parts/DevContainerCommands/DevContainerCommands.ts')
beforeEach(() => {
  calls.length = 0
  terminalFailure = false
  result = undefined
})

await test('missing Docker opens one structured dialog without a duplicate notification or rejection', async () => {
  result = {
    errorCode: 'ENOENT',
    errorMessage: 'stack trace',
    missingExecutable: 'docker',
    ok: false,
  }
  await Commands.openWorkspace()
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'Dialog.show')
  assert.partialDeepStrictEqual(calls[0][1], {
    actionCommand: 'devcontainer.installDocker',
    errorCode: 'ENOENT',
    title: 'Error: Docker executable not found',
  })
})

await test('install action opens a fresh terminal before sending the host install command', async () => {
  installCommand = 'installer command'
  await Commands.installDocker()
  assert.deepEqual(calls, [
    ['Layout.showPanel', 'Terminals'],
    ['Terminals.addTerminal'],
    ['Terminals.sendText', 'installer command\r'],
  ])
})

await test('terminal launch failure produces one notification and never sends installation text', async () => {
  terminalFailure = true
  await Commands.installDocker()
  assert.equal(
    calls.some(([name]) => name === 'Terminals.sendText'),
    false,
  )
  assert.equal(calls.at(-1)?.[0], 'notification')
  assert.match(String(calls.at(-1)?.[2]), /Terminal unavailable/)
})

await test('a ready container switches the workspace URI after the extension command returns', async () => {
  result = { ok: true, workspaceUri: 'devcontainers:///abc123' }
  await Commands.openWorkspace()
  assert.equal(calls.length, 0)
  await delay(10)
  assert.deepEqual(calls, [
    ['Workspace.setUri', 'devcontainers:///abc123', '/'],
  ])
})
