import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.python-post-create'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'python-post-create',
    runtimeArgs: ['src/main.py'],
    runtimeCommand: 'python',
    runtimeOutput: /^python-post-create workspace fixture\s*$/,
  })
}
