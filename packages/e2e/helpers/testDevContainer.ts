import type { Test } from '@lvce-editor/test-worker'
import { waitForContainerWorkspace } from './waitForContainerWorkspace.ts'

interface Options {
  containerCli?: string
  fixture: string
  runtimeArgs: readonly string[]
  runtimeCommand: string
  runtimeOutput: RegExp
}

export const testDevContainer = async (
  {
    Command,
    Devcontainer,
    Editor,
    expect,
    Explorer,
    FileSystem,
    Locator,
    Settings,
    Workspace,
  }: Parameters<Test>[0],
  {
    containerCli,
    fixture,
    runtimeArgs,
    runtimeCommand,
    runtimeOutput,
  }: Options,
): Promise<void> => {
  // Prepare the workspace on every URL visit, including reloads after a completed test.
  const fixtureUrl = new URL(
    import.meta.resolve(`../.tmp/fixtures/${fixture}-${crypto.randomUUID()}`),
  )
  const sourceUrl = new URL(import.meta.resolve(`../fixtures/${fixture}`))
  // Browser test modules are served under /remote, but Explorer needs a file URI.
  const workspaceUri =
    fixtureUrl.protocol === 'file:'
      ? fixtureUrl.href
      : `file://${fixtureUrl.pathname.slice('/remote'.length)}`
  const sourceUri =
    sourceUrl.protocol === 'file:'
      ? sourceUrl.href
      : `file://${sourceUrl.pathname.slice('/remote'.length)}`
  await Command.execute('FileSystem.copy', sourceUri, workspaceUri)
  const fixtureContent = `${fixture} workspace fixture\n`
  await FileSystem.shouldHaveFile(
    `${workspaceUri}/src/message.txt`,
    fixtureContent,
  )
  await Workspace.setPath(workspaceUri)
  const sourceFolder = Locator('.Explorer .TreeItem[aria-label="src"]')
  await expect(sourceFolder).toBeVisible()
  await Explorer.reveal(`${workspaceUri}/src/message.txt`)
  const sourceFile = Locator('.Explorer .TreeItem[aria-label="message.txt"]')
  await expect(sourceFile).toBeVisible()
  const output = Locator(
    '.Explorer .TreeItem[aria-label="container-output.txt"]',
  )
  await expect(output).toHaveCount(0)

  if (containerCli) {
    await Settings.update({ 'devcontainer.containerCli': containerCli })
  }
  try {
    await Devcontainer.start()
    const containerUri = await waitForContainerWorkspace({ Command })
    if (containerCli === 'podman') {
      // Podman's marker exists but is empty in an unprivileged container.
      await Devcontainer.exec('test', ['-f', '/run/.containerenv'])
      // The running connection keeps its engine when the preference changes.
      await Settings.update({ 'devcontainer.containerCli': 'docker' })
    }
    await Devcontainer.shouldHaveExecOutput(
      runtimeCommand,
      runtimeArgs,
      runtimeOutput,
    )
    await Devcontainer.shouldHaveExecOutput(
      'cat',
      ['src/message.txt'],
      fixtureContent,
    )

    // Prove that execution is inside the container and in the mounted workspace.
    await Devcontainer.exec('sh', [
      '-c',
      '(test -f /.dockerenv || test -f /run/.containerenv) && cat src/message.txt > container-output.txt',
    ])
    await Explorer.refresh()
    await expect(output).toBeVisible()
    await Explorer.reveal(`${containerUri}/container-output.txt`)
    await Explorer.clickCurrent()
    await Editor.shouldHaveText(fixtureContent)

    // A host edit must also be visible through the container connection.
    const editedContent = `${fixture} edited from the workspace\n`
    await FileSystem.writeFile(`${workspaceUri}/src/message.txt`, editedContent)
    await Devcontainer.shouldHaveExecOutput(
      'cat',
      ['src/message.txt'],
      editedContent,
    )

    await Devcontainer.stop()
    await Devcontainer.shouldFailToExec(
      'cat',
      ['src/message.txt'],
      'DEVCONTAINER_NOT_RUNNING',
    )
  } finally {
    try {
      await Workspace.setPath(workspaceUri)
      await Devcontainer.remove()
    } finally {
      if (containerCli)
        await Settings.update({ 'devcontainer.containerCli': 'docker' })
    }
  }
}
