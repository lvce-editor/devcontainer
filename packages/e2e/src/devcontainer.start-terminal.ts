import type { Test } from '@lvce-editor/test-worker'
import { testContainerTerminal } from '../helpers/testContainerTerminal.ts'

export const name = 'devcontainer.start-terminal'

export const test: Test = async (context) => {
  await testContainerTerminal(
    context,
    'Dev Containers: Start Current Workspace',
  )
}
