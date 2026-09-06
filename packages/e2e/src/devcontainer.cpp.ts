import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.cpp'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'cpp',
    runtimeArgs: [
      '-c',
      'g++ -Wall -Werror src/main.cpp -o /tmp/devcontainer-e2e-cpp && /tmp/devcontainer-e2e-cpp',
    ],
    runtimeCommand: 'sh',
    runtimeOutput: /^cpp workspace fixture\s*$/,
  })
}
