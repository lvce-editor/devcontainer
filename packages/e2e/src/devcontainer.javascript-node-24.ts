/* eslint-disable e2e/prefer-execute-extension-command */
import type { Test } from '@lvce-editor/test-with-playwright'

const getProperty = (value: unknown, property: string): unknown => {
  if (!value || typeof value !== 'object' || !(property in value)) {
    return undefined
  }
  return value[property as keyof typeof value]
}

const assertOk = (result: unknown): void => {
  if (getProperty(result, 'ok') !== true) {
    throw new Error(
      `Expected a successful result, received ${JSON.stringify(result)}`,
    )
  }
}

const assertStatus = (result: unknown, expectedStatus: string): void => {
  const actualStatus = getProperty(result, 'status')
  if (actualStatus !== expectedStatus) {
    throw new Error(
      `Expected devcontainer status ${expectedStatus}, received ${JSON.stringify(result)}`,
    )
  }
}

export const name = 'devcontainer.javascript-node-24'

export const test: Test = async ({ Command, Workspace }) => {
  const workspaceUri = import.meta.resolve('../fixtures/javascript-node-24')
  await Workspace.setPath(workspaceUri)

  try {
    assertOk(
      await Command.execute(
        'ExtensionHost.executeCommand',
        'devcontainer.start',
      ),
    )
    assertStatus(
      await Command.execute(
        'ExtensionHost.executeCommand',
        'devcontainer.getState',
      ),
      'running',
    )
    assertOk(
      await Command.execute(
        'ExtensionHost.executeCommand',
        'devcontainer.exec',
        'node',
        ['--version'],
      ),
    )
    assertOk(
      await Command.execute(
        'ExtensionHost.executeCommand',
        'devcontainer.stop',
      ),
    )
    assertStatus(
      await Command.execute(
        'ExtensionHost.executeCommand',
        'devcontainer.getState',
      ),
      'stopped',
    )
  } finally {
    await Command.execute('ExtensionHost.executeCommand', 'devcontainer.remove')
  }
}
