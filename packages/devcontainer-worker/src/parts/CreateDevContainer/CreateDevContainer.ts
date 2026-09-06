import type * as Config from '../DevContainerConfig/DevContainerConfig.ts'
import type * as Client from '../DevContainerNodeClient/DevContainerNodeClient.ts'
import type * as State from '../DevContainerState/DevContainerState.ts'
import type * as Workspace from '../WorkspaceFolder/WorkspaceFolder.ts'

export interface Host {
  cancelStart?: (workspaceFolder: string) => Promise<unknown>
  DevContainerConfig: Pick<typeof Config, 'detect'>
  DevContainerNodeClient: Pick<
    typeof Client,
    | 'cliExec'
    | 'cliReadConfiguration'
    | 'cliUp'
    | 'dockerStopContainer'
    | 'dockerRemoveContainer'
    | 'containerFileSystem'
  >
  DevContainerState: Pick<
    typeof State,
    'get' | 'set' | 'remove' | 'persist' | 'forget'
  >
  WorkspaceFolder: Pick<typeof Workspace, 'toPath'>
}

export const createDevContainer = ({
  cancelStart,
  DevContainerConfig,
  DevContainerNodeClient,
  DevContainerState,
  WorkspaceFolder,
}: Host) => {
  interface CliLikeResult {
    json?: unknown
    ok?: boolean
  }

  const configNotFound = (workspaceFolder: string) => {
    return {
      errorCode: 'DEVCONTAINER_CONFIG_NOT_FOUND',
      errorMessage: 'No devcontainer configuration found',
      errorStack: undefined,
      ok: false,
      workspaceFolder,
    }
  }

  const getStringProperty = (value: unknown, property: string) => {
    if (value && typeof value === 'object' && property in value) {
      const { [property]: propertyValue } = value as Record<string, unknown>
      if (typeof propertyValue === 'string') {
        return propertyValue
      }
    }
    return undefined
  }

  const isOk = (result: unknown): result is CliLikeResult => {
    return Boolean(result && typeof result === 'object' && 'ok' in result)
  }

  const detect = async (options: { workspaceFolder: string }) => {
    const workspaceFolder = await WorkspaceFolder.toPath(
      options.workspaceFolder,
    )
    return DevContainerConfig.detect({ workspaceFolder })
  }

  const getState = async ({ workspaceFolder }: { workspaceFolder: string }) => {
    workspaceFolder = await WorkspaceFolder.toPath(workspaceFolder)
    return (
      DevContainerState.get(workspaceFolder) ?? {
        status: 'stopped',
      }
    )
  }

  const readConfiguration = async ({
    workspaceFolder,
  }: {
    workspaceFolder: string
  }) => {
    workspaceFolder = await WorkspaceFolder.toPath(workspaceFolder)
    const detected = await detect({ workspaceFolder })
    if (!detected.found) {
      return configNotFound(workspaceFolder)
    }
    return DevContainerNodeClient.cliReadConfiguration({ workspaceFolder })
  }

  const up = async ({ workspaceFolder }: { workspaceFolder: string }) => {
    workspaceFolder = await WorkspaceFolder.toPath(workspaceFolder)
    const existing = DevContainerState.get(workspaceFolder)
    if (existing?.status === 'starting') {
      return { errorCode: 'DEVCONTAINER_ALREADY_STARTED', ok: false }
    }
    const starting = DevContainerState.set(workspaceFolder, {
      status: 'starting',
    })
    const cancelled = () => DevContainerState.get(workspaceFolder) !== starting
    const cancellation = { errorCode: 'DEVCONTAINER_CANCELLED', ok: false }
    let result: unknown
    try {
      const detected = await detect({ workspaceFolder })
      if (cancelled()) return cancellation
      if (!detected.found) {
        DevContainerState.remove(workspaceFolder)
        return configNotFound(workspaceFolder)
      }
      result = await DevContainerNodeClient.cliUp({ workspaceFolder })
    } catch (error) {
      result = { errorMessage: String(error), ok: false }
    }
    if (cancelled()) return cancellation
    if (!isOk(result) || !result.ok) {
      DevContainerState.set(workspaceFolder, {
        lastResult: result,
        status: 'error',
      })
      return result
    }

    const containerId = getStringProperty(result.json, 'containerId')
    const remoteUser = getStringProperty(result.json, 'remoteUser')
    const remoteWorkspaceFolder = getStringProperty(
      result.json,
      'remoteWorkspaceFolder',
    )

    DevContainerState.set(workspaceFolder, {
      containerId,
      lastResult: result,
      remoteUser,
      remoteWorkspaceFolder,
      status: 'running',
    })

    return result
  }

  const exec = async ({
    args = [],
    command,
    workspaceFolder,
  }: {
    args?: readonly string[]
    command: string
    workspaceFolder: string
  }) => {
    workspaceFolder = await WorkspaceFolder.toPath(workspaceFolder)
    const currentState = DevContainerState.get(workspaceFolder)
    if (!currentState || currentState.status !== 'running') {
      return {
        errorCode: 'DEVCONTAINER_NOT_RUNNING',
        errorMessage: 'Devcontainer is not running',
        errorStack: undefined,
        ok: false,
        workspaceFolder,
      }
    }
    return DevContainerNodeClient.cliExec({ args, command, workspaceFolder })
  }

  const stop = async ({ workspaceFolder }: { workspaceFolder: string }) => {
    workspaceFolder = await WorkspaceFolder.toPath(workspaceFolder)
    const currentState = DevContainerState.get(workspaceFolder)
    if (currentState?.status === 'starting' && cancelStart) {
      DevContainerState.remove(workspaceFolder)
      return cancelStart(workspaceFolder)
    }
    if (!currentState?.containerId) {
      return {
        errorCode: 'DEVCONTAINER_NOT_RUNNING',
        errorMessage: 'Devcontainer is not running',
        errorStack: undefined,
        ok: false,
        workspaceFolder,
      }
    }
    const result = await DevContainerNodeClient.dockerStopContainer({
      containerId: currentState.containerId,
    })
    if (DevContainerState.get(workspaceFolder) !== currentState) return result
    if (isOk(result) && result.ok) {
      DevContainerState.set(workspaceFolder, {
        ...currentState,
        lastResult: result,
        status: 'stopped',
      })
    } else {
      DevContainerState.set(workspaceFolder, {
        ...currentState,
        lastResult: result,
        status: 'error',
      })
    }
    return result
  }

  const remove = async ({ workspaceFolder }: { workspaceFolder: string }) => {
    workspaceFolder = await WorkspaceFolder.toPath(workspaceFolder)
    const currentState = DevContainerState.get(workspaceFolder)
    if (currentState?.status === 'starting' && cancelStart) {
      DevContainerState.remove(workspaceFolder)
      return cancelStart(workspaceFolder)
    }
    if (!currentState?.containerId) {
      return {
        errorCode: 'DEVCONTAINER_NOT_RUNNING',
        errorMessage: 'Devcontainer is not running',
        errorStack: undefined,
        ok: false,
        workspaceFolder,
      }
    }
    const result = await DevContainerNodeClient.dockerRemoveContainer({
      containerId: currentState.containerId,
    })
    if (DevContainerState.get(workspaceFolder) !== currentState) return result
    if (isOk(result) && result.ok) {
      await DevContainerState.forget(workspaceFolder)
      DevContainerState.remove(workspaceFolder)
    } else {
      DevContainerState.set(workspaceFolder, {
        ...currentState,
        lastResult: result,
        status: 'error',
      })
    }
    return result
  }

  const opening = new Map<string, Promise<unknown>>()

  const connectWorkspace = async (workspaceFolder: string) => {
    const result = await up({ workspaceFolder })
    if (!isOk(result) || !result.ok) {
      return result
    }
    const state = DevContainerState.get(workspaceFolder)
    if (!state?.containerId || !state.remoteWorkspaceFolder?.startsWith('/')) {
      throw new Error(
        'Devcontainer did not return a container id and absolute workspace folder',
      )
    }
    // Verify the connection before changing the editor workspace.
    await DevContainerNodeClient.containerFileSystem({
      containerId: state.containerId,
      operation: 'readDirWithFileTypes',
      path: state.remoteWorkspaceFolder,
      remoteUser: state.remoteUser,
      remoteWorkspaceFolder: state.remoteWorkspaceFolder,
    })
    await DevContainerState.persist(workspaceFolder)
    return { ok: true, workspaceUri: `devcontainers:///${state.containerId}` }
  }

  const openWorkspace = async ({
    workspaceFolder,
  }: {
    workspaceFolder: string
  }): Promise<unknown> => {
    workspaceFolder = await WorkspaceFolder.toPath(workspaceFolder)
    const existing = opening.get(workspaceFolder)
    if (existing) {
      return existing
    }
    const promise = connectWorkspace(workspaceFolder)
    opening.set(workspaceFolder, promise)
    try {
      return await promise
    } finally {
      opening.delete(workspaceFolder)
    }
  }
  return {
    detect,
    exec,
    getState,
    openWorkspace,
    readConfiguration,
    remove,
    stop,
    up,
  }
}
