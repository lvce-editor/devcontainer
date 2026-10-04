import type { Test } from '@lvce-editor/test-worker'
import { testContainerTerminal } from '../helpers/testContainerTerminal.ts'

// Requires the renderer's disposeCommand support in the published server.
export const skip = 1

export const test: Test = async (context) => {
  await testContainerTerminal(
    context,
    'Dev Containers: Reopen in Container',
    true,
  )
}
