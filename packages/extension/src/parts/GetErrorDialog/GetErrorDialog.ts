export interface DevContainerError {
  errorCode?: string
  errorMessage?: string
  missingExecutable?: string
}

export const getErrorDialog = (error: DevContainerError) => {
  if (error.missingExecutable) {
    const executableName = error.missingExecutable
      .split(/[\\/]/)
      .at(-1)
      ?.toLowerCase()
    if (executableName !== 'docker' && executableName !== 'docker.exe') {
      return {
        errorCode: error.errorCode || 'ENOENT',
        message: `The configured executable "${error.missingExecutable}" could not be found. Check devcontainer.containerCli, then run Reopen in Container again.`,
        title: 'Error: Container executable not found',
        type: 'error',
      }
    }
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
