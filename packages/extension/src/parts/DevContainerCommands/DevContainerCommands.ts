import { executeCommand, showNotification } from '@lvce-editor/api'
import * as Progress from '../Progress/Progress.ts'
import * as Rpc from '../Rpc/Rpc.ts'
import * as Workspace from '../Workspace/Workspace.ts'

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
  const result = (await Progress.run('DevContainer.up', workspaceFolder)) as {
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
  return Rpc.invoke('DevContainer.setDockerPath', path)
}

export const openWorkspace = async (): Promise<void> => {
  try {
    const originalWorkspace = await Workspace.getFolder()
    const result = (await Progress.run(
      'DevContainer.openWorkspace',
      originalWorkspace,
    )) as {
      ok?: boolean
      workspaceUri?: string
      errorCode?: string
      errorMessage?: string
    }
    if (!result.ok || !result.workspaceUri?.startsWith('devcontainers:///')) {
      throw new Error(
        [
          result.errorCode ? `Error code: ${result.errorCode}` : '',
          result.errorMessage || 'Failed to open workspace in devcontainer',
        ]
          .filter(Boolean)
          .join('\n'),
      )
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
    await showNotification(
      'error',
      `Failed to open devcontainer workspace: ${error instanceof Error ? error.message : String(error)}`,
    )
    throw error
  }
}
