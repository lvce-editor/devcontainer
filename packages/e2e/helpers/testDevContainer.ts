import type { Test } from '@lvce-editor/test-with-playwright'

interface Options {
  fixture: string
  runtimeArgs: readonly string[]
  runtimeCommand: string
  runtimeOutput: RegExp
}

const getProperty = (value: unknown, property: string): unknown => {
  if (!value || typeof value !== 'object' || !(property in value)) {
    return undefined
  }
  return value[property as keyof typeof value]
}

const assertProperty = (
  result: unknown,
  property: string,
  expected: unknown,
): void => {
  if (getProperty(result, property) !== expected) {
    throw new Error(
      `Expected ${property}=${JSON.stringify(expected)}, received ${JSON.stringify(result)}`,
    )
  }
}

export const testDevContainer = async (
  {
    Command,
    Editor,
    expect,
    Explorer,
    FileSystem,
    Locator,
    QuickPick,
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
    await QuickPick.executeCommand('Dev Containers: Start Current Workspace')
    const state = await Command.executeExtensionCommand('devcontainer.getState')
    assertProperty(state, 'status', 'running')
    const containerId = getProperty(state, 'containerId')
    if (typeof containerId !== 'string' || !containerId) {
      throw new Error(`Missing container id: ${JSON.stringify(state)}`)
    }

    const runtime = await Command.executeExtensionCommand(
      'devcontainer.exec',
      runtimeCommand,
      runtimeArgs,
    )
    assertProperty(runtime, 'ok', true)
    const stdout = getProperty(runtime, 'stdout')
    if (typeof stdout !== 'string' || !runtimeOutput.test(stdout)) {
      throw new Error(
        `Unexpected container runtime: ${JSON.stringify(runtime)}`,
      )
    }

    const read = await Command.executeExtensionCommand(
      'devcontainer.exec',
      'cat',
      ['src/message.txt'],
    )
    assertProperty(read, 'ok', true)
    assertProperty(read, 'stdout', fixtureContent)

    // Prove that execution is inside Docker and in the mounted workspace.
    const write = await Command.executeExtensionCommand(
      'devcontainer.exec',
      'sh',
      [
        '-c',
        'test -f /.dockerenv && cat src/message.txt > container-output.txt',
      ],
    )
    assertProperty(write, 'ok', true)
    await Explorer.refresh()
    await expect(output).toBeVisible()
    await Explorer.reveal(`${workspaceUri}/container-output.txt`)
    await Explorer.clickCurrent()
    await Editor.shouldHaveText(fixtureContent)

    // A host edit must also be visible through the container connection.
    const editedContent = `${fixture} edited from the workspace\n`
    await FileSystem.writeFile(`${workspaceUri}/src/message.txt`, editedContent)
    const reread = await Command.executeExtensionCommand(
      'devcontainer.exec',
      'cat',
      ['src/message.txt'],
    )
    assertProperty(reread, 'ok', true)
    assertProperty(reread, 'stdout', editedContent)

    await QuickPick.executeCommand('Dev Containers: Stop Current Workspace')
    assertProperty(
      await Command.executeExtensionCommand('devcontainer.getState'),
      'status',
      'stopped',
    )
    const stoppedExec = await Command.executeExtensionCommand(
      'devcontainer.exec',
      'cat',
      ['src/message.txt'],
    )
    assertProperty(stoppedExec, 'ok', false)
    assertProperty(stoppedExec, 'errorCode', 'DEVCONTAINER_NOT_RUNNING')
  } finally {
    const state = await Command.executeExtensionCommand('devcontainer.getState')
    if (getProperty(state, 'containerId')) {
      assertProperty(
        await Command.executeExtensionCommand('devcontainer.remove'),
        'ok',
        true,
      )
    }
  }
}
