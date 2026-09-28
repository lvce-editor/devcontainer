import type { Test } from '@lvce-editor/test-worker'
import { getWorkspaceUri } from '../helpers/getWorkspaceUri.ts'

export const name = 'devcontainer.reopen-progress-failure'

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
    `${new URL(localUri).pathname}/missing-container-cli`,
  )
  try {
    const label = 'Dev Containers: Reopen in Container'
    await QuickPick.open()
    await QuickPick.setValue(`>${label}`)
    await QuickPick.selectItem(label)
    const output = Locator('.Output')
    await expect(output).toBeVisible()
    await expect(output).toContainText('missing-container-cli')
    await expect(output).toContainText('ENOENT')
    await expect(output).toContainText('Failed to open devcontainer workspace:')
    if ((await Command.execute('Workspace.getUri')) !== localUri) {
      throw new Error('Failed startup must preserve the local workspace')
    }
  } finally {
    await Devcontainer.setDockerPath('docker')
  }
}
