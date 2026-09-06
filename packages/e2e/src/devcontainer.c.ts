import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.c'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'c',
    runtimeArgs: [
      '-c',
      'gcc -Wall -Werror src/main.c -o /tmp/devcontainer-e2e-c && /tmp/devcontainer-e2e-c',
    ],
    runtimeCommand: 'sh',
    runtimeOutput: /^c workspace fixture\s*$/,
  })
}
