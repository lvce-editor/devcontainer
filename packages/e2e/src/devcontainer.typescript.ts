import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.typescript'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'typescript',
    runtimeArgs: ['src/main.ts'],
    runtimeCommand: 'node',
    runtimeOutput: /^typescript workspace fixture\s*$/,
  })
}
