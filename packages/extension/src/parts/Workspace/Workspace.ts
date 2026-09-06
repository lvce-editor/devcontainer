import { getWorkspaceUri } from '@lvce-editor/api'

export const getFolder = async (): Promise<string> => {
  const workspaceFolder = await getWorkspaceUri()
  if (!workspaceFolder) {
    throw new Error('No workspace folder is open')
  }
  return workspaceFolder
}
