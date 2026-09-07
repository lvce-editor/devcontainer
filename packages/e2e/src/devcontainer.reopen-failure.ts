import type { Test } from '@lvce-editor/test-worker'
import { getWorkspaceUri } from '../helpers/getWorkspaceUri.ts'

export const name = 'devcontainer.reopen-failure'

export const test: Test = async ({ Command, expect, Locator, Workspace }) => {
  const localUri = await getWorkspaceUri({ Command }, 'reopen-invalid')
  await Workspace.setPath(localUri)
  await Command.executeExtensionCommand('devcontainer.openWorkspace')
  const heading = Locator('.DialogHeading')
  await expect(heading).toHaveText('Could not open devcontainer')
  await Command.execute('Viewlet.closeWidget', 'Dialog')
  const uri = await Command.execute('Workspace.getUri')
  if (uri !== localUri) {
    throw new Error(`Failed build changed the workspace to ${uri}`)
  }
  const hostFile = Locator('.Explorer .TreeItem[aria-label="host-only.txt"]')
  await expect(hostFile).toBeVisible()
  await Command.executeExtensionCommand('devcontainer.showLogs')
  const editor = Locator('.Editor')
  await expect(editor).toContainText('missing-Dockerfile')
}
