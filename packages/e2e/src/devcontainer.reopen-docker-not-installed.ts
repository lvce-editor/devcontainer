import type { Test } from '@lvce-editor/test-worker'
import { getWorkspaceUri } from '../helpers/getWorkspaceUri.ts'

// Enable when the editor release includes structured dialog support.
export const skip = 1

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
    const dialog = Locator('.DialogContent')
    const errorIcon = Locator('.DialogErrorIcon')
    const errorMessage = Locator('.DialogMessage')
    await expect(dialog).toBeVisible()
    await expect(errorIcon).toBeVisible()
    const heading = Locator('.DialogHeading')
    await expect(heading).toHaveText('Error: Docker executable not found')
    const errorCode = Locator('.DialogErrorCode')
    await expect(errorCode).toContainText('ENOENT')
    await expect(errorMessage).toContainText(
      'Install Docker or check its configured path',
    )
    const installButton = Locator('.DialogButtonsRow button[name="Action"]')
    await expect(installButton).toHaveText('Install Docker')
    const notification = Locator('.NotificationMessage')
    await expect(notification).toHaveCount(0)
    if ((await Command.execute('Workspace.getUri')) !== localUri) {
      throw new Error('Failed startup must preserve the local workspace')
    }
    await Command.execute('Viewlet.closeWidget', 'Dialog')
    await expect(dialog).toHaveCount(0)
  } finally {
    await Devcontainer.setDockerPath('docker')
  }
}
