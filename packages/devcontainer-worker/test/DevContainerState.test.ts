import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as DevContainerNodeClient from '../src/parts/DevContainerNodeClient/DevContainerNodeClient.ts'
import * as DevContainerState from '../src/parts/DevContainerState/DevContainerState.ts'
import * as WorkspaceFolder from '../src/parts/WorkspaceFolder/WorkspaceFolder.ts'

let directory: string
let running = true

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'devcontainer-restore-'))
  process.env.LVCE_DEVCONTAINER_CONNECTIONS_DIR = directory
  running = true
  DevContainerNodeClient.setNodeApi({
    cliExec: async () => ({}),
    cliReadConfiguration: async () => ({}),
    cliUp: async () => {
      throw new Error('Restoring must not rebuild the container')
    },
    dockerInspectContainer: async ({ containerCli, containerId }) => {
      if (containerCli) expect(containerCli).toBe('podman')
      expect(containerId).toBe('abc123')
      return running
    },
    dockerRemoveContainer: async () => ({}),
    dockerStopContainer: async () => ({}),
  })
})

afterEach(async () => {
  DevContainerState.reset()
  DevContainerNodeClient.resetNodeApi()
  delete process.env.LVCE_DEVCONTAINER_CONNECTIONS_DIR
  await rm(directory, { force: true, recursive: true })
})

test.each([undefined, 'podman'])(
  'restores the URI connection and engine %s after the workspace disposes its extension runtime',
  async (containerCli) => {
    const workspaceFolder = join(directory, 'workspace')
    const state = {
      containerCli,
      containerId: 'abc123',
      remoteUser: 'vscode',
      remoteWorkspaceFolder: '/container-workspace',
      status: 'running' as const,
    }
    DevContainerState.set(workspaceFolder, state)
    await DevContainerState.persist(workspaceFolder)
    DevContainerState.reset()

    expect(
      await WorkspaceFolder.toPath('devcontainers:///abc123/file.txt'),
    ).toBe(workspaceFolder)
    expect(DevContainerState.get(workspaceFolder)).toEqual(state)

    DevContainerState.reset()
    running = false
    expect(await WorkspaceFolder.toPath(workspaceFolder)).toBe(workspaceFolder)
    expect(DevContainerState.get(workspaceFolder)).toMatchObject({
      containerId: 'abc123',
      status: 'stopped',
    })

    await DevContainerState.forget(workspaceFolder)
    DevContainerState.reset()
    await expect(
      WorkspaceFolder.toPath('devcontainers:///abc123'),
    ).rejects.toThrow('no longer available')
  },
)

test('does not redirect an old URI to a replacement container', async () => {
  const workspaceFolder = join(directory, 'workspace')
  DevContainerState.set(workspaceFolder, {
    containerId: 'abc123',
    remoteWorkspaceFolder: '/original',
    status: 'running',
  })
  await DevContainerState.persist(workspaceFolder)
  DevContainerState.set(workspaceFolder, {
    containerId: 'replacement456',
    remoteWorkspaceFolder: '/replacement',
    status: 'running',
  })

  await expect(
    WorkspaceFolder.toPath('devcontainers:///abc123/file.txt'),
  ).rejects.toThrow('no longer available')
  expect(DevContainerState.get(workspaceFolder)?.containerId).toBe(
    'replacement456',
  )
})
