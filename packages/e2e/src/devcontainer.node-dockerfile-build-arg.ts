import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.node-dockerfile-build-arg'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'node-dockerfile-build-arg',
    runtimeArgs: ['src/main.mjs'],
    runtimeCommand: 'node',
    runtimeOutput: /^node-dockerfile-build-arg workspace fixture\s*$/,
  })
}
