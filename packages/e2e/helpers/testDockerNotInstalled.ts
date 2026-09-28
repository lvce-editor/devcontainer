import type { Test } from '@lvce-editor/test-worker'

export const testDockerNotInstalled = async ({
  Command,
  Devcontainer,
  Workspace,
}: Parameters<Test>[0]): Promise<Error> => {
  const source = new URL(import.meta.resolve('../fixtures/javascript-node-24'))
  const sourceUri =
    source.protocol === 'file:'
      ? source.href
      : `file://${source.pathname.slice('/remote'.length)}`
  const targetUri = sourceUri.replace(
    '/fixtures/javascript-node-24',
    () => `/.tmp/fixtures/docker-not-installed-${crypto.randomUUID()}`,
  )
  await Command.execute('FileSystem.copy', sourceUri, targetUri)
  await Workspace.setPath(targetUri)
  await Devcontainer.setDockerPath(
    `${new URL(targetUri).pathname}/missing-docker`,
  )
  try {
    await Devcontainer.start({ timeout: 30_000 })
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      error.code !== 'E_DOCKER_NOT_INSTALLED'
    ) {
      throw error
    }
    if (
      error.name !== 'DockerNotInstalledError' ||
      !error.message.includes('Docker was not found. Install Docker') ||
      !error.message.includes('PATH')
    ) {
      throw new Error('Expected an actionable DockerNotInstalledError', {
        cause: error,
      })
    }
    return error
  } finally {
    await Devcontainer.setDockerPath('docker')
  }
  throw new Error('Expected startup to fail with E_DOCKER_NOT_INSTALLED')
}
