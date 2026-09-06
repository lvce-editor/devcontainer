import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.bash'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'bash',
    runtimeArgs: ['src/main.sh'],
    runtimeCommand: 'bash',
    runtimeOutput: /^bash workspace fixture\s*$/,
  })
}
