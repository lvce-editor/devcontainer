import { getDevcontainerCliPath } from '@lvce-editor/devcontainer-node/devcontainer-cli'
import { posix } from 'node:path'
import * as ContainerTerminalSession from '../ContainerTerminalSession/ContainerTerminalSession.ts'
import * as ContainerUri from '../ContainerUri/ContainerUri.ts'
import * as DevContainerState from '../DevContainerState/DevContainerState.ts'

export const getSpawnOptions = async (
  workspaceUri: string,
  cwd = '',
  createSession: (
    id: string,
    cli: string,
    user?: string,
  ) => Promise<{
    directory: string
    token: string
  }> = ContainerTerminalSession.create,
) => {
  const workspace = ContainerUri.parse(workspaceUri)
  const location = ContainerUri.parse(cwd || workspaceUri)
  if (location.id !== workspace.id) {
    throw new Error('Cannot open a terminal in a different workspace')
  }
  const workspaceFolder =
    await DevContainerState.getWorkspaceFolder(workspaceUri)
  const state = DevContainerState.get(workspaceFolder)
  if (
    state?.status !== 'running' ||
    !state.containerId ||
    !state.remoteWorkspaceFolder
  ) {
    throw new Error('Devcontainer is not running')
  }
  let session: { directory: string; token: string }
  try {
    session = await createSession(
      state.containerId,
      state.containerCli || 'docker',
      state.remoteUser,
    )
  } catch (error) {
    // Keep preparation failures in the terminal's normal startup-error UI.
    // The message is an argument to fixed code, never executable source.
    return {
      args: [
        '--eval',
        'console.error(process.argv[1]); process.exitCode = 1',
        error instanceof Error ? error.message : String(error),
      ],
      command: process.execPath,
      cwd: workspaceFolder,
      disposeCommand: undefined,
      env: { ELECTRON_RUN_AS_NODE: '1' },
    }
  }
  // The host PTY runs the CLI, which applies remoteUser, remoteEnv and the
  // user's environment probe. The shell and its working directory are remote.
  return {
    args: [
      getDevcontainerCliPath(),
      'exec',
      '--workspace-folder',
      workspaceFolder,
      '--docker-path',
      state.containerCli || 'docker',
      '--container-id',
      state.containerId,
      'env',
      `LVCE_TERMINAL_SESSION=${session.token}`,
      'sh',
      '-c',
      ContainerTerminalSession.shellScript,
      'devcontainer-terminal',
      posix.join(state.remoteWorkspaceFolder, location.path),
      session.directory,
    ],
    command: process.execPath,
    cwd: workspaceFolder,
    disposeCommand: {
      args: [session.token],
      command: 'devcontainer.disposeTerminal',
    },
    env: { ELECTRON_RUN_AS_NODE: '1' },
  }
}
