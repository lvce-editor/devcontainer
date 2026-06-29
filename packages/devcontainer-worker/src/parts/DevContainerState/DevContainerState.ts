export type DevContainerStatus = 'error' | 'running' | 'starting' | 'stopped'

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
