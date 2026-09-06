import * as ConnectionStorage from '../ConnectionStorage/ConnectionStorage.ts'
import * as ContainerUri from '../ContainerUri/ContainerUri.ts'
import * as DevContainerNodeClient from '../DevContainerNodeClient/DevContainerNodeClient.ts'
type DevContainerStatus = 'error' | 'running' | 'starting' | 'stopped'

export interface DevContainerState {
  containerId?: string
  lastResult?: unknown
  remoteUser?: string
  remoteWorkspaceFolder?: string
  status: DevContainerStatus
}

const state = new Map<string, DevContainerState>()

export const get = (workspaceFolder: string): DevContainerState | undefined => {
  return state.get(workspaceFolder)
}

export const set = (
  workspaceFolder: string,
  value: DevContainerState,
): DevContainerState => {
  state.set(workspaceFolder, value)
  return value
}

export const remove = (workspaceFolder: string) => {
  state.delete(workspaceFolder)
}

export const reset = () => {
  state.clear()
}

export const getWorkspaceFolder = async (uri: string): Promise<string> => {
  const { id } = ContainerUri.parse(uri)
  for (const [workspaceFolder, value] of state) {
    if (value.containerId === id) {
      return workspaceFolder
    }
  }
  const restored = await restore(id)
  if (restored) {
    return restored
  }
  throw new Error(
    'Devcontainer connection is no longer available. Reopen the local workspace in its container.',
  )
}

export const restore = async (key: string): Promise<string | undefined> => {
  const connection = await ConnectionStorage.read(key)
  if (!connection) {
    return undefined
  }
  const running = await DevContainerNodeClient.dockerInspectContainer(
    connection.containerId,
  )
  // Another request may already have restored or changed this workspace.
  if (!state.has(connection.workspaceFolder)) {
    state.set(connection.workspaceFolder, {
      containerId: connection.containerId,
      remoteUser: connection.remoteUser,
      remoteWorkspaceFolder: connection.remoteWorkspaceFolder,
      status: running ? 'running' : 'stopped',
    })
  }
  return connection.workspaceFolder
}

export const persist = async (workspaceFolder: string): Promise<void> => {
  const current = state.get(workspaceFolder)
  if (!current?.containerId || !current.remoteWorkspaceFolder) {
    throw new Error('Devcontainer workspace connection is incomplete')
  }
  await ConnectionStorage.save({
    containerId: current.containerId,
    remoteUser: current.remoteUser,
    remoteWorkspaceFolder: current.remoteWorkspaceFolder,
    workspaceFolder,
  })
}

export const forget = async (workspaceFolder: string): Promise<void> => {
  const connection = await ConnectionStorage.read(workspaceFolder)
  if (connection) {
    await ConnectionStorage.remove(connection)
  }
}
