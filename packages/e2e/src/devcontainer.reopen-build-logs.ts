import type { Test } from '@lvce-editor/test-worker'
import { getWorkspaceUri } from '../helpers/getWorkspaceUri.ts'

// Enable after the editor ships dialog-worker's action button support.
export const skip = 1

export const name = 'devcontainer.reopen-build-logs'

export const test: Test = async ({ Command, expect, Locator, Workspace }) => {
  const localUri = await getWorkspaceUri({ Command }, 'reopen-invalid')
  await Workspace.setPath(localUri)
  await Command.executeExtensionCommand('devcontainer.openWorkspace')
  const dialog = Locator('.DialogContent')
  await expect(dialog).toBeVisible()
  const heading = Locator('.DialogHeading')
  await expect(heading).toHaveText('Could not open devcontainer')
  const message = Locator('.DialogMessage')
  await expect(message).toHaveText(
    'The container could not be started. Run “Dev Containers: Show Full Logs” to see what went wrong.',
  )
  const showLogs = Locator('.DialogContent button[name=Action]')
  await expect(showLogs).toBeVisible()
  await Command.execute('Dialog.handleClickButton', 'Action')
  await expect(dialog).toHaveCount(0)
  const editor = Locator('.Editor')
  await expect(editor).toContainText('missing-Dockerfile')
  if ((await Command.execute('Workspace.getUri')) !== localUri) {
    throw new Error('Viewing build logs must preserve the local workspace')
  }
}
