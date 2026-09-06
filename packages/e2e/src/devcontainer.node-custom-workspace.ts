import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.node-custom-workspace'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'node-custom-workspace',
    runtimeArgs: ['src/main.mjs'],
    runtimeCommand: 'node',
    runtimeOutput: /^node-custom-workspace workspace fixture\s*$/,
  })
}
