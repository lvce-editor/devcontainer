export interface DevContainerError {
  errorCode?: string
  errorMessage?: string
  missingDocker?: boolean
}

export const getErrorDialog = (error: DevContainerError) => {
  if (error.missingDocker) {
    return {
      actionCommand: 'devcontainer.installDocker',
      actionLabel: 'Install Docker',
      errorCode: error.errorCode || 'ENOENT',
      message:
        'Dev Containers needs Docker to start this workspace. Install Docker or check its configured path. Then run Reopen in Container again.\n\nInstall Docker opens a terminal on the container host. Linux uses rootless Docker; macOS and Windows use Docker Desktop.',
      title: 'Error: Docker executable not found',
      type: 'error',
    }
  }
  const message =
    error.errorMessage?.replace(/^(?:Error:\s*)+/, '') ||
    'Could not open the workspace in a container.'
  return {
    errorCode: error.errorCode,
    message,
    title: 'Error: Could not open devcontainer',
    type: 'error',
  }
}
