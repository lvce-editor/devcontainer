import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.rust'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'rust',
    runtimeArgs: [
      '-c',
      'rustc src/main.rs -o /tmp/devcontainer-e2e-rust && /tmp/devcontainer-e2e-rust',
    ],
    runtimeCommand: 'sh',
    runtimeOutput: /^rust workspace fixture\s*$/,
  })
}
