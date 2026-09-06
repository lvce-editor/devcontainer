import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.go'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'go',
    runtimeArgs: ['run', 'src/main.go'],
    runtimeCommand: 'go',
    runtimeOutput: /^go workspace fixture\s*$/,
  })
}
