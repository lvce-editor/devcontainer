/* eslint-disable e2e/prefer-execute-extension-command */
import type { Test } from '@lvce-editor/test-with-playwright'
import * as AssertResult from './parts/AssertResult/AssertResult.ts'

export const name = 'devcontainer.ubuntu-24.04'

export const test: Test = async ({ Command, Workspace }) => {
  const workspaceUri = import.meta.resolve('../fixtures/ubuntu-24.04')
  await Workspace.setPath(workspaceUri)

  try {
    AssertResult.ok(
      await Command.execute(
        'ExtensionHost.executeCommand',
        'devcontainer.start',
      ),
    )
    AssertResult.status(
      await Command.execute(
        'ExtensionHost.executeCommand',
        'devcontainer.getState',
      ),
      'running',
    )
    AssertResult.ok(
      await Command.execute(
        'ExtensionHost.executeCommand',
        'devcontainer.exec',
        'cat',
        ['/etc/os-release'],
      ),
    )
    AssertResult.ok(
      await Command.execute(
        'ExtensionHost.executeCommand',
        'devcontainer.stop',
      ),
    )
    AssertResult.status(
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
