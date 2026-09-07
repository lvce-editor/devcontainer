import { executeCommand, showNotification } from '@lvce-editor/api'
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

export const start = () => {
  return invokeForCurrentWorkspace('DevContainer.up')
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
    const result = (await Rpc.invoke('DevContainer.openWorkspace', {
      workspaceFolder: originalWorkspace,
    })) as {
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
    const { workspaceUri } = result
    // Workspace refresh reads this extension's provider. Let the originating
    // command return before re-entering its RPC with filesystem requests.
    setTimeout(() => {
      void executeCommand('Workspace.setUri', workspaceUri, '/').catch(
        (error: unknown) => {
          void showNotification(
            'error',
            `Failed to open devcontainer workspace: ${String(error)}`,
          )
        },
      )
    }, 0)
  } catch (error) {
    await showNotification(
      'error',
      `Failed to open devcontainer workspace: ${error instanceof Error ? error.message : String(error)}`,
    )
    throw error
  }
}
