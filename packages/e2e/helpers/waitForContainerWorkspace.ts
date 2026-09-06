import type { Test } from '@lvce-editor/test-worker'

export const waitForContainerWorkspace = async ({
  Command,
  Devcontainer,
}: Pick<Parameters<Test>[0], 'Command' | 'Devcontainer'>): Promise<string> => {
  const deadline = Date.now() + 120_000
  let workspaceUri: unknown
  while (Date.now() < deadline) {
    workspaceUri = await Command.execute('Workspace.getUri')
    if (
      typeof workspaceUri === 'string' &&
      /^devcontainers:\/\/\/[a-f0-9]+$/.test(workspaceUri)
    ) {
      return workspaceUri
    }
    const state = await Devcontainer.getState()
    if (state.status === 'error') {
      throw new Error(`Devcontainer failed: ${JSON.stringify(state)}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(
    `Timed out reopening workspace: ${workspaceUri}; state: ${JSON.stringify(await Devcontainer.getState())}`,
  )
}
