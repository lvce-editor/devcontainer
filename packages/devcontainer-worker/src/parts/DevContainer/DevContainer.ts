import * as DevContainerConfig from '../DevContainerConfig/DevContainerConfig.ts'
import * as DevContainerNodeClient from '../DevContainerNodeClient/DevContainerNodeClient.ts'
import * as DevContainerState from '../DevContainerState/DevContainerState.ts'

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
    const propertyValue = value[property as keyof typeof value]
    if (typeof propertyValue === 'string') {
      return propertyValue
    }
  }
  return undefined
}

const isOk = (result: unknown): result is CliLikeResult => {
  return Boolean(result && typeof result === 'object' && 'ok' in result)
}

export const detect = DevContainerConfig.detect

export const getState = ({ workspaceFolder }: { workspaceFolder: string }) => {
  return (
    DevContainerState.get(workspaceFolder) ?? {
      status: 'stopped',
    }
  )
}

export const readConfiguration = async ({
  workspaceFolder,
}: {
  workspaceFolder: string
}) => {
  const detected = await detect({ workspaceFolder })
  if (!detected.found) {
    return configNotFound(workspaceFolder)
  }
  return DevContainerNodeClient.cliReadConfiguration({ workspaceFolder })
}

export const up = async ({ workspaceFolder }: { workspaceFolder: string }) => {
  const detected = await detect({ workspaceFolder })
  if (!detected.found) {
    return configNotFound(workspaceFolder)
  }

  DevContainerState.set(workspaceFolder, {
    status: 'starting',
  })

  const result = await DevContainerNodeClient.cliUp({ workspaceFolder })
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

export const exec = async ({
  args = [],
  command,
  workspaceFolder,
}: {
  args?: readonly string[]
  command: string
  workspaceFolder: string
}) => {
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

export const stop = async ({ workspaceFolder }: { workspaceFolder: string }) => {
  const currentState = DevContainerState.get(workspaceFolder)
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
  if (isOk(result) && result.ok) {
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

export const remove = async ({
  workspaceFolder,
}: {
  workspaceFolder: string
}) => {
  const currentState = DevContainerState.get(workspaceFolder)
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
  if (isOk(result) && result.ok) {
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
