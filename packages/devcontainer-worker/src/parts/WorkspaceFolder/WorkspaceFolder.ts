import { fileURLToPath } from 'node:url'
import * as DevContainerState from '../DevContainerState/DevContainerState.ts'

const normalizePath = (workspaceFolder: string): string => {
  if (workspaceFolder.startsWith('remote-ssh://')) {
    throw new Error(
      'Reopening an SSH workspace in a devcontainer is not supported yet. Dev Containers currently runs on the editor host, not the SSH host. Open a local copy of this workspace to use Reopen in Container.',
    )
  }
  if (workspaceFolder.startsWith('file://')) {
    return fileURLToPath(workspaceFolder)
  }
  if (
    workspaceFolder.startsWith('http://') ||
    workspaceFolder.startsWith('https://')
  ) {
    const { pathname } = new URL(workspaceFolder)
    if (pathname.startsWith('/remote/')) {
      return decodeURIComponent(pathname.slice('/remote'.length))
    }
  }
  return workspaceFolder
}

export const toPath = async (workspaceFolder: string): Promise<string> => {
  if (workspaceFolder.startsWith('devcontainers:///')) {
    return DevContainerState.getWorkspaceFolder(workspaceFolder)
  }
  const path = normalizePath(workspaceFolder)
  if (!DevContainerState.get(path)) {
    await DevContainerState.restore(path)
  }
  return path
}
