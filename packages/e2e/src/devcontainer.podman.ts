import type { Test } from '@lvce-editor/test-worker'
import { testDevContainer } from '../helpers/testDevContainer.ts'

export const name = 'devcontainer.podman'

export const test: Test = async (context) => {
  await testDevContainer(context, {
    containerCli: 'podman',
    fixture: 'ubuntu-24.04',
    runtimeArgs: ['/etc/os-release'],
    runtimeCommand: 'cat',
    runtimeOutput: /VERSION_ID="24.04"/,
  })
}
