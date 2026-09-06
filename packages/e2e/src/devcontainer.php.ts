import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.php'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'php',
    runtimeArgs: ['src/main.php'],
    runtimeCommand: 'php',
    runtimeOutput: /^php workspace fixture\s*$/,
  })
}
