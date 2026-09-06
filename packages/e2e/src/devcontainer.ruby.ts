import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.ruby'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'ruby',
    runtimeArgs: ['src/main.rb'],
    runtimeCommand: 'ruby',
    runtimeOutput: /^ruby workspace fixture\s*$/,
  })
}
