import type { Test } from '@lvce-editor/test-worker'

interface Options {
  fixture: string
  runtimeArgs: readonly string[]
  runtimeCommand: string
  runtimeOutput: RegExp
}

export const testDevContainer = async (
  {
    Devcontainer,
    Editor,
    expect,
    Explorer,
    FileSystem,
    Locator,
    Workspace,
  }: Parameters<Test>[0],
  { fixture, runtimeArgs, runtimeCommand, runtimeOutput }: Options,
): Promise<void> => {
  // The runner copies fixtures for each run so stale container output cannot pass a test.
  const fixtureUrl = new URL(import.meta.resolve(`../.tmp/fixtures/${fixture}`))
  // Browser test modules are served under /remote, but Explorer needs a file URI.
  const workspaceUri =
    fixtureUrl.protocol === 'file:'
      ? fixtureUrl.href
      : `file://${fixtureUrl.pathname.slice('/remote'.length)}`
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

  try {
    await Devcontainer.start()
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

    // Prove that execution is inside Docker and in the mounted workspace.
    await Devcontainer.exec('sh', [
      '-c',
      'test -f /.dockerenv && cat src/message.txt > container-output.txt',
    ])
    await Explorer.refresh()
    await expect(output).toBeVisible()
    await Explorer.reveal(`${workspaceUri}/container-output.txt`)
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
    await Devcontainer.remove()
  }
}
