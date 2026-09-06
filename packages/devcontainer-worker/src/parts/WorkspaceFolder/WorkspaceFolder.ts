import { fileURLToPath } from 'node:url'
import * as DevContainerState from '../DevContainerState/DevContainerState.ts'

export const toPath = (workspaceFolder: string) => {
  if (workspaceFolder.startsWith('devcontainers:///')) {
    return DevContainerState.getWorkspaceFolder(workspaceFolder)
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
