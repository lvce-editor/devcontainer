import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.javascript-esm'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'javascript-esm',
    runtimeArgs: ['src/main.mjs'],
    runtimeCommand: 'node',
    runtimeOutput: /^javascript-esm workspace fixture\s*$/,
  })
}
