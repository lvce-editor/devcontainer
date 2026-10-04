import type { Test } from '@lvce-editor/test-worker'
import { testContainerTerminal } from '../helpers/testContainerTerminal.ts'

export const test: Test = async (context) => {
  await testContainerTerminal(
    context,
    'Dev Containers: Reopen in Container',
    true,
  )
}
