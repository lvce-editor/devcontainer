import { getWorkspaceFolder } from '@lvce-editor/api'

export const getFolder = async (): Promise<string> => {
  const workspaceFolder = await getWorkspaceFolder()
  if (!workspaceFolder) {
    throw new Error('No workspace folder is open')
  }
  return workspaceFolder
}
