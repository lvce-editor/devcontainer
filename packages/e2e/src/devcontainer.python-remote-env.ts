import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.python-remote-env'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'python-remote-env',
    runtimeArgs: ['src/main.py'],
    runtimeCommand: 'python',
    runtimeOutput: /^python-remote-env workspace fixture\s*$/,
  })
}
