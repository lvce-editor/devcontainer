import type { Test } from '@lvce-editor/test-worker'
import { testDockerNotInstalled } from '../helpers/testDockerNotInstalled.ts'

export const name = 'devcontainer.docker-not-installed'

export const test: Test = async (context) => {
  await testDockerNotInstalled(context)
}
