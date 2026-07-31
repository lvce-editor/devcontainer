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
