import type { Test } from '@lvce-editor/test-worker'
import { getWorkspaceUri } from '../helpers/getWorkspaceUri.ts'

export const name = 'devcontainer.reopen-docker-not-installed'

export const test: Test = async ({
  Command,
  Devcontainer,
  expect,
  Locator,
  QuickPick,
  Workspace,
}) => {
  const localUri = await getWorkspaceUri({ Command }, 'javascript-node-24')
  await Workspace.setPath(localUri)
  await Devcontainer.setDockerPath(
    `${new URL(localUri).pathname}/missing-docker`,
  )
  try {
    const label = 'Dev Containers: Reopen in Container'
    await QuickPick.open()
    await QuickPick.setValue(`>${label}`)
    await QuickPick.selectItem(label)
    const output = Locator('.Output')
    await expect(output).toBeVisible()
    await expect(output).toContainText('Checking devcontainer configuration')
    await expect(output).toContainText('Docker executable was not found')
    const dialog = Locator('.DialogContent')
    const errorIcon = Locator('.DialogErrorIcon')
    const errorMessage = Locator('.DialogMessage')
    const notificationMessage = Locator('.NotificationMessage')
    await expect(dialog).toBeVisible()
    await expect(errorIcon).toBeVisible()
    await expect(errorMessage).toContainText(
      'DevContainerNode.cliUp failed with exit code 1',
    )
    await expect(errorMessage).toContainText('Error code: ENOENT')
    await expect(errorMessage).toContainText(
      'was not found. Install it or check devcontainer.containerCli.',
    )
    await expect(errorMessage).toContainText('missing-docker ENOENT')
    await expect(notificationMessage).toContainText('Error code: ENOENT')
    await expect(notificationMessage).toContainText(
      'was not found. Install it or check devcontainer.containerCli.',
    )
    await expect(notificationMessage).toContainText(
      'Failed to open devcontainer workspace:',
    )
    if ((await Command.execute('Workspace.getUri')) !== localUri) {
      throw new Error('Failed startup must preserve the local workspace')
    }
    await Command.execute('Viewlet.closeWidget', 'Dialog')
    await expect(dialog).toHaveCount(0)
  } finally {
    await Devcontainer.setDockerPath('docker')
  }
}
