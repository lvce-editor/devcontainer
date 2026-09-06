import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.perl'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'perl',
    runtimeArgs: ['src/main.pl'],
    runtimeCommand: 'perl',
    runtimeOutput: /^perl workspace fixture\s*$/,
  })
}
