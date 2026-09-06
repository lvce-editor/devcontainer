import type { Test } from '@lvce-editor/test-worker'
import { getWorkspaceUri } from '../helpers/getWorkspaceUri.ts'

export const name = 'devcontainer.reopen-failure'

export const test: Test = async ({ Command, expect, Locator, Workspace }) => {
  const localUri = getWorkspaceUri('reopen-invalid')
  await Workspace.setPath(localUri)
  let failed = false
  try {
    await Command.executeExtensionCommand('devcontainer.openWorkspace')
  } catch {
    failed = true
  }
  if (!failed) {
    throw new Error('Expected devcontainer build to fail')
  }
  const uri = await Command.execute('Workspace.getUri')
  if (uri !== localUri) {
    throw new Error(`Failed build changed the workspace to ${uri}`)
  }
  await expect(
    Locator('.Explorer .TreeItem[aria-label="host-only.txt"]'),
  ).toBeVisible()
}
