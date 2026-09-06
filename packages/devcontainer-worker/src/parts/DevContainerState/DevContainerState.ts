import * as ContainerUri from '../ContainerUri/ContainerUri.ts'
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

export const getWorkspaceFolder = (uri: string): string => {
  const { id } = ContainerUri.parse(uri)
  for (const [workspaceFolder, value] of state) {
    if (value.containerId === id) {
      return workspaceFolder
    }
  }
  throw new Error(
    'Devcontainer connection is no longer available. Reopen the local workspace in its container.',
  )
}
