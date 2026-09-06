import type { Test } from '@lvce-editor/test-with-playwright'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.javascript-node-24'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'javascript-node-24',
    runtimeArgs: ['--version'],
    runtimeCommand: 'node',
    runtimeOutput: /^v24\.\d+\.\d+\s*$/,
  })
}
