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
    // The readiness boundary precedes the deferred hook. Wait for its actual
    // marker, then assert it is alive while the workspace is usable.
    await Devcontainer.exec('sh', [
      '-c',
      'for i in $(seq 1 200); do test -f /tmp/devcontainer-post-start && exit 0; sleep 0.1; done; exit 1',
    ])
    await Devcontainer.shouldHaveExecOutput(
      'cat',
      ['/tmp/devcontainer-post-start'],
      'started\n',
    )
    await Devcontainer.shouldHaveExecOutput(
      'sh',
      [
        '-c',
        'kill -0 "$(cat /tmp/devcontainer-post-start.pid)" && echo running',
      ],
      'running\n',
    )
    await Devcontainer.shouldHaveExecOutput(
      'cat',
      ['/container-workspace/container-only.txt'],
      'created inside the devcontainer\n',
    )
    // Workspace handoff closes the panel; reopening its existing channel must
    // show the deferred hook's retained output.
    await Command.execute('Layout.openOutput', 'dev-containers')
    const output = Locator('.Output')
    await expect(output).toContainText('Running the postStartCommand')
    await Command.execute('Layout.showPanel', 'Terminals')
    const terminal = Locator('.XtermTerminal')
    await expect(terminal).toBeVisible()
    await expect(terminal).toContainText('# ')
    await Command.execute(
      'Terminals.sendText',
      'printf "persistent-%s" terminal > /tmp/terminal-acceptance; printf "terminal-%s\\n" ready\r',
    )
    await expect(terminal).toContainText('terminal-ready')
    await Devcontainer.shouldHaveExecOutput(
      'cat',
      ['/tmp/terminal-acceptance'],
      'persistent-terminal',
    )
    const pid = await Devcontainer.exec('cat', [
      '/tmp/devcontainer-post-start.pid',
    ])
    await Command.executeExtensionCommand('devcontainer.openWorkspace')
    await waitForContainerWorkspace({ Command })
    await Devcontainer.shouldHaveExecOutput(
      'cat',
      ['/tmp/devcontainer-post-start.pid'],
      pid,
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
