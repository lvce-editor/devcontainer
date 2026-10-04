import type { Test } from '@lvce-editor/test-worker'

export const waitForContainerWorkspace = async ({
  Command,
}: Pick<Parameters<Test>[0], 'Command'>): Promise<string> => {
  const deadline = Date.now() + 120_000
  let workspaceUri: unknown
  while (Date.now() < deadline) {
    workspaceUri = await Command.execute('Workspace.getUri')
    if (
      typeof workspaceUri === 'string' &&
      (workspaceUri.endsWith('!') ||
        /^devcontainers:\/\/\/[a-f0-9]+$/.test(workspaceUri))
    ) {
      const state = await Command.executeExtensionCommand(
        'devcontainer.getState',
      )
      if (
        state &&
        typeof state === 'object' &&
        'workspaceReady' in state &&
        state.workspaceReady === true
      )
        return workspaceUri
    }
  }
  throw new Error(`Timed out reopening workspace: ${workspaceUri}`)
}
