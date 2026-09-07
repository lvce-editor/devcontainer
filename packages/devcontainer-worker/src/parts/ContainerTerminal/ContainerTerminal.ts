import { getDevcontainerCliPath } from '@lvce-editor/devcontainer-node/devcontainer-cli'
import { posix } from 'node:path'
import * as ContainerUri from '../ContainerUri/ContainerUri.ts'
import * as DevContainerState from '../DevContainerState/DevContainerState.ts'

export const getSpawnOptions = async (workspaceUri: string, cwd = '') => {
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
      'sh',
      '-c',
      'cd -- "$1" && exec "${SHELL:-/bin/sh}" -il',
      'devcontainer-terminal',
      posix.join(state.remoteWorkspaceFolder, location.path),
    ],
    command: process.execPath,
    cwd: workspaceFolder,
  }
}
