import type { Test } from '@lvce-editor/test-worker'
import { testReopen } from '../helpers/testReopen.ts'

export const name = 'devcontainer.podman-reopen'

export const test: Test = async (context) => {
  await testReopen(context, 'podman')
}
