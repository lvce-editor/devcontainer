export interface FileSystemOptions {
  containerId: string
  content?: string
  newPath?: string
  operation: string
  path: string
  remoteUser?: string
  remoteWorkspaceFolder: string
}

export interface NodeApi {
  cliExec(options: {
    args?: readonly string[]
    command: string
    workspaceFolder: string
  }): Promise<unknown>
  cliReadConfiguration(options: { workspaceFolder: string }): Promise<unknown>
  cliUp(options: {
    workspaceFolder: string
    onOutput?: (text: string) => void
  }): Promise<unknown>
  containerFileSystem?(options: FileSystemOptions): Promise<unknown>
  dockerInspectContainer?(options: { containerId: string }): Promise<boolean>
  dockerRemoveContainer(options: { containerId: string }): Promise<unknown>
  dockerStopContainer(options: { containerId: string }): Promise<unknown>
}

const missingNodeApi = () => {
  throw new Error('DevContainerNode client has not been configured')
}

let nodeApi: NodeApi = {
  cliExec: missingNodeApi,
  cliReadConfiguration: missingNodeApi,
  cliUp: missingNodeApi,
  dockerRemoveContainer: missingNodeApi,
  dockerStopContainer: missingNodeApi,
}

export const setNodeApi = (newNodeApi: NodeApi) => {
  nodeApi = newNodeApi
}

export const resetNodeApi = () => {
  nodeApi = {
    cliExec: missingNodeApi,
    cliReadConfiguration: missingNodeApi,
    cliUp: missingNodeApi,
    dockerRemoveContainer: missingNodeApi,
    dockerStopContainer: missingNodeApi,
  }
}

export const cliReadConfiguration = (options: { workspaceFolder: string }) => {
  return nodeApi.cliReadConfiguration(options)
}

export const cliUp = (options: {
  workspaceFolder: string
  onOutput?: (text: string) => void
}) => {
  return nodeApi.cliUp(options)
}

export const cliExec = (options: {
  args?: readonly string[]
  command: string
  workspaceFolder: string
}) => {
  return nodeApi.cliExec(options)
}

export const dockerStopContainer = (options: { containerId: string }) => {
  return nodeApi.dockerStopContainer(options)
}

export const dockerRemoveContainer = (options: { containerId: string }) => {
  return nodeApi.dockerRemoveContainer(options)
}

export const containerFileSystem = (
  options: FileSystemOptions,
): Promise<unknown> => {
  if (!nodeApi.containerFileSystem) {
    return missingNodeApi()
  }
  return nodeApi.containerFileSystem(options)
}

export const dockerInspectContainer = (
  containerId: string,
): Promise<boolean> => {
  if (!nodeApi.dockerInspectContainer) {
    return missingNodeApi()
  }
  return nodeApi.dockerInspectContainer({ containerId })
}
