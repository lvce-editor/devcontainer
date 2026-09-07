import {
  executeCommand,
  getPreference,
  showNotification,
} from '@lvce-editor/api'
import * as GetErrorDialog from '../GetErrorDialog/GetErrorDialog.ts'
import * as Progress from '../Progress/Progress.ts'
import * as Rpc from '../Rpc/Rpc.ts'
import * as Workspace from '../Workspace/Workspace.ts'

let containerCliOverride: string | undefined

const getContainerCli = async (): Promise<string> => {
  const value =
    containerCliOverride ??
    (await getPreference('devcontainer.containerCli')) ??
    'docker'
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(
      'devcontainer.containerCli must be a non-empty executable name or path',
    )
  }
  return value
}

const invokeForCurrentWorkspace = async (
  method: string,
  options: Record<string, unknown> = {},
) => {
  const workspaceFolder = await Workspace.getFolder()
  return Rpc.invoke(method, {
    ...options,
    workspaceFolder,
  })
}

export const start = async () => {
  const workspaceFolder = await Workspace.getFolder()
  const result = (await Progress.run(
    'DevContainer.up',
    workspaceFolder,
    await getContainerCli(),
  )) as {
    ok?: boolean
    errorMessage?: string
  }
  await Progress.appendLine(
    result.ok
      ? 'Devcontainer started.'
      : `Failed to start devcontainer: ${result.errorMessage || 'Unknown error'}`,
  )
  return result
}

export const stop = () => {
  return invokeForCurrentWorkspace('DevContainer.stop')
}

export const getState = () => {
  return invokeForCurrentWorkspace('DevContainer.getState')
}

export const exec = (command: string, args: readonly string[] = []) => {
  return invokeForCurrentWorkspace('DevContainer.exec', { args, command })
}

export const remove = () => {
  return invokeForCurrentWorkspace('DevContainer.remove')
}

export const setDockerPath = (path: string) => {
  containerCliOverride = path === 'docker' ? undefined : path
  return Rpc.invoke('DevContainer.setDockerPath', path)
}

export const openWorkspace = async (): Promise<void> => {
  try {
    const originalWorkspace = await Workspace.getFolder()
    const result = (await Progress.run(
      'DevContainer.openWorkspace',
      originalWorkspace,
      await getContainerCli(),
    )) as {
      ok?: boolean
      workspaceUri?: string
      missingExecutable?: string
      errorCode?: string
      errorMessage?: string
    }
    if (!result.ok || !result.workspaceUri?.startsWith('devcontainers:///')) {
      await Progress.appendLine(
        `Failed to open devcontainer workspace: ${result.errorMessage || 'Unknown error'}`,
      )
      await executeCommand('Dialog.show', GetErrorDialog.getErrorDialog(result))
      return
    }
    if ((await Workspace.getFolder()) !== originalWorkspace) {
      throw new Error(
        'The workspace changed while the devcontainer was building. Run Reopen in Container again for the desired workspace.',
      )
    }
    await Progress.appendLine('Container ready. Opening the workspace…')
    const { workspaceUri } = result
    // Workspace refresh reads this extension's provider. Let the originating
    // command return before re-entering its RPC with filesystem requests.
    setTimeout(() => {
      void executeCommand('Workspace.setUri', workspaceUri, '/').then(
        () => Progress.appendLine('Connected to the devcontainer workspace.'),
        async (error: unknown) => {
          await Progress.appendLine(
            `Failed to open devcontainer workspace: ${String(error)}`,
          )
          void showNotification(
            'error',
            `Failed to open devcontainer workspace: ${String(error)}`,
          )
        },
      )
    }, 0)
  } catch (error) {
    await Progress.appendLine(
      `Failed to open devcontainer workspace: ${error instanceof Error ? error.message : String(error)}`,
    )
    await executeCommand(
      'Dialog.show',
      GetErrorDialog.getErrorDialog({
        errorMessage: error instanceof Error ? error.message : String(error),
      }),
    )
  }
}

export const installDocker = async (): Promise<void> => {
  try {
    const command = (await Rpc.invoke(
      'DevContainer.getDockerInstallCommand',
    )) as string
    await executeCommand('Layout.showPanel', 'Terminals')
    await executeCommand('Terminals.addTerminal')
    await executeCommand('Terminals.sendText', `${command}\r`)
  } catch (error) {
    await showNotification(
      'error',
      `Could not open Docker installation: ${error instanceof Error ? error.message : String(error)}. Install Docker from https://docs.docker.com/get-docker/`,
    )
  }
}
