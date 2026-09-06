import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.python'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'python',
    runtimeArgs: ['src/main.py'],
    runtimeCommand: 'python',
    runtimeOutput: /^python workspace fixture\s*$/,
  })
}
