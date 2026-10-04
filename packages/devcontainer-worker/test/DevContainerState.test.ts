import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as DevContainerNodeClient from '../src/parts/DevContainerNodeClient/DevContainerNodeClient.ts'
import * as DevContainerState from '../src/parts/DevContainerState/DevContainerState.ts'
import * as WorkspaceFolder from '../src/parts/WorkspaceFolder/WorkspaceFolder.ts'

let directory: string
let running = true
let inspectedEngines: (string | undefined)[] = []

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'devcontainer-restore-'))
  process.env.LVCE_DEVCONTAINER_CONNECTIONS_DIR = directory
  running = true
  inspectedEngines = []
  DevContainerNodeClient.setNodeApi({
    cliExec: async () => ({}),
    cliReadConfiguration: async () => ({}),
    cliUp: async () => {
      throw new Error('Restoring must not rebuild the container')
    },
    dockerInspectContainer: async ({ containerCli, containerId }) => {
      inspectedEngines.push(containerCli)
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
    expect(inspectedEngines).toEqual([containerCli])

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

test('restores saved forwarding once for concurrent requests and skips stopped containers', async () => {
  const workspaceFolder = join(directory, 'workspace')
  const forwarded: unknown[] = []
  DevContainerNodeClient.setNodeApi({
    cliExec: async () => ({}),
    cliReadConfiguration: async () => ({}),
    cliUp: async () => ({}),
    dockerInspectContainer: async () => running,
    dockerRemoveContainer: async () => ({}),
    dockerStopContainer: async () => ({}),
    forwardPorts: async (options) => {
      forwarded.push(options)
    },
  })
  DevContainerState.set(workspaceFolder, {
    containerId: 'abc123',
    forwardPorts: [3000],
    remoteUser: 'node',
    remoteWorkspaceFolder: '/app',
    status: 'running',
  })
  await DevContainerState.persist(workspaceFolder)
  DevContainerState.reset()
  await Promise.all([
    DevContainerState.restore('abc123'),
    DevContainerState.restore(workspaceFolder),
  ])
  expect(forwarded).toEqual([
    expect.objectContaining({
      containerId: 'abc123',
      forwardPorts: [3000],
      remoteUser: 'node',
      workspaceFolder,
    }),
  ])
  DevContainerState.reset()
  running = false
  await DevContainerState.restore('abc123')
  expect(forwarded).toHaveLength(1)
})

test('a stale restoration does not reopen ports after the workspace state changes', async () => {
  const workspaceFolder = join(directory, 'workspace')
  const inspected = Promise.withResolvers<boolean>()
  let forwards = 0
  DevContainerNodeClient.setNodeApi({
    cliExec: async () => ({}),
    cliReadConfiguration: async () => ({}),
    cliUp: async () => ({}),
    dockerInspectContainer: async () => {
      DevContainerState.set(workspaceFolder, {
        containerId: 'replacement',
        status: 'stopped',
      })
      return inspected.promise
    },
    dockerRemoveContainer: async () => ({}),
    dockerStopContainer: async () => ({}),
    forwardPorts: async () => {
      forwards++
    },
  })
  DevContainerState.set(workspaceFolder, {
    containerId: 'abc123',
    forwardPorts: [3000],
    remoteWorkspaceFolder: '/app',
    status: 'running',
  })
  await DevContainerState.persist(workspaceFolder)
  DevContainerState.reset()
  const restoring = DevContainerState.restore('abc123')
  inspected.resolve(true)
  await restoring
  expect(forwards).toBe(0)
  expect(DevContainerState.get(workspaceFolder)?.containerId).toBe(
    'replacement',
  )
})
