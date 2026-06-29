import { afterEach, expect, test } from '@jest/globals'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

test('stop - clears state after docker stop', async () => {
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
  expect(DevContainer.getState({ workspaceFolder })).toEqual({
    status: 'stopped',
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
