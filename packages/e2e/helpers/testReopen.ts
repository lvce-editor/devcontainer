import type { Test } from '@lvce-editor/test-worker'
import { getWorkspaceUri } from './getWorkspaceUri.ts'
import { waitForContainerWorkspace } from './waitForContainerWorkspace.ts'

export const testReopen = async (
  {
    Command,
    Devcontainer,
    Editor,
    expect,
    Explorer,
    FileSystem,
    Locator,
    Main,
    QuickPick,
    Settings,
    Workspace,
  }: Parameters<Test>[0],
  containerCli?: string,
): Promise<void> => {
  const localUri = await getWorkspaceUri({ Command }, 'reopen')
  await Workspace.setPath(localUri)
  const hostFile = Locator('.Explorer .TreeItem[aria-label="host-only.txt"]')
  await expect(hostFile).toBeVisible()
  if (containerCli)
    await Settings.update({ 'devcontainer.containerCli': containerCli })
  try {
    const label = 'Dev Containers: Reopen in Container'
    await QuickPick.open()
    await QuickPick.setValue(`>${label}`)
    const command = Locator('.QuickPickItem', { hasText: label })
    await expect(command).toHaveCount(1)
    await QuickPick.selectItem(label)
    const workspaceUri = await waitForContainerWorkspace({ Command })
    if (containerCli === 'podman') {
      await Devcontainer.shouldHaveExecOutput(
        'cat',
        ['/run/.containerenv'],
        /engine="podman-/,
      )
      await Settings.update({ 'devcontainer.containerCli': 'docker' })
    }
    // This directory and file were created by the Dockerfile, outside the bind mount.
    const containerFile = Locator(
      '.Explorer .TreeItem[aria-label="container-only.txt"]',
    )
    await expect(containerFile).toBeVisible()
    await expect(hostFile).toHaveCount(0)
    const blob = await Command.execute(
      'FileSystem.getBlob',
      `${workspaceUri}/binary.bin`,
    )
    const bytes = new Uint8Array(await blob.arrayBuffer())
    if (bytes.join(',') !== '0,255,128,65') {
      throw new Error('Container file reads did not preserve binary bytes')
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
    const newFile = Locator('.Explorer .TreeItem[aria-label="new file.txt"]')
    await expect(newFile).toBeVisible()
    // Lifecycle commands must still target the original local configuration.
    await Devcontainer.stop()
    await Devcontainer.shouldFailToExec(
      'cat',
      ['container-only.txt'],
      'DEVCONTAINER_NOT_RUNNING',
    )
  } finally {
    try {
      await Workspace.setPath(localUri)
      await Devcontainer.remove()
    } finally {
      if (containerCli)
        await Settings.update({ 'devcontainer.containerCli': 'docker' })
    }
  }
}
