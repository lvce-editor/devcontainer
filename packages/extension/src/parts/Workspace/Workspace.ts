export const getFolder = () => {
  // @ts-ignore
  const workspaceFolder = vscode.getWorkspaceFolder()
  if (!workspaceFolder) {
    throw new Error('No workspace folder is open')
  }
  return workspaceFolder
}
