import type { Test } from '@lvce-editor/test-worker'
import { getWorkspaceUri } from '../helpers/getWorkspaceUri.ts'
import { waitForContainerWorkspace } from '../helpers/waitForContainerWorkspace.ts'

export const name = 'devcontainer.reopen-persistent-post-start'

export const test: Test = async ({
  Command,
  Devcontainer,
  expect,
  Locator,
  QuickPick,
  Workspace,
}) => {
  const localUri = await getWorkspaceUri({ Command }, 'reopen-persistent')
  await Workspace.setPath(localUri)
  try {
    await QuickPick.open()
    await QuickPick.setValue('>Dev Containers: Reopen in Container')
    await QuickPick.selectItem('Dev Containers: Reopen in Container')
    const workspaceUri = await waitForContainerWorkspace({ Command })
    const containerFile = Locator(
      '.Explorer .TreeItem[aria-label="container-only.txt"]',
    )
    await expect(containerFile).toBeVisible()
    await Devcontainer.shouldHaveExecOutput(
      'cat',
      ['/tmp/devcontainer-post-start'],
      'started',
    )
    await Devcontainer.shouldHaveExecOutput(
      'sh',
      [
        '-c',
        'kill -0 "$(cat /tmp/devcontainer-post-start.pid)" && echo running',
      ],
      'running',
    )
    await Devcontainer.shouldHaveExecOutput(
      'cat',
      ['/container-workspace/container-only.txt'],
      'created inside the devcontainer\n',
    )
    if ((await Command.execute('Workspace.getUri')) !== workspaceUri) {
      throw new Error(
        'The persistent post-start command blocked workspace handoff',
      )
    }
  } finally {
    await Workspace.setPath(localUri)
    await Devcontainer.remove()
  }
}
