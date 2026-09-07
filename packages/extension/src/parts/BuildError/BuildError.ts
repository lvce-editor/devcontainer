import type { FileSystemProvider } from '@lvce-editor/api'
import {
  closeUri,
  executeCommand,
  openUri,
  showNotification,
} from '@lvce-editor/api'

interface BuildError {
  errorCode?: string
  errorMessage?: string
  errorStack?: string
  stderr?: string
  stdout?: string
}

const logsUri = 'devcontainer-logs:///Dev Container.log'
let logs = 'No devcontainer startup logs are available yet.'

export const fileSystem: FileSystemProvider = {
  id: 'devcontainer-logs',
  isReadonly: () => true,
  readFile: () => new Blob([logs]),
}

export const showLogs = (): void => {
  // Opening the editor reads this extension's provider. Return from the
  // command before re-entering its RPC to avoid a deadlock.
  setTimeout(() => {
    void (async () => {
      await closeUri(logsUri)
      await openUri(logsUri)
    })().catch(async () => {
      await showNotification(
        'error',
        'Could not open the devcontainer logs. Try Show Full Logs again.',
      )
    })
  }, 0)
}

export const showError = async (
  error: BuildError,
  workspaceFolder: string,
): Promise<void> => {
  logs = [
    `Workspace: ${workspaceFolder}`,
    error.errorCode,
    error.errorMessage,
    error.errorStack,
    error.stdout ? `Standard output:\n${error.stdout}` : '',
    error.stderr ? `Standard error:\n${error.stderr}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  const isBuildFailure =
    /Command failed: [^\n]*\b(?:buildx build|docker build)\b/.test(
      error.errorMessage || '',
    )
  await executeCommand('Dialog.show', {
    actionCommand: 'devcontainer.showLogs',
    actionLabel: 'Show Full Logs',
    message: isBuildFailure
      ? 'The container image could not be built. Run “Dev Containers: Show Full Logs” to see which build step failed.'
      : 'The container could not be started. Run “Dev Containers: Show Full Logs” to see what went wrong.',
    title: 'Could not open devcontainer',
    type: 'error',
  })
}
