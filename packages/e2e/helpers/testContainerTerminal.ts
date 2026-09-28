import type { Test } from '@lvce-editor/test-worker'
import { getWorkspaceUri } from './getWorkspaceUri.ts'
import { waitForContainerWorkspace } from './waitForContainerWorkspace.ts'

export const testContainerTerminal = async (
  {
    Command,
    Devcontainer,
    expect,
    FileSystem,
    Locator,
    QuickPick,
    Workspace,
  }: Parameters<Test>[0],
  label = 'Dev Containers: Reopen in Container',
): Promise<void> => {
  const localUri = await getWorkspaceUri({ Command }, 'reopen')
  await Workspace.setPath(localUri)
  await FileSystem.writeFile(`${localUri}/.progress-release`, '')
  try {
    await QuickPick.open()
    await QuickPick.setValue(`>${label}`)
    await QuickPick.selectItem(label)
    const workspaceUri = await waitForContainerWorkspace({ Command })
    const containerFile = Locator(
      '.Explorer .TreeItem[aria-label="container-only.txt"]',
    )
    await expect(containerFile).toBeVisible()
    await Command.execute('Layout.showPanel', 'Terminals')
    const terminal = Locator('.XtermTerminal')
    await expect(terminal).toBeVisible()
    await Command.execute(
      'Terminals.sendText',
      'pwd; id -un; cat container-only.txt; printf "terminal-%s" created > terminal-created.txt\r',
    )
    await expect(terminal).toContainText('/container-workspace')
    await expect(terminal).toContainText('root')
    await expect(terminal).toContainText('built inside the devcontainer')
    await Devcontainer.shouldHaveExecOutput(
      'cat',
      ['/container-workspace/terminal-created.txt'],
      'terminal-created',
    )
    await Command.execute(
      'Terminals.sendText',
      'printf "%s" "$DEVCONTAINER_TERMINAL_TEST" > terminal-env.txt; printf "environment-%s\\n" ready\r',
    )
    await expect(terminal).toContainText('environment-ready')
    await Devcontainer.shouldHaveExecOutput(
      'cat',
      ['/container-workspace/terminal-env.txt'],
      'configured environment',
    )
    await FileSystem.mkdir(`${workspaceUri}/sub folder`)
    await Command.execute(
      'Terminals.addTerminal',
      `${workspaceUri}/sub%20folder`,
    )
    await Command.execute(
      'Terminals.sendText',
      'pwd; printf "subfolder-%s" created > marker.txt\r',
    )
    await expect(terminal).toContainText('/container-workspace/sub folder')
    await Devcontainer.shouldHaveExecOutput(
      'cat',
      ['/container-workspace/sub folder/marker.txt'],
      'subfolder-created',
    )
  } finally {
    await Workspace.setPath(localUri)
    await Devcontainer.remove()
  }
}
