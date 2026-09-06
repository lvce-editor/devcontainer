import { afterEach, expect, test } from '@jest/globals'
import * as ContainerFileSystem from '../src/parts/ContainerFileSystem/ContainerFileSystem.ts'
import * as DevContainerNodeClient from '../src/parts/DevContainerNodeClient/DevContainerNodeClient.ts'
import * as DevContainerState from '../src/parts/DevContainerState/DevContainerState.ts'

const setup = () => {
  DevContainerState.set('/local', {
    containerId: 'abc123',
    status: 'running',
    remoteUser: 'vscode',
    remoteWorkspaceFolder: '/remote',
  })
  const received: DevContainerNodeClient.FileSystemOptions[] = []
  DevContainerNodeClient.setNodeApi({
    cliExec: async () => ({}),
    cliReadConfiguration: async () => ({}),
    cliUp: async () => ({}),
    dockerRemoveContainer: async () => ({}),
    dockerStopContainer: async () => ({}),
    containerFileSystem: async (options) => {
      received.push(options)
      return ''
    },
  })
  return received
}

afterEach(() => {
  DevContainerState.reset()
  DevContainerNodeClient.resetNodeApi()
})

test('routes encoded paths and content to the container workspace and remote user', async () => {
  const received = setup()
  await ContainerFileSystem.invoke(
    'writeFile',
    'devcontainers:///abc123/a%20b/%E2%9C%93.txt',
    'hello — world',
  )
  expect(received).toEqual([
    {
      containerId: 'abc123',
      remoteUser: 'vscode',
      remoteWorkspaceFolder: '/remote',
      operation: 'writeFile',
      path: '/remote/a b/✓.txt',
      content: 'hello — world',
      newPath: undefined,
    },
  ])
})

test('rejects mutation of the workspace root and renames to another container', async () => {
  const received = setup()
  await expect(
    ContainerFileSystem.invoke('remove', 'devcontainers:///abc123'),
  ).rejects.toThrow('workspace root')
  await expect(
    ContainerFileSystem.invoke(
      'rename',
      'devcontainers:///abc123/a',
      'devcontainers:///def456/b',
    ),
  ).rejects.toThrow('across devcontainers')
  await expect(
    ContainerFileSystem.invoke('readFile', 'devcontainers:///abc123/%2Fetc'),
  ).rejects.toThrow('Invalid devcontainer path')
  expect(received).toEqual([])
})

test('does not read a stopped container or fall back to the host filesystem', async () => {
  const received = setup()
  DevContainerState.set('/local', { containerId: 'abc123', status: 'stopped' })
  await expect(
    ContainerFileSystem.invoke('readFile', 'devcontainers:///abc123/a'),
  ).rejects.toThrow('not running')
  expect(received).toEqual([])
})
