import { afterEach, expect, test } from '@jest/globals'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as DevContainer from '../src/parts/DevContainer/DevContainer.js'
import * as DevContainerNodeClient from '../src/parts/DevContainerNodeClient/DevContainerNodeClient.js'
import * as DevContainerState from '../src/parts/DevContainerState/DevContainerState.js'

const roots: string[] = []

const createWorkspace = async ({ withConfig = true } = {}) => {
  const root = await mkdtemp(join(tmpdir(), 'devcontainer-worker-'))
  roots.push(root)
  if (withConfig) {
    const configDir = join(root, '.devcontainer')
    await mkdir(configDir)
    await writeFile(join(configDir, 'devcontainer.json'), '{}')
  }
  return root
}

afterEach(async () => {
  DevContainerState.reset()
  DevContainerNodeClient.resetNodeApi()
  for (const root of roots.splice(0)) {
    await rm(root, { force: true, recursive: true })
  }
})

test('up - missing config', async () => {
  const workspaceFolder = await createWorkspace({ withConfig: false })

  expect(await DevContainer.up({ workspaceFolder })).toMatchObject({
    errorCode: 'DEVCONTAINER_CONFIG_NOT_FOUND',
    ok: false,
    workspaceFolder,
  })
})

test('up - success stores running state', async () => {
  const workspaceFolder = await createWorkspace()
  DevContainerNodeClient.setNodeApi({
    cliExec: async () => ({ json: { outcome: 'success' }, ok: true }),
    cliReadConfiguration: async () => ({ json: {}, ok: true }),
    cliUp: async () => ({
      json: {
        containerId: 'container-1',
        outcome: 'success',
        remoteUser: 'vscode',
        remoteWorkspaceFolder: '/workspaces/app',
      },
      ok: true,
    }),
    dockerRemoveContainer: async () => ({ ok: true }),
    dockerStopContainer: async () => ({ ok: true }),
  })

  expect(await DevContainer.up({ workspaceFolder })).toMatchObject({
    ok: true,
  })
  expect(DevContainer.getState({ workspaceFolder })).toMatchObject({
    containerId: 'container-1',
    remoteUser: 'vscode',
    remoteWorkspaceFolder: '/workspaces/app',
    status: 'running',
  })
})

test('up - failure stores error state', async () => {
  const workspaceFolder = await createWorkspace()
  DevContainerNodeClient.setNodeApi({
    cliExec: async () => ({ ok: true }),
    cliReadConfiguration: async () => ({ ok: true }),
    cliUp: async () => ({
      errorMessage: 'boom',
      ok: false,
    }),
    dockerRemoveContainer: async () => ({ ok: true }),
    dockerStopContainer: async () => ({ ok: true }),
  })

  expect(await DevContainer.up({ workspaceFolder })).toMatchObject({
    errorMessage: 'boom',
    ok: false,
  })
  expect(DevContainer.getState({ workspaceFolder })).toMatchObject({
    status: 'error',
  })
})

test('exec - before container start', async () => {
  const workspaceFolder = await createWorkspace()

  expect(
    await DevContainer.exec({
      command: 'node',
      workspaceFolder,
    }),
  ).toMatchObject({
    errorCode: 'DEVCONTAINER_NOT_RUNNING',
    ok: false,
  })
})

test('stop - stores stopped state after docker stop', async () => {
  const workspaceFolder = await createWorkspace()
  const stopped: string[] = []
  DevContainerState.set(workspaceFolder, {
    containerId: 'container-1',
    status: 'running',
  })
  DevContainerNodeClient.setNodeApi({
    cliExec: async () => ({ ok: true }),
    cliReadConfiguration: async () => ({ ok: true }),
    cliUp: async () => ({ ok: true }),
    dockerRemoveContainer: async () => ({ ok: true }),
    dockerStopContainer: async ({ containerId }) => {
      stopped.push(containerId)
      return { ok: true }
    },
  })

  expect(await DevContainer.stop({ workspaceFolder })).toEqual({
    ok: true,
  })
  expect(stopped).toEqual(['container-1'])
  expect(DevContainer.getState({ workspaceFolder })).toMatchObject({
    containerId: 'container-1',
    status: 'stopped',
  })
})

test('up - accepts a file workspace uri', async () => {
  const workspaceFolder = await createWorkspace()
  const workspaceUri = pathToFileURL(workspaceFolder).href
  DevContainerNodeClient.setNodeApi({
    cliExec: async () => ({ ok: true }),
    cliReadConfiguration: async () => ({ ok: true }),
    cliUp: async ({ workspaceFolder: receivedWorkspaceFolder }) => ({
      json: {
        containerId: 'container-1',
        remoteWorkspaceFolder: receivedWorkspaceFolder,
      },
      ok: true,
    }),
    dockerRemoveContainer: async () => ({ ok: true }),
    dockerStopContainer: async () => ({ ok: true }),
  })

  expect(
    await DevContainer.up({ workspaceFolder: workspaceUri }),
  ).toMatchObject({
    ok: true,
  })
  expect(
    DevContainer.getState({ workspaceFolder: workspaceUri }),
  ).toMatchObject({
    containerId: 'container-1',
    status: 'running',
  })
})

test('remove - clears state after docker remove', async () => {
  const workspaceFolder = await createWorkspace()
  const removed: string[] = []
  DevContainerState.set(workspaceFolder, {
    containerId: 'container-1',
    status: 'running',
  })
  DevContainerNodeClient.setNodeApi({
    cliExec: async () => ({ ok: true }),
    cliReadConfiguration: async () => ({ ok: true }),
    cliUp: async () => ({ ok: true }),
    dockerRemoveContainer: async ({ containerId }) => {
      removed.push(containerId)
      return { ok: true }
    },
    dockerStopContainer: async () => ({ ok: true }),
  })

  expect(await DevContainer.remove({ workspaceFolder })).toEqual({
    ok: true,
  })
  expect(removed).toEqual(['container-1'])
  expect(DevContainer.getState({ workspaceFolder })).toEqual({
    status: 'stopped',
  })
})

test('openWorkspace builds, checks the remote folder, and resolves lifecycle commands from its URI', async () => {
  const workspaceFolder = await createWorkspace()
  const operations: string[] = []
  DevContainerNodeClient.setNodeApi({
    cliExec: async () => ({ ok: true }),
    cliReadConfiguration: async () => ({ ok: true }),
    cliUp: async () => {
      operations.push('build')
      return {
        ok: true,
        json: {
          containerId: 'abc123',
          remoteUser: 'vscode',
          remoteWorkspaceFolder: '/container-only',
        },
      }
    },
    containerFileSystem: async (options) => {
      expect(options).toMatchObject({
        containerId: 'abc123',
        remoteUser: 'vscode',
        path: '/container-only',
        operation: 'readDirWithFileTypes',
      })
      operations.push('connect')
      return []
    },
    dockerStopContainer: async ({ containerId }) => ({
      ok: containerId === 'abc123',
    }),
    dockerRemoveContainer: async () => ({ ok: true }),
  })
  const [first, second] = await Promise.all([
    DevContainer.openWorkspace({ workspaceFolder }),
    DevContainer.openWorkspace({ workspaceFolder }),
  ])
  expect(first).toEqual({ ok: true, workspaceUri: 'devcontainers:///abc123' })
  expect(second).toEqual(first)
  expect(operations).toEqual(['build', 'connect'])
  expect(
    await DevContainer.stop({ workspaceFolder: 'devcontainers:///abc123' }),
  ).toEqual({ ok: true })
})

test('openWorkspace does not connect after a failed build', async () => {
  const workspaceFolder = await createWorkspace()
  DevContainerNodeClient.setNodeApi({
    cliExec: async () => ({ ok: true }),
    cliReadConfiguration: async () => ({ ok: true }),
    cliUp: async () => ({ ok: false, errorMessage: 'build failed' }),
    containerFileSystem: async () => {
      throw new Error('must not connect')
    },
    dockerStopContainer: async () => ({ ok: true }),
    dockerRemoveContainer: async () => ({ ok: true }),
  })
  expect(await DevContainer.openWorkspace({ workspaceFolder })).toEqual({
    ok: false,
    errorMessage: 'build failed',
  })
})

test('openWorkspace rejects an inaccessible remote workspace', async () => {
  const workspaceFolder = await createWorkspace()
  DevContainerNodeClient.setNodeApi({
    cliExec: async () => ({ ok: true }),
    cliReadConfiguration: async () => ({ ok: true }),
    cliUp: async () => ({
      ok: true,
      json: { containerId: 'abc123', remoteWorkspaceFolder: '/missing' },
    }),
    containerFileSystem: async () => {
      throw new Error('workspace missing')
    },
    dockerStopContainer: async () => ({ ok: true }),
    dockerRemoveContainer: async () => ({ ok: true }),
  })
  await expect(DevContainer.openWorkspace({ workspaceFolder })).rejects.toThrow(
    'workspace missing',
  )
})
