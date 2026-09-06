import type { Test } from '@lvce-editor/test-worker'
import { getWorkspaceUri } from '../helpers/getWorkspaceUri.ts'

export const name = 'devcontainer.reopen'

export const test: Test = async ({
  Command,
  Devcontainer,
  Editor,
  expect,
  Explorer,
  FileSystem,
  Locator,
  Main,
  QuickPick,
  Workspace,
}) => {
  const localUri = getWorkspaceUri('reopen')
  await Workspace.setPath(localUri)
  await expect(
    Locator('.Explorer .TreeItem[aria-label="host-only.txt"]'),
  ).toBeVisible()
  try {
    await QuickPick.executeCommand('Dev Containers: Reopen in Container')
    // This directory and file were created by the Dockerfile, outside the bind mount.
    const containerFile = Locator(
      '.Explorer .TreeItem[aria-label="container-only.txt"]',
    )
    await expect(containerFile).toBeVisible()
    await expect(
      Locator('.Explorer .TreeItem[aria-label="host-only.txt"]'),
    ).toHaveCount(0)
    const workspaceUri = await Command.execute('Workspace.getUri')
    if (
      typeof workspaceUri !== 'string' ||
      !/^devcontainers:\/\/\/[a-f0-9]+$/.test(workspaceUri)
    ) {
      throw new Error(
        `Expected a devcontainers workspace URI, got ${workspaceUri}`,
      )
    }
    await Explorer.reveal(`${workspaceUri}/container-only.txt`)
    await Explorer.clickCurrent()
    await Editor.shouldHaveText('built inside the devcontainer\n')
    await Editor.setText('edited through the container workspace — ✓\n')
    await Main.save()
    await Devcontainer.shouldHaveExecOutput(
      'cat',
      ['/container-workspace/container-only.txt'],
      'edited through the container workspace — ✓\n',
    )
    await FileSystem.writeFile(
      `${workspaceUri}/new file.txt`,
      'created remotely\n',
    )
    await Devcontainer.shouldHaveExecOutput(
      'cat',
      ['/container-workspace/new file.txt'],
      'created remotely\n',
    )
    await Explorer.refresh()
    await expect(
      Locator('.Explorer .TreeItem[aria-label="new file.txt"]'),
    ).toBeVisible()
    // Lifecycle commands must still target the original local configuration.
    await Devcontainer.stop()
    await Devcontainer.shouldFailToExec(
      'cat',
      ['container-only.txt'],
      'DEVCONTAINER_NOT_RUNNING',
    )
  } finally {
    await Workspace.setPath(localUri)
    await Devcontainer.remove()
  }
}
