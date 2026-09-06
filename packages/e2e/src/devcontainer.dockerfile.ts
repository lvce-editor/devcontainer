import type { Test } from '@lvce-editor/test-with-playwright'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.dockerfile'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    fixture: 'dockerfile',
    runtimeArgs: ['/etc/devcontainer-e2e-build'],
    runtimeCommand: 'cat',
    runtimeOutput: /^built from the fixture Dockerfile\s*$/,
  })
}
