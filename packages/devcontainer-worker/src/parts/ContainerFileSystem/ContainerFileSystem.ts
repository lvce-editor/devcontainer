import { posix } from 'node:path'
import * as ContainerUri from '../ContainerUri/ContainerUri.ts'
import * as DevContainerNodeClient from '../DevContainerNodeClient/DevContainerNodeClient.ts'
import * as DevContainerState from '../DevContainerState/DevContainerState.ts'

export const invoke = async (
  operation: string,
  uri: string,
  value?: string,
): Promise<unknown> => {
  const workspaceFolder = await DevContainerState.getWorkspaceFolder(uri)
  const state = DevContainerState.get(workspaceFolder)
  if (
    state?.status !== 'running' ||
    !state.containerId ||
    !state.remoteWorkspaceFolder
  ) {
    throw new Error('Devcontainer is not running')
  }
  const location = ContainerUri.parse(uri)
  if (
    !location.path &&
    ['writeFile', 'mkdir', 'remove', 'rename'].includes(operation)
  ) {
    throw new Error('Cannot modify the devcontainer workspace root')
  }
  let newPath: string | undefined
  if (operation === 'rename') {
    const destination = ContainerUri.parse(value || '')
    if (destination.id !== location.id || !destination.path) {
      throw new Error(
        'Cannot rename across devcontainers or replace the workspace root',
      )
    }
    newPath = posix.join(state.remoteWorkspaceFolder, destination.path)
  }
  return DevContainerNodeClient.containerFileSystem({
    containerId: state.containerId,
    content: operation === 'writeFile' ? value : undefined,
    newPath,
    operation,
    path: posix.join(state.remoteWorkspaceFolder, location.path),
    remoteUser: state.remoteUser,
    remoteWorkspaceFolder: state.remoteWorkspaceFolder,
  })
}
