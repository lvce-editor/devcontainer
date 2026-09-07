import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.podman-dockerfile'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    containerCli: 'podman',
    fixture: 'dockerfile',
    runtimeArgs: ['/etc/os-release'],
    runtimeCommand: 'cat',
    runtimeOutput: /VERSION_ID="24.04"/,
  })
}
